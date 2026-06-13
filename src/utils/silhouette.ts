export const DRESS_SILHOUETTE_OPTIONS = ['a_line', 'princess', 'slender', 'mermaid'] as const

export type DressSilhouette = (typeof DRESS_SILHOUETTE_OPTIONS)[number]

export const SILHOUETTE_LABELS: Record<DressSilhouette, string> = {
  a_line: 'Aライン',
  princess: 'プリンセスライン',
  slender: 'スレンダーライン',
  mermaid: 'マーメイドライン',
}

export interface ThemeSilhouetteChoices {
  silhouettes1stChoice?: string[]
  silhouettes2ndChoice?: string[]
  silhouettes3rdChoice?: string[]
}

export function hasThemeSilhouetteChoices(theme?: ThemeSilhouetteChoices): boolean {
  if (!theme) return false
  return (
    (theme.silhouettes1stChoice?.length ?? 0) > 0 ||
    (theme.silhouettes2ndChoice?.length ?? 0) > 0 ||
    (theme.silhouettes3rdChoice?.length ?? 0) > 0
  )
}

export function normalizeSilhouette(
  value: unknown,
  costumeType?: string,
): DressSilhouette | undefined {
  if (costumeType && costumeType !== 'dress') return undefined
  if (typeof value !== 'string' || !value.trim()) return undefined
  return DRESS_SILHOUETTE_OPTIONS.includes(value as DressSilhouette)
    ? (value as DressSilhouette)
    : undefined
}

export function silhouetteLabel(value?: string): string {
  if (!value) return ''
  return SILHOUETTE_LABELS[value as DressSilhouette] ?? value
}
