import { Costume, UsageHistory, EventThemePreferences } from './storage'
import {
  enrichCostumeColors,
  normalizePattern,
  colorNamesAreSimilar,
  themeColorNamesFrom,
} from './theme-colors'
import {
  calculateColorThemeScore,
  calculateToneThemeScore,
  calculatePatternThemeScore,
  calculateSilhouetteThemeScore,
  calculateSuitStyleThemeScore,
  calculateSuitBreastingThemeScore,
  calculateCombinedThemeScore,
  isCostumeRecentlyUsed,
} from './costume-theme-match'
import {
  effectiveAvoidSimilarColors,
  isSpreadColorPolicy,
  migrateColorUnificationPolicy,
} from './theme-color-policy'
import { DEFAULT_RECENT_USAGE_EXCLUDE_DAYS } from './app-settings'

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
  recentUsageExcludeDays?: number
  /** 再提案時に使う、客席から見たステージ順 */
  stageParticipantOrder?: string[]
  /** ステージ順上の列区切り */
  stageRowBreakIndices?: number[]
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

  if (!isSpreadColorPolicy(themePrefs.colorUnification)) {
    return similarToAny ? 1.2 : 0.75
  }

  return similarToAny ? 0.7 : 1.15
}

/** 色味バラけ時は同じシルエットでまとまりを出す */
function calculateSilhouetteUnificationScore(
  costume: Costume,
  assigned: Costume[],
  themePrefs?: EventThemePreferences,
): number {
  if (!themePrefs || assigned.length === 0 || costume.type !== 'dress' || !costume.silhouette) {
    return 1
  }

  const sameSilhouette = assigned.some(
    (c) => c.type === 'dress' && c.silhouette && c.silhouette === costume.silhouette,
  )

  if (isSpreadColorPolicy(themePrefs.colorUnification)) {
    return sameSilhouette ? 1.2 : 0.75
  }

  return sameSilhouette ? 0.85 : 1
}

