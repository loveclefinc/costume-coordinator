import type { Costume, EventThemePreferences, UsageHistory } from './storage'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import { enrichCostumeColors, normalizePattern, themeColorNamesFrom } from './theme-colors'
import { buildColorAnchorReasons, calculateColorAnchorScore } from './color-coordination'
import { DEFAULT_RECENT_USAGE_EXCLUDE_DAYS } from './app-settings'
import { hasThemeSilhouetteChoices } from './silhouette'
import { hasThemeSuitBreastingChoices, hasThemeSuitStyleChoices } from './suit-attributes'
import { isSpreadColorPolicy, migrateColorUnificationPolicy } from './theme-color-policy'

export type ThemePreferencesInput = EventThemePreferences | EventThemePreferencesPayload

export interface CostumeThemeMatch {
  costume: Costume
  score: number
  scorePercent: number
  reasons: string[]
}

/** 直近使用の衣装か（クリーニング中などで候補から除外） */
export function isCostumeRecentlyUsed(
  costumeId: string,
  usageHistory: UsageHistory[],
  excludeDays: number = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
): boolean {
  if (excludeDays <= 0) return false

  const cutoff = Date.now() - excludeDays * 24 * 60 * 60 * 1000
  return usageHistory.some((h) => h.costumeId === costumeId && h.usedAt > cutoff)
}

