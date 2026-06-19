import type {
  CreateEventRequest,
  CreateEventResponse,
  CreateCostumeRequest,
  CreateCostumeResponse,
  EventAdminSnapshot,
  EventPublicInfo,
  ExtendRetentionRequest,
  ExtendRetentionResponse,
  JoinEventRequest,
  JoinEventResponse,
  ParticipantSubmissionStatus,
  ServerCostume,
  ServerParticipant,
  ServerPhoto,
  UploadPhotoResponse,
} from '../../../shared/event-api-types'
import { computeExpiresAt, extendExpiresAt, isExpired } from '../../../shared/event-expiry'
import {
  DEFAULT_UPLOAD_LIMITS,
  formatBytes,
  type UploadLimits,
} from '../../../shared/upload-limits'

export interface Env {
  DB: D1Database
  PHOTOS: R2Bucket
  ALLOWED_ORIGINS: string
  MAX_PHOTOS_PER_COSTUME: string
  MAX_PHOTO_BYTES: string
  MAX_COSTUMES_PER_PARTICIPANT: string
  MAX_EVENT_STORAGE_BYTES: string
  /** wrangler secret put GOOGLE_CLIENT_ID */
  GOOGLE_CLIENT_ID?: string
  /** wrangler secret put GOOGLE_CLIENT_SECRET */
  GOOGLE_CLIENT_SECRET?: string
}

