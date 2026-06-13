import type { Costume } from './storage'

/** 自分の衣装ワードローブ（イベント提出分は含まない） */
export function isPersonalWardrobeCostume(costume: Pick<Costume, 'sourceEventId'>): boolean {
  return !costume.sourceEventId
}

/** 特定イベントの提出・取り込み衣装 */
export function isEventScopedCostume(
  costume: Pick<Costume, 'sourceEventId'>,
  eventId: string,
): boolean {
  return costume.sourceEventId === eventId
}

export function filterPersonalWardrobeCostumes(costumes: Costume[]): Costume[] {
  return costumes.filter(isPersonalWardrobeCostume)
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
