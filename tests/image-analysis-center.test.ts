import { describe, it, expect } from 'vitest'
import {
  getCenterSampleBounds,
  getCornerSampleBounds,
  getGarmentSampleBounds,
  isLikelyBackgroundPixel,
  isLikelyWarmNeutralBackground,
  getCenterSampleWeight,
  hexToRgb,
  rgbToHex,
  computeImageDisplayMetrics,
  mapLocalPointToImagePixel,
  detectCornerBackgroundColors,
  isSimilarToAnyColor,
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

  it('isLikelyWarmNeutralBackground detects beige studio backdrop', () => {
    const beige = hexToRgb('#D1B68B')!
    expect(isLikelyWarmNeutralBackground(...beige)).toBe(true)
    const tan = hexToRgb('#D2B78E')!
    expect(isLikelyWarmNeutralBackground(...tan)).toBe(true)
  })

  it('isLikelyWarmNeutralBackground keeps dress whites and blues', () => {
    expect(isLikelyWarmNeutralBackground(245, 245, 250)).toBe(false)
    expect(isLikelyWarmNeutralBackground(200, 205, 215)).toBe(false)
    expect(isLikelyWarmNeutralBackground(30, 60, 180)).toBe(false)
    expect(isLikelyWarmNeutralBackground(20, 40, 120)).toBe(false)
  })

  it('getCenterSampleBounds default fraction is tighter than full half', () => {
    const half = getCenterSampleBounds(100, 200, 0.5)
    const tight = getCenterSampleBounds(100, 200, 0.35)
    const halfArea = (half.x1 - half.x0) * (half.y1 - half.y0)
    const tightArea = (tight.x1 - tight.x0) * (tight.y1 - tight.y0)
    expect(tightArea).toBeLessThan(halfArea)
  })

  it('computeImageDisplayMetrics maps center click to image center for contain', () => {
    const metrics = computeImageDisplayMetrics(400, 800, 200, 400, 'contain')
    const center = mapLocalPointToImagePixel(400, 800, 100, 200, metrics)
    expect(center).toEqual({ x: 200, y: 400 })
  })

  it('mapLocalPointToImagePixel returns null in letterbox margin', () => {
    const metrics = computeImageDisplayMetrics(400, 800, 300, 400, 'contain')
    expect(mapLocalPointToImagePixel(400, 800, 0, 200, metrics)).toBeNull()
  })

  it('getGarmentSampleBounds focuses on torso area and skips top/bottom margins', () => {
    const bounds = getGarmentSampleBounds(200, 400, 0.32)
    expect(bounds.y0).toBe(80)
    expect(bounds.y1).toBe(352)
    expect(bounds.x1 - bounds.x0).toBeLessThan(200)
    expect(bounds.x0).toBeGreaterThan(0)
  })

  it('getCornerSampleBounds returns four corner patches', () => {
    const corners = getCornerSampleBounds(200, 400)
    expect(corners).toHaveLength(4)
    expect(corners[0]).toEqual({ x0: 0, y0: 0, x1: 24, y1: 48 })
    expect(corners[3].x0).toBeGreaterThan(corners[0].x1)
    expect(corners[3].y0).toBeGreaterThan(corners[0].y1)
  })

  it('detectCornerBackgroundColors finds beige shared by 3+ corners', () => {
    const width = 100
    const height = 200
    const data = new Uint8ClampedArray(width * height * 4)
    const beige = hexToRgb('#D1B68B')!
    const blue = hexToRgb('#1E4FA8')!

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const inCenter = x > 30 && x < 70 && y > 50 && y < 170
        const [r, g, b] = inCenter ? blue : beige
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }

    const excluded = detectCornerBackgroundColors(data, width, height)
    expect(excluded.length).toBeGreaterThan(0)
    expect(isSimilarToAnyColor(...beige, excluded)).toBe(true)
    expect(isSimilarToAnyColor(...blue, excluded)).toBe(false)
  })

  it('detectCornerBackgroundColors ignores colors present in fewer than 3 corners', () => {
    const width = 100
    const height = 100
    const data = new Uint8ClampedArray(width * height * 4)
    const colors = [
      hexToRgb('#D1B68B')!,
      hexToRgb('#D2B78E')!,
      hexToRgb('#AABBCC')!,
      hexToRgb('#112233')!,
    ]

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        let rgb = colors[3]
        if (x < 12 && y < 12) rgb = colors[0]
        if (x >= 88 && y < 12) rgb = colors[1]
        if (x < 12 && y >= 88) rgb = colors[2]
        data[i] = rgb[0]
        data[i + 1] = rgb[1]
        data[i + 2] = rgb[2]
        data[i + 3] = 255
      }
    }

    const excluded = detectCornerBackgroundColors(data, width, height)
    expect(excluded).toHaveLength(0)
  })
})
