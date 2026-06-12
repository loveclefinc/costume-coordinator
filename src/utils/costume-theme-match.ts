import type { Costume, EventThemePreferences, UsageHistory } from './storage'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import { enrichCostumeColors, normalizePattern } from './theme-colors'

export type ThemePreferencesInput = EventThemePreferences | EventThemePreferencesPayload

export interface CostumeThemeMatch {
  costume: Costume
  score: number
  scorePercent: number
  reasons: string[]
}

/** テーマ色との一致度（0〜1） */
export function calculateColorThemeScore(
  costumeColors: string[],
  themePrefs?: ThemePreferencesInput,
): number {
  if (!themePrefs) return 0.5

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

/** テーマトーンとの一致度（0〜1） */
export function calculateToneThemeScore(
  costumeTone: string,
  themePrefs?: ThemePreferencesInput,
): number {
  if (!themePrefs) return 0.5
  if (themePrefs.tones1stChoice.includes(costumeTone)) return 1.0
  if (themePrefs.tones2ndChoice.includes(costumeTone)) return 0.8
  if (themePrefs.tones3rdChoice.includes(costumeTone)) return 0.6
  return 0.3
}

/** テーマ柄との一致度（0〜1） */
export function calculatePatternThemeScore(
  costumePattern: string,
  themePrefs?: ThemePreferencesInput,
): number {
  if (!themePrefs) return 0.5
  const pattern = normalizePattern(costumePattern)
  if (themePrefs.patterns1stChoice.map(normalizePattern).includes(pattern)) return 1.0
  if (themePrefs.patterns2ndChoice.map(normalizePattern).includes(pattern)) return 0.8
  if (themePrefs.patterns3rdChoice.map(normalizePattern).includes(pattern)) return 0.6
  return 0.3
}

/** 直近使用のペナルティ（0〜1、高いほど良い） */
export function calculateUsagePenalty(
  costumeId: string,
  usageHistory: UsageHistory[],
  excludeDays: number = 30,
): number {
  const recentUsages = usageHistory.filter((h) => {
    const daysSinceUse = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
    return daysSinceUse <= excludeDays && h.costumeId === costumeId
  })
  return Math.max(0, 1 - recentUsages.length * 0.1)
}

function buildMatchReasons(
  costume: Costume,
  themePrefs: ThemePreferencesInput | undefined,
  usageHistory: UsageHistory[],
  colorScore: number,
  toneScore: number,
  patternScore: number,
): string[] {
  const reasons: string[] = []

  if (themePrefs) {
    if (colorScore >= 0.95) reasons.push('色: 第1希望')
    else if (colorScore >= 0.75) reasons.push('色: 第2希望')
    else if (colorScore >= 0.55) reasons.push('色: 第3希望')

    if (toneScore >= 0.95) reasons.push('トーン: 第1希望')
    else if (toneScore >= 0.75) reasons.push('トーン: 第2希望')
    else if (toneScore >= 0.55) reasons.push('トーン: 第3希望')

    if (patternScore >= 0.95) reasons.push('柄: 第1希望')
    else if (patternScore >= 0.75) reasons.push('柄: 第2希望')
    else if (patternScore >= 0.55) reasons.push('柄: 第3希望')
  }

  const excludeDays = themePrefs?.recentUsageExcludeDays ?? 30
  const recent = usageHistory.some((h) => {
    const days = (Date.now() - h.usedAt) / (1000 * 60 * 60 * 24)
    return days <= excludeDays && h.costumeId === costume.id
  })
  if (!recent) reasons.push(`直近${excludeDays}日間未使用`)

  if (reasons.length === 0) reasons.push('テーマとの一致度は低め')
  return reasons
}

/** 1着の衣装がイベントテーマにどれだけ合うか */
export function scoreCostumeForEventTheme(
  costume: Costume,
  themePreferences?: ThemePreferencesInput,
  usageHistory: UsageHistory[] = [],
): CostumeThemeMatch {
  const colorScore = calculateColorThemeScore(costume.colors, themePreferences)
  const toneScore = calculateToneThemeScore(costume.tone, themePreferences)
  const patternScore = calculatePatternThemeScore(costume.pattern, themePreferences)
  const themeScore = (colorScore + toneScore + patternScore) / 3

  const excludeDays = themePreferences?.recentUsageExcludeDays ?? 30
  const usageScore = calculateUsagePenalty(costume.id, usageHistory, excludeDays)

  const score = themePreferences
    ? themeScore * 0.8 + usageScore * 0.2
    : 0.5

  return {
    costume,
    score,
    scorePercent: Math.round(score * 100),
    reasons: buildMatchReasons(
      costume,
      themePreferences,
      usageHistory,
      colorScore,
      toneScore,
      patternScore,
    ),
  }
}

/** 登録衣装をテーマ適合度順に並べる（アプリの肝） */
export function rankCostumesForEventTheme(
  costumes: Costume[],
  themePreferences?: ThemePreferencesInput,
  usageHistory: UsageHistory[] = [],
): CostumeThemeMatch[] {
  return costumes
    .map((costume) => scoreCostumeForEventTheme(costume, themePreferences, usageHistory))
    .sort((a, b) => b.score - a.score || a.costume.name.localeCompare(b.costume.name, 'ja'))
}
