import type { Costume, FavoriteCombination } from './storage'
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

export function normalizeCostumeTags(tags: unknown): string[] {
  const values = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(/[,、，\n]/)
      : []

  const normalized = values
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.normalize('NFKC').trim())
    .filter(Boolean)

  return Array.from(new Set(normalized))
}

export function normalizeFavoriteCombinations(value: unknown): FavoriteCombination[] {
  if (!Array.isArray(value)) return []

  const now = Date.now()
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const raw = entry as Partial<FavoriteCombination>
    const id = typeof raw.id === 'string' ? raw.id.trim() : ''
    const name = typeof raw.name === 'string' ? raw.name.normalize('NFKC').trim() : ''
    const pieceIds = Array.isArray(raw.pieceIds)
      ? Array.from(new Set(raw.pieceIds.filter((item): item is string => typeof item === 'string' && item.length > 0))).slice(0, 2)
      : []

    if (!id || !name || pieceIds.length < 1) return []
    return [{
      id,
      name: name.slice(0, 80),
      pieceIds,
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    }]
  })
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

  const componentCostumeIds = Array.isArray(r.componentCostumeIds)
    ? Array.from(new Set(r.componentCostumeIds.filter((id): id is string => typeof id === 'string' && id.length > 0))).slice(0, 3)
    : []
  const rawComponentNames = Array.isArray(r.componentCostumeNames)
    ? r.componentCostumeNames
        .map((name) => typeof name === 'string' ? name.trim() : '')
        .slice(0, componentCostumeIds.length)
    : []
  const componentCostumeNames = componentCostumeIds.map(
    (_, index) => rawComponentNames[index] || `構成アイテム${index + 1}`,
  )
  const normalizedWearingPhotos = Array.isArray(r.wearingPhotos)
    ? r.wearingPhotos.filter((photo): photo is string => typeof photo === 'string' && photo.length > 0)
    : []
  const wearingPhotos = componentCostumeIds.length >= 2
    ? normalizedWearingPhotos.slice(0, componentCostumeIds.length - 1)
    : normalizedWearingPhotos

  return {
    id: r.id,
    name: r.name ?? '',
    image,
    wearingPhotos,
    tags: normalizeCostumeTags(r.tags),
    favoriteCombinations: normalizeFavoriteCombinations(r.favoriteCombinations),
    componentCostumeIds,
    componentCostumeNames,
    colors: enrichCostumeColors(normalizeCostumeColors(r.colors)),
    tone: (tone as Costume['tone']) || 'neutral',
    pattern: normalizePattern(r.pattern || 'solid'),
    season: normalizeSeason(r.season),
    type: costumeType,
    silhouette: normalizeSilhouette(r.silhouette, costumeType),
    suitStyle,
    suitBreasting: normalizeSuitBreasting(r.suitBreasting ?? (r as { suitPieces?: unknown }).suitPieces, costumeType, suitStyle),
    suitLapel: normalizeSuitLapel(r.suitLapel, costumeType, suitStyle),
    sourceEventId: typeof r.sourceEventId === 'string' ? r.sourceEventId : undefined,
    sourceParticipantName: typeof r.sourceParticipantName === 'string' ? r.sourceParticipantName : undefined,
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
  }
}

export function normalizeCostumeList(costumes: Costume[]): Costume[] {
  return costumes.map((c) => normalizeCostume(c))
}
