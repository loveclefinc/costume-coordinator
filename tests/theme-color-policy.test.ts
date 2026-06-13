import { describe, it, expect } from 'vitest'
import {
  effectiveAvoidSimilarColors,
  migrateColorUnificationPolicy,
  normalizeThemeColorPolicy,
} from '../src/utils/theme-color-policy'

describe('theme-color-policy', () => {
  it('migrates legacy neutral to unified', () => {
    expect(migrateColorUnificationPolicy('neutral')).toBe('unified')
    expect(migrateColorUnificationPolicy(undefined)).toBe('unified')
  })

  it('migrates legacy varied + avoidSimilar to varied_distinct', () => {
    expect(migrateColorUnificationPolicy('varied', true)).toBe('varied_distinct')
    expect(migrateColorUnificationPolicy('varied', false)).toBe('varied')
  })

  it('varied_distinct enables avoid similar only', () => {
    expect(
      effectiveAvoidSimilarColors({
        colorUnification: 'varied_distinct',
        avoidSimilarColors: false,
      } as never),
    ).toBe(true)
    expect(
      effectiveAvoidSimilarColors({
        colorUnification: 'varied',
        avoidSimilarColors: true,
      } as never),
    ).toBe(true)
    expect(
      effectiveAvoidSimilarColors({
        colorUnification: 'unified',
        avoidSimilarColors: true,
      } as never),
    ).toBe(false)
  })

  it('normalizeThemeColorPolicy syncs avoidSimilarColors with varied_distinct only', () => {
    const distinct = normalizeThemeColorPolicy({
      colorUnification: 'varied_distinct',
      avoidSimilarColors: false,
    } as never)
    expect(distinct.colorUnification).toBe('varied_distinct')
    expect(distinct.avoidSimilarColors).toBe(true)

    const legacyVaried = normalizeThemeColorPolicy({
      colorUnification: 'varied',
      avoidSimilarColors: true,
    } as never)
    expect(legacyVaried.colorUnification).toBe('varied_distinct')
    expect(legacyVaried.avoidSimilarColors).toBe(true)

    const varied = normalizeThemeColorPolicy({
      colorUnification: 'varied',
      avoidSimilarColors: false,
    } as never)
    expect(varied.colorUnification).toBe('varied')
    expect(varied.avoidSimilarColors).toBe(false)

    const unified = normalizeThemeColorPolicy({
      colorUnification: 'unified',
      avoidSimilarColors: true,
    } as never)
    expect(unified.colorUnification).toBe('unified')
    expect(unified.avoidSimilarColors).toBe(false)
  })
})
