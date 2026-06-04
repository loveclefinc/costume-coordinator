import { Costume, UsageHistory, EventThemePreferences } from './storage'
import {
  enrichCostumeColors,
  normalizePattern,
  colorNamesAreSimilar,
  themeColorNamesFrom,
} from './theme-colors'

export interface OptimizationResult {
  participantId: string
  participantName: string
  costumeId: string
  costume: Costume
  score: number
  reason: string[]
}

export interface OptimizationInput {
  participants: Array<{ id: string; name: string; preferences: string[] }>
  costumes: Costume[]
  usageHistory: UsageHistory[]
  themePreferences?: EventThemePreferences
}

/**
 * Calculate color match score against theme preferences
 * Returns 0-1 where 1 is perfect match
 */
function calculateColorThemeScore(costumeColors: string[], themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5 // Neutral if no theme preferences

  const colors = enrichCostumeColors(costumeColors)

  for (const color of colors) {
    if (themePrefs.colors1stChoice.includes(color)) return 1.0
  }

  for (const color of colors) {
    if (themePrefs.colors2ndChoice.includes(color)) return 0.8
  }

  for (const color of colors) {
    if (themePrefs.colors3rdChoice.includes(color)) return 0.6
  }

  return 0.3
}

/**
 * Calculate tone match score against theme preferences
 */
function calculateToneThemeScore(costumeTone: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5

  // Check 1st choice tones
  if (themePrefs.tones1stChoice.includes(costumeTone)) return 1.0

  // Check 2nd choice tones
  if (themePrefs.tones2ndChoice.includes(costumeTone)) return 0.8

  // Check 3rd choice tones
  if (themePrefs.tones3rdChoice.includes(costumeTone)) return 0.6

  return 0.3
}

/**
 * Calculate pattern match score against theme preferences
 */
function calculatePatternThemeScore(costumePattern: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5

  const pattern = normalizePattern(costumePattern)

  if (themePrefs.patterns1stChoice.map(normalizePattern).includes(pattern)) return 1.0
  if (themePrefs.patterns2ndChoice.map(normalizePattern).includes(pattern)) return 0.8
  if (themePrefs.patterns3rdChoice.map(normalizePattern).includes(pattern)) return 0.6

  return 0.3
}

/**
 * Calculate color compatibility score between two costumes
 * Returns 0-1 where 1 is perfect compatibility
 */
function calculateColorCompatibility(colors1: string[], colors2: string[], avoidSimilar: boolean = false): number {
  if (colors1.length === 0 || colors2.length === 0) return 1

  const commonColors = colors1.filter(c => colors2.includes(c))
  if (commonColors.length > 0) {
    return avoidSimilar ? 0.2 : 0.5 // Stronger penalty if avoidSimilarColors is enabled
  }

  return 1
}

/**
 * Calculate tone compatibility score
 */
function calculateToneCompatibility(tone1: string, tone2: string): number {
  if (tone1 === tone2) return 0.7 // Same tone is less ideal
  return 1 // Different tones are better
}

/**
 * Calculate pattern compatibility score
 */
function calculatePatternCompatibility(pattern1: string, pattern2: string): number {
  const p1 = normalizePattern(pattern1)
  const p2 = normalizePattern(pattern2)
  if (p1 === p2 && p1 !== 'plain') return 0.5
  return 1
}

/**
 * 色味の統一方針: unified は同系色を、varied は異なる色を優先
 */
function calculateColorUnificationScore(
  costume: Costume,
  assigned: Costume[],
  themePrefs?: EventThemePreferences,
): number {
  if (!themePrefs || assigned.length === 0) return 1

  const names = themeColorNamesFrom(costume.colors)
  if (names.length === 0) return 1

  const similarToAny = assigned.some((c) => colorNamesAreSimilar(costume.colors, c.colors))

  if (themePrefs.colorUnification === 'unified') {
    return similarToAny ? 1.2 : 0.75
  }

  return similarToAny ? 0.7 : 1.15
}

/**
 * Calculate usage history penalty (prefer less recently used)
 */
function calculateUsagePenalty(costumeId: string, usageHistory: UsageHistory[], excludeDays: number = 30): number {
  const recentUsages = usageHistory.filter(h => {
    const daysSinceUse = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
    return daysSinceUse <= excludeDays && h.costumeId === costumeId
  })

  return Math.max(0, 1 - recentUsages.length * 0.1)
}