/** 使用可能な衣装だけに絞る（excludeDays=0 のときは全件） */
export function filterCostumesByUsageAvailability(
  costumes: Costume[],
  usageHistory: UsageHistory[],
  excludeDays: number = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
): Costume[] {
  if (excludeDays <= 0) return costumes
  return costumes.filter((costume) => !isCostumeRecentlyUsed(costume.id, usageHistory, excludeDays))
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

/** テーマシルエットとの一致度（0〜1）。希望未設定時は null */
export function calculateSilhouetteThemeScore(
  costume: Pick<Costume, 'type' | 'silhouette'>,
  themePrefs?: ThemePreferencesInput,
): number | null {
  if (!themePrefs || !hasThemeSilhouetteChoices(themePrefs)) return null
  if (costume.type !== 'dress' || !costume.silhouette) return 0.3

  const silhouette = costume.silhouette
  if ((themePrefs.silhouettes1stChoice ?? []).includes(silhouette)) return 1.0
  if ((themePrefs.silhouettes2ndChoice ?? []).includes(silhouette)) return 0.8
  if ((themePrefs.silhouettes3rdChoice ?? []).includes(silhouette)) return 0.6
  return 0.3
}

/** スーツ形式との一致度。希望未設定時は null */
export function calculateSuitStyleThemeScore(
  costume: Pick<Costume, 'type' | 'suitStyle'>,
  themePrefs?: ThemePreferencesInput,
): number | null {
  if (!themePrefs || !hasThemeSuitStyleChoices(themePrefs)) return null
  if (costume.type !== 'suit' || !costume.suitStyle) return 0.3

  const style = costume.suitStyle
  if ((themePrefs.suitStyles1stChoice ?? []).includes(style)) return 1.0
  if ((themePrefs.suitStyles2ndChoice ?? []).includes(style)) return 0.8
  if ((themePrefs.suitStyles3rdChoice ?? []).includes(style)) return 0.6
  return 0.3
}

/** スーツ前釦（シングル/ダブル）との一致度。希望未設定時は null */
export function calculateSuitBreastingThemeScore(
  costume: Pick<Costume, 'type' | 'suitBreasting'>,
  themePrefs?: ThemePreferencesInput,
): number | null {
  if (!themePrefs || !hasThemeSuitBreastingChoices(themePrefs)) return null
  if (costume.type !== 'suit' || !costume.suitBreasting) return 0.3

  const breasting = costume.suitBreasting
  if ((themePrefs.suitBreasting1stChoice ?? []).includes(breasting)) return 1.0
  if ((themePrefs.suitBreasting2ndChoice ?? []).includes(breasting)) return 0.8
  if ((themePrefs.suitBreasting3rdChoice ?? []).includes(breasting)) return 0.6
  return 0.3
}

/** 色・トーン・柄（＋任意でシルエット・スーツ属性）の平均テーマスコア */
export function calculateCombinedThemeScore(
  costume: Costume,
  themePrefs?: ThemePreferencesInput,
): number {
  if (!themePrefs) return 0.5

  const scores = [
    calculateColorThemeScore(costume.colors, themePrefs),
    calculateToneThemeScore(costume.tone, themePrefs),
    calculatePatternThemeScore(costume.pattern, themePrefs),
  ]
  const silhouetteScore = calculateSilhouetteThemeScore(costume, themePrefs)
  if (silhouetteScore !== null) scores.push(silhouetteScore)
  const suitStyleScore = calculateSuitStyleThemeScore(costume, themePrefs)
  if (suitStyleScore !== null) scores.push(suitStyleScore)
  const suitBreastingScore = calculateSuitBreastingThemeScore(costume, themePrefs)
  if (suitBreastingScore !== null) scores.push(suitBreastingScore)

  const anchorScore = calculateColorAnchorScore(costume.colors, themePrefs.colorCoordinationAnchors)
  scores.push(anchorScore)

  return scores.reduce((sum, value) => sum + value, 0) / scores.length
}

function buildMatchReasons(
  costume: Costume,
  themePrefs: ThemePreferencesInput | undefined,
  excludeDays: number,
): string[] {
  const reasons: string[] = []

  if (themePrefs) {
    const colorScore = calculateColorThemeScore(costume.colors, themePrefs)
    const toneScore = calculateToneThemeScore(costume.tone, themePrefs)
    const patternScore = calculatePatternThemeScore(costume.pattern, themePrefs)
    const silhouetteScore = calculateSilhouetteThemeScore(costume, themePrefs)
    const suitStyleScore = calculateSuitStyleThemeScore(costume, themePrefs)
    const suitBreastingScore = calculateSuitBreastingThemeScore(costume, themePrefs)

    if (colorScore >= 0.95) reasons.push('色: 第1希望')
    else if (colorScore >= 0.75) reasons.push('色: 第2希望')
    else if (colorScore >= 0.55) reasons.push('色: 第3希望')

    if (toneScore >= 0.95) reasons.push('トーン: 第1希望')
    else if (toneScore >= 0.75) reasons.push('トーン: 第2希望')
    else if (toneScore >= 0.55) reasons.push('トーン: 第3希望')

    if (patternScore >= 0.95) reasons.push('柄: 第1希望')
    else if (patternScore >= 0.75) reasons.push('柄: 第2希望')
    else if (patternScore >= 0.55) reasons.push('柄: 第3希望')

    if (silhouetteScore !== null) {
      if (silhouetteScore >= 0.95) reasons.push('シルエット: 第1希望')
      else if (silhouetteScore >= 0.75) reasons.push('シルエット: 第2希望')
      else if (silhouetteScore >= 0.55) reasons.push('シルエット: 第3希望')
    }

    if (suitStyleScore !== null) {
      if (suitStyleScore >= 0.95) reasons.push('スーツ形式: 第1希望')
      else if (suitStyleScore >= 0.75) reasons.push('スーツ形式: 第2希望')
      else if (suitStyleScore >= 0.55) reasons.push('スーツ形式: 第3希望')
    }

    if (suitBreastingScore !== null) {
      if (suitBreastingScore >= 0.95) reasons.push('前釦: 第1希望')
      else if (suitBreastingScore >= 0.75) reasons.push('前釦: 第2希望')
      else if (suitBreastingScore >= 0.55) reasons.push('前釦: 第3希望')
    }

    reasons.push(...buildColorAnchorReasons(costume.colors, themePrefs.colorCoordinationAnchors))
  }

  if (excludeDays > 0) {
    reasons.push(`直近${excludeDays}日間未使用`)
  }

  if (reasons.length === 0) reasons.push('テーマとの一致度は低め')
  return reasons
}

/** 1着の衣装がイベントテーマにどれだけ合うか */
export function scoreCostumeForEventTheme(
  costume: Costume,
  themePreferences?: ThemePreferencesInput,
): CostumeThemeMatch {
  const score = themePreferences ? calculateCombinedThemeScore(costume, themePreferences) : 0.5

  return {
    costume,
    score,
    scorePercent: Math.round(score * 100),
    reasons: buildMatchReasons(costume, themePreferences, 0),
  }
}

/** 登録衣装をテーマ適合度順に並べる（使用不可の衣装は除外） */
export function rankCostumesForEventTheme(
  costumes: Costume[],
  themePreferences?: ThemePreferencesInput,
  usageHistory: UsageHistory[] = [],
  recentUsageExcludeDays: number = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
): CostumeThemeMatch[] {
  const available = filterCostumesByUsageAvailability(costumes, usageHistory, recentUsageExcludeDays)

  return available
    .map((costume) => {
      const match = scoreCostumeForEventTheme(costume, themePreferences)
      if (recentUsageExcludeDays > 0) {
        return {
          ...match,
          reasons: buildMatchReasons(costume, themePreferences, recentUsageExcludeDays),
        }
      }
      return match
    })
    .sort((a, b) => b.score - a.score || a.costume.name.localeCompare(b.costume.name, 'ja'))
}

/** テーマに合う衣装だけを抽出（最低スコア未満は除外。ただし1件は必ず残す） */
export const AUTO_PICK_MIN_SCORE = 0.48

function hasThemeColorChoices(theme: ThemePreferencesInput): boolean {
  return (
    theme.colors1stChoice.length > 0 ||
    theme.colors2ndChoice.length > 0 ||
    theme.colors3rdChoice.length > 0
  )
}

function overlapCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const bSet = new Set(b)
  return a.filter((value) => bSet.has(value)).length
}

