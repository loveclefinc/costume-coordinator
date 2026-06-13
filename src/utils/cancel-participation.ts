import { clearEventParticipantSession } from '../event-server/session'
import { notifyEventsChanged } from './ensure-local-participant-event'
import { storage } from './storage'

/** 参加者端末: 参加登録を解除し、ローカルのイベントコピーを削除（招待URLから再参加可能） */
export async function cancelLocalParticipation(eventId: string): Promise<void> {
  await storage.init()
  clearEventParticipantSession(eventId)
  const existing = await storage.getEvent(eventId)
  if (existing) {
    await storage.deleteEvent(eventId)
    notifyEventsChanged()
  }
}
