import type {
  CreateEventRequest,
  CreateEventResponse,
  CreateCostumeRequest,
  CreateCostumeResponse,
  EventAdminSnapshot,
  EventPublicInfo,
  JoinEventRequest,
  JoinEventResponse,
  ServerCostume,
  ServerParticipant,
  ServerPhoto,
  UploadPhotoResponse,
} from '../../../shared/event-api-types'
import { computeExpiresAt, isExpired } from '../../../shared/event-expiry'

export interface Env {
  DB: D1Database
  PHOTOS: R2Bucket
  ALLOWED_ORIGINS: string
  MAX_PHOTOS_PER_COSTUME: string
  MAX_PHOTO_BYTES: string
}

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return cors(new Response(null, { status: 204 }), request, env)
    }

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return cors(json({ ok: true }), request, env)
      }

      if (url.pathname === '/api/events' && request.method === 'POST') {
        return cors(await handleCreateEvent(request, env), request, env)
      }

      const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)$/)
      if (eventMatch && request.method === 'GET') {
        return cors(await handleGetEventPublic(eventMatch[1], url, env), request, env)
      }

      const snapshotMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/snapshot$/)
      if (snapshotMatch && request.method === 'GET') {
        return cors(await handleAdminSnapshot(snapshotMatch[1], url, env, request), request, env)
      }

      const joinMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/join$/)
      if (joinMatch && request.method === 'POST') {
        return cors(await handleJoin(joinMatch[1], url, request, env), request, env)
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

      return cors(json({ error: 'Not found' }, 404), request, env)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Internal error'
      const status = message.includes('認証') || message.includes('トークン') ? 401 : 500
      return cors(json({ error: message }, status), request, env)
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runExpiryCleanup(env))
  },
}

async function handleCreateEvent(request: Request, env: Env): Promise<Response> {
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

  const res: CreateEventResponse = {
    eventId,
    adminToken,
    inviteToken,
    expiresAt,
    invitePath: `/join?e=${encodeURIComponent(eventId)}&t=${encodeURIComponent(inviteToken)}`,
    participatePath: `/events/${encodeURIComponent(eventId)}/participate`,
  }
  return json(res, 201)
}

