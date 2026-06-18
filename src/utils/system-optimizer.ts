import {
  optimizeCostumeAssignments,
  type OptimizationInput,
  type OptimizationResult,
} from './optimizer'
import { assignmentHue } from './assignment-display-order'
import { normalizeStageBreaks, orderStageAssignments, splitStageRows } from './stage-layout'
import { isSpreadColorPolicy } from './theme-color-policy'

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

function stageVisualScore(assignments: OptimizationResult[], input: OptimizationInput): number {
  if (!input.stageParticipantOrder?.length || assignments.length < 2) return 1

  const ordered = orderStageAssignments(assignments, input.stageParticipantOrder)
  const breaks = normalizeStageBreaks(ordered.length, input.stageRowBreakIndices)
  const rows = splitStageRows(ordered, breaks)
  const spreadColors = isSpreadColorPolicy(input.themePreferences?.colorUnification)
  const rowScores = rows.flatMap((row) => {
    if (row.length < 2) return []
    const differences = row.slice(1).map((item, index) => {
      const distance = Math.abs(
        assignmentHue({ participantName: item.participantName, colors: item.costume.colors }) -
        assignmentHue({ participantName: row[index].participantName, colors: row[index].costume.colors }),
      ) % 360
      return Math.min(distance, 360 - distance) / 180
    })
    const averageDifference = differences.reduce((sum, value) => sum + value, 0) / differences.length
    const variation = differences.reduce((sum, value) => sum + Math.abs(value - averageDifference), 0) / differences.length
    const regularity = Math.max(0, 1 - variation)
    return [spreadColors
      ? (averageDifference * 0.55) + (regularity * 0.45)
      : ((1 - averageDifference) * 0.7) + (regularity * 0.3)]
  })

  if (rowScores.length === 0) return 1
  return rowScores.reduce((sum, value) => sum + value, 0) / rowScores.length
}

function rankedHarmonyScore(assignments: OptimizationResult[], baseScore: number, input: OptimizationInput): number {
  if (!input.stageParticipantOrder?.length) return baseScore
  return (baseScore * 0.75) + (stageVisualScore(assignments, input) * 0.25)
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
  const candidates: Array<{ assignments: OptimizationResult[]; harmonyScore: number }> = []
  const seen = new Set<string>()

  if (primary.assignments.length > 0) {
    seen.add(assignmentFingerprint(primary.assignments))
    candidates.push(primary)
  }

  const participantCount = input.participants.length
  if (participantCount > 0 && alternativeCount > 1) {
    for (let rotate = 1; rotate < participantCount + alternativeCount; rotate += 1) {
      if (candidates.length >= alternativeCount) break

      const rotated = [
        ...input.participants.slice(rotate % participantCount),
        ...input.participants.slice(0, rotate % participantCount),
      ]
      const variant = optimizeCostumeAssignments({ ...input, participants: rotated })
      if (variant.assignments.length === 0) continue

      const fingerprint = assignmentFingerprint(variant.assignments)
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)

      candidates.push(variant)
    }
  }

  const ranked = candidates
    .map((candidate) => ({
      ...candidate,
      harmonyScore: rankedHarmonyScore(candidate.assignments, candidate.harmonyScore, input),
    }))
  if (input.stageParticipantOrder?.length) {
    ranked.sort((a, b) => b.harmonyScore - a.harmonyScore)
  }
  const selected = ranked[0] ?? primary
  const alternatives = ranked.slice(1, alternativeCount).map((candidate, index) => ({
    id: `alt-${index + 1}`,
    label: `参考案 ${index + 1}`,
    assignments: candidate.assignments,
    harmonyScore: candidate.harmonyScore,
  }))

  return {
    selected: selected.assignments,
    harmonyScore: selected.harmonyScore,
    alternatives,
  }
}
