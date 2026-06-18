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
