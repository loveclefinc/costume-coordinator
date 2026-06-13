import { fetchEventPublic, EventApiError } from '../event-server/client'
import { isEventServerEnabled } from '../event-server/config'
import {
  clearEventSession,
  getEventSession,
  isParticipantDeviceEvent,
} from '../event-server/session'
import { notifyEventsChanged } from './ensure-local-participant-event'
import { storage } from './storage'

/** サーバーで削除されたイベントを参加者端末のローカルから除去 */
export async function pruneRemovedParticipantEvents(): Promise<number> {
  if (!isEventServerEnabled()) return 0

  await storage.init()
  const events = await storage.getAllEvents()
  let removed = 0

  for (const event of events) {
    if (!isParticipantDeviceEvent(event.id)) continue
    const inviteToken = getEventSession(event.id)?.inviteToken
    if (!inviteToken) continue

    try {
      await fetchEventPublic(event.id, inviteToken)
    } catch (error) {
      if (error instanceof EventApiError && (error.status === 404 || error.status === 410)) {
        await storage.deleteEvent(event.id)
        clearEventSession(event.id)
        removed++
      }
    }
  }

  if (removed > 0) {
    notifyEventsChanged()
  }

  return removed
}
