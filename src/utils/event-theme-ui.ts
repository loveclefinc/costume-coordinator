import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import type { AssignmentDisplayOrder } from '../../shared/event-api-types'
import type { ColorAnalysisResult } from './image-analysis'
import { hexToThemeColorName, THEME_COLOR_REF_HEX, type ThemeColorName } from './theme-colors'
import {
  COLOR_UNIFICATION_LABELS,
  migrateColorUnificationPolicy,
} from './theme-color-policy'
import { DRESS_SILHOUETTE_OPTIONS, SILHOUETTE_LABELS } from './silhouette'
import {
  SUIT_BREASTING_LABELS,
  SUIT_BREASTING_OPTIONS,
  SUIT_STYLE_LABELS,
  SUIT_STYLE_OPTIONS,
} from './suit-attributes'

export { SILHOUETTE_LABELS }

export const THEME_COLOR_OPTIONS = [
  'red', 'pink', 'purple', 'blue', 'cyan', 'green',
  'yellow', 'orange', 'brown', 'gray', 'white', 'black',
] as const

export const THEME_TONE_OPTIONS = ['pastel', 'vivid', 'dark', 'neutral'] as const

export const THEME_PATTERN_OPTIONS = [
  'plain', 'floral', 'stripe', 'dot', 'check', 'geometric', 'animal',
] as const

export const THEME_SILHOUETTE_OPTIONS = DRESS_SILHOUETTE_OPTIONS
export const THEME_SUIT_STYLE_OPTIONS = SUIT_STYLE_OPTIONS
export const THEME_SUIT_BREASTING_OPTIONS = SUIT_BREASTING_OPTIONS

export const ASSIGNMENT_DISPLAY_ORDER_LABELS: Record<AssignmentDisplayOrder, string> = {
  participant_order: '参加者順',
  rainbow: '虹色順',
  contrast: 'コントラスト順',
}

export const ASSIGNMENT_DISPLAY_ORDER_HINTS: Record<AssignmentDisplayOrder, string> = {
  participant_order: '参加者リストの順番で表示します。',
  rainbow: '赤・橙・黄・緑・青・紫のように、色相が自然につながる順で表示します。',
  contrast: '隣同士の色差が出やすいように、明暗・色相を交互に並べます。',
}

export const COLOR_LABELS: Record<string, string> = {
  red: '赤',
  pink: 'ピンク',
  purple: '紫',
  blue: '青',
  cyan: 'シアン',
  green: '緑',
  yellow: '黄',
  orange: 'オレンジ',
  brown: '茶',
  gray: 'グレー',
  white: '白',
  black: '黒',
}

export const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: 'ビビッド',
  dark: 'ダーク',
  neutral: 'ニュートラル',
}

export const PATTERN_LABELS: Record<string, string> = {
  plain: '無地',
  floral: '花柄',
  stripe: 'ストライプ',
  dot: 'ドット',
  check: 'チェック',
  geometric: '幾何学',
  animal: 'アニマル',
}

export interface ThemeChoiceSets {
  colors: string[]
  tones: string[]
  patterns: string[]
  silhouettes: string[]
  suitStyles: string[]
  suitBreasting: string[]
}

export interface ThemeGuidedDefaults {
  colors: string[]
  tone: string
  pattern: string
}

