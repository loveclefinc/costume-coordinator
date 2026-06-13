import type { Costume } from './storage'
import type { DressSilhouette } from './silhouette'
import { normalizeSilhouette } from './silhouette'
import { normalizeSuitBreasting, normalizeSuitLapel, normalizeSuitStyle } from './suit-attributes'
import { enrichCostumeColors, normalizePattern } from './theme-colors'

/**
 * Legacy / sync data may store colors as { primary, secondary } instead of string[].
 */
export function normalizeCostumeColors(colors: unknown): string[] {
  if (Array.isArray(colors)) {
    return colors.filter((c): c is string => typeof c === 'string' && c.length > 0)
  }
  if (colors && typeof colors === 'object') {
    const obj = colors as { primary?: string; secondary?: string }
    const list: string[] = []
    if (obj.primary) list.push(obj.primary)
    if (obj.secondary) list.push(obj.secondary)
    return list
  }
  if (typeof colors === 'string' && colors) {
    return [colors]
  }
  return []
}

export function normalizeSeason(season: unknown): string[] {
  if (Array.isArray(season)) {
    return season.filter((s): s is string => typeof s === 'string')
  }
  return []
}

export function normalizeCostume(raw: Costume | Record<string, unknown>): Costume {
  const r = raw as Costume & {
    imageUri?: string
    thumbnailUri?: string
    wearingPhotos?: string[]
    colorCategory?: string
    tags?: string[]
  }

  const image =
    (typeof r.image === 'string' && r.image) ||
    (typeof r.imageUri === 'string' && r.imageUri) ||
    ''

  let tone = r.tone
  if (tone === 'light' || tone === 'dark') {
    tone = tone === 'dark' ? 'dark' : 'pastel'
  }

  const costumeType = typeof r.type === 'string' ? r.type : undefined

  const suitStyle = normalizeSuitStyle(r.suitStyle, costumeType)

  return {
    id: r.id,
    name: r.name ?? '',
    image,
    colors: enrichCostumeColors(normalizeCostumeColors(r.colors)),
    tone: (tone as Costume['tone']) || 'neutral',
    pattern: normalizePattern(r.pattern || 'solid'),
    season: normalizeSeason(r.season),
    type: costumeType,
    silhouette: normalizeSilhouette(r.silhouette, costumeType),
    suitStyle,
    suitBreasting: normalizeSuitBreasting(r.suitBreasting ?? (r as { suitPieces?: unknown }).suitPieces, costumeType, suitStyle),
    suitLapel: normalizeSuitLapel(r.suitLapel, costumeType, suitStyle),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

export function normalizeCostumeList(costumes: Costume[]): Costume[] {
  return costumes.map((c) => normalizeCostume(c))
}
