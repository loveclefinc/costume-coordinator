import type { Costume } from './storage'

/** イベント取り込み衣装を ID でマージ（イベントレコード内のみ保持） */
export function mergeEventImportedCostumes(
  existing: Costume[] | undefined,
  incoming: Costume[],
): Costume[] {
  const map = new Map((existing ?? []).map((costume) => [costume.id, costume]))
  for (const costume of incoming) {
    map.set(costume.id, costume)
  }
  return [...map.values()]
}

export function countImportCostumeChanges(
  existing: Costume[] | undefined,
  incoming: Costume[],
): { added: number; updated: number } {
  const existingIds = new Set((existing ?? []).map((costume) => costume.id))
  let added = 0
  let updated = 0
  for (const costume of incoming) {
    if (existingIds.has(costume.id)) {
      updated++
    } else {
      added++
    }
  }
  return { added, updated }
}
