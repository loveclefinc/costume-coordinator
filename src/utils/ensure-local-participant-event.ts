import type { EventPublicInfo } from '../../shared/event-api-types'
import { storage, type Event } from './storage'

export const EVENTS_CHANGED_EVENT = 'costume-coordinator:events-changed'

export function notifyEventsChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENTS_CHANGED_EVENT))
}

/**
 * 招待 URL から参加した参加者の端末に、イベントを IndexedDB へ保存する。
 * オンライン提出のみ行いローカルにイベントが無い場合、一覧に表示されない問題を解消する。
 */
export async function ensureLocalParticipantEvent(
  info: EventPublicInfo,
  participantName?: string,
): Promise<Event> {
  await storage.init()

  const existing = await storage.getEvent(info.id)
  const participants = new Set(existing?.participants ?? [])
  if (participantName?.trim()) {
    participants.add(participantName.trim())
  }

  const event: Event = {
    id: info.id,
    name: info.name,
    date: info.date,
    description: info.description ?? '',
    participants: [...participants],
    costumes: existing?.costumes ?? {},
    participantPreferences: existing?.participantPreferences,
    themePreferences: info.themePreferences ?? existing?.themePreferences,
    hostedOnServer: true,
    serverExpiresAt: info.expiresAt,
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }

  if (existing) {
    await storage.updateEvent(event)
  } else {
    await storage.addEvent(event)
  }

  notifyEventsChanged()
  return event
}
