import worker, { type Env } from './index'
import type { ParticipantSubmissionStatus } from '../../../shared/event-api-types'
import { DEFAULT_UPLOAD_LIMITS, formatBytes, type UploadLimits } from '../../../shared/upload-limits'
import { EVENT_API_ALLOWED_METHODS } from './cors-policy'
import { persistUploadWithRollback } from './upload-persistence'

function parseUploadLimits(env: Env): UploadLimits {
  const int = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? '', 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  return {
    maxPhotoBytes: int(env.MAX_PHOTO_BYTES, DEFAULT_UPLOAD_LIMITS.maxPhotoBytes),
    maxPhotosPerCostume: int(env.MAX_PHOTOS_PER_COSTUME, DEFAULT_UPLOAD_LIMITS.maxPhotosPerCostume),
    maxCostumesPerParticipant: int(
      env.MAX_COSTUMES_PER_PARTICIPANT,
      DEFAULT_UPLOAD_LIMITS.maxCostumesPerParticipant,
    ),
    maxEventStorageBytes: int(env.MAX_EVENT_STORAGE_BYTES, DEFAULT_UPLOAD_LIMITS.maxEventStorageBytes),
  }
}

async function getEventStorageBytes(env: Env, eventId: string): Promise<number> {
  try {
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(size_bytes), 0) as total FROM photos WHERE event_id = ?`,
    )
      .bind(eventId)
      .first<{ total: number }>()
    return row?.total ?? 0
  } catch {
    const limits = parseUploadLimits(env)
    const row = await env.DB.prepare(`SELECT COUNT(*) as c FROM photos WHERE event_id = ?`)
      .bind(eventId)
      .first<{ c: number }>()
    return (row?.c ?? 0) * limits.maxPhotoBytes
  }
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function applyCorsPolicy(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  const headers = new Headers(response.headers)

  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  } else if (allowed.length === 1 && allowed[0]) {
    headers.set('Access-Control-Allow-Origin', allowed[0])
  }

  headers.set('Access-Control-Allow-Methods', EVENT_API_ALLOWED_METHODS)
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Participant-Token, X-Admin-Token',
  )
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}

async function authorizeParticipant(
  eventId: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<{ participantId: string } | Response> {
  const authUrl = new URL(request.url)
  authUrl.pathname = `/api/events/${encodeURIComponent(eventId)}/participant/status`
  authUrl.search = ''
  const authRequest = new Request(authUrl.toString(), {
    method: 'GET',
    headers: request.headers,
  })
  const authResponse = await worker.fetch(authRequest, env, ctx)
  if (!authResponse.ok) return authResponse
  const status = (await authResponse.json()) as ParticipantSubmissionStatus
  return { participantId: status.participantId }
}

async function handleUploadPhotoWithRollback(
  eventId: string,
  costumeId: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const authorization = await authorizeParticipant(eventId, request, env, ctx)
  if (authorization instanceof Response) return authorization

  const costume = await env.DB.prepare(
    `SELECT id, participant_id FROM costumes WHERE id = ? AND event_id = ?`,
  )
    .bind(costumeId, eventId)
    .first<{ id: string; participant_id: string }>()

  if (!costume) return json({ error: '衣装が見つかりません' }, 404)
  if (costume.participant_id !== authorization.participantId) {
    return json({ error: '他の参加者の衣装には写真を追加できません' }, 403)
  }

  const limits = parseUploadLimits(env)
  const countRow = await env.DB.prepare(`SELECT COUNT(*) as c FROM photos WHERE costume_id = ?`)
    .bind(costumeId)
    .first<{ c: number }>()
  if ((countRow?.c ?? 0) >= limits.maxPhotosPerCostume) {
    return json({ error: `写真は1衣装あたり最大 ${limits.maxPhotosPerCostume} 枚までです` }, 400)
  }

  const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream'
  if (!contentType.startsWith('image/')) {
    return json({ error: '画像ファイルのみアップロードできます' }, 400)
  }

  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength > limits.maxPhotoBytes) {
    return json(
      {
        error: `1枚あたり最大 ${formatBytes(limits.maxPhotoBytes)} までです（現在 ${formatBytes(bytes.byteLength)}）`,
      },
      413,
    )
  }
  if (bytes.byteLength === 0) return json({ error: '空のファイルです' }, 400)

  const used = await getEventStorageBytes(env, eventId)
  if (used + bytes.byteLength > limits.maxEventStorageBytes) {
    return json(
      { error: `このイベントの保存上限（${formatBytes(limits.maxEventStorageBytes)}）に達しています` },
      413,
    )
  }

  const photoId = `ph_${Date.now()}_${randomId()}`
  const r2Key = `${eventId}/${costumeId}/${photoId}`
  const sortOrder = countRow?.c ?? 0

  try {
    await persistUploadWithRollback({
      putObject: async () => {
        await env.PHOTOS.put(r2Key, bytes, { httpMetadata: { contentType } })
      },
      insertRecord: async () => {
        await env.DB.prepare(
          `INSERT INTO photos (id, event_id, costume_id, r2_key, content_type, size_bytes, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(photoId, eventId, costumeId, r2Key, contentType, bytes.byteLength, sortOrder, Date.now())
          .run()
      },
      deleteObject: async () => {
        await env.PHOTOS.delete(r2Key)
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '写真の保存に失敗しました'
    return json({ error: message }, 500)
  }

  const origin = new URL(request.url).origin
  return json({ photoId, viewUrl: `${origin}/api/media/${photoId}` }, 201)
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const photoMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/costumes\/([^/]+)\/photos$/)

    if (photoMatch && request.method === 'POST') {
      const response = await handleUploadPhotoWithRollback(
        decodeURIComponent(photoMatch[1]),
        decodeURIComponent(photoMatch[2]),
        request,
        env,
        ctx,
      )
      return applyCorsPolicy(response, request, env)
    }

    const response = await worker.fetch(request, env, ctx)
    return applyCorsPolicy(response, request, env)
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await worker.scheduled(event, env, ctx)
  },
}