/**
 * Calculate preference score for a costume
 */
function calculatePreferenceScore(costumeId: string, preferences: string[]): number {
  const preferenceIndex = preferences.indexOf(costumeId)
  if (preferenceIndex === -1) return 0.5 // Not in preferences

  // Higher score for higher preference ranking
  return 1 - (preferenceIndex / Math.max(preferences.length, 5))
}

/**
 * Main optimization algorithm - prioritizes event theme preferences
 */
export function optimizeCostumeAssignments(input: OptimizationInput): { assignments: OptimizationResult[]; harmonyScore: number } {
  const { participants, costumes, usageHistory, themePreferences } = input

  if (costumes.length === 0) {
    return { assignments: [], harmonyScore: 0 }
  }

  const results: OptimizationResult[] = []
  const assignedCostumes = new Set<string>()

  // Sort participants by preference strength (those with strong preferences first)
  const sortedParticipants = [...participants].sort((a, b) => {
    return b.preferences.length - a.preferences.length
  })

  for (const participant of sortedParticipants) {
    let bestCostume: Costume | null = null
    let bestScore = -Infinity
    const reasons: string[] = []

    for (const costume of costumes) {
      // Skip already assigned costumes
      if (assignedCostumes.has(costume.id)) continue

      let score = 0

      // PRIORITY 1: Event Theme Preferences (50%)
      // This is the primary optimization criterion
      const colorThemeScore = calculateColorThemeScore(costume.colors, themePreferences)
      const toneThemeScore = calculateToneThemeScore(costume.tone, themePreferences)
      const patternThemeScore = calculatePatternThemeScore(costume.pattern, themePreferences)
      const themeScore = (colorThemeScore + toneThemeScore + patternThemeScore) / 3
      score += themeScore * 0.5

      // PRIORITY 2: Participant Preference (25%)
      const prefScore = calculatePreferenceScore(costume.id, participant.preferences)
      score += prefScore * 0.25

      // PRIORITY 3: Usage history penalty (15%)
      const excludeDays = themePreferences?.recentUsageExcludeDays || 30
      const usagePenalty = calculateUsagePenalty(costume.id, usageHistory, excludeDays)
      score += usagePenalty * 0.15

      // PRIORITY 4: Compatibility + 色味統一方針 (10%)
      let compatibilityScore = 1
      for (const result of results) {
        const avoidSimilar = themePreferences?.avoidSimilarColors || false
        const colorCompat = calculateColorCompatibility(
          enrichCostumeColors(costume.colors),
          enrichCostumeColors(result.costume.colors),
          avoidSimilar,
        )
        const toneCompat = calculateToneCompatibility(costume.tone, result.costume.tone)
        const patternCompat = calculatePatternCompatibility(costume.pattern, result.costume.pattern)
        compatibilityScore *= (colorCompat + toneCompat + patternCompat) / 3
      }
      const unificationScore = calculateColorUnificationScore(
        costume,
        results.map((r) => r.costume),
        themePreferences,
      )
      compatibilityScore *= unificationScore
      score += compatibilityScore * 0.1

      if (score > bestScore) {
        bestScore = score
        bestCostume = costume
      }
    }

    if (bestCostume) {
      assignedCostumes.add(bestCostume.id)

      // Build reason explanation
      if (themePreferences?.colorUnification === 'unified') {
        reasons.push('色味統一（同系色）')
      } else if (themePreferences?.colorUnification === 'varied') {
        reasons.push('色味バラけ')
      }

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

      const excludeDays = themePreferences?.recentUsageExcludeDays || 30
      const recentUsages = usageHistory.filter(h => {
        const daysSinceUse = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
        return daysSinceUse <= excludeDays && h.costumeId === bestCostume!.id
      })
      if (recentUsages.length === 0) {
        reasons.push(`直近${excludeDays}日間未使用`)
      }

      reasons.push(`スコア: ${(bestScore * 100).toFixed(1)}`)

      results.push({
        participantId: participant.id,
        participantName: participant.name,
        costumeId: bestCostume.id,
        costume: bestCostume,
        score: bestScore,
        reason: reasons,
      })
    }
  }

  const harmonyScore = calculateHarmonyScore(results)
  return { assignments: results, harmonyScore }
}

/**
 * Calculate overall harmony score for the assignment
 */
export function calculateHarmonyScore(results: OptimizationResult[]): number {
  if (results.length === 0) return 0

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  return avgScore
}
