import { describe, expect, it } from 'vitest'
import {
  buildCompleteOutfitCandidates,
  createFavoriteCombination,
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

  it('keeps the base suit available when every component exists but one photo is missing', () => {
    const wardrobe = completeWardrobe().map((item) =>
      item.id === 'shirt-white' ? { ...item, image: '' } : item,
    )

    const ids = buildCompleteOutfitCandidates(wardrobe).map((item) => item.id)
    expect(ids).toContain('suit-navy')
    expect(ids).not.toContain('favorite-outfit:favorite-formal')
  })
})