function costumeDiversityPenalty(
  candidate: CostumeThemeMatch,
  selected: CostumeThemeMatch[],
  themePreferences?: ThemePreferencesInput,
): number {
  if (selected.length === 0) return 0

  const spreadColors = !themePreferences ||
    isSpreadColorPolicy(migrateColorUnificationPolicy(
      themePreferences.colorUnification,
      themePreferences.avoidSimilarColors,
    ))
  const candidateColors = themeColorNamesFrom(candidate.costume.colors)
  const candidatePattern = normalizePattern(candidate.costume.pattern)
  let penalty = 0

  for (const existing of selected) {
    const colorOverlap = overlapCount(candidateColors, themeColorNamesFrom(existing.costume.colors))
    if (colorOverlap > 0) penalty += spreadColors ? 0.18 : 0.05
    if (candidate.costume.tone === existing.costume.tone) penalty += 0.05
    if (candidatePattern === normalizePattern(existing.costume.pattern)) penalty += 0.04
    if (
      candidate.costume.type === 'dress' &&
      existing.costume.type === 'dress' &&
      candidate.costume.silhouette &&
      candidate.costume.silhouette === existing.costume.silhouette
    ) {
      penalty += spreadColors ? 0.04 : 0.02
    }
    if (
      candidate.costume.type === 'suit' &&
      existing.costume.type === 'suit' &&
      candidate.costume.suitStyle &&
      candidate.costume.suitStyle === existing.costume.suitStyle
    ) {
      penalty += spreadColors ? 0.04 : 0.02
    }
  }

  return penalty
}

function pickDiverseCostumes(
  ranked: CostumeThemeMatch[],
  maxCount: number,
  themePreferences?: ThemePreferencesInput,
): CostumeThemeMatch[] {
  if (ranked.length <= maxCount) return ranked

  const selected: CostumeThemeMatch[] = [ranked[0]]
  const remaining = ranked.slice(1)

  while (selected.length < maxCount && remaining.length > 0) {
    let bestIndex = 0
    let bestAdjustedScore = -Infinity

    remaining.forEach((entry, index) => {
      const adjustedScore = entry.score - costumeDiversityPenalty(entry, selected, themePreferences)
      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore
        bestIndex = index
      }
    })

    selected.push(remaining.splice(bestIndex, 1)[0])
  }

  return selected
}

/**
 * 参加者が提出する「候補衣装」を自動選出する。
 * 全員提出後にシステムが最適化で1着を決めるため、テーマに合う候補を複数（最大 maxCount）返す。
 */
export function autoPickCostumesForEventTheme(
  costumes: Costume[],
  themePreferences?: ThemePreferencesInput,
  usageHistory: UsageHistory[] = [],
  maxCount: number = 1,
  minScore: number = AUTO_PICK_MIN_SCORE,
  recentUsageExcludeDays: number = DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
): CostumeThemeMatch[] {
  const ranked = rankCostumesForEventTheme(
    costumes,
    themePreferences,
    usageHistory,
    recentUsageExcludeDays,
  )
  if (ranked.length === 0) return []

  const cap = Math.max(1, maxCount)
  if (!themePreferences) {
    return pickDiverseCostumes(ranked, cap)
  }

  let pool = ranked
  if (hasThemeColorChoices(themePreferences)) {
    const colorMatched = ranked.filter(
      (entry) => calculateColorThemeScore(entry.costume.colors, themePreferences) >= 0.6,
    )
    if (colorMatched.length > 0) pool = colorMatched
  }

  const qualified = pool.filter((entry) => entry.score >= minScore)
  const picks = qualified.length > 0 ? qualified : pool
  return pickDiverseCostumes(picks, cap, themePreferences)
}
