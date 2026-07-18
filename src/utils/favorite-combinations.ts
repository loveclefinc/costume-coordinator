import type { Costume, FavoriteCombination } from './storage'
import { costumeSearchLabels, wardrobeLabelsMatchQuery } from './costume-search'
import { enrichCostumeColors, normalizePattern } from './theme-colors'

export const MAX_FAVORITE_COMBINATION_PIECES = 2
export const MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER = 3
export const MAX_AUTO_OUTFIT_CANDIDATES = 12
const MAX_AUTO_COMPONENT_OPTIONS_PER_ROLE = 8

const OWNER_TYPES = new Set(['dress', 'suit', 'shirt', 'blouse', 'top', 'other'])
const UPPER_TYPES = new Set(['shirt', 'blouse', 'top'])
const SUIT_INNER_TYPES = new Set(['shirt', 'blouse'])
const LOWER_TYPES = new Set(['skirt', 'bottom', 'pants', 'trousers'])
const ACCENT_TYPES = new Set(['necktie', 'bowtie', 'accessory'])
const PIECE_TYPES = new Set([
  ...UPPER_TYPES,
  ...LOWER_TYPES,
  ...ACCENT_TYPES,
  'other',
])

const NEUTRAL_COLORS = new Set([
  'black',
  'white',
  'gray',
  'grey',
  'brown',
  'beige',
  'cream',
  'navy',
  'silver',
  'gold',
])

const COMPLEMENTARY_COLOR_PAIRS = new Set([
  'blue|orange',
  'blue|brown',
  'green|pink',
  'green|red',
  'navy|pink',
  'navy|red',
  'purple|yellow',
])

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

export interface AutoOutfitSuggestion {
  /** Worker にそのまま提出できる、写真と構成品情報をまとめた候補。 */
  costume: Costume
  owner: Costume
  pieces: Costume[]
  /** 既存属性の組み合わせやすさを0〜100に丸めた決定的スコア。 */
  score: number
  /** UI 向けの短い提案根拠。最終的なイベント割当理由とは別物。 */
  reasons: string[]
}

type AutoOutfitKind = 'suit' | 'dress' | 'separates'

interface AutoOutfitBlueprint {
  owner: Costume
  pieces: Costume[]
  kind: AutoOutfitKind
}

interface ScoredAutoOutfitBlueprint {
  blueprint: AutoOutfitBlueprint
  score: number
  reasons: string[]
  componentKey: string
}

function normalizedCostumeType(costume: Pick<Costume, 'type'>): string {
  return costume.type?.trim().toLowerCase() ?? ''
}

function isUpperGarment(costume: Pick<Costume, 'type'>): boolean {
  return UPPER_TYPES.has(normalizedCostumeType(costume))
}

function isSuitInnerGarment(costume: Pick<Costume, 'type'>): boolean {
  return SUIT_INNER_TYPES.has(normalizedCostumeType(costume))
}

function isLowerGarment(costume: Pick<Costume, 'type'>): boolean {
  return LOWER_TYPES.has(normalizedCostumeType(costume))
}

function isAccent(costume: Pick<Costume, 'type'>): boolean {
  return ACCENT_TYPES.has(normalizedCostumeType(costume))
}

function isGenericAccessory(costume: Pick<Costume, 'type'>): boolean {
  return normalizedCostumeType(costume) === 'accessory'
}

function isLegacyOtherPiece(costume: Pick<Costume, 'type'>): boolean {
  const type = normalizedCostumeType(costume)
  return !type || type === 'other'
}

export function canOwnFavoriteCombination(costume: Costume): boolean {
  const type = normalizedCostumeType(costume)
  return !type || OWNER_TYPES.has(type)
}

