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
  /** 中心から見る領域の割合（幅・高さそれぞれ）。衣装領域モード時は幅のみ参照 */
  centerFraction?: number
  /** 中心に近いピクセルほど重みを大きくする */
  radialWeighting?: boolean
  /** 白っぽい背景（壁など）をカウントから除外 */
  skipLikelyBackground?: boolean
  /** 四隅に共通する色を背景として除外 */
  excludeCornerBackground?: boolean
  /** ドレス・スーツ等の胴体領域に絞ってサンプル */
  useGarmentBounds?: boolean
}

const ANALYSIS_MAX_SIDE = 480
const SAMPLE_STEP = 3
/** 衣装は画面中央に写る想定 — 幅のこの割合だけをサンプル */
const DEFAULT_CENTER_FRACTION = 0.32
/** 四隅パッチのサイズ（短辺に対する割合） */
const CORNER_PATCH_FRACTION = 0.12
/** 四隅で同色とみなす RGB 距離 */
const CORNER_COLOR_MATCH_DISTANCE = 42
/** 背景色とみなして除外するために必要な角の数 */
const CORNER_BACKGROUND_MIN_MATCHES = 3
/** 類似色をまとめる量子化（チャンネルあたりの段階数） */
const COLOR_QUANTIZE_LEVELS = 12

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
  const [h, s, l] = rgbToHsl(r, g, b)
  if (l > 92 && s < 15) return true
  if (l < 10 && s < 20) return true
  if (isLikelyWarmNeutralBackground(r, g, b, h, s, l)) return true
  return false
}

/**
 * スタジオのベージュ・タン・砂色背景（D1B68B 系）を除外。
 * 白・銀・青い衣装は残す。
 */
export function isLikelyWarmNeutralBackground(
  r: number,
  g: number,
  b: number,
  h?: number,
  s?: number,
  l?: number,
): boolean {
  const hsl = h !== undefined && s !== undefined && l !== undefined
    ? [h, s, l] as [number, number, number]
    : rgbToHsl(r, g, b)
  const [hue, sat, light] = hsl

  if (light < 52 || light > 82) return false
  if (sat < 12 || sat > 58) return false
  if (hue < 18 || hue > 72) return false
  if (r - b < 28 || g <= b) return false
  return true
}

/** 近い色をまとめて、ベージュの微妙な色差が上位を占めないようにする */
export function quantizeRgb(r: number, g: number, b: number, levels = COLOR_QUANTIZE_LEVELS): [number, number, number] {
  const step = 255 / (levels - 1)
  const q = (v: number) => Math.min(255, Math.round(Math.round(v / step) * step))
  return [q(r), q(g), q(b)]
}

export interface ImageBounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

/** 四隅それぞれのサンプル領域 */
export function getCornerSampleBounds(
  width: number,
  height: number,
  cornerFraction: number = CORNER_PATCH_FRACTION,
): ImageBounds[] {
  const patchW = Math.max(4, Math.round(width * cornerFraction))
  const patchH = Math.max(4, Math.round(height * cornerFraction))
  return [
    { x0: 0, y0: 0, x1: patchW, y1: patchH },
    { x0: width - patchW, y0: 0, x1: width, y1: patchH },
    { x0: 0, y0: height - patchH, x1: patchW, y1: height },
    { x0: width - patchW, y0: height - patchH, x1: width, y1: height },
  ]
}

/**
 * ドレス・スーツ等が中央に写る写真向けの衣装領域。
 * 頭上・床・左右の背景を避け、胴体〜スカート付近を優先する。
 */
export function getGarmentSampleBounds(
  width: number,
  height: number,
  widthFraction: number = DEFAULT_CENTER_FRACTION,
): ImageBounds {
  const wf = Math.min(0.5, Math.max(0.22, widthFraction))
  const marginX = (width * (1 - wf)) / 2
  return {
    x0: Math.floor(marginX),
    y0: Math.floor(height * 0.2),
    x1: Math.ceil(width - marginX),
    y1: Math.ceil(height * 0.88),
  }
}

export function colorDistanceRgb(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 +
    (a[1] - b[1]) ** 2 +
    (a[2] - b[2]) ** 2,
  )
}

function countQuantizedColorsInBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: ImageBounds,
): Record<string, number> {
  const colorMap: Record<string, number> = {}
  for (let y = bounds.y0; y < bounds.y1; y += SAMPLE_STEP) {
    for (let x = bounds.x0; x < bounds.x1; x += SAMPLE_STEP) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < 128) continue
      const [qr, qg, qb] = quantizeRgb(data[i], data[i + 1], data[i + 2])
      const hex = rgbToHex(qr, qg, qb)
      colorMap[hex] = (colorMap[hex] || 0) + 1
    }
  }
  return colorMap
}

function getDominantRgbInBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: ImageBounds,
): [number, number, number] | null {
  const colorMap = countQuantizedColorsInBounds(data, width, height, bounds)
  const top = Object.entries(colorMap).sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  return hexToRgb(top[0])
}

/**
 * 四隅の 3 以上で共通する色を背景候補として検出する。
 * スタジオ背景（ベージュ壁など）の除去に有効。
 */
export function detectCornerBackgroundColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  minMatches: number = CORNER_BACKGROUND_MIN_MATCHES,
): string[] {
  const corners = getCornerSampleBounds(width, height)
  const dominants = corners
    .map((bounds) => getDominantRgbInBounds(data, width, height, bounds))
    .filter((rgb): rgb is [number, number, number] => rgb !== null)

  if (dominants.length < minMatches) return []

  const excluded: string[] = []
  const used = new Set<number>()

  for (let i = 0; i < dominants.length; i++) {
    if (used.has(i)) continue

    const cluster = [dominants[i]]
    const clusterIndices = [i]

    for (let j = i + 1; j < dominants.length; j++) {
      if (used.has(j)) continue
      if (colorDistanceRgb(dominants[i], dominants[j]) <= CORNER_COLOR_MATCH_DISTANCE) {
        cluster.push(dominants[j])
        clusterIndices.push(j)
      }
    }

    if (cluster.length >= minMatches) {
      const avg: [number, number, number] = [
        Math.round(cluster.reduce((sum, c) => sum + c[0], 0) / cluster.length),
        Math.round(cluster.reduce((sum, c) => sum + c[1], 0) / cluster.length),
        Math.round(cluster.reduce((sum, c) => sum + c[2], 0) / cluster.length),
      ]
      excluded.push(rgbToHex(...quantizeRgb(...avg)))
      clusterIndices.forEach((idx) => used.add(idx))
    }
  }

  return excluded
}

export function isSimilarToAnyColor(
  r: number,
  g: number,
  b: number,
  colors: string[],
  maxDistance: number = CORNER_COLOR_MATCH_DISTANCE,
): boolean {
  return colors.some((hex) => {
    const rgb = hexToRgb(hex)
    return rgb !== null && colorDistanceRgb([r, g, b], rgb) <= maxDistance
  })
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

interface AccumulateColorsConfig extends Required<ExtractDominantColorsOptions> {
  excludedColors: string[]
}

function getSampleBounds(
  width: number,
  height: number,
  options: Required<ExtractDominantColorsOptions>,
): ImageBounds {
  if (options.useGarmentBounds) {
    return getGarmentSampleBounds(width, height, options.centerFraction)
  }
  return getCenterSampleBounds(width, height, options.centerFraction)
}

function accumulateColorsFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: AccumulateColorsConfig,
): Record<string, number> {
  const { x0, y0, x1, y1 } = getSampleBounds(width, height, options)
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
      if (options.excludedColors.length > 0 && isSimilarToAnyColor(r, g, b, options.excludedColors)) {
        continue
      }

      let weight = 1
      if (options.radialWeighting) {
        weight = getCenterSampleWeight(x, y, width, height)
      }

      const [, sat] = rgbToHsl(r, g, b)
      // 衣装の柄色（青など）は彩度が高い — 無地背景より優先
      weight *= 0.45 + sat / 70

      const [qr, qg, qb] = quantizeRgb(r, g, b)
      const hex = rgbToHex(qr, qg, qb)
      colorMap[hex] = (colorMap[hex] || 0) + weight
    }
  }

  return colorMap
}

function sortTopColors(colorMap: Record<string, number>, limit = 5): string[] {
  return Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color]) => color)
}

/**
 * Extract dominant colors — 中央領域を優先（背景色の影響を抑える）
 */
