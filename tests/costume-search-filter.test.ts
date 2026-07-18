import { describe, expect, it } from 'vitest'
import type { Costume } from '../src/utils/storage'
import {
  costumeSearchLabels,
  queryTokens,
  searchWardrobeCostumes,
} from '../src/utils/costume-search'

function costume(overrides: Partial<Costume>): Costume {
  return {
    id: overrides.id ?? 'c1',
    name: overrides.name ?? '衣装',
    image: '',
    colors: overrides.colors ?? [],
    tone: overrides.tone ?? 'neutral',
    pattern: overrides.pattern ?? 'plain',
    season: overrides.season ?? [],
    type: overrides.type,
    silhouette: overrides.silhouette,
    suitStyle: overrides.suitStyle,
    suitBreasting: overrides.suitBreasting,
    suitLapel: overrides.suitLapel,
    tags: overrides.tags,
    createdAt: overrides.createdAt ?? 1,
    updatedAt: overrides.updatedAt ?? 1,
  }
}

describe('Costume wardrobe search', () => {
  const wardrobe = [
    costume({
      id: 'floral-blue',
      name: '青い花柄ドレス',
      colors: ['blue'],
      tone: 'pastel',
      pattern: 'floral',
      season: ['spring'],
      type: 'dress',
      silhouette: 'a_line',
      updatedAt: 10,
    }),
    costume({
      id: 'black-tuxedo',
      name: '黒タキシード',
      colors: ['black'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      suitStyle: 'tuxedo',
      suitLapel: 'shawl',
      updatedAt: 20,
    }),
    costume({
      id: 'red-dress',
      name: '赤い無地ドレス',
      colors: ['red'],
      tone: 'vivid',
      pattern: 'plain',
      type: 'dress',
      silhouette: 'princess',
      tags: ['千秋楽', 'アンコール'],
      updatedAt: 30,
    }),
  ]

  it('keeps filler words from blocking natural Japanese search', () => {
    const results = searchWardrobeCostumes(wardrobe, '花柄の衣装どんなの持ってたっけ？')
    expect(results.map((result) => result.costume.id)).toEqual(['floral-blue'])
    expect(results[0].matchedLabels).toContain('花柄')
  })

  it('searches by color family aliases such as 青系', () => {
    const results = searchWardrobeCostumes(wardrobe, '青系')
    expect(results.map((result) => result.costume.id)).toEqual(['floral-blue'])
  })

  it('searches plain costumes with 無地', () => {
    const results = searchWardrobeCostumes(wardrobe, '無地')
    expect(results.map((result) => result.costume.id)).toEqual(['red-dress', 'black-tuxedo'])
    expect(results[0].matchedLabels).toContain('無地')
  })

  it('searches patterned costumes with 柄', () => {
    const results = searchWardrobeCostumes(wardrobe, '柄')
    expect(results.map((result) => result.costume.id)).toEqual(['floral-blue'])
    expect(results[0].matchedLabels).toContain('柄あり')
  })

  it('searches tone, type, silhouette, and suit attributes as Japanese labels', () => {
    expect(searchWardrobeCostumes(wardrobe, '落ち着いた').map((r) => r.costume.id)).toEqual([])
    expect(searchWardrobeCostumes(wardrobe, 'Aライン').map((r) => r.costume.id)).toEqual(['floral-blue'])
    expect(searchWardrobeCostumes(wardrobe, 'タキシード ショールカラー').map((r) => r.costume.id)).toEqual(['black-tuxedo'])
  })

  it('requires all meaningful query terms to match the same costume', () => {
    const results = searchWardrobeCostumes(wardrobe, '青 花柄')
    expect(results.map((result) => result.costume.id)).toEqual(['floral-blue'])
  })

  it('returns all costumes newest first when the query is empty', () => {
    expect(searchWardrobeCostumes(wardrobe, '').map((result) => result.costume.id)).toEqual([
      'red-dress',
      'black-tuxedo',
      'floral-blue',
    ])
  })

  it('searches user-defined wardrobe tags', () => {
    expect(searchWardrobeCostumes(wardrobe, '千秋楽').map((result) => result.costume.id)).toEqual([
      'red-dress',
    ])
    expect(costumeSearchLabels(wardrobe[2])).toEqual(
      expect.arrayContaining(['千秋楽', 'アンコール']),
    )
  })

  it('uses id as a stable tie-breaker for equally recent costumes', () => {
    const tied = [
      costume({ id: 'z-last', name: 'Z', updatedAt: 50 }),
      costume({ id: 'a-first', name: 'A', updatedAt: 50 }),
    ]
    expect(searchWardrobeCostumes(tied, '').map((result) => result.costume.id)).toEqual([
      'a-first',
      'z-last',
    ])
  })

  it('builds searchable Japanese labels from registered attributes', () => {
    const labels = costumeSearchLabels(wardrobe[0])
    expect(labels).toEqual(expect.arrayContaining(['青い花柄ドレス', '青', '花柄', 'ドレス', '春', 'Aライン']))
  })

  it('searches separately registered tops and bottoms by their Japanese type names', () => {
    const separates = [
      costume({ id: 'blouse-white', name: '白ブラウス', type: 'blouse', updatedAt: 40 }),
      costume({ id: 'skirt-navy', name: '紺スカート', type: 'skirt', updatedAt: 41 }),
      costume({ id: 'pants-black', name: '黒パンツ', type: 'pants', updatedAt: 42 }),
    ]

    expect(searchWardrobeCostumes(separates, 'ブラウス').map((result) => result.costume.id)).toEqual([
      'blouse-white',
    ])
    expect(searchWardrobeCostumes(separates, 'スカート').map((result) => result.costume.id)).toEqual([
      'skirt-navy',
    ])
    expect(searchWardrobeCostumes(separates, 'パンツ・ズボン').map((result) => result.costume.id)).toEqual([
      'pants-black',
    ])
  })

  it('normalizes casual query tokens', () => {
    expect(queryTokens('青系の衣装')).toEqual([
      expect.arrayContaining(['青系', '青', 'ブルー', '水色', 'ネイビー']),
    ])
  })
})
