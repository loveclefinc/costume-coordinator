import { describe, expect, it } from 'vitest'
import type { Costume, UsageHistory } from '../src/utils/storage'
import { autoPickCostumesForParticipation } from '../src/utils/participate-costume-pick'

const costume = (id: string, name: string, overrides: Partial<Costume> = {}): Costume => ({
  id,
  name,
  image: 'data:image/jpeg;base64,x',
  colors: ['blue'],
  tone: 'neutral',
  pattern: 'plain',
  season: [],
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
})

describe('autoPickCostumesForParticipation', () => {
  it('falls back when recent usage filter excludes all costumes', () => {
    const history: UsageHistory[] = [
      {
        id: 'h1',
        costumeId: 'c1',
        eventId: 'evt_1',
        participantName: '太郎',
        usedAt: Date.now(),
      },
      {
        id: 'h2',
        costumeId: 'c2',
        eventId: 'evt_1',
        participantName: '太郎',
        usedAt: Date.now(),
      },
    ]

    const picked = autoPickCostumesForParticipation(
      [costume('c1', '赤'), costume('c2', '青')],
      {
        colors1stChoice: [],
        colors2ndChoice: [],
        colors3rdChoice: [],
        tones1stChoice: [],
        tones2ndChoice: [],
        tones3rdChoice: [],
        patterns1stChoice: [],
        patterns2ndChoice: [],
        patterns3rdChoice: [],
        colorUnification: 'varied',
      },
      history,
      5,
      30,
    )

    expect(picked.length).toBeGreaterThan(0)
  })

  it('returns empty when wardrobe is empty', () => {
    expect(autoPickCostumesForParticipation([], undefined, [], 5, 30)).toEqual([])
  })

  it('keeps participant submissions capped at 5 costumes', () => {
    const picked = autoPickCostumesForParticipation(
      Array.from({ length: 12 }, (_, index) => costume(`c${index + 1}`, `衣装${index + 1}`)),
      undefined,
      [],
      5,
      30,
    )

    expect(picked).toHaveLength(5)
  })

  it('submits a saved suit outfit as one candidate and never submits accessory-only singles', () => {
    const wardrobe = [
      costume('suit-navy', 'ネイビースーツ', {
        type: 'suit',
        colors: ['navy'],
        favoriteCombinations: [
          {
            id: 'formal-set',
            name: 'ネイビー本番コーデ',
            pieceIds: ['shirt-white', 'tie-red'],
            createdAt: 1,
            updatedAt: 2,
          },
        ],
      }),
      costume('shirt-white', '白ワイシャツ', { type: 'shirt', colors: ['white'] }),
      costume('tie-red', '赤ネクタイ', { type: 'necktie', colors: ['red'] }),
      costume('bowtie-black', '黒蝶ネクタイ', { type: 'bowtie', colors: ['black'] }),
      costume('accessory-gold', '金ブローチ', { type: 'accessory', colors: ['yellow'] }),
      costume('dress-blue', '青ドレス', { type: 'dress', colors: ['blue'] }),
    ]

    const picked = autoPickCostumesForParticipation(wardrobe, undefined, [], 10, 0)
    const ids = picked.map((entry) => entry.costume.id)

    expect(ids).toContain('favorite-outfit:formal-set')
    expect(ids).toContain('dress-blue')
    expect(ids).not.toContain('suit-navy')
    expect(ids).not.toContain('shirt-white')
    expect(ids).not.toContain('tie-red')
    expect(ids).not.toContain('bowtie-black')
    expect(ids).not.toContain('accessory-gold')

    const outfit = picked.find((entry) => entry.costume.id === 'favorite-outfit:formal-set')
    expect(outfit?.costume.componentCostumeIds).toEqual([
      'suit-navy',
      'shirt-white',
      'tie-red',
    ])
    expect(outfit?.costume.wearingPhotos).toHaveLength(2)
  })

  it('keeps a standalone dress eligible when no favorite combination is needed', () => {
    const picked = autoPickCostumesForParticipation(
      [
        costume('dress-green', '緑ドレス', { type: 'dress', colors: ['green'] }),
        costume('tie-only', '緑ネクタイ', { type: 'necktie', colors: ['green'] }),
      ],
      undefined,
      [],
      5,
      0,
    )

    expect(picked.map((entry) => entry.costume.id)).toEqual(['dress-green'])
  })
})
