const STORAGE_KEY = 'costume-coordinator-event-server-session'

export type EventServerSessionEntry = {
  adminToken?: string
  inviteToken?: string
  participantToken?: string
  participantId?: string
  displayName?: string
  expiresAt?: number
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
  const { participantToken: _pt, participantId: _pi, displayName: _dn, ...rest } = entry
  store.events[eventId] = rest
  writeStore(store)
}
