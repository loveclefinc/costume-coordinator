import { describe, it, expect } from 'vitest'
import {
  autoPickCostumesForEventTheme,
  rankCostumesForEventTheme,
} from '../src/utils/costume-theme-match'
import type { Costume, EventThemePreferences } from '../src/utils/storage'

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
  avoidSimilarColors: false,
  recentUsageExcludeDays: 30,
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
  })
})
