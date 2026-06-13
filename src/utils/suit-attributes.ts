export const SUIT_STYLE_OPTIONS = ['tuxedo', 'tailcoat', 'standard'] as const
export const SUIT_BREASTING_OPTIONS = ['single', 'double'] as const
export const SUIT_LAPEL_OPTIONS = ['notch', 'peak', 'shawl'] as const

export type SuitStyle = (typeof SUIT_STYLE_OPTIONS)[number]
export type SuitBreasting = (typeof SUIT_BREASTING_OPTIONS)[number]
export type SuitLapel = (typeof SUIT_LAPEL_OPTIONS)[number]

export const SUIT_STYLE_LABELS: Record<SuitStyle, string> = {
  tuxedo: 'タキシード',
  tailcoat: '燕尾',
  standard: '一般スーツ',
}

export const SUIT_BREASTING_LABELS: Record<SuitBreasting, string> = {
  single: 'シングル',
  double: 'ダブル',
}

export const SUIT_LAPEL_LABELS: Record<SuitLapel, string> = {
  notch: 'ノッチドラペル',
  peak: 'ピークドラペル',
  shawl: 'ショールカラー',
}

export interface ThemeSuitStyleChoices {
  suitStyles1stChoice?: string[]
  suitStyles2ndChoice?: string[]
  suitStyles3rdChoice?: string[]
}

export interface ThemeSuitBreastingChoices {
  suitBreasting1stChoice?: string[]
  suitBreasting2ndChoice?: string[]
  suitBreasting3rdChoice?: string[]
}

export type ThemeSuitChoices = ThemeSuitStyleChoices & ThemeSuitBreastingChoices

export function hasThemeSuitStyleChoices(theme?: ThemeSuitStyleChoices): boolean {
  if (!theme) return false
  return (
    (theme.suitStyles1stChoice?.length ?? 0) > 0 ||
    (theme.suitStyles2ndChoice?.length ?? 0) > 0 ||
    (theme.suitStyles3rdChoice?.length ?? 0) > 0
  )
}

export function hasThemeSuitBreastingChoices(theme?: ThemeSuitBreastingChoices): boolean {
  if (!theme) return false
  return (
    (theme.suitBreasting1stChoice?.length ?? 0) > 0 ||
    (theme.suitBreasting2ndChoice?.length ?? 0) > 0 ||
    (theme.suitBreasting3rdChoice?.length ?? 0) > 0
  )
}

export function normalizeSuitStyle(value: unknown, costumeType?: string): SuitStyle | undefined {
  if (costumeType && costumeType !== 'suit') return undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  return SUIT_STYLE_OPTIONS.includes(value as SuitStyle) ? (value as SuitStyle) : undefined
}

export function normalizeSuitBreasting(value: unknown, costumeType?: string, suitStyle?: string): SuitBreasting | undefined {
  if (costumeType && costumeType !== 'suit') return undefined
  if (suitStyle && suitStyle !== 'standard') return undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  if (SUIT_BREASTING_OPTIONS.includes(value as SuitBreasting)) {
    return value as SuitBreasting
  }
  return undefined
}

export function normalizeSuitLapel(value: unknown, costumeType?: string, suitStyle?: string): SuitLapel | undefined {
  if (costumeType && costumeType !== 'suit') return undefined
  if (suitStyle && suitStyle !== 'tuxedo') return undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  return SUIT_LAPEL_OPTIONS.includes(value as SuitLapel) ? (value as SuitLapel) : undefined
}

export function suitStyleLabel(value?: string): string {
  if (!value) return ''
  return SUIT_STYLE_LABELS[value as SuitStyle] ?? value
}

export function suitBreastingLabel(value?: string): string {
  if (!value) return ''
  return SUIT_BREASTING_LABELS[value as SuitBreasting] ?? value
}

export function suitLapelLabel(value?: string): string {
  if (!value) return ''
  return SUIT_LAPEL_LABELS[value as SuitLapel] ?? value
}
