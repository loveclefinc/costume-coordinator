import { describe, it, expect } from 'vitest'
import {
  enrichCostumeColors,
  hexToThemeColorName,
  normalizePattern,
  colorNamesAreSimilar,
} from '../src/utils/theme-colors'

describe('theme-colors', () => {
  it('hexToThemeColorName maps costume reds and blues', () => {
    expect(hexToThemeColorName('#E63946')).toBe('red')
    expect(hexToThemeColorName('#457B9D')).toBe('blue')
    expect(hexToThemeColorName('#FF6B9D')).toBe('pink')
  })

  it('enrichCostumeColors keeps HEX and adds theme names', () => {
    const colors = enrichCostumeColors(['#E63946', '#F1FAEE'])
    expect(colors).toContain('#E63946')
    expect(colors).toContain('red')
  })

  it('normalizePattern treats solid as plain', () => {
    expect(normalizePattern('solid')).toBe('plain')
    expect(normalizePattern('floral')).toBe('floral')
  })

  it('colorNamesAreSimilar works across HEX and names', () => {
    expect(colorNamesAreSimilar(['#E63946'], ['red'])).toBe(true)
    expect(colorNamesAreSimilar(['#457B9D'], ['yellow'])).toBe(false)
  })
})
