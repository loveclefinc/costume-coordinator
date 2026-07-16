import { describe, it, expect } from 'vitest'
import {
  normalizeCostume,
  normalizeCostumeColors,
  normalizeCostumeTags,
  normalizeFavoriteCombinations,
} from '../../src/utils/costume-normalize'

describe('costume-normalize', () => {
  it('converts legacy colors object to array', () => {
    expect(
      normalizeCostumeColors({ primary: '#ff0000', secondary: '#00ff00' }),
    ).toEqual(['#ff0000', '#00ff00'])
  })

  it('normalizes full costume with imageUri', () => {
    const c = normalizeCostume({
      id: '1',
      name: 'Test',
      imageUri: 'data:image/png;base64,x',
      colors: { primary: '#abc' },
      tone: 'neutral',
      pattern: 'solid',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(c.image).toBe('data:image/png;base64,x')
    expect(c.colors[0]).toBe('#ABC')
    expect(c.pattern).toBe('plain')
    expect(c.season).toEqual([])
  })

  it('keeps dress silhouette and strips it for non-dress types', () => {
    const dress = normalizeCostume({
      id: '1',
      name: 'Dress',
      image: 'data:image/png;base64,x',
      colors: ['blue'],
      tone: 'vivid',
      pattern: 'floral',
      type: 'dress',
      silhouette: 'princess',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(dress.silhouette).toBe('princess')

    const suit = normalizeCostume({
      id: '2',
      name: 'Suit',
      image: 'data:image/png;base64,x',
      colors: ['black'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      silhouette: 'a_line',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(suit.silhouette).toBeUndefined()
  })

  it('keeps suit breasting and strips it for non-suit types', () => {
    const suit = normalizeCostume({
      id: '2',
      name: 'Suit',
      image: 'data:image/png;base64,x',
      colors: ['black'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      suitStyle: 'standard',
      suitBreasting: 'double',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(suit.suitBreasting).toBe('double')

    const dress = normalizeCostume({
      id: '3',
      name: 'Dress',
      image: 'data:image/png;base64,x',
      colors: ['blue'],
      tone: 'vivid',
      pattern: 'floral',
      type: 'dress',
      suitBreasting: 'single',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(dress.suitBreasting).toBeUndefined()
  })

  it('normalizes comma-separated tags with NFKC trimming and de-duplication', () => {
    expect(normalizeCostumeTags('  Ｆｏｒｍａｌ、本番,Formal\n ')).toEqual([
      'Formal',
      '本番',
    ])
  })

  it('sanitizes saved favorite combinations and caps them to two pieces', () => {
    expect(normalizeFavoriteCombinations([
      {
        id: ' favorite-1 ',
        name: '  Ｎａｖｙ　コーデ  ',
        pieceIds: ['shirt-1', 'tie-1', 'tie-1', 'extra-1'],
        createdAt: 100,
        updatedAt: 200,
      },
      { id: '', name: '無効', pieceIds: ['x'] },
      { id: 'favorite-empty', name: '空', pieceIds: [] },
      null,
    ])).toEqual([
      {
        id: 'favorite-1',
        name: 'Navy コーデ',
        pieceIds: ['shirt-1', 'tie-1'],
        createdAt: 100,
        updatedAt: 200,
      },
    ])
  })

  it('preserves sanitized outfit component metadata for imported complete outfits', () => {
    const normalized = normalizeCostume({
      id: 'favorite-outfit:1',
      name: 'ネイビーコーデ',
      image: 'data:image/jpeg;base64,suit',
      wearingPhotos: ['', 'data:image/jpeg;base64,shirt', 123],
      tags: ['  フォーマル  ', 'フォーマル', ''],
      favoriteCombinations: [
        {
          id: 'draft-1',
          name: '別の下書き',
          pieceIds: ['private-piece'],
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      componentCostumeIds: ['suit-1', 'shirt-1', 'tie-1', 'shirt-1', '', 123],
      componentCostumeNames: ['  スーツ ', '白シャツ', '', 123],
      colors: ['navy'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      season: [],
      createdAt: 1,
      updatedAt: 2,
    })

    expect(normalized.wearingPhotos).toEqual(['data:image/jpeg;base64,shirt'])
    expect(normalized.tags).toEqual(['フォーマル'])
    expect(normalized.favoriteCombinations).toEqual([
      expect.objectContaining({ id: 'draft-1', pieceIds: ['private-piece'] }),
    ])
    expect(normalized.componentCostumeIds).toEqual(['suit-1', 'shirt-1', 'tie-1'])
    expect(normalized.componentCostumeNames).toEqual([
      'スーツ',
      '白シャツ',
      '構成アイテム3',
    ])
  })
})