export function canBeFavoriteCombinationPiece(costume: Costume): boolean {
  const type = normalizedCostumeType(costume)
  return !type || PIECE_TYPES.has(type)
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
  if (!owner) errors.push('ベース衣装を選択してください')
  else if (!canOwnFavoriteCombination(owner)) errors.push('ベース衣装にはドレス、スーツ、トップスなどを選んでください')

  if (pieceIds.length === 0) errors.push('組み合わせる衣装を1点以上選んでください')
  if (pieceIds.length > MAX_FAVORITE_COMBINATION_PIECES) {
    errors.push(`組み合わせる衣装は${MAX_FAVORITE_COMBINATION_PIECES}点までです`)
  }
  if (pieces.length !== pieceIds.length) errors.push('削除済み、または存在しない衣装が含まれています')
  if (pieces.some((piece) => !canBeFavoriteCombinationPiece(piece))) {
    errors.push('組み合わせる衣装にはシャツ・トップス、ボトムス、ネクタイ類、小物などを選んでください')
  }
  if (owner && !owner.image) errors.push(`ベース衣装「${owner.name}」に写真を登録してください`)
  const pieceWithoutPhoto = pieces.find((piece) => !piece.image)
  if (pieceWithoutPhoto) errors.push(`「${pieceWithoutPhoto.name}」に写真を登録してください`)

  const upperCount = pieces.filter(isUpperGarment).length
  if (upperCount > 1 || (owner && isUpperGarment(owner) && upperCount > 0)) {
    errors.push('シャツ・トップスは1つの組み合わせにつき1点までです')
  }
  const lowerCount = pieces.filter(isLowerGarment).length
  if (lowerCount > 1) errors.push('ボトムスは1つの組み合わせにつき1点までです')

  const neckwearCount = pieces.filter((piece) => {
    const type = normalizedCostumeType(piece)
    return type === 'necktie' || type === 'bowtie'
  }).length
  if (neckwearCount > 1) errors.push('ネクタイと蝶ネクタイはどちらか1点を選んでください')

  if (owner) {
    const ownerType = normalizedCostumeType(owner)
    if (ownerType === 'suit' && lowerCount > 0) {
      errors.push('スーツにはボトムスを追加できません')
    }
    if (ownerType === 'dress' && pieces.some((piece) => !isAccent(piece) && !isLegacyOtherPiece(piece))) {
      errors.push('ドレスにはアクセサリー類を組み合わせてください')
    }
    if (isUpperGarment(owner)) {
      if (lowerCount !== 1) {
        errors.push('シャツ・トップスにはボトムスを1点組み合わせてください')
      }
      if (pieces.some((piece) => !isLowerGarment(piece) && !isAccent(piece))) {
        errors.push('シャツ・トップスにはボトムスと小物を組み合わせてください')
      }
    }
  }

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
    ...entry.pieces.filter(isAccent),
    ...entry.pieces.filter(isLowerGarment),
    ...entry.pieces.filter(isUpperGarment),
    ...entry.pieces.filter(isLegacyOtherPiece),
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
  if ((costume.componentCostumeIds?.length ?? 0) >= 2) return false
  return isAccent(costume) || isUpperGarment(costume) || isLowerGarment(costume)
}

function hasPhysicalPhoto(costume: Costume): boolean {
  return Boolean(costume.image) && (costume.componentCostumeIds?.length ?? 0) < 2
}

function compareCostumeIds(a: Costume, b: Costume): number {
  return a.id.localeCompare(b.id)
}

function stableAutoOutfitHash(componentIds: string[]): string {
  const value = componentIds.join('\u001f')
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}

function normalizedValues(values: string[] | undefined): Set<string> {
  return new Set(
    (values ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )
}

function setsOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const value of a) {
    if (b.has(value)) return true
  }
  return false
}

function colorsAreEasyToCombine(a: Set<string>, b: Set<string>): boolean {
  if (setsOverlap(a, b)) return true
  if ([...a].some((color) => NEUTRAL_COLORS.has(color))) return true
  if ([...b].some((color) => NEUTRAL_COLORS.has(color))) return true

  for (const first of a) {
    for (const second of b) {
      const pair = [first, second].sort().join('|')
      if (COMPLEMENTARY_COLOR_PAIRS.has(pair)) return true
    }
  }
  return false
}

