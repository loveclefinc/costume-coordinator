import { describe, it, expect } from 'vitest'
import type { EventThemePreferencesPayload } from '../shared/event-api-types'
import {
  getAllowedThemeChoices,
  getThemeGuidedDefaults,
  mapAnalysisToThemeChoices,
  formatThemeSummary,
} from '../src/utils/event-theme-ui'

const sampleTheme: EventThemePreferencesPayload = {
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
  avoidSimilarColors: true,
  recentUsageExcludeDays: 30,
}

describe('event-theme-ui', () => {
  it('getAllowedThemeChoices unions all preference ranks', () => {
    const allowed = getAllowedThemeChoices(sampleTheme)
    expect(allowed.colors).toEqual(expect.arrayContaining(['blue', 'white', 'gray']))
    expect(allowed.tones).toEqual(expect.arrayContaining(['vivid', 'neutral']))
    expect(allowed.patterns).toEqual(expect.arrayContaining(['floral', 'plain']))
  })

  it('getThemeGuidedDefaults prefers first-rank choices', () => {
    const defaults = getThemeGuidedDefaults(sampleTheme)
    expect(defaults.colors).toEqual(['blue'])
    expect(defaults.tone).toBe('vivid')
    expect(defaults.pattern).toBe('floral')
  })

  it('mapAnalysisToThemeChoices clamps photo colors to allowed theme colors', () => {
    const mapped = mapAnalysisToThemeChoices(
      {
        primaryColor: '#D1B68B',
        colorCategory: 'warm',
        tone: 'neutral',
        dominantColors: ['#D1B68B'],
      },
      sampleTheme,
    )
    expect(mapped.colors[0]).toBe('gray')
    expect(mapped.tone).toBe('neutral')
  })

  it('formatThemeSummary includes rank and unification info', () => {
    const lines = formatThemeSummary(sampleTheme)
    expect(lines.some((line) => line.includes('統一'))).toBe(true)
    expect(lines.some((line) => line.includes('第1希望'))).toBe(true)
  })
})
