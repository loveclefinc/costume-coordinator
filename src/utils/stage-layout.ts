export interface StageAssignmentLike {
  participantId: string
}

export const normalizeStageBreaks = (
  itemCount: number,
  breaks?: number[],
  legacyBreak?: number,
): number[] => {
  const source = breaks ?? (typeof legacyBreak === 'number' ? [legacyBreak] : [])
  return [...new Set(source)]
    .filter((index) => Number.isInteger(index) && index > 0 && index < itemCount)
    .sort((a, b) => a - b)
}

export const orderStageAssignments = <T extends StageAssignmentLike>(
  items: T[],
  participantOrder?: string[],
): T[] => {
  if (!participantOrder?.length) return items
  const positions = new Map(participantOrder.map((id, index) => [id, index]))
  return [...items].sort((a, b) => {
    const aPosition = positions.get(a.participantId) ?? Number.MAX_SAFE_INTEGER
    const bPosition = positions.get(b.participantId) ?? Number.MAX_SAFE_INTEGER
    return aPosition - bPosition
  })
}

export const splitStageRows = <T,>(items: T[], breaks: number[]): T[][] => {
  const rows: T[][] = []
  let start = 0
  for (const end of normalizeStageBreaks(items.length, breaks)) {
    rows.push(items.slice(start, end))
    start = end
  }
  rows.push(items.slice(start))
  return rows
}

export const moveStageBreak = (
  breaks: number[],
  breakIndex: number,
  direction: -1 | 1,
  itemCount: number,
): number[] => {
  const normalized = normalizeStageBreaks(itemCount, breaks)
  if (!normalized.includes(breakIndex)) return normalized

  const target = breakIndex + direction
  if (target <= 0 || target >= itemCount || normalized.includes(target)) return normalized

  return normalized
    .map((index) => (index === breakIndex ? target : index))
    .sort((a, b) => a - b)
}

export const findStageBreakToAdd = (breaks: number[], itemCount: number): number | null => {
  if (itemCount < 2) return null

  const normalized = normalizeStageBreaks(itemCount, breaks)
  const boundaries = [0, ...normalized, itemCount]
  let bestBreak: number | null = null
  let largestRowSize = 1

  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index]
    const end = boundaries[index + 1]
    const rowSize = end - start
    if (rowSize <= largestRowSize) continue

    largestRowSize = rowSize
    bestBreak = start + Math.ceil(rowSize / 2)
  }

  return bestBreak
}
