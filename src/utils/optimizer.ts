import { Costume, UsageHistory } from './storage'

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
}

/**
 * Calculate color compatibility score between two costumes
 * Returns 0-1 where 1 is perfect compatibility
 */
function calculateColorCompatibility(colors1: string[], colors2: string[]): number {
  if (colors1.length === 0 || colors2.length === 0) return 1

  const commonColors = colors1.filter(c => colors2.includes(c))
  if (commonColors.length > 0) return 0.3 // Penalize if colors overlap

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
  if (pattern1 === pattern2 && pattern1 !== 'solid') return 0.5 // Same pattern is less ideal
  return 1
}

/**
 * Calculate usage history penalty (prefer less recently used)
 */
function calculateUsagePenalty(costumeId: string, usageHistory: UsageHistory[]): number {
  const recentUsages = usageHistory.filter(h => {
    const daysSinceUse = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
    return daysSinceUse <= 30 && h.costumeId === costumeId
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
 * Main optimization algorithm
 */
export function optimizeCostumeAssignments(input: OptimizationInput): OptimizationResult[] {
  const { participants, costumes, usageHistory } = input

  if (costumes.length === 0) {
    return []
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

      // 1. Preference score (40%)
      const prefScore = calculatePreferenceScore(costume.id, participant.preferences)
      score += prefScore * 0.4

      // 2. Usage history penalty (30%)
      const usagePenalty = calculateUsagePenalty(costume.id, usageHistory)
      score += usagePenalty * 0.3

      // 3. Compatibility with already assigned costumes (20%)
      let compatibilityScore = 1
      for (const result of results) {
        const colorCompat = calculateColorCompatibility(costume.colors, result.costume.colors)
        const toneCompat = calculateToneCompatibility(costume.tone, result.costume.tone)
        const patternCompat = calculatePatternCompatibility(costume.pattern, result.costume.pattern)
        compatibilityScore *= (colorCompat + toneCompat + patternCompat) / 3
      }
      score += compatibilityScore * 0.2

      // 4. Season availability (10%)
      const currentMonth = new Date().getMonth()
      let seasonScore = 0.5
      if (currentMonth >= 2 && currentMonth <= 4 && costume.season.includes('spring')) seasonScore = 1
      else if (currentMonth >= 5 && currentMonth <= 7 && costume.season.includes('summer')) seasonScore = 1
      else if (currentMonth >= 8 && currentMonth <= 10 && costume.season.includes('autumn')) seasonScore = 1
      else if ((currentMonth >= 11 || currentMonth <= 1) && costume.season.includes('winter')) seasonScore = 1
      score += seasonScore * 0.1

      if (score > bestScore) {
        bestScore = score
        bestCostume = costume
      }
    }

    if (bestCostume) {
      assignedCostumes.add(bestCostume.id)

      const prefIndex = participant.preferences.indexOf(bestCostume.id)
      if (prefIndex !== -1) {
        reasons.push(`希望順位: ${prefIndex + 1}位`)
      }

      const recentUsages = usageHistory.filter(h => {
        const daysSinceUse = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
        return daysSinceUse <= 30 && h.costumeId === bestCostume!.id
      })
      if (recentUsages.length === 0) {
        reasons.push('直近30日間未使用')
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

  return results
}

/**
 * Calculate overall harmony score for the assignment
 */
export function calculateHarmonyScore(results: OptimizationResult[]): number {
  if (results.length === 0) return 0

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  return avgScore
}
