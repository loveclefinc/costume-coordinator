import { Costume, EventThemePreferences, UsageHistory } from './storage'

export interface ExtendedOptimizationResult {
  participantId: string
  participantName: string
  mainCostume: Costume
  accessories: Costume[]
  totalScore: number
  reasons: string[]
}

export interface ExtendedOptimizationInput {
  participants: Array<{ id: string; name: string; preferences: string[] }>
  costumes: Costume[]
  usageHistory: UsageHistory[]
  themePreferences?: EventThemePreferences
}

/**
 * Categorize costumes by type
 */
function categorizeCostumesByType(costumes: Costume[]): {
  mainCostumes: Costume[]
  accessories: Costume[]
} {
  const mainCostumes = costumes.filter(c => 
    !c.type || ['dress', 'suit', 'shirt'].includes(c.type)
  )
  
  const accessories = costumes.filter(c => 
    c.type && ['necktie', 'bowtie', 'accessory', 'other'].includes(c.type)
  )
  
  return { mainCostumes, accessories }
}

/**
 * Calculate color match score
 */
function calculateColorScore(costumeColors: string[], themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5
  
  for (const color of costumeColors) {
    if (themePrefs.colors1stChoice.includes(color)) return 1.0
    if (themePrefs.colors2ndChoice.includes(color)) return 0.8
    if (themePrefs.colors3rdChoice.includes(color)) return 0.6
  }
  
  return 0.3
}

/**
 * Calculate tone match score
 */
function calculateToneScore(costumeTone: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5
  
  if (themePrefs.tones1stChoice.includes(costumeTone)) return 1.0
  if (themePrefs.tones2ndChoice.includes(costumeTone)) return 0.8
  if (themePrefs.tones3rdChoice.includes(costumeTone)) return 0.6
  
  return 0.3
}

/**
 * Calculate pattern match score
 */
function calculatePatternScore(costumePattern: string, themePrefs?: EventThemePreferences): number {
  if (!themePrefs) return 0.5
  
  if (themePrefs.patterns1stChoice.includes(costumePattern)) return 1.0
  if (themePrefs.patterns2ndChoice.includes(costumePattern)) return 0.8
  if (themePrefs.patterns3rdChoice.includes(costumePattern)) return 0.6
  
  return 0.3
}

/**
 * Calculate color compatibility between two costumes
 */
function calculateColorCompatibility(colors1: string[], colors2: string[]): number {
  if (colors1.length === 0 || colors2.length === 0) return 1
  
  const commonColors = colors1.filter(c => colors2.includes(c))
  return commonColors.length > 0 ? 0.7 : 1
}

/**
 * Calculate tone compatibility
 */
function calculateToneCompatibility(tone1: string, tone2: string): number {
  return tone1 === tone2 ? 0.7 : 1
}

/**
 * Check if costume was recently used
 */
function isRecentlyUsed(costumeId: string, usageHistory: UsageHistory[], excludeDays: number = 30): boolean {
  const cutoffDate = Date.now() - (excludeDays * 24 * 60 * 60 * 1000)
  return usageHistory.some(h => h.costumeId === costumeId && h.usedAt > cutoffDate)
}

/**
 * Find best matching accessories for a main costume
 */
function findBestAccessories(
  mainCostume: Costume,
  availableAccessories: Costume[],
  usageHistory: UsageHistory[],
  themePrefs?: EventThemePreferences
): Costume[] {
  const scoredAccessories = availableAccessories
    .filter(acc => !isRecentlyUsed(acc.id, usageHistory))
    .map(acc => {
      let score = 0.5
      
      // Color compatibility
      const colorCompat = calculateColorCompatibility(mainCostume.colors, acc.colors)
      score *= colorCompat
      
      // Tone compatibility
      const toneCompat = calculateToneCompatibility(mainCostume.tone, acc.tone)
      score *= toneCompat
      
      // Theme preference matching
      const colorThemeScore = calculateColorScore(acc.colors, themePrefs)
      const toneThemeScore = calculateToneScore(acc.tone, themePrefs)
      score = (score + colorThemeScore + toneThemeScore) / 3
      
      return { costume: acc, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3) // Return top 3 accessories
    .map(item => item.costume)
  
  return scoredAccessories
}

/**
 * Generate optimized costume combinations including accessories
 */
export function optimizeWithAccessories(input: ExtendedOptimizationInput): ExtendedOptimizationResult[] {
  const { participants, costumes, usageHistory, themePreferences } = input
  const { mainCostumes, accessories } = categorizeCostumesByType(costumes)
  
  const results: ExtendedOptimizationResult[] = []
  
  for (const participant of participants) {
    // Find best main costume
    const scoredCostumes = mainCostumes
      .filter(c => !isRecentlyUsed(c.id, usageHistory, themePreferences?.recentUsageExcludeDays || 30))
      .map(costume => {
        let score = 0.5
        
        // Color score
        const colorScore = calculateColorScore(costume.colors, themePreferences)
        score = (score + colorScore) / 2
        
        // Tone score
        const toneScore = calculateToneScore(costume.tone, themePreferences)
        score = (score + toneScore) / 2
        
        // Pattern score
        const patternScore = calculatePatternScore(costume.pattern, themePreferences)
        score = (score + patternScore) / 2
        
        return { costume, score }
      })
      .sort((a, b) => b.score - a.score)
    
    if (scoredCostumes.length === 0) continue
    
    const mainCostume = scoredCostumes[0].costume
    const mainScore = scoredCostumes[0].score
    
    // Find matching accessories
    const matchingAccessories = findBestAccessories(
      mainCostume,
      accessories,
      usageHistory,
      themePreferences
    )
    
    // Calculate average accessory score
    const accessoryScore = matchingAccessories.length > 0
      ? matchingAccessories.reduce((sum, acc) => {
          const colorCompat = calculateColorCompatibility(mainCostume.colors, acc.colors)
          const toneCompat = calculateToneCompatibility(mainCostume.tone, acc.tone)
          return sum + (colorCompat + toneCompat) / 2
        }, 0) / matchingAccessories.length
      : 0.5
    
    const totalScore = (mainScore + accessoryScore) / 2
    
    const reasons: string[] = [
      `メイン衣装: ${mainCostume.name}`,
      ...matchingAccessories.map(acc => `${acc.type === 'necktie' ? 'ネクタイ' : acc.type === 'bowtie' ? '蝶ネクタイ' : '小物'}: ${acc.name}`)
    ]
    
    results.push({
      participantId: participant.id,
      participantName: participant.name,
      mainCostume,
      accessories: matchingAccessories,
      totalScore,
      reasons
    })
  }
  
  return results.sort((a, b) => b.totalScore - a.totalScore)
}
