export const MAX_PUBLISHED_ASSIGNMENT_REASONS = 3
export const MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH = 120

const FALLBACK_ASSIGNMENT_REASON = 'テーマとグループ全体の調和をもとに選びました'

/**
 * 決定的最適化エンジンの詳細ログから、結果画面向けの短い理由だけを残す。
 * モデルによる文章生成は行わず、同じ入力には常に同じ結果を返す。
 */
export function compactAssignmentReasons(reasons: unknown): string[] {
  if (!Array.isArray(reasons)) return [FALLBACK_ASSIGNMENT_REASON]

  const compacted: string[] = []
  const seen = new Set<string>()

  for (const value of reasons) {
    if (typeof value !== 'string') continue
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized || /^スコア\s*[:：]/.test(normalized)) continue

    const shortened = normalized.slice(0, MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH)
    if (seen.has(shortened)) continue
    seen.add(shortened)
    compacted.push(shortened)

    if (compacted.length >= MAX_PUBLISHED_ASSIGNMENT_REASONS) break
  }

  return compacted.length > 0 ? compacted : [FALLBACK_ASSIGNMENT_REASON]
}

export function buildAssignmentReasonMap(
  assignments: Array<{ participantName: string; reason?: unknown }>,
): Record<string, string[]> {
  return Object.fromEntries(
    assignments
      .filter((assignment) => assignment.participantName.trim().length > 0)
      .map((assignment) => [
        assignment.participantName.trim(),
        compactAssignmentReasons(assignment.reason),
      ]),
  )
}
