import { describe, expect, it } from 'vitest'
import { calculateColorAnchorScore } from '../src/utils/color-coordination'
import type { ColorCoordinationAnchor } from '../src/utils/storage'

describe('calculateColorAnchorScore', () => {
  it('returns neutral score when no anchors', () => {
    expect(calculateColorAnchorScore(['blue'], undefined)).toBe(1)
  })

  it('penalizes similar colors in avoid mode', () => {
    const anchors: ColorCoordinationAnchor[] = [
      { id: 'a1', label: 'ゲスト', colors: ['red'], mode: 'avoid' },
    ]
    const avoidScore = calculateColorAnchorScore(['red', 'pink'], anchors)
    const clearScore = calculateColorAnchorScore(['blue'], anchors)
    expect(avoidScore).toBeLessThan(clearScore)
  })

  it('boosts similar colors in match mode', () => {
    const anchors: ColorCoordinationAnchor[] = [
      { id: 'a1', label: 'ソリスト', colors: ['blue'], mode: 'match' },
    ]
    const matchScore = calculateColorAnchorScore(['blue'], anchors)
    const mismatchScore = calculateColorAnchorScore(['red'], anchors)
    expect(matchScore).toBeGreaterThan(mismatchScore)
  })
})