function uniqueList(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function unionRankChoices(
  theme: EventThemePreferencesPayload | undefined,
  key: 'colors' | 'tones' | 'patterns' | 'silhouettes' | 'suitStyles' | 'suitBreasting',
): string[] {
  if (!theme) return []
  const suffix = 'Choice'
  return uniqueList([
    ...((theme[`${key}1st${suffix}` as keyof EventThemePreferencesPayload] as string[] | undefined) ?? []),
    ...((theme[`${key}2nd${suffix}` as keyof EventThemePreferencesPayload] as string[] | undefined) ?? []),
    ...((theme[`${key}3rd${suffix}` as keyof EventThemePreferencesPayload] as string[] | undefined) ?? []),
  ])
}

/** イベント設定で許可される色・トーン・柄（全希望の和集合） */
export function getAllowedThemeChoices(
  theme?: EventThemePreferencesPayload,
): ThemeChoiceSets {
  const colors = unionRankChoices(theme, 'colors')
  const tones = unionRankChoices(theme, 'tones')
  const patterns = unionRankChoices(theme, 'patterns')
  const silhouettes = unionRankChoices(theme, 'silhouettes')
  const suitStyles = unionRankChoices(theme, 'suitStyles')
  const suitBreasting = unionRankChoices(theme, 'suitBreasting')

  return {
    colors: colors.length > 0 ? colors : [...THEME_COLOR_OPTIONS],
    tones: tones.length > 0 ? tones : [...THEME_TONE_OPTIONS],
    patterns: patterns.length > 0 ? patterns : [...THEME_PATTERN_OPTIONS],
    silhouettes: silhouettes.length > 0 ? silhouettes : [...THEME_SILHOUETTE_OPTIONS],
    suitStyles: suitStyles.length > 0 ? suitStyles : [...THEME_SUIT_STYLE_OPTIONS],
    suitBreasting: suitBreasting.length > 0 ? suitBreasting : [...THEME_SUIT_BREASTING_OPTIONS],
  }
}

/** 第1希望を初期値にする */
export function getThemeGuidedDefaults(
  theme?: EventThemePreferencesPayload,
): ThemeGuidedDefaults {
  const allowed = getAllowedThemeChoices(theme)
  const firstColor = theme?.colors1stChoice[0]
  const firstTone = theme?.tones1stChoice[0]
  const firstPattern = theme?.patterns1stChoice[0]

  return {
    colors: firstColor && allowed.colors.includes(firstColor) ? [firstColor] : [],
    tone: firstTone && allowed.tones.includes(firstTone) ? firstTone : allowed.tones[0],
    pattern: firstPattern && allowed.patterns.includes(firstPattern)
      ? firstPattern
      : allowed.patterns[0],
  }
}

function nearestAllowedThemeColor(
  hex: string,
  allowed: string[],
): string | null {
  const detected = hexToThemeColorName(hex)
  if (detected && allowed.includes(detected)) return detected

  const rgb = hex.startsWith('#') ? hex : `#${hex}`
  const name = hexToThemeColorName(rgb)
  if (!name) return allowed[0] ?? null

  if (allowed.includes(name)) return name

  // 許可色の中で最も近い色名
  const ref = THEME_COLOR_REF_HEX[name as ThemeColorName]
  if (!ref) return allowed[0] ?? null

  let best = allowed[0]
  let bestDist = Infinity
  for (const candidate of allowed) {
    const candidateHex = THEME_COLOR_REF_HEX[candidate as ThemeColorName]
    if (!candidateHex) continue
    const dist = colorDistanceHex(ref, candidateHex)
    if (dist < bestDist) {
      bestDist = dist
      best = candidate
    }
  }
  return best
}

function colorDistanceHex(a: string, b: string): number {
  const parse = (hex: string) => {
    const n = hex.replace('#', '')
    return [
      parseInt(n.slice(0, 2), 16),
      parseInt(n.slice(2, 4), 16),
      parseInt(n.slice(4, 6), 16),
    ] as [number, number, number]
  }
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function nearestAllowedValue(value: string, allowed: string[]): string {
  return allowed.includes(value) ? value : allowed[0]
}

/** 写真分析結果をイベントのテーマ許可範囲に収める */
export function mapAnalysisToThemeChoices(
  analysis: ColorAnalysisResult,
  theme?: EventThemePreferencesPayload,
): ThemeGuidedDefaults {
  const allowed = getAllowedThemeChoices(theme)
  const colorFromPhoto = nearestAllowedThemeColor(analysis.primaryColor, allowed.colors)

  return {
    colors: colorFromPhoto ? [colorFromPhoto] : getThemeGuidedDefaults(theme).colors,
    tone: nearestAllowedValue(analysis.tone, allowed.tones),
    pattern: getThemeGuidedDefaults(theme).pattern,
  }
}

export function themeColorSwatchHex(colorName: string): string {
  return THEME_COLOR_REF_HEX[colorName as ThemeColorName] ?? '#9E9E9E'
}

export function hasThemePreferences(theme?: EventThemePreferencesPayload): boolean {
  if (!theme) return false
  return (
    theme.colors1stChoice.length > 0 ||
    theme.colors2ndChoice.length > 0 ||
    theme.colors3rdChoice.length > 0 ||
    theme.tones1stChoice.length > 0 ||
    theme.tones2ndChoice.length > 0 ||
    theme.tones3rdChoice.length > 0 ||
    theme.patterns1stChoice.length > 0 ||
    theme.patterns2ndChoice.length > 0 ||
    theme.patterns3rdChoice.length > 0 ||
    (theme.silhouettes1stChoice?.length ?? 0) > 0 ||
    (theme.silhouettes2ndChoice?.length ?? 0) > 0 ||
    (theme.silhouettes3rdChoice?.length ?? 0) > 0 ||
    (theme.suitStyles1stChoice?.length ?? 0) > 0 ||
    (theme.suitStyles2ndChoice?.length ?? 0) > 0 ||
    (theme.suitStyles3rdChoice?.length ?? 0) > 0 ||
    (theme.suitBreasting1stChoice?.length ?? 0) > 0 ||
    (theme.suitBreasting2ndChoice?.length ?? 0) > 0 ||
    (theme.suitBreasting3rdChoice?.length ?? 0) > 0
  )
}

export {
  COLOR_UNIFICATION_LABELS,
  COLOR_UNIFICATION_HINTS,
  effectiveAvoidSimilarColors,
  migrateColorUnificationPolicy,
  normalizeThemeColorPolicy,
} from './theme-color-policy'

export function formatThemeSummary(theme: EventThemePreferencesPayload): string[] {
  const lines: string[] = []
  const policy = migrateColorUnificationPolicy(theme.colorUnification, theme.avoidSimilarColors)
  lines.push(`色味: ${COLOR_UNIFICATION_LABELS[policy]}`)
  if (theme.assignmentDisplayOrder && theme.assignmentDisplayOrder !== 'participant_order') {
    lines.push(`並び順: ${ASSIGNMENT_DISPLAY_ORDER_LABELS[theme.assignmentDisplayOrder]}`)
  }

  const ranks = [
    { label: '第1希望', colors: theme.colors1stChoice, tones: theme.tones1stChoice, patterns: theme.patterns1stChoice, silhouettes: theme.silhouettes1stChoice ?? [], suitStyles: theme.suitStyles1stChoice ?? [], suitBreasting: theme.suitBreasting1stChoice ?? [] },
    { label: '第2希望', colors: theme.colors2ndChoice, tones: theme.tones2ndChoice, patterns: theme.patterns2ndChoice, silhouettes: theme.silhouettes2ndChoice ?? [], suitStyles: theme.suitStyles2ndChoice ?? [], suitBreasting: theme.suitBreasting2ndChoice ?? [] },
    { label: '第3希望', colors: theme.colors3rdChoice, tones: theme.tones3rdChoice, patterns: theme.patterns3rdChoice, silhouettes: theme.silhouettes3rdChoice ?? [], suitStyles: theme.suitStyles3rdChoice ?? [], suitBreasting: theme.suitBreasting3rdChoice ?? [] },
  ]

  for (const rank of ranks) {
    const parts: string[] = []
    if (rank.colors.length > 0) {
      parts.push(`色: ${rank.colors.map((c) => COLOR_LABELS[c] ?? c).join('・')}`)
    }
    if (rank.tones.length > 0) {
      parts.push(`トーン: ${rank.tones.map((t) => TONE_LABELS[t] ?? t).join('・')}`)
    }
    if (rank.patterns.length > 0) {
      parts.push(`柄: ${rank.patterns.map((p) => PATTERN_LABELS[p] ?? p).join('・')}`)
    }
    if (rank.silhouettes.length > 0) {
      parts.push(`シルエット: ${rank.silhouettes.map((s) => SILHOUETTE_LABELS[s as keyof typeof SILHOUETTE_LABELS] ?? s).join('・')}`)
    }
    if (rank.suitStyles.length > 0) {
      parts.push(`スーツ形式: ${rank.suitStyles.map((s) => SUIT_STYLE_LABELS[s as keyof typeof SUIT_STYLE_LABELS] ?? s).join('・')}`)
    }
    if (rank.suitBreasting.length > 0) {
      parts.push(`前釦: ${rank.suitBreasting.map((p) => SUIT_BREASTING_LABELS[p as keyof typeof SUIT_BREASTING_LABELS] ?? p).join('・')}`)
    }
    if (parts.length > 0) lines.push(`${rank.label}: ${parts.join(' / ')}`)
  }

  return lines
}