function parseUploadLimits(env: Env): UploadLimits {
  const int = (v: string | undefined, fallback: number) => {
    const n = parseInt(v ?? '', 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  return {
    maxPhotoBytes: int(env.MAX_PHOTO_BYTES, DEFAULT_UPLOAD_LIMITS.maxPhotoBytes),
    maxPhotosPerCostume: int(
      env.MAX_PHOTOS_PER_COSTUME,
      DEFAULT_UPLOAD_LIMITS.maxPhotosPerCostume,
    ),
    maxCostumesPerParticipant: int(
      env.MAX_COSTUMES_PER_PARTICIPANT,
      DEFAULT_UPLOAD_LIMITS.maxCostumesPerParticipant,
    ),
    maxEventStorageBytes: int(
      env.MAX_EVENT_STORAGE_BYTES,
      DEFAULT_UPLOAD_LIMITS.maxEventStorageBytes,
    ),
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
    const row = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM photos WHERE event_id = ?`,
    )
      .bind(eventId)
      .first<{ c: number }>()
    return (row?.c ?? 0) * limits.maxPhotoBytes
  }
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
}
const EVENT_API_VERSION = '2026-06-19.7'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), request, env)
    }

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return cors(
          json({ ok: true, apiVersion: EVENT_API_VERSION, uploadLimits: parseUploadLimits(env) }),
          request,
          env,
        )
      }

      if (url.pathname === '/api/events' && request.method === 'POST') {
        return cors(await handleCreateEvent(request, env), request, env)
      }

      const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/)
      if (eventMatch && request.method === 'GET') {
        return cors(await handleGetEventPublic(eventMatch[1], url, env), request, env)
      }
      if (eventMatch && request.method === 'DELETE') {
        return cors(await handleDeleteEvent(eventMatch[1], request, env), request, env)
      }

      const registerHostMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/register-host$/)
      if (registerHostMatch && request.method === 'POST') {
        return cors(await handleRegisterHost(registerHostMatch[1], request, env), request, env)
      }

      const snapshotMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/snapshot$/)
      if (snapshotMatch && request.method === 'GET') {
        return cors(await handleAdminSnapshot(snapshotMatch[1], url, env, request), request, env)
      }

      const extendMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/extend-retention$/)
      if (extendMatch && request.method === 'POST') {
        return cors(await handleExtendRetention(extendMatch[1], request, env), request, env)
      }

      const joinMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/join$/)
      if (joinMatch && request.method === 'POST') {
        return cors(await handleJoin(joinMatch[1], url, request, env), request, env)
      }

      const participantStatusMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/participant\/status$/)
      if (participantStatusMatch && request.method === 'GET') {
        return cors(await handleParticipantStatus(participantStatusMatch[1], request, env), request, env)
      }

      const costumesMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/costumes$/)
      if (costumesMatch && request.method === 'POST') {
        return cors(await handleCreateCostume(costumesMatch[1], request, env), request, env)
      }

      const photoMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/costumes\/([^/]+)\/photos$/)
      if (photoMatch && request.method === 'POST') {
        return cors(
          await handleUploadPhoto(photoMatch[1], photoMatch[2], request, env, url),
          request,
          env,
        )
      }

      const mediaMatch = url.pathname.match(/^\/api\/media\/([^/]+)$/)
      if (mediaMatch && request.method === 'GET') {
        return cors(await handleMedia(mediaMatch[1], url, env), request, env)
      }

      if (url.pathname === '/api/oauth/google/token' && request.method === 'POST') {
        return cors(await handleGoogleTokenExchange(request, env), request, env)
      }

      if (url.pathname === '/api/oauth/google/refresh' && request.method === 'POST') {
        return cors(await handleGoogleTokenRefresh(request, env), request, env)
      }

      return cors(json({ error: 'Not found' }, 404), request, env)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Internal error'
      const status = errorStatus(message)
      return cors(json({ error: message }, status), request, env)
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runExpiryCleanup(env))
  },
}

async function handleCreateEvent(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as CreateEventRequest
    if (!body.name?.trim() || !body.date?.trim()) {
      return json({ error: 'name と date は必須です' }, 400)
    }
    const retentionDays = body.retentionDays === 7 ? 7 : 14
    const createdAt = Date.now()
    const eventId = `evt_${createdAt}_${randomId()}`
    const adminToken = randomToken()
    const inviteToken = randomToken()
    const expiresAt = computeExpiresAt(createdAt, body.date, retentionDays)
    const themeJson = body.themePreferences ? JSON.stringify(body.themePreferences) : null

    await env.DB.prepare(
      `INSERT INTO events (id, name, event_date, description, theme_json, expires_at, admin_token, invite_token, retention_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        eventId,
        body.name.trim(),
        body.date.trim(),
        (body.description ?? '').trim(),
        themeJson,
        expiresAt,
        await hashToken(adminToken),
        await hashToken(inviteToken),
        retentionDays,
        createdAt,
      )
      .run()

    let hostParticipant: JoinEventResponse | undefined
    const hostName = body.hostDisplayName?.trim()
    if (hostName) {
      hostParticipant = await registerParticipant(env, eventId, hostName, createdAt)
    }

    const res: CreateEventResponse = {
      eventId,
      adminToken,
      inviteToken,
      expiresAt,
      invitePath: `/join?e=${encodeURIComponent(eventId)}&t=${encodeURIComponent(inviteToken)}`,
      participatePath: `/events/${encodeURIComponent(eventId)}/participate`,
      hostParticipant,
    }
    return json(res, 201)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'イベントの作成に失敗しました'
    return json({ error: message }, 500)
  }
}

async function handleGetEventPublic(eventId: string, url: URL, env: Env): Promise<Response> {
  const invite = url.searchParams.get('invite') ?? ''
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)
  await assertInviteToken(env, eventId, invite, row.invite_token)

  const info = rowToPublic(row, env)
  return json(info)
}

async function handleAdminSnapshot(
  eventId: string,
  url: URL,
  env: Env,
  request: Request,
): Promise<Response> {
  const admin = getAdminToken(url, request)
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)
  await assertAdminToken(env, eventId, admin, row.admin_token)

  const snapshot = await buildAdminSnapshot(env, row, request.url)
  return json(snapshot)
}

async function handleExtendRetention(
  eventId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const admin = getAdminToken(new URL(request.url), request)
  const row = await getEventRow(env, eventId)
  await assertAdminToken(env, eventId, admin, row.admin_token)

  let days = 7
  try {
    const body = (await request.json()) as ExtendRetentionRequest
    if (body.days != null && body.days !== 7) {
      return json({ error: '延長は7日のみ指定できます' }, 400)
    }
  } catch {
    /* empty body OK */
  }

  const next = extendExpiresAt(row.expires_at, row.created_at, days)
  if (next == null) {
    return json({ error: 'これ以上延長できません（作成から最大14日まで）' }, 400)
  }

  await env.DB.prepare(`UPDATE events SET expires_at = ? WHERE id = ?`)
    .bind(next, eventId)
    .run()

  const res: ExtendRetentionResponse = { expiresAt: next }
  return json(res)
}

