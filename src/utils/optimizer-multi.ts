import { Costume, EventThemePreferences, UsageHistory } from './storage'
import { isCostumeRecentlyUsed } from './costume-theme-match'
import { DEFAULT_RECENT_USAGE_EXCLUDE_DAYS } from './app-settings'

export interface OptimizationResult {
  participantId: string
  participantName: string
  costumeId: string
  costume: Costume
  score: number
  reason: string[]
}

export interface OptimizationProposal {
  proposalId: string
  assignments: OptimizationResult[]
  harmonyScore: number
  createdAt: Date
  reason: string
}

export interface OptimizationInput {
  participants: Array<{ id: string; name: string; preferences: string[] }>
  costumes: Costume[]
  usageHistory: UsageHistory[]
  themePreferences?: EventThemePreferences
  recentUsageExcludeDays?: number
}

/**
 * Calculate color match score against theme preferences
 * Returns 0-1 where 1 is perfect match
 */
function calculateColorThemeScore(costumeColors: string[], themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5

  for (const color of costumeColors) {
    if (themePrefs.colors1stChoice.includes(color)) return 1.0
  }

  for (const color of costumeColors) {
    if (themePrefs.colors2ndChoice.includes(color)) return 0.8
  }

  for (const color of costumeColors) {
    if (themePrefs.colors3rdChoice.includes(color)) return 0.6
  }

  return 0.3
}

/**
 * Calculate tone match score against theme preferences
 */
function calculateToneThemeScore(costumeTone: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5

  if (themePrefs.tones1stChoice.includes(costumeTone)) return 1.0
  if (themePrefs.tones2ndChoice.includes(costumeTone)) return 0.8
  if (themePrefs.tones3rdChoice.includes(costumeTone)) return 0.6

  return 0.3
}

/**
 * Calculate pattern match score against theme preferences
 */
function calculatePatternThemeScore(costumePattern: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5

  if (themePrefs.patterns1stChoice.includes(costumePattern)) return 1.0
  if (themePrefs.patterns2ndChoice.includes(costumePattern)) return 0.8
  if (themePrefs.patterns3rdChoice.includes(costumePattern)) return 0.6

  return 0.3
}

/**
 * Calculate preference score based on participant preferences
 */
function calculatePreferenceScore(costumeId: string, preferences: string[]): number {
  const index = preferences.indexOf(costumeId)
  if (index === -1) return 0
  return 1 - index * 0.1 // First choice: 1.0, second: 0.9, etc.
}

function calculateAssignmentScore(
  costume: Costume,
  participantPreferences: string[],
  themePreferences?: EventThemePreferences,
): number {
  const colorScore = calculateColorThemeScore(costume.colors, themePreferences)
  const toneScore = calculateToneThemeScore(costume.tone, themePreferences)
  const patternScore = calculatePatternThemeScore(costume.pattern, themePreferences)
  const preferenceScore = calculatePreferenceScore(costume.id, participantPreferences)

  const weights = {
    color: 0.3125,
    tone: 0.25,
    pattern: 0.1875,
    preference: 0.25,
  }

  return (
    colorScore * weights.color +
    toneScore * weights.tone +
    patternScore * weights.pattern +
    preferenceScore * weights.preference
  )
}

/**
 * Generate multiple costume assignment proposals
 */
export function generateMultipleProposals(input: OptimizationInput, proposalCount: number = 3): OptimizationProposal[] {
  const {
    participants,
    costumes,
    usageHistory,
    themePreferences,
    recentUsageExcludeDays = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
  } = input
  const proposals: OptimizationProposal[] = []
  const usedCostumesByProposal: Set<string>[] = []

  for (let proposalIndex = 0; proposalIndex < proposalCount; proposalIndex++) {
    const assignments: OptimizationResult[] = []
    const usedCostumes = new Set(usedCostumesByProposal[proposalIndex] || [])

    for (const participant of participants) {
      let bestCostume: Costume | null = null
      let bestScore = -1

      for (const costume of costumes) {
        // Skip if already used in this proposal
        if (usedCostumes.has(costume.id)) continue

        // Skip if already assigned to another participant in this proposal
        if (assignments.some(a => a.costumeId === costume.id)) continue

        if (isCostumeRecentlyUsed(costume.id, usageHistory, recentUsageExcludeDays)) continue

        const score = calculateAssignmentScore(
          costume,
          participant.preferences,
          themePreferences,
        )

        if (score > bestScore) {
          bestScore = score
          bestCostume = costume
        }
      }

      if (bestCostume) {
        usedCostumes.add(bestCostume.id)

        const reasons: string[] = []

        if (themePreferences) {
          const colorMatch = calculateColorThemeScore(bestCostume.colors, themePreferences)
          if (colorMatch >= 0.9) reasons.push('テーマ色第1希望')
          else if (colorMatch >= 0.7) reasons.push('テーマ色第2希望')
          else if (colorMatch >= 0.5) reasons.push('テーマ色第3希望')

          const toneMatch = calculateToneThemeScore(bestCostume.tone, themePreferences)
          if (toneMatch >= 0.9) reasons.push('テーマトーン第1希望')
          else if (toneMatch >= 0.7) reasons.push('テーマトーン第2希望')

          const patternMatch = calculatePatternThemeScore(bestCostume.pattern, themePreferences)
          if (patternMatch >= 0.9) reasons.push('テーマ柄第1希望')
          else if (patternMatch >= 0.7) reasons.push('テーマ柄第2希望')
        }

        const prefIndex = participant.preferences.indexOf(bestCostume.id)
        if (prefIndex !== -1) {
          reasons.push(`希望順位: ${prefIndex + 1}位`)
        }

        if (recentUsageExcludeDays > 0) {
          reasons.push(`直近${recentUsageExcludeDays}日間未使用`)
        }

        reasons.push(`スコア: ${(bestScore * 100).toFixed(1)}`)

        assignments.push({
          participantId: participant.id,
          participantName: participant.name,
          costumeId: bestCostume.id,
          costume: bestCostume,
          score: bestScore,
          reason: reasons,
        })
      }
    }

    if (assignments.length > 0) {
      const harmonyScore = calculateHarmonyScore(assignments)
      const proposalReason = `提案 ${proposalIndex + 1}: 調和スコア ${(harmonyScore * 100).toFixed(1)}`

      proposals.push({
        proposalId: `proposal-${proposalIndex}-${Date.now()}`,
        assignments,
        harmonyScore,
        createdAt: new Date(),
        reason: proposalReason,
      })

      usedCostumesByProposal[proposalIndex] = usedCostumes
    }
  }

  return proposals.sort((a, b) => b.harmonyScore - a.harmonyScore)
}

/**
 * Calculate overall harmony score for the assignment
 */
export function calculateHarmonyScore(results: OptimizationResult[]): number {
  if (results.length === 0) return 0

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  return avgScore
}
