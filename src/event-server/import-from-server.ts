import type { EventAdminSnapshot } from '../../shared/event-api-types'
import { normalizeCostume } from '../utils/costume-normalize'
import type { Costume, Event } from '../utils/storage'
import { storage } from '../utils/storage'

/**
 * 代表者: サーバー上の全提出を IndexedDB に取り込み。全員提出済みなら最適化も自動実行。
 * 画像は API の viewUrl（HTTPS）をそのまま image に設定。
 */
export async function importAdminSnapshotToLocal(
  snapshot: EventAdminSnapshot,
  localEventId: string,
): Promise<{ costumesAdded: number; costumesUpdated: number; participantsAdded: number }> {
  await storage.init()

  let costumesAdded = 0
  let costumesUpdated = 0
  let participantsAdded = 0

  const existingEvent = await storage.getEvent(localEventId)
  const participantNames = new Set(existingEvent?.participants ?? [])
  const prefs: Record<string, string[]> = { ...(existingEvent?.participantPreferences ?? {}) }

  for (const p of snapshot.participants) {
    if (!participantNames.has(p.displayName)) {
      participantNames.add(p.displayName)
      participantsAdded++
    }
  }

  for (const sc of snapshot.costumes) {
    const primaryPhoto = sc.photos.sort((a, b) => a.sortOrder - b.sortOrder)[0]
    const image = primaryPhoto?.viewUrl ?? ''

    const costume: Costume = normalizeCostume({
      id: sc.id,
      name: sc.name,
      image,
      colors: sc.colors,
      tone: sc.tone,
      pattern: sc.pattern,
      season: sc.season,
      type: sc.type,
      silhouette: sc.silhouette,
      suitStyle: sc.suitStyle,
      suitBreasting: sc.suitBreasting,
      createdAt: sc.createdAt,
      updatedAt: sc.updatedAt,
    })

    const existing = await storage.getCostume(costume.id)
    if (existing) {
      await storage.updateCostume(costume)
      costumesUpdated++
    } else {
      await storage.addCostume(costume)
      costumesAdded++
    }

    if (sc.preferences.length > 0) {
      prefs[sc.participantName] = sc.preferences
    }
  }

  const eventPatch: Partial<Event> = {
    name: snapshot.event.name,
    date: snapshot.event.date,
    description: snapshot.event.description,
    participants: [...participantNames],
    participantPreferences: prefs,
    themePreferences: snapshot.event.themePreferences,
    hostedOnServer: true,
    serverExpiresAt: snapshot.event.expiresAt,
    updatedAt: Date.now(),
  }

  if (existingEvent) {
    await storage.updateEvent({
      ...existingEvent,
      ...eventPatch,
    } as Event)
  }

  return { costumesAdded, costumesUpdated, participantsAdded }
}