function autoOutfitScore(blueprint: AutoOutfitBlueprint): { score: number; reasons: string[] } {
  const items = [blueprint.owner, ...blueprint.pieces]
  const reasons = new Set<string>()
  let score = blueprint.kind === 'separates' ? 58 : blueprint.kind === 'suit' ? 54 : 50

  if (blueprint.kind === 'suit') {
    reasons.add(
      blueprint.pieces.some(isUpperGarment)
        ? 'スーツにシャツと小物を補完'
        : 'スーツに小物を補完',
    )
  } else if (blueprint.kind === 'dress') {
    reasons.add('ドレスに登録済みの小物をコーディネート')
  } else {
    reasons.add('トップスとボトムスを完成コーデに統合')
  }

  if (blueprint.pieces.some(isAccent)) score += 4

  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      const a = items[left]
      const b = items[right]
      const seasonsA = normalizedValues(a.season)
      const seasonsB = normalizedValues(b.season)
      if (seasonsA.size > 0 && seasonsB.size > 0) {
        if (setsOverlap(seasonsA, seasonsB)) {
          score += 5
          reasons.add('着用シーズンが合う')
        } else {
          score -= 6
        }
      }

      const toneA = a.tone.trim().toLowerCase()
      const toneB = b.tone.trim().toLowerCase()
      if (toneA && toneB && toneA === toneB) {
        score += 4
        reasons.add('トーンがそろう')
      } else if (toneA === 'neutral' || toneB === 'neutral') {
        score += 2
      }

      const colorsA = normalizedValues(enrichCostumeColors(a.colors))
      const colorsB = normalizedValues(enrichCostumeColors(b.colors))
      if (colorsA.size > 0 && colorsB.size > 0 && colorsAreEasyToCombine(colorsA, colorsB)) {
        score += 5
        reasons.add('色を合わせやすい')
      }

      const patternA = normalizePattern(a.pattern)
      const patternB = normalizePattern(b.pattern)
      if (patternA !== 'plain' && patternB !== 'plain') {
        score -= 7
      } else {
        score += 2
        reasons.add('柄同士が競合しにくい')
      }

      if (setsOverlap(normalizedValues(a.tags), normalizedValues(b.tags))) {
        score += 2
      }
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons: [...reasons].slice(0, 4),
  }
}

function buildAutoOutfitName(items: Costume[]): string {
  const normalized = `おすすめ: ${items.map((item) => item.name.trim()).join(' + ')}`
    .normalize('NFKC')
    .trim()
  return Array.from(normalized).slice(0, 80).join('')
}

function materializeAutoOutfit(
  blueprint: AutoOutfitBlueprint,
  ownerRank: number,
): AutoOutfitSuggestion | null {
  const items = [blueprint.owner, ...blueprint.pieces]
  const timestamp = Math.max(...items.map((item) => item.createdAt))
  const combination: FavoriteCombination = {
    id: `auto-${stableAutoOutfitHash([blueprint.owner.id])}-${ownerRank}`,
    name: buildAutoOutfitName(items),
    pieceIds: blueprint.pieces.map((piece) => piece.id),
    createdAt: timestamp,
    updatedAt: Math.max(...items.map((item) => item.updatedAt)),
  }
  const costume = materializeFavoriteCombination({
    owner: blueprint.owner,
    combination,
    pieces: blueprint.pieces,
    missingPieceIds: [],
  })
  if (!costume) return null

  const scored = autoOutfitScore(blueprint)
  return {
    costume,
    owner: blueprint.owner,
    pieces: blueprint.pieces,
    ...scored,
  }
}