export async function extractDominantColors(
  imageUrl: string,
  options: ExtractDominantColorsOptions = {},
): Promise<string[]> {
  const opts: Required<ExtractDominantColorsOptions> = {
    centerFraction: options.centerFraction ?? DEFAULT_CENTER_FRACTION,
    radialWeighting: options.radialWeighting ?? true,
    skipLikelyBackground: options.skipLikelyBackground ?? true,
    excludeCornerBackground: options.excludeCornerBackground ?? true,
    useGarmentBounds: options.useGarmentBounds ?? true,
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const { canvas, ctx } = buildAnalysisCanvas(img)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const { data, width, height } = {
          data: imageData.data,
          width: canvas.width,
          height: canvas.height,
        }

        const cornerBackground = opts.excludeCornerBackground
          ? detectCornerBackgroundColors(data, width, height)
          : []

        const colorMap = accumulateColorsFromImageData(data, width, height, {
          ...opts,
          excludedColors: cornerBackground,
        })

        const sortedColors = sortTopColors(colorMap)

        if (sortedColors.length > 0) {
          resolve(sortedColors)
          return
        }

        // 除外しすぎた場合: 四隅除外だけ外して再試行
        const relaxedMap = accumulateColorsFromImageData(data, width, height, {
          ...opts,
          excludedColors: [],
        })
        const relaxed = sortTopColors(relaxedMap)
        if (relaxed.length > 0) {
          resolve(relaxed)
          return
        }

        // 最後の手段: ヒューリスティック除外も外す
        const fallbackMap = accumulateColorsFromImageData(data, width, height, {
          ...opts,
          skipLikelyBackground: false,
          excludedColors: [],
        })
        const fallback = sortTopColors(fallbackMap)

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

export interface ImageDisplayMetrics {
  scaleX: number
  scaleY: number
  offsetX: number
  offsetY: number
}

/** object-fit を考慮した表示サイズと natural サイズの対応 */
export function computeImageDisplayMetrics(
  naturalWidth: number,
  naturalHeight: number,
  renderedWidth: number,
  renderedHeight: number,
  objectFit: string = 'contain',
): ImageDisplayMetrics {
  const nw = naturalWidth
  const nh = naturalHeight
  const rw = renderedWidth
  const rh = renderedHeight

  if (!nw || !nh || rw === 0 || rh === 0) {
    return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 }
  }

  if (objectFit === 'fill') {
    return { scaleX: rw / nw, scaleY: rh / nh, offsetX: 0, offsetY: 0 }
  }

  let scale: number
  if (objectFit === 'cover') {
    scale = Math.max(rw / nw, rh / nh)
  } else {
    scale = Math.min(rw / nw, rh / nh)
    if (objectFit === 'scale-down') scale = Math.min(scale, 1)
    if (objectFit === 'none') scale = 1
  }

  const contentW = nw * scale
  const contentH = nh * scale
  return {
    scaleX: scale,
    scaleY: scale,
    offsetX: (rw - contentW) / 2,
    offsetY: (rh - contentH) / 2,
  }
}

/** 画面上の img 要素と natural サイズの対応（object-fit を考慮） */
export function getImageDisplayMetrics(img: HTMLImageElement): ImageDisplayMetrics {
  const rect = img.getBoundingClientRect()
  const objectFit = getComputedStyle(img).objectFit || 'fill'
  return computeImageDisplayMetrics(
    img.naturalWidth,
    img.naturalHeight,
    rect.width,
    rect.height,
    objectFit,
  )
}

/** クリック位置を画像のピクセル座標に変換。画像外なら null */
export function mapLocalPointToImagePixel(
  naturalWidth: number,
  naturalHeight: number,
  localX: number,
  localY: number,
  metrics: ImageDisplayMetrics,
): { x: number; y: number } | null {
  const x = Math.floor((localX - metrics.offsetX) / metrics.scaleX)
  const y = Math.floor((localY - metrics.offsetY) / metrics.scaleY)

  if (x < 0 || y < 0 || x >= naturalWidth || y >= naturalHeight) {
    return null
  }
  return { x, y }
}

/** クリック位置を画像のピクセル座標に変換。画像外なら null */
export function clientPointToImagePixel(
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const rect = img.getBoundingClientRect()
  const metrics = getImageDisplayMetrics(img)
  return mapLocalPointToImagePixel(
    img.naturalWidth,
    img.naturalHeight,
    clientX - rect.left,
    clientY - rect.top,
    metrics,
  )
}

function averageRgbFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): [number, number, number] | null {
  let rSum = 0
  let gSum = 0
  let bSum = 0
  let count = 0

  for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
      const i = (y * width + x) * 4
      const a = data[i + 3]
      if (a < 128) continue
      rSum += data[i]
      gSum += data[i + 1]
      bSum += data[i + 2]
      count++
    }
  }

  if (count === 0) return null
  return [
    Math.round(rSum / count),
    Math.round(gSum / count),
    Math.round(bSum / count),
  ]
}

/**
 * 画像上の座標から色を取得（周辺ピクセルの平均で安定化）
 */
export async function sampleColorFromImage(
  imageUrl: string,
  x: number,
  y: number,
  radius = 2,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const rgb = averageRgbFromImageData(
          imageData.data,
          canvas.width,
          canvas.height,
          x,
          y,
          radius,
        )
        resolve(rgb ? rgbToHex(...rgb) : '#808080')
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

/** img 要素上のクリック位置から色を取得 */
export async function sampleColorAtClientPoint(
  imageUrl: string,
  img: HTMLImageElement,
  clientX: number,
  clientY: number,
  radius = 2,
): Promise<string | null> {
  const point = clientPointToImagePixel(img, clientX, clientY)
  if (!point) return null
  return sampleColorFromImage(imageUrl, point.x, point.y, radius)
}
