import type { Costume, FavoriteCombination } from './storage'
import { costumeSearchLabels, wardrobeLabelsMatchQuery } from './costume-search'
import { enrichCostumeColors, normalizePattern } from './theme-colors'

export const MAX_FAVORITE_COMBINATION_PIECES = 2

const OWNER_TYPES = new Set(['dress', 'suit', 'other'])
const PIECE_TYPES = new Set(['shirt', 'necktie', 'bowtie', 'accessory', 'other'])

export interface ResolvedFavoriteCombination {
  owner: Costume
  combination: FavoriteCombination
  pieces: Costume[]
  missingPieceIds: string[]
}

export interface FavoriteCombinationInput {
  name: string
  ownerId: string
  pieceIds: string[]
}

export interface FavoriteCombinationValidation {
  valid: boolean
  errors: string[]
  owner?: Costume
  pieces: Costume[]
  pieceIds: string[]
}

export function canOwnFavoriteCombination(costume: Costume): boolean {
  return !costume.type || OWNER_TYPES.has(costume.type)
}

export function canBeFavoriteCombinationPiece(costume: Costume): boolean {
  return !costume.type || PIECE_TYPES.has(costume.type)
}

export function validateFavoriteCombination(
  input: FavoriteCombinationInput,
  wardrobe: Costume[],
): FavoriteCombinationValidation {
  const errors: string[] = []
  const name = input.name.normalize('NFKC').trim()
  const owner = wardrobe.find((costume) => costume.id === input.ownerId)
  const pieceIds = Array.from(new Set(input.pieceIds.filter(Boolean))).filter(
    (id) => id !== input.ownerId,
  )
  const pieces = pieceIds.flatMap((id) => {
    const costume = wardrobe.find((candidate) => candidate.id === id)
    return costume ? [costume] : []
  })

  if (!name) errors.push('組み合わせ名を入力してください')
  if (name.length > 80) errors.push('組み合わせ名は80文字以内で入力してください')
  if (!owner) errors.push('主衣装を選択してください')
  else if (!canOwnFavoriteCombination(owner)) errors.push('主衣装にはドレス、スーツなどを選んでください')

  if (pieceIds.length === 0) errors.push('組み合わせる衣装を1点以上選んでください')
  if (pieceIds.length > MAX_FAVORITE_COMBINATION_PIECES) {
    errors.push(`組み合わせる衣装は${MAX_FAVORITE_COMBINATION_PIECES}点までです`)
  }
  if (pieces.length !== pieceIds.length) errors.push('削除済み、または存在しない衣装が含まれています')
  if (pieces.some((piece) => !canBeFavoriteCombinationPiece(piece))) {
    errors.push('組み合わせる衣装にはシャツ、ネクタイ、蝶ネクタイ、小物などを選んでください')
  }
  if (owner && !owner.image) errors.push(`主衣装「${owner.name}」に写真を登録してください`)
  const pieceWithoutPhoto = pieces.find((piece) => !piece.image)
  if (pieceWithoutPhoto) errors.push(`「${pieceWithoutPhoto.name}」に写真を登録してください`)

  const shirtCount = pieces.filter((piece) => piece.type === 'shirt').length
  if (shirtCount > 1 || (owner?.type === 'shirt' && shirtCount > 0)) {
    errors.push('ワイシャツは1つの組み合わせにつき1点までです')
  }
  const neckwearCount = pieces.filter((piece) => piece.type === 'necktie' || piece.type === 'bowtie').length
  if (neckwearCount > 1) errors.push('ネクタイと蝶ネクタイはどちらか1点を選んでください')

  return { valid: errors.length === 0, errors, owner, pieces, pieceIds }
}

export function resolveFavoriteCombinations(wardrobe: Costume[]): ResolvedFavoriteCombination[] {
  const byId = new Map(wardrobe.map((costume) => [costume.id, costume]))
  return wardrobe
    .flatMap((owner) =>
      (owner.favoriteCombinations ?? []).map((combination) => {
        const pieces = combination.pieceIds.flatMap((id) => {
          const costume = byId.get(id)
          return costume ? [costume] : []
        })
        const present = new Set(pieces.map((piece) => piece.id))
        return {
          owner,
          combination,
          pieces,
          missingPieceIds: combination.pieceIds.filter((id) => !present.has(id)),
        }
      }),
    )
    .sort(
      (a, b) =>
        b.combination.updatedAt - a.combination.updatedAt ||
        a.combination.id.localeCompare(b.combination.id),
    )
}

