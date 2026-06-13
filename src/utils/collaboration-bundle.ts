/**
 * サーバーなしで複数端末をつなぐための交換フォーマット。
 * 代表者 ↔ 参加者 は JSON ファイル（LINE 等）でやり取りする。
 */
import type { Costume, Event } from './storage'
import { normalizeCostume, normalizeCostumeList } from './costume-normalize'
import {
  countImportCostumeChanges,
  mergeEventImportedCostumes,
} from './event-imported-costumes'

export const COLLABORATION_BUNDLE_VERSION = 1

export type EventInviteBundle = {
  type: 'event-invite'
  version: typeof COLLABORATION_BUNDLE_VERSION
  exportedAt: number
  event: Event
  message?: string
}

export type ParticipantSubmissionBundle = {
  type: 'participant-submission'
  version: typeof COLLABORATION_BUNDLE_VERSION
  exportedAt: number
  eventId: string
  eventName: string
  participantName: string
  costumes: Costume[]
  /** 希望順（衣装 ID） */
  preferences: string[]
}

export type CollaborationBundle = EventInviteBundle | ParticipantSubmissionBundle

export function createEventInviteBundle(event: Event, message?: string): EventInviteBundle {
  return {
    type: 'event-invite',
    version: COLLABORATION_BUNDLE_VERSION,
    exportedAt: Date.now(),
    event: { ...event },
    message,
  }
}

export function createParticipantSubmissionBundle(params: {
  event: Event
  participantName: string
  costumes: Costume[]
  preferences: string[]
}): ParticipantSubmissionBundle {
  return {
    type: 'participant-submission',
    version: COLLABORATION_BUNDLE_VERSION,
    exportedAt: Date.now(),
    eventId: params.event.id,
    eventName: params.event.name,
    participantName: params.participantName.trim(),
    costumes: params.costumes.map((c) => normalizeCostume(c)),
    preferences: params.preferences.filter(Boolean),
  }
}

export function parseCollaborationBundle(json: string): CollaborationBundle {
  const raw = JSON.parse(json) as CollaborationBundle
  if (!raw || typeof raw !== 'object' || !('type' in raw)) {
    throw new Error('無効なファイル形式です')
  }
  if (raw.version !== COLLABORATION_BUNDLE_VERSION) {
    throw new Error(`未対応のバージョンです: ${String(raw.version)}`)
  }
  if (raw.type === 'event-invite') {
    if (!raw.event?.id) throw new Error('イベント情報がありません')
    return raw
  }
  if (raw.type === 'participant-submission') {
    if (!raw.eventId || !raw.participantName) {
      throw new Error('参加者情報がありません')
    }
    return raw
  }
  throw new Error('不明なファイル種別です')
}

export async function readCollaborationBundleFromFile(file: File): Promise<CollaborationBundle> {
  const text = await file.text()
  return parseCollaborationBundle(text)
}

export function downloadCollaborationBundle(bundle: CollaborationBundle, filename: string): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export type ImportEventInviteResult = {
  eventId: string
  created: boolean
}

export type ImportParticipantSubmissionResult = {
  eventId: string
  participantName: string
  costumesAdded: number
  costumesUpdated: number
  participantAdded: boolean
}

export async function importEventInvite(
  bundle: EventInviteBundle,
  deps: {
    getEvent: (id: string) => Promise<Event | undefined>
    addEvent: (event: Event) => Promise<unknown>
    updateEvent: (event: Event) => Promise<unknown>
  },
): Promise<ImportEventInviteResult> {
  const event = normalizeEventFromBundle(bundle.event)
  const existing = await deps.getEvent(event.id)

  if (existing) {
    await deps.updateEvent({
      ...existing,
      name: event.name,
      date: event.date,
      description: event.description,
      themePreferences: event.themePreferences,
      participants: event.participants ?? existing.participants,
      updatedAt: Date.now(),
    })
    return { eventId: event.id, created: false }
  }

  await deps.addEvent(event)
  return { eventId: event.id, created: true }
}

export async function importParticipantSubmission(
  bundle: ParticipantSubmissionBundle,
  deps: {
    getEvent: (id: string) => Promise<Event | undefined>
    updateEvent: (event: Event) => Promise<unknown>
  },
): Promise<ImportParticipantSubmissionResult> {
  const event = await deps.getEvent(bundle.eventId)
  if (!event) {
    throw new Error(
      `イベント「${bundle.eventName}」がこの端末にありません。先に参加用ファイル（イベント招待）を取り込んでください。`,
    )
  }

  const normalized = normalizeCostumeList(bundle.costumes).map((costume) =>
    normalizeCostume({
      ...costume,
      sourceParticipantName: bundle.participantName,
      updatedAt: Date.now(),
    }),
  )

  const importedCostumes = mergeEventImportedCostumes(event.importedCostumes, normalized)
  const { added: costumesAdded, updated: costumesUpdated } = countImportCostumeChanges(
    event.importedCostumes,
    normalized,
  )

  const participants = [...event.participants]
  let participantAdded = false
  if (!participants.includes(bundle.participantName)) {
    participants.push(bundle.participantName)
    participantAdded = true
  }

  const prefs = { ...(event.participantPreferences ?? {}) }
  if (bundle.preferences.length > 0) {
    prefs[bundle.participantName] = bundle.preferences
  }

  await deps.updateEvent({
    ...event,
    participants,
    participantPreferences: prefs,
    importedCostumes,
    updatedAt: Date.now(),
  })

  return {
    eventId: bundle.eventId,
    participantName: bundle.participantName,
    costumesAdded,
    costumesUpdated,
    participantAdded,
  }
}

function normalizeEventFromBundle(event: Event): Event {
  const now = Date.now()
  return {
    id: event.id,
    name: event.name ?? '',
    date: event.date ?? '',
    description: event.description ?? '',
    participants: Array.isArray(event.participants) ? event.participants : [],
    costumes: event.costumes && typeof event.costumes === 'object' ? event.costumes : {},
    participantPreferences:
      event.participantPreferences && typeof event.participantPreferences === 'object'
        ? event.participantPreferences
        : {},
    themePreferences: event.themePreferences,
    createdAt: typeof event.createdAt === 'number' ? event.createdAt : now,
    updatedAt: now,
  }
}
