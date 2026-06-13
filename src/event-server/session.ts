const STORAGE_KEY = 'costume-coordinator-event-server-session'

export type EventServerSessionEntry = {
  adminToken?: string
  inviteToken?: string
  participantToken?: string
  participantId?: string
  displayName?: string
  expiresAt?: number
  /** オンライン提出が完了済みか */
  costumesSubmitted?: boolean
}

type SessionStore = {
  events: Record<string, EventServerSessionEntry>
}

function readStore(): SessionStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { events: {} }
    const parsed = JSON.parse(raw) as SessionStore
    if (!parsed.events || typeof parsed.events !== 'object') return { events: {} }
    return parsed
  } catch {
    return { events: {} }
  }
}

function writeStore(store: SessionStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getEventSession(eventId: string): EventServerSessionEntry | undefined {
  return readStore().events[eventId]
}

export function setEventSession(eventId: string, patch: EventServerSessionEntry): void {
  const store = readStore()
  store.events[eventId] = { ...store.events[eventId], ...patch }
  writeStore(store)
}

export function clearEventSession(eventId: string): void {
  const store = readStore()
  delete store.events[eventId]
  writeStore(store)
}

/** 参加者登録だけ解除（招待トークン等は残す） */
export function clearEventParticipantSession(eventId: string): void {
  const store = readStore()
  const entry = store.events[eventId]
  if (!entry) return
  const {
    participantToken: _pt,
    participantId: _pi,
    displayName: _dn,
    costumesSubmitted: _cs,
    ...rest
  } = entry
  store.events[eventId] = rest
  writeStore(store)
}

/** 管理者トークンを保持している（代表者端末） */
export function hasEventAdminAccess(eventId: string): boolean {
  return Boolean(getEventSession(eventId)?.adminToken)
}

/** 招待 URL 経由で参加登録済み */
export function hasEventParticipantAccess(eventId: string): boolean {
  const session = getEventSession(eventId)
  return Boolean(session?.participantToken && session?.inviteToken)
}

/** 参加者のみ（代表者権限なし） */
export function isParticipantOnlySession(eventId: string): boolean {
  return hasEventParticipantAccess(eventId) && !hasEventAdminAccess(eventId)
}

/** 招待経由で関与している参加者端末（代表者ではない） */
export function isParticipantDeviceEvent(eventId: string): boolean {
  const session = getEventSession(eventId)
  return Boolean(session?.inviteToken && !session?.adminToken)
}