async function handleParticipantStatus(
  eventId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const participant = await requireParticipant(eventId, request, env)
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)

  const counts = await env.DB.prepare(
    `SELECT
      (SELECT COUNT(*) FROM costumes c WHERE c.event_id = ? AND c.participant_id = ?) as costume_count,
      (SELECT COUNT(*) FROM photos ph
        JOIN costumes c ON c.id = ph.costume_id
        WHERE c.event_id = ? AND c.participant_id = ?) as photo_count`,
  )
    .bind(eventId, participant.id, eventId, participant.id)
    .first<{ costume_count: number; photo_count: number }>()

  const costumeRows = await env.DB.prepare(
    `SELECT c.id, c.source_costume_id, c.name,
      (SELECT COUNT(*) FROM photos ph WHERE ph.costume_id = c.id) as photo_count
     FROM costumes c
     WHERE c.event_id = ? AND c.participant_id = ?
     ORDER BY c.created_at ASC`,
  )
    .bind(eventId, participant.id)
    .all<{ id: string; source_costume_id: string | null; name: string; photo_count: number }>()

  const costumeCount = counts?.costume_count ?? 0
  const photoCount = counts?.photo_count ?? 0

  const res: ParticipantSubmissionStatus = {
    participantId: participant.id,
    displayName: participant.display_name,
    costumeCount,
    photoCount,
    costumes: (costumeRows.results ?? []).map((row) => ({
      id: row.id,
      ...(row.source_costume_id ? { sourceCostumeId: row.source_costume_id } : {}),
      name: row.name,
      photoCount: row.photo_count,
    })),
    submitted: costumeCount > 0 && photoCount >= costumeCount,
  }
  return json(res)
}

async function handleJoin(
  eventId: string,
  url: URL,
  request: Request,
  env: Env,
): Promise<Response> {
  const invite = url.searchParams.get('invite') ?? ''
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)
  await assertInviteToken(env, eventId, invite, row.invite_token)

  const body = (await request.json()) as JoinEventRequest
  const displayName = body.displayName?.trim()
  if (!displayName) return json({ error: 'displayName は必須です' }, 400)

  try {
    const res = await registerParticipant(env, eventId, displayName, Date.now())
    return json(res, 201)
  } catch (e) {
    const message = e instanceof Error ? e.message : '参加に失敗しました'
    const status = message.includes('既に') ? 409 : 500
    return json({ error: message }, status)
  }
}

