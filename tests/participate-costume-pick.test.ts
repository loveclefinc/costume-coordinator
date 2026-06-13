import { describe, expect, it } from 'vitest'
import type { Costume, UsageHistory } from '../src/utils/storage'
import { autoPickCostumesForParticipation } from '../src/utils/participate-costume-pick'

const costume = (id: string, name: string): Costume => ({
  id,
  name,
  image: 'data:image/jpeg;base64,x',
  colors: ['blue'],
  tone: 'neutral',
  pattern: 'plain',
  season: [],
  createdAt: 1,
  updatedAt: 1,
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
})
