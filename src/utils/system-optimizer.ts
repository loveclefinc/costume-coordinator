import {
  optimizeCostumeAssignments,
  type OptimizationInput,
  type OptimizationResult,
} from './optimizer'

export interface SystemOptimizationAlternative {
  id: string
  label: string
  assignments: OptimizationResult[]
  harmonyScore: number
}

export interface SystemOptimizationOutcome {
  selected: OptimizationResult[]
  harmonyScore: number
  alternatives: SystemOptimizationAlternative[]
}

function assignmentFingerprint(assignments: OptimizationResult[]): string {
  return assignments
    .map((row) => `${row.participantId}:${row.costumeId}`)
    .sort()
    .join('|')
}

/**
 * テーマ・希望・使用履歴から最適な1案を選び、参考用の別案も生成する。
 * 採用するのは調和スコア最高の primary のみ（代表者の手動決定は不要）。
 */
export function runSystemOptimization(
  input: OptimizationInput,
  alternativeCount: number = 3,
): SystemOptimizationOutcome {
  const primary = optimizeCostumeAssignments(input)
  const alternatives: SystemOptimizationAlternative[] = []
  const seen = new Set<string>()

  if (primary.assignments.length > 0) {
    seen.add(assignmentFingerprint(primary.assignments))
  }

  const participantCount = input.participants.length
  if (participantCount > 0 && alternativeCount > 1) {
    for (let rotate = 1; rotate < participantCount + alternativeCount; rotate += 1) {
      if (alternatives.length >= alternativeCount - 1) break

      const rotated = [
        ...input.participants.slice(rotate % participantCount),
        ...input.participants.slice(0, rotate % participantCount),
      ]
      const variant = optimizeCostumeAssignments({ ...input, participants: rotated })
      if (variant.assignments.length === 0) continue

      const fingerprint = assignmentFingerprint(variant.assignments)
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)

      alternatives.push({
        id: `alt-${rotate}`,
        label: `参考案 ${alternatives.length + 1}`,
        assignments: variant.assignments,
        harmonyScore: variant.harmonyScore,
      })
    }
  }

  return {
    selected: primary.assignments,
    harmonyScore: primary.harmonyScore,
    alternatives,
  }
}
