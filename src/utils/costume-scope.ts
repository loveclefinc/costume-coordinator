import type { Costume, Event } from './storage'

/** イベント取り込み衣装の ID 一覧 */
export function collectEventImportedCostumeIds(events: Pick<Event, 'importedCostumes'>[]): Set<string> {
  const ids = new Set<string>()
  for (const event of events) {
    for (const costume of event.importedCostumes ?? []) {
      ids.add(costume.id)
    }
  }
  return ids
}

/** 自分の衣装ワードローブ（イベント提出分は含まない） */
export function isPersonalWardrobeCostume(
  costume: Pick<Costume, 'id' | 'sourceEventId'>,
  importedCostumeIds?: Set<string>,
): boolean {
  if (costume.sourceEventId) return false
  if (importedCostumeIds?.has(costume.id)) return false
  return true
}

/** 特定イベントの提出・取り込み衣装 */
export function isEventScopedCostume(
  costume: Pick<Costume, 'sourceEventId'>,
  eventId: string,
): boolean {
  return costume.sourceEventId === eventId
}

export function filterPersonalWardrobeCostumes(costumes: Costume[]): Costume[] {
  return costumes.filter((costume) => isPersonalWardrobeCostume(costume))
}

export function filterEventCostumes(costumes: Costume[], eventId: string): Costume[] {
  return costumes.filter((costume) => isEventScopedCostume(costume, eventId))
}

/** イベント詳細・組み合わせ用（イベント提出分があればそれだけ、なければ従来どおり個人衣装） */
export function resolveEventCostumeCatalog(
  personalCostumes: Costume[],
  eventCostumes: Costume[],
): Costume[] {
  return eventCostumes.length > 0 ? eventCostumes : personalCostumes
}

export function findCostumeById(
  costumeId: string,
  personalCostumes: Costume[],
  eventCostumes: Costume[],
): Costume | undefined {
  return (
    eventCostumes.find((costume) => costume.id === costumeId)
    ?? personalCostumes.find((costume) => costume.id === costumeId)
  )
}