async function handleGetEventPublic(eventId: string, url: URL, env: Env): Promise<Response> {
  const invite = url.searchParams.get('invite') ?? ''
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)
  await assertInviteToken(env, eventId, invite, row.invite_token)

  const info = rowToPublic(row)
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

  const snapshot = await buildAdminSnapshot(env, row, request.url, admin)
  return json(snapshot)
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

  const existing = await env.DB.prepare(
    `SELECT id FROM participants WHERE event_id = ? AND display_name = ?`,
  )
    .bind(eventId, displayName)
    .first<{ id: string }>()

  if (existing?.id) {
    return json({ error: '同じ表示名の参加者が既にいます' }, 409)
  }

  const participantId = `par_${Date.now()}_${randomId()}`
  const participantToken = randomToken()
  const tokenHash = await hashToken(participantToken)
  const createdAt = Date.now()

  await env.DB.prepare(
    `INSERT INTO participants (id, event_id, display_name, token_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(participantId, eventId, displayName, tokenHash, createdAt)
    .run()

  const res: JoinEventResponse = {
    participantId,
    participantToken,
    displayName,
  }
  return json(res, 201)
}

async function handleCreateCostume(eventId: string, request: Request, env: Env): Promise<Response> {
  const participant = await requireParticipant(eventId, request, env)
  const row = await getEventRow(env, eventId)
  assertNotExpired(row.expires_at)

  const body = (await request.json()) as CreateCostumeRequest
  if (!body.name?.trim()) return json({ error: 'name は必須です' }, 400)

  const costumeId = `cos_${Date.now()}_${randomId()}`
  const now = Date.now()
  const colors = JSON.stringify(Array.isArray(body.colors) ? body.colors : [])
  const season = JSON.stringify(Array.isArray(body.season) ? body.season : [])
  const preferences = JSON.stringify(Array.isArray(body.preferences) ? body.preferences : [])

  await env.DB.prepare(
    `INSERT INTO costumes (id, event_id, participant_id, name, colors_json, tone, pattern, season_json, type, preferences_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      costumeId,
      eventId,
      participant.id,
      body.name.trim(),
      colors,
      body.tone ?? 'neutral',
      body.pattern ?? 'plain',
      season,
      body.type ?? null,
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

  const maxPhotos = parseInt(env.MAX_PHOTOS_PER_COSTUME, 10) || 3
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM photos WHERE costume_id = ?`,
  )
    .bind(costumeId)
    .first<{ c: number }>()
  if ((countRow?.c ?? 0) >= maxPhotos) {
    return json({ error: `写真は最大 ${maxPhotos} 枚までです` }, 400)
  }

  const maxBytes = parseInt(env.MAX_PHOTO_BYTES, 10) || 5_242_880
  const contentType = request.headers.get('Content-Type') ?? 'application/octet-stream'
  if (!contentType.startsWith('image/')) {
    return json({ error: '画像ファイルのみアップロードできます' }, 400)
  }

  const bytes = new Uint8Array(await request.arrayBuffer())
  if (bytes.byteLength > maxBytes) {
    return json({ error: 'ファイルサイズが大きすぎます' }, 413)
  }
  if (bytes.byteLength === 0) {
    return json({ error: '空のファイルです' }, 400)
  }

  const photoId = `ph_${Date.now()}_${randomId()}`
  const r2Key = `${eventId}/${costumeId}/${photoId}`
  await env.PHOTOS.put(r2Key, bytes, {
    httpMetadata: { contentType },
  })

  const sortOrder = countRow?.c ?? 0
  await env.DB.prepare(
    `INSERT INTO photos (id, event_id, costume_id, r2_key, content_type, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(photoId, eventId, costumeId, r2Key, contentType, sortOrder, Date.now())
    .run()

  const viewUrl = mediaUrl(request.url, photoId, url.searchParams.get('invite') ?? undefined)
  const res: UploadPhotoResponse = { photoId, viewUrl }
  return json(res, 201)
}

async function handleMedia(photoId: string, url: URL, env: Env): Promise<Response> {
  const photo = await env.DB.prepare(
    `SELECT p.id, p.r2_key, p.content_type, p.event_id, e.expires_at, e.admin_token, e.invite_token
     FROM photos p JOIN events e ON e.id = p.event_id WHERE p.id = ?`,
  )
    .bind(photoId)
    .first<{
      id: string
      r2_key: string
      content_type: string
      event_id: string
      expires_at: number
      admin_token: string
      invite_token: string
    }>()

  if (!photo) return json({ error: 'Not found' }, 404)
  assertNotExpired(photo.expires_at)

  const admin = url.searchParams.get('admin') ?? ''
  const participant = url.searchParams.get('participant') ?? ''
  const invite = url.searchParams.get('invite') ?? ''

  let allowed = false
  if (admin && (await verifyToken(admin, photo.admin_token))) allowed = true
  if (!allowed && invite && (await verifyToken(invite, photo.invite_token))) allowed = true
  if (!allowed && participant) {
    const p = await env.DB.prepare(
      `SELECT token_hash FROM participants WHERE event_id = ? LIMIT 100`,
    )
      .bind(photo.event_id)
      .all<{ token_hash: string }>()
    for (const row of p.results ?? []) {
      if (await verifyToken(participant, row.token_hash)) {
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
  adminTokenPlain: string,
): Promise<EventAdminSnapshot> {
  const base = new URL(requestUrl)

  const participantsResult = await env.DB.prepare(
    `SELECT p.id, p.display_name, p.created_at,
      (SELECT COUNT(*) FROM costumes c WHERE c.participant_id = p.id) as costume_count,
      (SELECT MAX(c.updated_at) FROM costumes c WHERE c.participant_id = p.id) as last_submit
     FROM participants p WHERE p.event_id = ? ORDER BY p.created_at`,
  )
    .bind(row.id)
    .all<{
      id: string
      display_name: string
      created_at: number
      costume_count: number
      last_submit: number | null
    }>()

  const participants: ServerParticipant[] = (participantsResult.results ?? []).map((p) => ({
    id: p.id,
    displayName: p.display_name,
    submittedAt: p.costume_count > 0 ? p.last_submit : null,
    costumeCount: p.costume_count,
  }))

  const costumesResult = await env.DB.prepare(
    `SELECT c.*, p.display_name as participant_name FROM costumes c
     JOIN participants p ON p.id = c.participant_id
     WHERE c.event_id = ? ORDER BY c.updated_at DESC`,
  )
    .bind(row.id)
    .all<CostumeRow & { participant_name: string }>()

  const costumes: ServerCostume[] = []
  for (const c of costumesResult.results ?? []) {
    const photosRows = await env.DB.prepare(
      `SELECT id, costume_id, content_type, sort_order FROM photos WHERE costume_id = ? ORDER BY sort_order`,
    )
      .bind(c.id)
      .all<{ id: string; costume_id: string; content_type: string; sort_order: number }>()

    const adminQ = encodeURIComponent(adminTokenPlain)
    const photos: ServerPhoto[] = (photosRows.results ?? []).map((ph) => ({
      id: ph.id,
      costumeId: ph.costume_id,
      contentType: ph.content_type,
      sortOrder: ph.sort_order,
      viewUrl: `${base.origin}/api/media/${ph.id}?admin=${adminQ}`,
    }))

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
      preferences: JSON.parse(c.preferences_json) as string[],
      photos,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })
  }

  return {
    event: rowToPublic(row),
    participants,
    costumes,
  }
}

// Fix viewUrl in snapshot - admin will append token client-side
function mediaUrl(requestUrl: string, photoId: string, _invite?: string): string {
  const origin = new URL(requestUrl).origin
  return `${origin}/api/media/${photoId}`
}

async function runExpiryCleanup(env: Env): Promise<void> {
  const now = Date.now()
  const expired = await env.DB.prepare(`SELECT id FROM events WHERE expires_at < ?`)
    .bind(now)
    .all<{ id: string }>()

  for (const row of expired.results ?? []) {
    const photos = await env.DB.prepare(`SELECT r2_key FROM photos WHERE event_id = ?`)
      .bind(row.id)
      .all<{ r2_key: string }>()
    for (const ph of photos.results ?? []) {
      await env.PHOTOS.delete(ph.r2_key)
    }
    await env.DB.prepare(`DELETE FROM photos WHERE event_id = ?`).bind(row.id).run()
    await env.DB.prepare(`DELETE FROM costumes WHERE event_id = ?`).bind(row.id).run()
    await env.DB.prepare(`DELETE FROM participants WHERE event_id = ?`).bind(row.id).run()
    await env.DB.prepare(`DELETE FROM events WHERE id = ?`).bind(row.id).run()
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

function rowToPublic(row: EventRow): EventPublicInfo {
  return {
    id: row.id,
    name: row.name,
    date: row.event_date,
    description: row.description,
    expiresAt: row.expires_at,
    themePreferences: row.theme_json
      ? (JSON.parse(row.theme_json) as EventPublicInfo['themePreferences'])
      : undefined,
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