async function registerParticipant(
  env: Env,
  eventId: string,
  displayName: string,
  createdAt: number,
): Promise<JoinEventResponse> {
  const existing = await env.DB.prepare(
    `SELECT id FROM participants WHERE event_id = ? AND display_name = ?`,
  )
    .bind(eventId, displayName)
    .first<{ id: string }>()

  if (existing?.id) {
    throw new Error('同じ表示名の参加者が既にいます')
  }

  const participantId = `par_${createdAt}_${randomId()}`
  const participantToken = randomToken()
  const tokenHash = await hashToken(participantToken)

  await env.DB.prepare(
    `INSERT INTO participants (id, event_id, display_name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(participantId, eventId, displayName, tokenHash, createdAt)
    .run()

  return {
    participantId,
    participantToken,
    displayName,
  }
}

async function handleCreateCostume(eventId: string, request: Request, env: Env): Promise<Response> {
  const participant = await requireParticipant(eventId, request, env)
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)

  const body = (await request.json()) as CreateCostumeRequest
  if (!body.name?.trim()) return json({ error: 'name は必須です' }, 400)

  const sourceCostumeId = body.sourceCostumeId?.trim() || null
  if (sourceCostumeId && sourceCostumeId.length > 200) {
    return json({ error: 'sourceCostumeId が長すぎます' }, 400)
  }

  if (sourceCostumeId) {
    const existing = await env.DB.prepare(
      `SELECT id FROM costumes WHERE event_id = ? AND participant_id = ? AND source_costume_id = ?`,
    )
      .bind(eventId, participant.id, sourceCostumeId)
      .first<{ id: string }>()
    if (existing) return json({ costumeId: existing.id } satisfies CreateCostumeResponse)
  }

  const limits = parseUploadLimits(env)
  const costumeCount = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM costumes WHERE event_id = ? AND participant_id = ?`,
  )
    .bind(eventId, participant.id)
    .first<{ c: number }>()
  if ((costumeCount?.c ?? 0) >= limits.maxCostumesPerParticipant) {
    return json(
      {
        error: `衣装はお一人様最大 ${limits.maxCostumesPerParticipant} 件までです`,
      },
      400,
    )
  }

  const costumeId = `cos_${Date.now()}_${randomId()}`
  const now = Date.now()
  const colors = JSON.stringify(Array.isArray(body.colors) ? body.colors : [])
  const season = JSON.stringify(Array.isArray(body.season) ? body.season : [])
  const preferences = JSON.stringify(Array.isArray(body.preferences) ? body.preferences : [])

  await env.DB.prepare(
    `INSERT INTO costumes (id, event_id, participant_id, source_costume_id, name, colors_json, tone, pattern, season_json, type, silhouette, suit_style, suit_breasting, suit_lapel, preferences_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      costumeId,
      eventId,
      participant.id,
      sourceCostumeId,
      body.name.trim(),
      colors,
      body.tone ?? 'neutral',
      body.pattern ?? 'plain',
      season,
      body.type ?? null,
      body.silhouette ?? null,
      body.suitStyle ?? null,
      body.suitBreasting ?? null,
      body.suitLapel ?? null,
      preferences,
      now,
      now,
    )
    .run()

  const res: CreateCostumeResponse = { costumeId }
  return json(res, 201)
}

async function handleUploadPhoto(
  eventId: string,
  costumeId: string,
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const participant = await requireParticipant(eventId, request, env)
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)

  const costume = await env.DB.prepare(
    `SELECT id, participant_id FROM costumes WHERE id = ? AND event_id = ?`,
  )
    .bind(costumeId, eventId)
    .first<{ id: string; participant_id: string }>()

  if (!costume) return json({ error: '衣装が見つかりません' }, 404)
  if (costume.participant_id !== participant.id) {
    return json({ error: '他の参加者の衣装には写真を追加できません' }, 403)
  }

  const limits = parseUploadLimits(env)
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM photos WHERE costume_id = ?`,
  )
    .bind(costumeId)
    .first<{ c: number }>()
  if ((countRow?.c ?? 0) >= limits.maxPhotosPerCostume) {
    return json(
      { error: `写真は1衣装あたり最大 ${limits.maxPhotosPerCostume} 枚までです` },
      400,
    )
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
  if (bytes.byteLength === 0) {
    return json({ error: '空のファイルです' }, 400)
  }

  const used = await getEventStorageBytes(env, eventId)
  if (used + bytes.byteLength > limits.maxEventStorageBytes) {
    return json(
      {
        error: `このイベントの保存上限（${formatBytes(limits.maxEventStorageBytes)}）に達しています`,
      },
      413,
    )
  }

  const photoId = `ph_${Date.now()}_${randomId()}`
  const r2Key = `${eventId}/${costumeId}/${photoId}`
  await env.PHOTOS.put(r2Key, bytes, {
    httpMetadata: { contentType },
  })

  const sortOrder = countRow?.c ?? 0
  await env.DB.prepare(
    `INSERT INTO photos (id, event_id, costume_id, r2_key, content_type, size_bytes, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      photoId,
      eventId,
      costumeId,
      r2Key,
      contentType,
      bytes.byteLength,
      sortOrder,
      Date.now(),
    )
    .run()

  const viewUrl = mediaUrl(request.url, photoId, url.searchParams.get('invite') ?? undefined)
  const res: UploadPhotoResponse = { photoId, viewUrl }
  return json(res, 201)
}

async function handleMedia(photoId: string, url: URL, env: Env): Promise<Response> {
  const photo = await env.DB.prepare(
    `SELECT p.id, p.r2_key, p.content_type, p.event_id, c.participant_id,
      e.expires_at, e.admin_token
     FROM photos p
     JOIN costumes c ON c.id = p.costume_id AND c.event_id = p.event_id
     JOIN events e ON e.id = p.event_id
     WHERE p.id = ?`,
  )
    .bind(photoId)
    .first<{
      id: string
      r2_key: string
      content_type: string
      event_id: string
      participant_id: string
      expires_at: number
      admin_token: string
    }>()

  if (!photo) return json({ error: 'Not found' }, 404)
  assertNotExpired(photo.expires_at)

  const media = url.searchParams.get('media') ?? ''
  const participant = url.searchParams.get('participant') ?? ''

  let allowed = false
  if (media && (await verifyMediaAccessToken(media, photo.admin_token, photo.id))) allowed = true
  if (!allowed && participant) {
    const eventParticipants = await env.DB.prepare(
      `SELECT token_hash FROM participants WHERE event_id = ? LIMIT 100`,
    )
      .bind(photo.event_id)
      .all<{ token_hash: string }>()
    for (const eventParticipant of eventParticipants.results ?? []) {
      if (await verifyToken(participant, eventParticipant.token_hash)) {
        allowed = true
        break
      }
    }
  }

  if (!allowed) return json({ error: '認証が必要です' }, 401)

  const obj = await env.PHOTOS.get(photo.r2_key)
  if (!obj) return json({ error: '画像がありません' }, 404)

  const headers = new Headers()
  headers.set('Content-Type', photo.content_type)
  headers.set('Cache-Control', 'private, max-age=3600')
  return new Response(obj.body, { headers })
}

async function buildAdminSnapshot(
  env: Env,
  row: EventRow,
  requestUrl: string,
): Promise<EventAdminSnapshot> {
  const base = new URL(requestUrl)

  const participantsResult = await env.DB.prepare(
    `SELECT p.id, p.display_name, p.created_at,
      (SELECT COUNT(*) FROM costumes c WHERE c.event_id = p.event_id AND c.participant_id = p.id) as costume_count,
      (SELECT COUNT(*) FROM photos ph
        JOIN costumes c ON c.id = ph.costume_id
        WHERE c.event_id = p.event_id AND ph.event_id = p.event_id AND c.participant_id = p.id) as photo_count,
      (SELECT MAX(c.updated_at) FROM costumes c WHERE c.event_id = p.event_id AND c.participant_id = p.id) as last_submit
     FROM participants p WHERE p.event_id = ? ORDER BY p.created_at`,
  )
    .bind(row.id)
    .all<{
      id: string
      display_name: string
      created_at: number
      costume_count: number
      photo_count: number
      last_submit: number | null
    }>()

  const participants: ServerParticipant[] = (participantsResult.results ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    submittedAt: p.costume_count > 0 && p.photo_count >= p.costume_count ? p.last_submit : null,
    costumeCount: p.costume_count,
    photoCount: p.photo_count,
  }))

  const costumesResult = await env.DB.prepare(
    `SELECT c.*, p.display_name as participant_name FROM costumes c
     JOIN participants p ON p.id = c.participant_id
     WHERE c.event_id = ? ORDER BY c.updated_at DESC`,
  )
    .bind(row.id)
    .all<CostumeRow & { participant_name: string }>()

  const costumeIdsByParticipant = new Map<string, string[]>()
  for (const costume of costumesResult.results ?? []) {
    const ids = costumeIdsByParticipant.get(costume.participant_id) ?? []
    ids.push(costume.id)
    costumeIdsByParticipant.set(costume.participant_id, ids)
  }

  const costumes: ServerCostume[] = []
  for (const c of costumesResult.results ?? []) {
    const photosRows = await env.DB.prepare(
      `SELECT id, costume_id, content_type, sort_order FROM photos
       WHERE costume_id = ? AND event_id = ? ORDER BY sort_order`,
    )
      .bind(c.id, row.id)
      .all<{ id: string; costume_id: string; content_type: string; sort_order: number }>()

    const photos: ServerPhoto[] = (photosRows.results ?? []).map((ph) => ({
      id: ph.id,
      costumeId: ph.costume_id,
      contentType: ph.content_type,
      sortOrder: ph.sort_order,
      viewUrl: '',
    }))
    for (const photo of photos) {
      const mediaToken = await createMediaAccessToken(row.admin_token, photo.id)
      photo.viewUrl = `${base.origin}/api/media/${photo.id}?media=${encodeURIComponent(mediaToken)}`
    }

    costumes.push({
      id: c.id,
      participantId: c.participant_id,
      participantName: c.participant_name,
      name: c.name,
      colors: JSON.parse(c.colors_json) as string[],
      tone: c.tone,
      pattern: c.pattern,
      season: JSON.parse(c.season_json) as string[],
      type: c.type ?? undefined,
      silhouette: c.silhouette ?? undefined,
      suitStyle: c.suit_style ?? undefined,
      suitBreasting: c.suit_breasting ?? undefined,
      suitLapel: c.suit_lapel ?? undefined,
      preferences: (() => {
        const saved = JSON.parse(c.preferences_json) as string[]
        return saved.length > 0
          ? saved
          : (costumeIdsByParticipant.get(c.participant_id) ?? [])
      })(),
      photos,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })
  }

  return {
    event: rowToPublic(row, env),
    participants,
    costumes,
  }
}

// Fix viewUrl in snapshot - admin will append token client-side
function mediaUrl(requestUrl: string, photoId: string, _invite?: string): string {
  const origin = new URL(requestUrl).origin
  return `${origin}/api/media/${photoId}`
}

async function purgeEventData(env: Env, eventId: string): Promise<void> {
  const photos = await env.DB.prepare(`SELECT r2_key FROM photos WHERE event_id = ?`)
    .bind(eventId)
    .all<{ r2_key: string }>()
  for (const ph of photos.results ?? []) {
    await env.PHOTOS.delete(ph.r2_key)
  }
  await env.DB.prepare(`DELETE FROM photos WHERE event_id = ?`).bind(eventId).run()
  await env.DB.prepare(`DELETE FROM costumes WHERE event_id = ?`).bind(eventId).run()
  await env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(eventId).run()
  await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(eventId).run()
}

async function handleDeleteEvent(
  eventId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const admin = getAdminToken(new URL(request.url), request)
  const row = await getEventRow(env, eventId)
  await assertAdminToken(env, eventId, admin, row.admin_token)
  await purgeEventData(env, eventId)
  return new Response(null, { status: 204 })
}

async function handleRegisterHost(
  eventId: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const admin = getAdminToken(new URL(request.url), request)
  const row = await getEventRow(env, eventId)
  await assertAdminToken(env, eventId, admin, row.admin_token)
  assertNotExpired(row.expires_at)

  const body = (await request.json()) as { displayName?: string }
  const displayName = body.displayName?.trim()
  if (!displayName) return json({ error: 'displayName は必須です' }, 400)

  const existing = await env.DB.prepare(
    `SELECT id FROM participants WHERE event_id = ? AND display_name = ?`,
  )
    .bind(eventId, displayName)
    .first<{ id: string }>()

  if (existing?.id) {
    const participantToken = randomToken()
    const tokenHash = await hashToken(participantToken)
    await env.DB.prepare(`UPDATE participants SET token_hash = ? WHERE id = ?`)
      .bind(tokenHash, existing.id)
      .run()
    return json({
      participantId: existing.id,
      participantToken,
      displayName,
      reissued: true,
    })
  }

  const res = await registerParticipant(env, eventId, displayName, Date.now())
  return json({ ...res, reissued: false }, 201)
}

async function runExpiryCleanup(env: Env): Promise<void> {
  const now = Date.now()
  const expired = await env.DB.prepare(`SELECT id FROM events WHERE expires_at < ?`)
    .bind(now)
    .all<{ id: string }>()

  for (const row of expired.results ?? []) {
    await purgeEventData(env, row.id)
  }
}

// --- DB helpers ---

type EventRow = {
  id: string
  name: string
  event_date: string
  description: string
  theme_json: string | null
  expires_at: number
  admin_token: string
  invite_token: string
  retention_days: number
  created_at: number
}

type CostumeRow = {
  id: string
  event_id: string
  participant_id: string
  name: string
  colors_json: string
  tone: string
  pattern: string
  season_json: string
  type: string | null
  silhouette: string | null
  suit_style: string | null
  suit_breasting: string | null
  suit_lapel: string | null
  preferences_json: string
  created_at: number
  updated_at: number
}

async function getEventRow(env: Env, eventId: string): Promise<EventRow> {
  const row = await env.DB.prepare(`SELECT * FROM events WHERE id = ?`)
    .bind(eventId)
    .first<EventRow>()
  if (!row) throw new Error('イベントが見つかりません')
  return row
}

function errorStatus(message: string): number {
  if (message.includes('イベントが見つかりません')) return 404
  if (message.includes('保存期限が切れています')) return 410
  if (message.includes('認証') || message.includes('トークン')) return 401
  return 500
}

function rowToPublic(row: EventRow, env: Env): EventPublicInfo {
  return {
    id: row.id,
    name: row.name,
    date: row.event_date,
    description: row.description,
    expiresAt: row.expires_at,
    themePreferences: row.theme_json
      ? (JSON.parse(row.theme_json) as EventPublicInfo['themePreferences'])
      : undefined,
    uploadLimits: parseUploadLimits(env),
  }
}

function assertNotExpired(expiresAt: number): void {
  if (isExpired(expiresAt)) throw new Error('このイベントの保存期限が切れています')
}

async function assertInviteToken(
  env: Env,
  eventId: string,
  plain: string,
  storedHash: string,
): Promise<void> {
  if (!plain || !(await verifyToken(plain, storedHash))) {
    throw new Error('招待トークンが無効です')
  }
}

async function assertAdminToken(
  env: Env,
  eventId: string,
  plain: string,
  storedHash: string,
): Promise<void> {
  if (!plain || !(await verifyToken(plain, storedHash))) {
    throw new Error('管理者トークンが無効です')
  }
}

async function requireParticipant(
  eventId: string,
  request: Request,
  env: Env,
): Promise<{ id: string; display_name: string }> {
  const token = request.headers.get('X-Participant-Token') ?? ''
  if (!token) throw new Error('参加者トークンが必要です')

  const rows = await env.DB.prepare(
    `SELECT id, display_name, token_hash FROM participants WHERE event_id = ?`,
  )
    .bind(eventId)
    .all<{ id: string; display_name: string; token_hash: string }>()

  for (const row of rows.results ?? []) {
    if (await verifyToken(token, row.token_hash)) {
      return { id: row.id, display_name: row.display_name }
    }
  }
  throw new Error('参加者トークンが無効です')
}

function getAdminToken(url: URL, request: Request): string {
  return (
    url.searchParams.get('admin') ??
    request.headers.get('X-Admin-Token') ??
    ''
  )
}

async function hashToken(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyToken(plain: string, storedHash: string): Promise<boolean> {
  const h = await hashToken(plain)
  if (h.length !== storedHash.length) return false
  let diff = 0
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ storedHash.charCodeAt(i)
  return diff === 0
}

async function createMediaAccessToken(adminTokenHash: string, photoId: string): Promise<string> {
  return hashToken(`${adminTokenHash}:${photoId}:media`)
}

async function verifyMediaAccessToken(
  plain: string,
  adminTokenHash: string,
  photoId: string,
): Promise<boolean> {
  const expected = await createMediaAccessToken(adminTokenHash, photoId)
  if (plain.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < plain.length; i++) {
    diff |= plain.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function isAllowedGoogleRedirectUri(redirectUri: string, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  return allowed.some((origin) => redirectUri === `${origin}/oauth/google/callback`)
}

async function handleGoogleTokenExchange(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json(
      {
        error:
          'Google OAuth が Worker に未設定です。GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET を wrangler secret で登録してください。',
      },
      503,
    )
  }

  let body: { code?: string; code_verifier?: string; redirect_uri?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.code || !body.code_verifier || !body.redirect_uri) {
    return json({ error: 'code, code_verifier, redirect_uri は必須です' }, 400)
  }

  if (!isAllowedGoogleRedirectUri(body.redirect_uri, env)) {
    return json({ error: 'redirect_uri が許可されていません' }, 400)
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    code: body.code,
    code_verifier: body.code_verifier,
    grant_type: 'authorization_code',
    redirect_uri: body.redirect_uri,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await res.json()
  if (!res.ok) {
    const detail =
      (data as { error_description?: string; error?: string }).error_description ??
      (data as { error?: string }).error ??
      'Token exchange failed'
    return json({ error: detail }, res.status)
  }

  return json(data)
}

async function handleGoogleTokenRefresh(request: Request, env: Env): Promise<Response> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return json({ error: 'Google OAuth が Worker に未設定です' }, 503)
  }

  let body: { refresh_token?: string }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.refresh_token) {
    return json({ error: 'refresh_token は必須です' }, 400)
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: body.refresh_token,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await res.json()
  if (!res.ok) {
    const detail =
      (data as { error_description?: string; error?: string }).error_description ??
      (data as { error?: string }).error ??
      'Token refresh failed'
    return json({ error: detail }, res.status)
  }

  return json(data)
}

function cors(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('Origin') ?? ''
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim())
  const headers = new Headers(response.headers)
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  } else if (allowed.length === 1 && allowed[0]) {
    headers.set('Access-Control-Allow-Origin', allowed[0])
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Participant-Token, X-Admin-Token',
  )
  headers.set('Vary', 'Origin')
  return new Response(response.body, { status: response.status, headers })
}