/** 色味バラけ時は同じスーツ形式・前釦でまとまりを出す */
function calculateSuitUnificationScore(
  costume: Costume,
  assigned: Costume[],
  themePrefs?: EventThemePreferences,
): number {
  if (!themePrefs || assigned.length === 0 || costume.type !== 'suit') return 1

  let score = 1
  const spread = isSpreadColorPolicy(themePrefs.colorUnification)

  if (costume.suitStyle) {
    const sameStyle = assigned.some(
      (c) => c.type === 'suit' && c.suitStyle && c.suitStyle === costume.suitStyle,
    )
    score *= spread ? (sameStyle ? 1.15 : 0.85) : (sameStyle ? 0.9 : 1)
  }

  if (costume.suitBreasting) {
    const sameBreasting = assigned.some(
      (c) => c.type === 'suit' && c.suitBreasting && c.suitBreasting === costume.suitBreasting,
    )
    score *= spread ? (sameBreasting ? 1.15 : 0.85) : (sameBreasting ? 0.9 : 1)
  }

  return score
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

function buildReasonExplanation(
  costume: Costume,
  score: number,
  preferences: string[],
  themePreferences: EventThemePreferences | undefined,
  recentUsageExcludeDays: number,
): string[] {
  const reasons: string[] = []

  const colorPolicy = migrateColorUnificationPolicy(
    themePreferences?.colorUnification,
    themePreferences?.avoidSimilarColors,
  )
  if (colorPolicy === 'unified') {
    reasons.push('色味統一（同系色）')
  } else {
    reasons.push('色味バラけ')
    if (colorPolicy === 'varied_distinct') {
      reasons.push('似た色を回避')
    }
  }

  if (themePreferences) {
    const colorMatch = calculateColorThemeScore(costume.colors, themePreferences)
    if (colorMatch >= 0.9) reasons.push('テーマ色第1希望')
    else if (colorMatch >= 0.7) reasons.push('テーマ色第2希望')
    else if (colorMatch >= 0.5) reasons.push('テーマ色第3希望')

    const toneMatch = calculateToneThemeScore(costume.tone, themePreferences)
    if (toneMatch >= 0.9) reasons.push('テーマトーン第1希望')
    else if (toneMatch >= 0.7) reasons.push('テーマトーン第2希望')

    const patternMatch = calculatePatternThemeScore(costume.pattern, themePreferences)
    if (patternMatch >= 0.9) reasons.push('テーマ柄第1希望')
    else if (patternMatch >= 0.7) reasons.push('テーマ柄第2希望')

    const silhouetteMatch = calculateSilhouetteThemeScore(costume, themePreferences)
    if (silhouetteMatch !== null) {
      if (silhouetteMatch >= 0.9) reasons.push('テーマシルエット第1希望')
      else if (silhouetteMatch >= 0.7) reasons.push('テーマシルエット第2希望')
    }

    const suitStyleMatch = calculateSuitStyleThemeScore(costume, themePreferences)
    if (suitStyleMatch !== null) {
      if (suitStyleMatch >= 0.9) reasons.push('スーツ形式第1希望')
      else if (suitStyleMatch >= 0.7) reasons.push('スーツ形式第2希望')
    }

    const suitBreastingMatch = calculateSuitBreastingThemeScore(costume, themePreferences)
    if (suitBreastingMatch !== null) {
      if (suitBreastingMatch >= 0.9) reasons.push('前釦第1希望')
      else if (suitBreastingMatch >= 0.7) reasons.push('前釦第2希望')
    }
  }

  const prefIndex = preferences.indexOf(costume.id)
  if (prefIndex !== -1) {
    reasons.push(`希望順位: ${prefIndex + 1}位`)
  }

  if (recentUsageExcludeDays > 0) {
    reasons.push(`直近${recentUsageExcludeDays}日間未使用`)
  }

  reasons.push(`スコア: ${(score * 100).toFixed(1)}`)
  return reasons
}

/**
 * Main optimization algorithm - prioritizes event theme preferences
 */
export function optimizeCostumeAssignments(input: OptimizationInput): { assignments: OptimizationResult[]; harmonyScore: number } {
  const {
    participants,
    costumes,
    usageHistory,
    themePreferences,
    recentUsageExcludeDays = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
  } = input

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
    const evaluatedCandidates: Array<{ costume: Costume; score: number }> = []

    const preferenceIds = new Set(participant.preferences)
    const eligibleCostumes =
      preferenceIds.size > 0
        ? costumes.filter((costume) => preferenceIds.has(costume.id))
        : costumes

    for (const costume of eligibleCostumes) {
      // Skip already assigned costumes
      if (assignedCostumes.has(costume.id)) continue

      // Skip recently used costumes (cleaning / unavailable)
      if (isCostumeRecentlyUsed(costume.id, usageHistory, recentUsageExcludeDays)) continue

      let score = 0

      // PRIORITY 1: Event Theme Preferences (56%)
      const themeScore = calculateCombinedThemeScore(costume, themePreferences)
      score += themeScore * 0.56

      // PRIORITY 2: Participant Preference (28%)
      const prefScore = calculatePreferenceScore(costume.id, participant.preferences)
      score += prefScore * 0.28

      // PRIORITY 3: Compatibility + 色味統一方針 (16%)
      let compatibilityScore = 1
      for (const result of results) {
        const avoidSimilar = effectiveAvoidSimilarColors(themePreferences)
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
      const silhouetteUnificationScore = calculateSilhouetteUnificationScore(
        costume,
        results.map((r) => r.costume),
        themePreferences,
      )
      compatibilityScore *= unificationScore * silhouetteUnificationScore * calculateSuitUnificationScore(
        costume,
        results.map((r) => r.costume),
        themePreferences,
      )
      score += compatibilityScore * 0.16

      evaluatedCandidates.push({ costume, score })
    }

    evaluatedCandidates.sort((a, b) => b.score - a.score)
    const bestCandidate = evaluatedCandidates[0]

    if (bestCandidate) {
      assignedCostumes.add(bestCandidate.costume.id)

      results.push({
        participantId: participant.id,
        participantName: participant.name,
        costumeId: bestCandidate.costume.id,
        costume: bestCandidate.costume,
        score: bestCandidate.score,
        reason: buildReasonExplanation(
          bestCandidate.costume,
          bestCandidate.score,
          participant.preferences,
          themePreferences,
          recentUsageExcludeDays,
        ),
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
