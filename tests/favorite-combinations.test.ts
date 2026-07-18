import { describe, expect, it } from 'vitest'
import {
  MAX_AUTO_OUTFIT_CANDIDATES,
  MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER,
  buildAutoOutfitSuggestions,
  buildCompleteOutfitCandidates,
  createFavoriteCombination,
  isAccessoryOnlyCostume,
  materializeFavoriteCombination,
  resolveFavoriteCombinations,
  searchFavoriteCombinations,
  validateFavoriteCombination,
} from '../src/utils/favorite-combinations'
import type { Costume, FavoriteCombination } from '../src/utils/storage'

function costume(overrides: Partial<Costume> & Pick<Costume, 'id' | 'name'>): Costume {
  return {
    image: `data:image/jpeg;base64,${overrides.id}`,
    colors: [],
    tone: 'neutral',
    pattern: 'plain',
    season: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function combination(overrides: Partial<FavoriteCombination> = {}): FavoriteCombination {
  return {
    id: 'favorite-formal',
    name: 'ネイビーの本番コーデ',
    pieceIds: ['shirt-white', 'tie-red'],
    createdAt: 10,
    updatedAt: 20,
    ...overrides,
  }
}

function completeWardrobe(): Costume[] {
  return [
    costume({
      id: 'suit-navy',
      name: 'ネイビースーツ',
      type: 'suit',
      image: 'data:image/jpeg;base64,suit',
      colors: ['navy'],
      tone: 'dark',
      pattern: 'plain',
      season: ['autumn', 'winter'],
      tags: ['フォーマル'],
      suitStyle: 'standard',
      suitBreasting: 'double',
      favoriteCombinations: [combination()],
      updatedAt: 12,
    }),
    costume({
      id: 'shirt-white',
      name: '白ワイシャツ',
      type: 'shirt',
      image: 'data:image/jpeg;base64,shirt',
      colors: ['white'],
      pattern: 'stripe',
      season: ['spring', 'autumn'],
      tags: ['クラシック'],
      updatedAt: 14,
    }),
    costume({
      id: 'tie-red',
      name: '赤ドットネクタイ',
      type: 'necktie',
      image: 'data:image/jpeg;base64,tie',
      colors: ['red'],
      pattern: 'dot',
      season: ['winter'],
      tags: ['コンサート'],
      updatedAt: 16,
    }),
  ]
}

describe('favorite complete outfits', () => {
  it('validates a suit + shirt + necktie combination as one complete outfit', () => {
    const wardrobe = completeWardrobe()
    const result = validateFavoriteCombination(
      {
        name: '  ネイビー本番用  ',
        ownerId: 'suit-navy',
        pieceIds: ['shirt-white', 'tie-red', 'tie-red'],
      },
      wardrobe,
    )

    expect(result.valid).toBe(true)
    expect(result.owner?.id).toBe('suit-navy')
    expect(result.pieceIds).toEqual(['shirt-white', 'tie-red'])
    expect(result.pieces.map((piece) => piece.id)).toEqual(['shirt-white', 'tie-red'])
  })

  it('rejects a missing component and incompatible component choices', () => {
    const wardrobe = [
      ...completeWardrobe(),
      costume({ id: 'bowtie-black', name: '黒蝶ネクタイ', type: 'bowtie' }),
      costume({ id: 'dress-blue', name: '青ドレス', type: 'dress' }),
    ]

    const missing = validateFavoriteCombination(
      { name: '不完全', ownerId: 'suit-navy', pieceIds: ['removed-piece'] },
      wardrobe,
    )
    expect(missing.valid).toBe(false)
    expect(missing.errors.join(' ')).toMatch(/存在しない/)

    const twoNeckwear = validateFavoriteCombination(
      {
        name: '首元重複',
        ownerId: 'suit-navy',
        pieceIds: ['tie-red', 'bowtie-black'],
      },
      wardrobe,
    )
    expect(twoNeckwear.valid).toBe(false)
    expect(twoNeckwear.errors.join(' ')).toMatch(/どちらか1点/)

    const dressAsPiece = validateFavoriteCombination(
      { name: '不正な小物', ownerId: 'suit-navy', pieceIds: ['dress-blue'] },
      wardrobe,
    )
    expect(dressAsPiece.valid).toBe(false)
    expect(dressAsPiece.errors.join(' ')).toMatch(/シャツ/)
  })

  it('normalizes the saved name and emits stable timestamps and id', () => {
    const saved = createFavoriteCombination(
      {
        name: '  Ｎａｖｙ　コーデ  ',
        ownerId: 'suit-navy',
        pieceIds: ['shirt-white', 'tie-red'],
      },
      completeWardrobe(),
      1234,
      'favorite-fixed',
    )

    expect(saved).toEqual({
      id: 'favorite-fixed',
      name: 'Navy コーデ',
      pieceIds: ['shirt-white', 'tie-red'],
      createdAt: 1234,
      updatedAt: 1234,
    })
  })

  it('materializes deterministic aggregate attributes and all component photos', () => {
    const entry = resolveFavoriteCombinations(completeWardrobe())[0]
    const outfit = materializeFavoriteCombination(entry)

    expect(outfit).toEqual(expect.objectContaining({
      id: 'favorite-outfit:favorite-formal',
      name: 'ネイビーの本番コーデ',
      image: 'data:image/jpeg;base64,suit',
      wearingPhotos: [
        'data:image/jpeg;base64,shirt',
        'data:image/jpeg;base64,tie',
      ],
      colors: ['navy', 'white', 'red'],
      tone: 'dark',
      pattern: 'dot',
      season: ['autumn', 'winter', 'spring'],
      tags: ['フォーマル', 'クラシック', 'コンサート'],
      type: 'suit',
      suitStyle: 'standard',
      suitBreasting: 'double',
      componentCostumeIds: ['suit-navy', 'shirt-white', 'tie-red'],
      componentCostumeNames: ['ネイビースーツ', '白ワイシャツ', '赤ドットネクタイ'],
      createdAt: 10,
      updatedAt: 20,
    }))
  })

  it('does not materialize an outfit with a deleted component or missing component photo', () => {
    const withDeletedPiece = completeWardrobe().filter((item) => item.id !== 'tie-red')
    expect(materializeFavoriteCombination(resolveFavoriteCombinations(withDeletedPiece)[0])).toBeNull()

    const withMissingPhoto = completeWardrobe().map((item) =>
      item.id === 'shirt-white' ? { ...item, image: '' } : item,
    )
    expect(materializeFavoriteCombination(resolveFavoriteCombinations(withMissingPhoto)[0])).toBeNull()
  })

  it('searches favorite outfits through their name and component attributes', () => {
    const wardrobe = completeWardrobe()
    expect(searchFavoriteCombinations(wardrobe, '本番コーデ').map((entry) => entry.combination.id)).toEqual([
      'favorite-formal',
    ])
    expect(searchFavoriteCombinations(wardrobe, '赤 ドット').map((entry) => entry.combination.id)).toEqual([
      'favorite-formal',
    ])
    expect(searchFavoriteCombinations(wardrobe, 'お気に入り').map((entry) => entry.combination.id)).toEqual([
      'favorite-formal',
    ])
  })

  it('treats a suit + shirt + necktie as one candidate and excludes accessory-only singles', () => {
    const wardrobe = [
      ...completeWardrobe(),
      costume({ id: 'dress-blue', name: '青ドレス', type: 'dress', colors: ['blue'] }),
      costume({ id: 'bowtie-black', name: '黒蝶ネクタイ', type: 'bowtie' }),
      costume({ id: 'brooch-gold', name: '金ブローチ', type: 'accessory' }),
    ]

    const candidates = buildCompleteOutfitCandidates(wardrobe)
    const ids = candidates.map((item) => item.id)

    expect(ids).toContain('favorite-outfit:favorite-formal')
    expect(ids).toContain('dress-blue')
    expect(ids).not.toContain('suit-navy')
    expect(ids).not.toContain('tie-red')
    expect(ids).not.toContain('bowtie-black')
    expect(ids).not.toContain('brooch-gold')

    const favorite = candidates.find((item) => item.id === 'favorite-outfit:favorite-formal')
    expect(favorite?.componentCostumeIds).toEqual(['suit-navy', 'shirt-white', 'tie-red'])
  })

  it('keeps a standalone dress and falls back to the suit when its saved outfit is invalid', () => {
    const wardrobe = [
      ...completeWardrobe()
        .filter((item) => item.id !== 'tie-red')
        .map((item) => item.id === 'shirt-white' ? { ...item, image: '' } : item),
      costume({ id: 'dress-blue', name: '青ドレス', type: 'dress' }),
    ]

    const ids = buildCompleteOutfitCandidates(wardrobe).map((item) => item.id)
    expect(ids).toContain('dress-blue')
    expect(ids).toContain('suit-navy')
    expect(ids).not.toContain('favorite-outfit:favorite-formal')
  })

  it('uses the remaining photographed accessory when one saved component photo is missing', () => {
    const wardrobe = completeWardrobe().map((item) =>
      item.id === 'shirt-white' ? { ...item, image: '' } : item,
    )

    const candidates = buildCompleteOutfitCandidates(wardrobe)
    const ids = candidates.map((item) => item.id)
    expect(ids).not.toContain('suit-navy')
    expect(ids).not.toContain('favorite-outfit:favorite-formal')
    expect(ids.some((id) => id.startsWith('favorite-outfit:auto-'))).toBe(true)
    expect(candidates.find((item) => item.id.startsWith('favorite-outfit:auto-'))?.componentCostumeIds).toEqual([
      'suit-navy',
      'tie-red',
    ])
  })

  it('suggests compatible registered pieces deterministically when no manual outfit exists', () => {
    const wardrobe = [
      costume({
        id: 'suit-navy',
        name: 'ネイビースーツ',
        type: 'suit',
        colors: ['navy'],
        tone: 'dark',
        pattern: 'plain',
        season: ['winter'],
        tags: ['本番'],
      }),
      costume({
        id: 'shirt-compatible',
        name: '白シャツ',
        type: 'shirt',
        colors: ['white'],
        tone: 'dark',
        pattern: 'plain',
        season: ['winter'],
        tags: ['本番'],
      }),
      costume({
        id: 'shirt-clashing',
        name: '夏の花柄シャツ',
        type: 'shirt',
        colors: ['green'],
        tone: 'vivid',
        pattern: 'floral',
        season: ['summer'],
      }),
      costume({
        id: 'tie-red',
        name: '赤ネクタイ',
        type: 'necktie',
        colors: ['red'],
        tone: 'dark',
        pattern: 'dot',
        season: ['winter'],
      }),
    ]

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    const fromReversedWardrobe = buildAutoOutfitSuggestions([...wardrobe].reverse())

    expect(suggestions).toHaveLength(2)
    expect(suggestions[0].pieces.map((piece) => piece.id)).toEqual([
      'shirt-compatible',
      'tie-red',
    ])
    expect(suggestions[0].score).toBeGreaterThan(suggestions[1].score)
    expect(suggestions[0].reasons).toContain('色を合わせやすい')
    expect(suggestions[0].costume.id).toMatch(/^favorite-outfit:auto-[0-9a-f]{16}-[1-3]$/)
    expect(suggestions[0].costume.componentCostumeIds).toEqual([
      'suit-navy',
      'shirt-compatible',
      'tie-red',
    ])
    expect(fromReversedWardrobe.map(({ costume: item, score }) => [item.id, score])).toEqual(
      suggestions.map(({ costume: item, score }) => [item.id, score]),
    )
  })

  it('keeps the owner rank slot id when a suggested accessory is replaced', () => {
    const base = [
      costume({ id: 'suit-stable', name: 'スーツ', type: 'suit' }),
      costume({ id: 'shirt-stable', name: 'シャツ', type: 'shirt' }),
    ]
    const before = buildAutoOutfitSuggestions([
      ...base,
      costume({ id: 'tie-before', name: '赤ネクタイ', type: 'necktie' }),
    ])[0]
    const after = buildAutoOutfitSuggestions([
      ...base,
      costume({ id: 'tie-after', name: '青ネクタイ', type: 'necktie' }),
    ])[0]

    expect(after.costume.id).toBe(before.costume.id)
    expect(before.costume.componentCostumeIds).toEqual([
      'suit-stable',
      'shirt-stable',
      'tie-before',
    ])
    expect(after.costume.componentCostumeIds).toEqual([
      'suit-stable',
      'shirt-stable',
      'tie-after',
    ])
  })

  it('gives a valid manually saved favorite priority over automatic suggestions', () => {
    const wardrobe = completeWardrobe()
    expect(buildAutoOutfitSuggestions(wardrobe).some(({ owner }) => owner.id === 'suit-navy')).toBe(false)

    const candidates = buildCompleteOutfitCandidates(wardrobe)
    expect(candidates.filter((item) => item.id.startsWith('favorite-outfit:'))).toHaveLength(1)
    expect(candidates.some((item) => item.id === 'favorite-outfit:favorite-formal')).toBe(true)
    expect(candidates.some((item) => item.id.startsWith('favorite-outfit:auto-'))).toBe(false)
  })

  it('falls back to an automatic outfit when the saved favorite is incomplete', () => {
    const wardrobe = completeWardrobe().map((item) =>
      item.id === 'suit-navy'
        ? {
            ...item,
            favoriteCombinations: [combination({ pieceIds: ['removed-piece'] })],
          }
        : item,
    )

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    expect(suggestions.some(({ owner }) => owner.id === 'suit-navy')).toBe(true)
    expect(suggestions[0].costume.componentCostumeIds).toEqual([
      'suit-navy',
      'shirt-white',
      'tie-red',
    ])
  })

  it('materializes blouse + bottom + accessory and never offers either half alone', () => {
    const wardrobe = [
      costume({
        id: 'blouse-white',
        name: '白ブラウス',
        type: 'blouse',
        colors: ['white'],
        season: ['spring'],
      }),
      costume({
        id: 'skirt-blue',
        name: '青スカート',
        type: 'skirt',
        colors: ['blue'],
        pattern: 'stripe',
        season: ['spring'],
      }),
      costume({
        id: 'pants-black',
        name: '黒パンツ',
        type: 'pants',
        colors: ['black'],
        season: ['spring'],
      }),
      costume({
        id: 'brooch-gold',
        name: '金ブローチ',
        type: 'accessory',
        colors: ['gold'],
        season: ['spring'],
      }),
    ]

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    expect(suggestions).toHaveLength(2)
    expect(suggestions.every(({ costume: item }) => item.type === 'blouse')).toBe(true)
    expect(suggestions.every(({ costume: item }) => item.componentCostumeIds?.length === 3)).toBe(true)
    expect(suggestions.every(({ pieces }) => pieces.some((piece) => piece.type === 'skirt' || piece.type === 'pants'))).toBe(true)

    const candidates = buildCompleteOutfitCandidates(wardrobe)
    const ids = candidates.map((item) => item.id)
    expect(ids).not.toContain('blouse-white')
    expect(ids).not.toContain('skirt-blue')
    expect(ids).not.toContain('pants-black')
    expect(ids).not.toContain('brooch-gold')
    expect(ids.filter((id) => id.startsWith('favorite-outfit:auto-'))).toHaveLength(2)
  })

  it('also treats a registered shirt + trousers as a complete separates outfit', () => {
    const wardrobe = [
      costume({ id: 'shirt-stage', name: 'ステージシャツ', type: 'shirt' }),
      costume({ id: 'trousers-black', name: '黒トラウザー', type: 'trousers' }),
    ]

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].costume.componentCostumeIds).toEqual([
      'shirt-stage',
      'trousers-black',
    ])
    expect(buildCompleteOutfitCandidates(wardrobe).map((item) => item.id)).toEqual([
      suggestions[0].costume.id,
    ])
  })

  it('pairs a dress with generic accessories but not standalone neckwear', () => {
    const wardrobe = [
      costume({ id: 'dress-black', name: '黒ドレス', type: 'dress' }),
      costume({ id: 'necklace-pearl', name: 'パールネックレス', type: 'accessory' }),
      costume({ id: 'tie-blue', name: '青ネクタイ', type: 'necktie' }),
    ]

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].costume.componentCostumeIds).toEqual([
      'dress-black',
      'necklace-pearl',
    ])

    const ids = buildCompleteOutfitCandidates(wardrobe).map((item) => item.id)
    expect(ids).toContain('dress-black')
    expect(ids).not.toContain('necklace-pearl')
    expect(ids).not.toContain('tie-blue')
  })

  it('requires one bottom for a manual upper-garment outfit and prioritizes lower pattern metadata', () => {
    const wardrobe = [
      costume({ id: 'top-black', name: '黒トップス', type: 'top', pattern: 'plain' }),
      costume({ id: 'skirt-check', name: 'チェックスカート', type: 'skirt', pattern: 'check' }),
      costume({ id: 'brooch-pearl', name: 'パールブローチ', type: 'accessory', pattern: 'plain' }),
    ]
    const valid = validateFavoriteCombination(
      {
        name: 'モノトーン',
        ownerId: 'top-black',
        pieceIds: ['skirt-check', 'brooch-pearl'],
      },
      wardrobe,
    )
    const missingBottom = validateFavoriteCombination(
      {
        name: '未完成',
        ownerId: 'top-black',
        pieceIds: ['brooch-pearl'],
      },
      wardrobe,
    )

    expect(valid.valid).toBe(true)
    expect(missingBottom.valid).toBe(false)
    expect(missingBottom.errors.join(' ')).toMatch(/ボトムスを1点/)

    const outfit = materializeFavoriteCombination({
      owner: wardrobe[0],
      pieces: [wardrobe[1], wardrobe[2]],
      missingPieceIds: [],
      combination: combination({
        id: 'favorite-separates',
        name: 'モノトーン',
        pieceIds: ['skirt-check', 'brooch-pearl'],
      }),
    })
    expect(outfit?.pattern).toBe('check')
    expect(outfit?.componentCostumeIds).toEqual(['top-black', 'skirt-check', 'brooch-pearl'])
  })

  it('never emits a lower garment alone and keeps a legacy other piece valid for dresses', () => {
    const skirt = costume({ id: 'skirt-only', name: 'スカート', type: 'skirt' })
    const dress = costume({ id: 'dress-blue', name: '青ドレス', type: 'dress' })
    const legacyOther = costume({
      id: 'legacy-shawl',
      name: 'ショール',
      type: 'other',
      pattern: 'floral',
    })

    expect(buildCompleteOutfitCandidates([skirt]).map((item) => item.id)).not.toContain('skirt-only')
    expect(validateFavoriteCombination(
      { name: '旧形式', ownerId: 'dress-blue', pieceIds: ['legacy-shawl'] },
      [dress, legacyOther],
    ).valid).toBe(true)
    expect(materializeFavoriteCombination({
      owner: dress,
      pieces: [legacyOther],
      missingPieceIds: [],
      combination: combination({ name: '旧形式', pieceIds: ['legacy-shawl'] }),
    })?.pattern).toBe('floral')
  })

  it('filters raw upper/lower/accent items but retains a materialized complete outfit', () => {
    const rawBlouse = costume({ id: 'blouse-raw', name: 'ブラウス', type: 'blouse' })
    const completeBlouseOutfit = costume({
      id: 'favorite-outfit:auto-fixed',
      name: 'ブラウスとスカート',
      type: 'blouse',
      componentCostumeIds: ['blouse-raw', 'skirt-raw'],
      componentCostumeNames: ['ブラウス', 'スカート'],
    })

    expect(isAccessoryOnlyCostume(rawBlouse)).toBe(true)
    expect(isAccessoryOnlyCostume(costume({ id: 'skirt-raw', name: 'スカート', type: 'skirt' }))).toBe(true)
    expect(isAccessoryOnlyCostume(costume({ id: 'tie-raw', name: 'ネクタイ', type: 'necktie' }))).toBe(true)
    expect(isAccessoryOnlyCostume(completeBlouseOutfit)).toBe(false)
  })

  it('keeps physically disjoint alternatives inside each owner candidate cap', () => {
    const wardrobe = [
      costume({ id: 'suit-diverse', name: 'スーツ', type: 'suit' }),
      ...Array.from({ length: 3 }, (_, index) =>
        costume({ id: `shirt-diverse-${index}`, name: `シャツ${index}`, type: 'shirt' }),
      ),
      ...Array.from({ length: 3 }, (_, index) =>
        costume({ id: `tie-diverse-${index}`, name: `ネクタイ${index}`, type: 'necktie' }),
      ),
    ]

    const suggestions = buildAutoOutfitSuggestions(wardrobe)
    expect(suggestions).toHaveLength(MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER)

    const usedPieces = new Set<string>()
    for (const suggestion of suggestions) {
      for (const piece of suggestion.pieces) {
        expect(usedPieces.has(piece.id)).toBe(false)
        usedPieces.add(piece.id)
      }
    }
  })

  it('distributes first-choice components across more than eight base garments', () => {
    const suits = Array.from({ length: 9 }, (_, index) =>
      costume({ id: `suit-group-${index}`, name: `スーツ${index}`, type: 'suit' }),
    )
    const shirts = Array.from({ length: 9 }, (_, index) =>
      costume({ id: `shirt-group-${index}`, name: `シャツ${index}`, type: 'shirt' }),
    )

    const suggestions = buildAutoOutfitSuggestions([...suits, ...shirts])
    const firstChoiceByOwner = suggestions.filter(({ costume: item }) =>
      item.id.endsWith('-1'),
    )

    expect(suggestions).toHaveLength(MAX_AUTO_OUTFIT_CANDIDATES)
    expect(firstChoiceByOwner).toHaveLength(9)
    expect(new Set(
      firstChoiceByOwner.map(({ pieces }) => pieces[0]?.id),
    )).toEqual(new Set(shirts.map((shirt) => shirt.id)))
  })

  it('caps automatic outfit generation per owner and across the wardrobe', () => {
    const suits = Array.from({ length: 5 }, (_, index) =>
      costume({ id: `suit-${index}`, name: `スーツ${index}`, type: 'suit' }),
    )
    const shirts = Array.from({ length: 12 }, (_, index) =>
      costume({ id: `shirt-${index}`, name: `シャツ${index}`, type: 'shirt' }),
    )
    const accents = Array.from({ length: 12 }, (_, index) =>
      costume({ id: `tie-${index}`, name: `ネクタイ${index}`, type: 'necktie' }),
    )

    const suggestions = buildAutoOutfitSuggestions([...suits, ...shirts, ...accents])
    const perOwner = new Map<string, number>()
    for (const suggestion of suggestions) {
      perOwner.set(suggestion.owner.id, (perOwner.get(suggestion.owner.id) ?? 0) + 1)
    }

    expect(suggestions).toHaveLength(MAX_AUTO_OUTFIT_CANDIDATES)
    expect(Math.max(...perOwner.values())).toBeLessThanOrEqual(MAX_AUTO_OUTFIT_CANDIDATES_PER_OWNER)
    expect([...perOwner.keys()].sort()).toEqual(suits.map((item) => item.id).sort())
    expect(suggestions.every(({ costume: item }) => item.componentCostumeIds?.length === 3)).toBe(true)
  })
})
