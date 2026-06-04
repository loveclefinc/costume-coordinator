import { describe, it, expect } from 'vitest'
import {
  getCenterSampleBounds,
  isLikelyBackgroundPixel,
  getCenterSampleWeight,
} from '../src/utils/image-analysis'

describe('image-analysis center sampling', () => {
  it('getCenterSampleBounds returns middle 50% region', () => {
    const b = getCenterSampleBounds(100, 200, 0.5)
    expect(b.x0).toBe(25)
    expect(b.x1).toBe(75)
    expect(b.y0).toBe(50)
    expect(b.y1).toBe(150)
  })

  it('getCenterSampleWeight is higher at center', () => {
    const center = getCenterSampleWeight(50, 100, 100, 200)
    const corner = getCenterSampleWeight(10, 10, 100, 200)
    expect(center).toBeGreaterThan(corner)
  })

  it('isLikelyBackgroundPixel detects near-white and near-black', () => {
    expect(isLikelyBackgroundPixel(250, 250, 250)).toBe(true)
    expect(isLikelyBackgroundPixel(5, 5, 5)).toBe(true)
    expect(isLikelyBackgroundPixel(230, 50, 50)).toBe(false)
  })
})