export function searchFavoriteCombinations(
  wardrobe: Costume[],
  query: string,
): ResolvedFavoriteCombination[] {
  return resolveFavoriteCombinations(wardrobe).filter((entry) => {
    const labels = [
      entry.combination.name,
      'お気に入り',
      'お気に入りコーデ',
      ...costumeSearchLabels(entry.owner),
      ...entry.pieces.flatMap(costumeSearchLabels),
    ]
    return wardrobeLabelsMatchQuery(labels, query)
  })
}

export function createFavoriteCombination(
  input: FavoriteCombinationInput,
  wardrobe: Costume[],
  now: number = Date.now(),
  id: string = `favorite_${now}_${Math.random().toString(36).slice(2, 9)}`,
): FavoriteCombination {
  const validation = validateFavoriteCombination(input, wardrobe)
  if (!validation.valid) throw new Error(validation.errors[0])
  return {
    id,
    name: input.name.normalize('NFKC').trim(),
    pieceIds: validation.pieceIds,
    createdAt: now,
    updatedAt: now,
  }
}

export function upsertFavoriteCombination(
  combinations: FavoriteCombination[] | undefined,
  next: FavoriteCombination,
): FavoriteCombination[] {
  const current = combinations ?? []
  const existing = current.find((combination) => combination.id === next.id)
  const value = existing ? { ...next, createdAt: existing.createdAt } : next
  return [...current.filter((combination) => combination.id !== next.id), value]
}

export function removeFavoriteCombination(
  combinations: FavoriteCombination[] | undefined,
  combinationId: string,
): FavoriteCombination[] {
  return (combinations ?? []).filter((combination) => combination.id !== combinationId)
}

export function materializeFavoriteCombination(
  entry: ResolvedFavoriteCombination,
): Costume | null {
  if (entry.missingPieceIds.length > 0 || entry.pieces.length === 0) return null

  const items = [entry.owner, ...entry.pieces]
  if (items.some((item) => !item.image)) return null
  const images = items.map((item) => item.image)
  const seasons = Array.from(new Set(items.flatMap((item) => item.season ?? [])))
  const tags = Array.from(new Set(items.flatMap((item) => item.tags ?? [])))
  const patternPriority = [
    ...entry.pieces.filter((item) => item.type === 'necktie' || item.type === 'bowtie' || item.type === 'accessory'),
    ...entry.pieces.filter((item) => item.type === 'shirt'),
    entry.owner,
  ]
  const pattern = patternPriority
    .map((item) => normalizePattern(item.pattern))
    .find((value) => value !== 'plain') ?? normalizePattern(entry.owner.pattern)

  return {
    id: `favorite-outfit:${entry.combination.id}`,
    name: entry.combination.name,
    image: images[0] ?? '',
    wearingPhotos: images.slice(1),
    tags,
    colors: enrichCostumeColors(items.flatMap((item) => item.colors)),
    tone: entry.owner.tone,
    pattern,
    season: seasons,
    type: entry.owner.type,
    silhouette: entry.owner.silhouette,
    suitStyle: entry.owner.suitStyle,
    suitBreasting: entry.owner.suitBreasting,
    suitLapel: entry.owner.suitLapel,
    componentCostumeIds: items.map((item) => item.id),
    componentCostumeNames: items.map((item) => item.name),
    createdAt: entry.combination.createdAt,
    updatedAt: Math.max(entry.combination.updatedAt, ...items.map((item) => item.updatedAt)),
  }
}

export function isAccessoryOnlyCostume(costume: Costume): boolean {
  return costume.type === 'necktie' || costume.type === 'bowtie' || costume.type === 'accessory'
}

/** イベント最適化へ渡す単位を「単品アクセサリー」ではなく「完成した装い」にそろえる。 */
export function buildCompleteOutfitCandidates(wardrobe: Costume[]): Costume[] {
  const resolved = resolveFavoriteCombinations(wardrobe)
  const materializedEntries = resolved.flatMap((entry) => {
    const costume = materializeFavoriteCombination(entry)
    return costume ? [{ entry, costume }] : []
  })
  const favoriteOutfits = materializedEntries.map(({ costume }) => costume)
  const ownersWithOutfits = new Set(
    materializedEntries.map(({ entry }) => entry.owner.id),
  )
  const piecesInOutfits = new Set(
    materializedEntries.flatMap(({ entry }) => entry.pieces.map((piece) => piece.id)),
  )

  const standalone = wardrobe.filter((costume) => {
    if (isAccessoryOnlyCostume(costume)) return false
    if (piecesInOutfits.has(costume.id)) return false
    if (costume.type === 'suit' && ownersWithOutfits.has(costume.id)) return false
    return true
  })

  return [...standalone, ...favoriteOutfits]
}