function bestComponentOptions(
  owner: Costume,
  candidates: Costume[],
  kind: AutoOutfitKind,
): Costume[] {
  return candidates
    .map((candidate) => ({
      candidate,
      score: autoOutfitScore({ owner, pieces: [candidate], kind }).score,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .slice(0, MAX_AUTO_COMPONENT_OPTIONS_PER_ROLE)
    .map(({ candidate }) => candidate)
}

function autoOutfitBlueprintsForOwner(owner: Costume, available: Costume[]): AutoOutfitBlueprint[] {
  const ownerType = normalizedCostumeType(owner)
  const accentCandidates = available.filter(
    (item) =>
      item.id !== owner.id &&
      isAccent(item) &&
      (
        (ownerType !== 'dress' && ownerType !== 'blouse' && ownerType !== 'top') ||
        isGenericAccessory(item)
      ),
  )
  const accents = bestComponentOptions(
    owner,
    accentCandidates,
    ownerType === 'dress' ? 'dress' : ownerType === 'suit' ? 'suit' : 'separates',
  )

  if (ownerType === 'suit') {
    const shirts = bestComponentOptions(
      owner,
      available.filter((item) => item.id !== owner.id && isSuitInnerGarment(item)),
      'suit',
    )
    if (shirts.length > 0) {
      if (accents.length > 0) {
        return shirts.flatMap((shirt) =>
          accents.map((accent) => ({ owner, pieces: [shirt, accent], kind: 'suit' as const })),
        )
      }
      return shirts.map((shirt) => ({ owner, pieces: [shirt], kind: 'suit' as const }))
    }
    return accents.map((accent) => ({ owner, pieces: [accent], kind: 'suit' as const }))
  }

  if (ownerType === 'dress') {
    return accents.map((accent) => ({ owner, pieces: [accent], kind: 'dress' as const }))
  }

  if (isUpperGarment(owner)) {
    const bottoms = bestComponentOptions(
      owner,
      available.filter((item) => item.id !== owner.id && isLowerGarment(item)),
      'separates',
    )
    if (bottoms.length === 0) return []
    if (accents.length > 0) {
      return bottoms.flatMap((bottom) =>
        accents.map((accent) => ({ owner, pieces: [bottom, accent], kind: 'separates' as const })),
      )
    }
    return bottoms.map((bottom) => ({ owner, pieces: [bottom], kind: 'separates' as const }))
  }

  return []
}

/**
 * 点数だけで上位を切ると、全候補が同じシャツや小物を共有し、物理構成品の
 * 排他によって他の参加者へ割り当てられなくなる。最初は最高点を選び、以降は
 * 既選択候補と共有する構成品が少ない候補を優先して、上限内にも代替を残す。
 */
function selectDiverseAutoOutfitBlueprints(
  blueprints: AutoOutfitBlueprint[],
): ScoredAutoOutfitBlueprint[] {
  const remaining: ScoredAutoOutfitBlueprint[] = blueprints
    .map((blueprint) => ({
      blueprint,
      ...autoOutfitScore(blueprint),
      componentKey: [blueprint.owner, ...blueprint.pieces]
        .map((item) => item.id)
        .join('\u001f'),
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.componentKey.localeCompare(b.componentKey),
    )
  const selected: ScoredAutoOutfitBlueprint[] = []
  const usedPieceIds = new Set<string>()

  while (
    remaining.length > 0 &&
    selected.length < MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER
  ) {
    remaining.sort((a, b) => {
      if (selected.length === 0) {
        return b.score - a.score || a.componentKey.localeCompare(b.componentKey)
      }
      const reusedByA = a.blueprint.pieces.reduce(
        (count, piece) => count + (usedPieceIds.has(piece.id) ? 1 : 0),
        0,
      )
      const reusedByB = b.blueprint.pieces.reduce(
        (count, piece) => count + (usedPieceIds.has(piece.id) ? 1 : 0),
        0,
      )
      return (
        reusedByA - reusedByB ||
        b.score - a.score ||
        a.componentKey.localeCompare(b.componentKey)
      )
    })

    const next = remaining.shift()
    if (!next) break
    selected.push(next)
    next.blueprint.pieces.forEach((piece) => usedPieceIds.add(piece.id))
  }

  return selected
}

function isValidResolvedFavorite(entry: ResolvedFavoriteCombination, wardrobe: Costume[]): boolean {
  const validation = validateFavoriteCombination(
    {
      name: entry.combination.name,
      ownerId: entry.owner.id,
      pieceIds: entry.combination.pieceIds,
    },
    wardrobe,
  )
  return validation.valid && materializeFavoriteCombination(entry) !== null
}

/**
 * 保存済みコーデがないベース衣装に限り、手元の構成品から決定的に完成コーデ候補を作る。
 * 各1着につき上位3件、全体12件までとし、メインスレッドでの無制限な組合せを防ぐ。
 */
export function buildAutoOutfitSuggestions(wardrobe: Costume[]): AutoOutfitSuggestion[] {
  const resolved = resolveFavoriteCombinations(wardrobe)
  const ownersWithValidManualFavorites = new Set(
    resolved
      .filter((entry) => isValidResolvedFavorite(entry, wardrobe))
      .map((entry) => entry.owner.id),
  )
  const available = wardrobe
    .filter(hasPhysicalPhoto)
    .sort(compareCostumeIds)
  const owners = available.filter((costume) => {
    if (ownersWithValidManualFavorites.has(costume.id)) return false
    const type = normalizedCostumeType(costume)
    return type === 'suit' || type === 'dress' || isUpperGarment(costume)
  })

  const suggestionsByOwner = owners.map((owner) => {
    const rankedBlueprints = selectDiverseAutoOutfitBlueprints(
      autoOutfitBlueprintsForOwner(owner, available),
    )

    return rankedBlueprints.flatMap(({ blueprint }, index) => {
      const suggestion = materializeAutoOutfit(blueprint, index + 1)
      return suggestion ? [suggestion] : []
    })
  })

  const suggestions: AutoOutfitSuggestion[] = []
  for (
    let rank = 0;
    rank < MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER && suggestions.length < MAX_AUTO_OUTFIT_CANDIDATES;
    rank += 1
  ) {
    const layer = suggestionsByOwner
      .flatMap((ownerSuggestions) => ownerSuggestions[rank] ? [ownerSuggestions[rank]] : [])
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.owner.id.localeCompare(b.owner.id) ||
          a.costume.id.localeCompare(b.costume.id),
      )

    suggestions.push(...layer.slice(0, MAX_AUTO_OUTFIT_CANDIDATES - suggestions.length))
  }

  return suggestions
}

/** イベント最適化へ渡す単位を「単品アクセサリー」ではなく「完成した装い」にそろえる。 */
export function buildCompleteOutfitCandidates(wardrobe: Costume[]): Costume[] {
  const resolved = resolveFavoriteCombinations(wardrobe)
  const materializedEntries = resolved.flatMap((entry) => {
    if (!isValidResolvedFavorite(entry, wardrobe)) return []
    const costume = materializeFavoriteCombination(entry)
    return costume ? [{ entry, costume }] : []
  })
  const favoriteOutfits = materializedEntries.map(({ costume }) => costume)
  const autoSuggestions = buildAutoOutfitSuggestions(wardrobe)
  const autoOutfits = autoSuggestions.map(({ costume }) => costume)
  const ownersWithOutfits = new Set(
    [
      ...materializedEntries.map(({ entry }) => entry.owner.id),
      ...autoSuggestions.map(({ owner }) => owner.id),
    ],
  )
  const piecesInOutfits = new Set(
    [
      ...materializedEntries.flatMap(({ entry }) => entry.pieces.map((piece) => piece.id)),
      ...autoSuggestions.flatMap(({ pieces }) => pieces.map((piece) => piece.id)),
    ],
  )

  const standalone = wardrobe.filter((costume) => {
    if (isAccessoryOnlyCostume(costume)) return false
    if (isUpperGarment(costume)) return false
    if (piecesInOutfits.has(costume.id)) return false
    if (costume.type === 'suit' && ownersWithOutfits.has(costume.id)) return false
    return true
  })

  return [...standalone, ...favoriteOutfits, ...autoOutfits]
}
