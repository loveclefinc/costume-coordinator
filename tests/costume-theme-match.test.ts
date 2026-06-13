import { describe, it, expect } from 'vitest'
import {
  autoPickCostumesForEventTheme,
  rankCostumesForEventTheme,
} from '../src/utils/costume-theme-match'
import type { Costume, EventThemePreferences, UsageHistory } from '../src/utils/storage'

const theme: EventThemePreferences = {
  colorUnification: 'unified',
  colors1stChoice: ['blue', 'white'],
  colors2ndChoice: ['gray'],
  colors3rdChoice: [],
  tones1stChoice: ['vivid'],
  tones2ndChoice: ['neutral'],
  tones3rdChoice: [],
  patterns1stChoice: ['floral'],
  patterns2ndChoice: ['plain'],
  patterns3rdChoice: [],
  silhouettes1stChoice: [],
  silhouettes2ndChoice: [],
  silhouettes3rdChoice: [],
  suitStyles1stChoice: [],
  suitStyles2ndChoice: [],
  suitStyles3rdChoice: [],
  suitBreasting1stChoice: [],
  suitBreasting2ndChoice: [],
  suitBreasting3rdChoice: [],
  avoidSimilarColors: false,
}

function costume(id: string, overrides: Partial<Costume>): Costume {
  const now = Date.now()
  return {
    id,
    name: id,
    image: 'data:image/png;base64,x',
    colors: ['gray'],
    tone: 'neutral',
    pattern: 'plain',
    season: [],
    type: 'dress',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('costume-theme-match', () => {
  it('ranks blue floral vivid dress above beige neutral outfit', () => {
    const ranked = rankCostumesForEventTheme(
      [
        costume('beige', { colors: ['#D1B68B'], tone: 'neutral', pattern: 'plain' }),
        costume('blue-dress', { colors: ['blue', 'white'], tone: 'vivid', pattern: 'floral' }),
      ],
      theme,
    )

    expect(ranked[0].costume.id).toBe('blue-dress')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('autoPickCostumesForEventTheme extracts matching costumes only', () => {
    const picked = autoPickCostumesForEventTheme(
      [
        costume('off-theme', { colors: ['yellow'], tone: 'dark', pattern: 'stripe' }),
        costume('blue-dress', { colors: ['blue', 'white'], tone: 'vivid', pattern: 'floral' }),
        costume('navy', { colors: ['blue'], tone: 'vivid', pattern: 'floral' }),
      ],
      theme,
      [],
      5,
    )

    expect(picked.every((entry) => entry.costume.id !== 'off-theme')).toBe(true)
    expect(picked[0].costume.id).toBe('blue-dress')
    expect(picked.length).toBe(2)
    expect(picked.map((entry) => entry.costume.id)).toContain('navy')
  })

  it('autoPickCostumesForEventTheme returns multiple candidates up to maxCount', () => {
    const picked = autoPickCostumesForEventTheme(
      [
        costume('c1', { colors: ['blue'], tone: 'vivid', pattern: 'floral' }),
        costume('c2', { colors: ['white'], tone: 'vivid', pattern: 'plain' }),
        costume('c3', { colors: ['gray'], tone: 'neutral', pattern: 'plain' }),
      ],
      theme,
      [],
      3,
    )

    expect(picked.length).toBe(3)
  })

  it('excludes recently used costumes before ranking', () => {
    const usageHistory: UsageHistory[] = [
      {
        id: 'usage1',
        costumeId: 'blue-dress',
        eventId: 'event1',
        participantName: 'Alice',
        usedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      },
    ]

    const ranked = rankCostumesForEventTheme(
      [
        costume('beige', { colors: ['#D1B68B'], tone: 'neutral', pattern: 'plain' }),
        costume('blue-dress', { colors: ['blue', 'white'], tone: 'vivid', pattern: 'floral' }),
      ],
      theme,
      usageHistory,
      30,
    )

    expect(ranked).toHaveLength(1)
    expect(ranked[0].costume.id).toBe('beige')
  })

  it('prefers matching dress silhouette when theme specifies it', () => {
    const ranked = rankCostumesForEventTheme(
      [
        costume('mermaid-dress', { colors: ['blue'], tone: 'vivid', pattern: 'floral', type: 'dress', silhouette: 'mermaid' }),
        costume('a-line-dress', { colors: ['blue'], tone: 'vivid', pattern: 'floral', type: 'dress', silhouette: 'a_line' }),
      ],
      {
        ...theme,
        silhouettes1stChoice: ['a_line'],
      },
    )

    expect(ranked[0].costume.id).toBe('a-line-dress')
  })

  it('prefers matching suit style and pieces when theme specifies them', () => {
    const ranked = rankCostumesForEventTheme(
      [
        costume('tux-single', { colors: ['black'], tone: 'dark', pattern: 'plain', type: 'suit', suitStyle: 'tuxedo', suitBreasting: 'single' }),
        costume('tail-double', { colors: ['black'], tone: 'dark', pattern: 'plain', type: 'suit', suitStyle: 'tailcoat', suitBreasting: 'double' }),
      ],
      {
        ...theme,
        suitStyles1stChoice: ['tailcoat'],
        suitBreasting1stChoice: ['double'],
      },
    )

    expect(ranked[0].costume.id).toBe('tail-double')
  })
})
