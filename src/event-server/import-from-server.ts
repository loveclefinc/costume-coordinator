import type { EventAdminSnapshot } from '../../shared/event-api-types'
import { normalizeCostume } from '../utils/costume-normalize'
import {
  countImportCostumeChanges,
  mergeEventImportedCostumes,
} from '../utils/event-imported-costumes'
import type { Costume, Event } from '../utils/storage'
import { storage } from '../utils/storage'

export type ImportAdminSnapshotResult = {
  costumesAdded: number
  costumesUpdated: number
  participantsAdded: number
  importedCostumes: Costume[]
}

/**
 * 代表者: サーバー上の全提出をイベントレコードへ取り込む（衣装ワードローブには保存しない）。
 * 画像は API の viewUrl（HTTPS）をそのまま image に設定。
 */
export async function importAdminSnapshotToLocal(
  snapshot: EventAdminSnapshot,
  localEventId: string,
): Promise<ImportAdminSnapshotResult> {
  await storage.init()

  let participantsAdded = 0
  const incomingCostumes: Costume[] = []

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

    incomingCostumes.push(
      normalizeCostume({
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
        suitLapel: sc.suitLapel,
        sourceParticipantName: sc.participantName,
        createdAt: sc.createdAt,
        updatedAt: sc.updatedAt,
      }),
    )

    if (sc.preferences.length > 0) {
      prefs[sc.participantName] = sc.preferences
    }
  }

  const importedCostumes = mergeEventImportedCostumes(
    existingEvent?.importedCostumes,
    incomingCostumes,
  )
  const { added: costumesAdded, updated: costumesUpdated } = countImportCostumeChanges(
    existingEvent?.importedCostumes,
    incomingCostumes,
  )

  const eventPatch: Partial<Event> = {
    name: snapshot.event.name,
    date: snapshot.event.date,
    description: snapshot.event.description,
    participants: [...participantNames],
    participantPreferences: prefs,
    themePreferences: snapshot.event.themePreferences,
    hostedOnServer: true,
    serverExpiresAt: snapshot.event.expiresAt,
    importedCostumes,
    updatedAt: Date.now(),
  }

  if (existingEvent) {
    await storage.updateEvent({
      ...existingEvent,
      ...eventPatch,
    } as Event)
  }

  return { costumesAdded, costumesUpdated, participantsAdded, importedCostumes }
}
