import { describe, expect, it } from 'vitest'
import { analyzePatternFromPixels } from '../src/utils/image-analysis'

type Rgb = readonly [number, number, number]

function makeRgba(
  width: number,
  height: number,
  getPixel: (x: number, y: number) => Rgb,
  alpha = 255,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      const [r, g, b] = getPixel(x, y)
      data[index] = r
      data[index + 1] = g
      data[index + 2] = b
      data[index + 3] = alpha
    }
  }
  return data
}

describe('on-device costume pattern analysis', () => {
  it('classifies a uniform image as solid with high confidence', () => {
    const width = 32
    const height = 32
    const result = analyzePatternFromPixels(
      makeRgba(width, height, () => [42, 83, 171]),
      width,
      height,
    )

    expect(result).toEqual({
      pattern: 'solid',
      confidence: 0.98,
      warnings: [],
      uncertainFields: [],
    })
  })

  it('recognizes repeated axis-aligned stripes but not a single color split', () => {
    const width = 32
    const height = 32
    const blue: Rgb = [25, 55, 170]
    const yellow: Rgb = [235, 205, 45]
    const striped = analyzePatternFromPixels(
      makeRgba(width, height, (x) => (Math.floor(x / 4) % 2 === 0 ? blue : yellow)),
      width,
      height,
    )
    const split = analyzePatternFromPixels(
      makeRgba(width, height, (x) => (x < width / 2 ? blue : yellow)),
      width,
      height,
    )

    expect(striped.pattern).toBe('stripe')
    expect(striped.confidence).toBeGreaterThanOrEqual(0.85)
    expect(striped.uncertainFields).toEqual([])
    expect(split.pattern).toBe('other')
    expect(split.uncertainFields).toEqual(['pattern'])
  })

  it('recognizes repeated checks only when both axes have aligned boundaries', () => {
    const width = 32
    const height = 32
    const navy: Rgb = [20, 35, 105]
    const white: Rgb = [230, 235, 245]
    const result = analyzePatternFromPixels(
      makeRgba(width, height, (x, y) => (
        (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? navy : white
      )),
      width,
      height,
    )

    expect(result.pattern).toBe('check')
    expect(result.confidence).toBeGreaterThanOrEqual(0.85)
    expect(result.warnings).toEqual([])
  })

  it('recognizes separated, similarly sized dots conservatively', () => {
    const width = 32
    const height = 32
    const background: Rgb = [230, 225, 210]
    const dot: Rgb = [45, 60, 135]
    const result = analyzePatternFromPixels(
      makeRgba(width, height, (x, y) => {
        const inDotColumn = [5, 13, 21, 27].some((start) => x >= start && x < start + 2)
        const inDotRow = [5, 13, 21, 27].some((start) => y >= start && y < start + 2)
        return inDotColumn && inDotRow ? dot : background
      }),
      width,
      height,
    )

    expect(result.pattern).toBe('dot')
    expect(result.confidence).toBeGreaterThanOrEqual(0.7)
  })

  it('returns other, low confidence, and a Japanese warning for unstructured pixels', () => {
    const width = 32
    const height = 32
    const result = analyzePatternFromPixels(
      makeRgba(width, height, (x, y) => [
        (x * 73 + y * 151 + x * y * 17) % 256,
        (x * 29 + y * 97 + x * y * 11) % 256,
        (x * 181 + y * 37 + x * y * 7) % 256,
      ]),
      width,
      height,
    )

    expect(result.pattern).toBe('other')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThan(0.7)
    expect(result.uncertainFields).toEqual(['pattern'])
    expect(result.warnings.join('')).toMatch(/[ぁ-んァ-ン一-龯]/)
  })

  it('fails closed when there are too few visible pixels', () => {
    const width = 8
    const height = 8
    const result = analyzePatternFromPixels(
      makeRgba(width, height, () => [100, 100, 100], 0),
      width,
      height,
    )

    expect(result).toEqual({
      pattern: 'other',
      confidence: 0.12,
      warnings: ['解析できる画素が少ないため、柄を判定できませんでした。'],
      uncertainFields: ['pattern'],
    })
  })
})
