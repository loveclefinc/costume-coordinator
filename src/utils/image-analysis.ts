/**
 * Image analysis utility for extracting colors and analyzing costume images
 */

export interface ColorAnalysisResult {
  primaryColor: string
  secondaryColor?: string
  colorCategory: 'warm' | 'cool' | 'neutral'
  tone: 'pastel' | 'vivid' | 'dark' | 'neutral'
  dominantColors: string[]
}

export interface ExtractDominantColorsOptions {
  /** 中心から見る領域の割合（幅・高さそれぞれ）。既定 0.5 = 中央50% */
  centerFraction?: number
  /** 中心に近いピクセルほど重みを大きくする */
  radialWeighting?: boolean
  /** 白っぽい背景（壁など）をカウントから除外 */
  skipLikelyBackground?: boolean
}

const ANALYSIS_MAX_SIDE = 480
const SAMPLE_STEP = 3

/** 中央領域のサンプル範囲（ピクセル座標） */
export function getCenterSampleBounds(
  width: number,
  height: number,
  centerFraction: number,
): { x0: number; y0: number; x1: number; y1: number } {
  const f = Math.min(1, Math.max(0.2, centerFraction))
  const marginX = (width * (1 - f)) / 2
  const marginY = (height * (1 - f)) / 2
  return {
    x0: Math.floor(marginX),
    y0: Math.floor(marginY),
    x1: Math.ceil(width - marginX),
    y1: Math.ceil(height - marginY),
  }
}

/** 画像中心に近いほど 1.0、領域の端に近いほど小さく（衣装は中央に写る想定） */
export function getCenterSampleWeight(
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const dx = (x - width / 2) / (width / 2)
  const dy = (y - height / 2) / (height / 2)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= 1) return 0.15
  return 1 - dist * 0.75
}

/** 白壁・黒背景などを弱く除外（真っ白い衣装は彩度で残す） */
export function isLikelyBackgroundPixel(r: number, g: number, b: number): boolean {
  const [, s, l] = rgbToHsl(r, g, b)
  if (l > 92 && s < 15) return true
  if (l < 10 && s < 20) return true
  return false
}

function buildAnalysisCanvas(
  img: HTMLImageElement,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const scale = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  ctx.drawImage(img, 0, 0, width, height)
  return { canvas, ctx }
}

function accumulateColorsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: Required<ExtractDominantColorsOptions>,
): Record<string, number> {
  const { x0, y0, x1, y1 } = getCenterSampleBounds(width, height, options.centerFraction)
  const colorMap: Record<string, number> = {}

  for (let y = y0; y < y1; y += SAMPLE_STEP) {
    for (let x = x0; x < x1; x += SAMPLE_STEP) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 128) continue
      if (options.skipLikelyBackground && isLikelyBackgroundPixel(r, g, b)) continue

      let weight = 1
      if (options.radialWeighting) {
        weight = getCenterSampleWeight(x, y, width, height)
      }

      const hex = rgbToHex(r, g, b)
      colorMap[hex] = (colorMap[hex] || 0) + weight
    }
  }

  return colorMap
}

/**
 * Extract dominant colors — 中央領域を優先（背景色の影響を抑える）
 */
export async function extractDominantColors(
  imageUrl: string,
  options: ExtractDominantColorsOptions = {},
): Promise<string[]> {
  const opts: Required<ExtractDominantColorsOptions> = {
    centerFraction: options.centerFraction ?? 0.5,
    radialWeighting: options.radialWeighting ?? true,
    skipLikelyBackground: options.skipLikelyBackground ?? true,
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const { canvas, ctx } = buildAnalysisCanvas(img)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const colorMap = accumulateColorsFromImageData(
          imageData.data,
          canvas.width,
          canvas.height,
          opts,
        )

        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color)

        if (sortedColors.length > 0) {
          resolve(sortedColors)
          return
        }

        // 中央だけだと背景除外で空になる場合は、中央50%・背景除外なしで再試行
        const fallbackMap = accumulateColorsFromImageData(
          imageData.data,
          canvas.width,
          canvas.height,
          { ...opts, skipLikelyBackground: false },
        )
        const fallback = Object.entries(fallbackMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color)

        resolve(fallback.length > 0 ? fallback : ['#808080'])
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

/**
 * Analyze image and return color analysis result
 */
export async function analyzeImage(imageUrl: string): Promise<ColorAnalysisResult> {
  try {
    const dominantColors = await extractDominantColors(imageUrl)
    const primaryColor = dominantColors[0] || '#808080'
    const secondaryColor = dominantColors[1]

    const colorCategory = classifyColorCategory(primaryColor)
    const tone = classifyTone(primaryColor)

    return {
      primaryColor,
      secondaryColor,
      colorCategory,
      tone,
      dominantColors,
    }
  } catch (error) {
    console.error('Image analysis failed:', error)
    return {
      primaryColor: '#808080',
      colorCategory: 'neutral',
      tone: 'neutral',
      dominantColors: ['#808080'],
    }
  }
}

/**
 * Classify color category (warm, cool, neutral)
 */
export function classifyColorCategory(hexColor: string): 'warm' | 'cool' | 'neutral' {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return 'neutral'

  const [r, g, b] = rgb
  const hsl = rgbToHsl(r, g, b)
  const [h] = hsl

  // Hue ranges: 0-30 and 330-360 = red (warm), 30-90 = yellow (warm), 90-150 = green (cool)
  // 150-210 = cyan (cool), 210-270 = blue (cool), 270-330 = magenta (cool/neutral)
  if ((h >= 0 && h <= 30) || (h >= 330 && h <= 360) || (h >= 30 && h <= 90)) {
    return 'warm'
  } else if (h >= 90 && h <= 270) {
    return 'cool'
  } else {
    return 'neutral'
  }
}

/**
 * Classify tone (pastel, vivid, dark, neutral)
 */
export function classifyTone(hexColor: string): 'pastel' | 'vivid' | 'dark' | 'neutral' {
  const rgb = hexToRgb(hexColor)
  if (!rgb) return 'neutral'

  const [r, g, b] = rgb
  const [, s, l] = rgbToHsl(r, g, b)

  // Lightness: 0-20% = dark, 20-40% = vivid, 40-70% = neutral, 70-100% = pastel
  if (l < 20) {
    return 'dark'
  } else if (l < 40 && s > 50) {
    return 'vivid'
  } else if (l > 70) {
    return 'pastel'
  } else {
    return 'neutral'
  }
}

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

/**
 * Convert Hex to RGB
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ] : null
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [h * 360, s * 100, l * 100]
}

/**
 * Get color name from hex
 */
export function getColorName(hexColor: string): string {
  const colorNames: { [key: string]: string } = {
    '#FF0000': '赤',
    '#FF6B6B': 'ライト赤',
    '#FF6B9D': 'ピンク',
    '#FFB6C1': 'ライトピンク',
    '#FFA500': 'オレンジ',
    '#FFD700': '金',
    '#FFFF00': '黄',
    '#00FF00': '緑',
    '#00AA00': 'ダークグリーン',
    '#00FFFF': 'シアン',
    '#0000FF': '青',
    '#0000AA': 'ダークブルー',
    '#800080': '紫',
    '#FF00FF': 'マゼンタ',
    '#FFFFFF': '白',
    '#808080': 'グレー',
    '#000000': '黒',
  }

  return colorNames[hexColor.toUpperCase()] || hexColor
}

/**
 * Compress image for thumbnail
 */
export async function compressImage(file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width))
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height))
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert file to data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
