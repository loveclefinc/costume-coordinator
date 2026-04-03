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

/**
 * Extract dominant color from image using Canvas API
 */
export async function extractDominantColors(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Sample pixels to find dominant colors
        const colorMap: { [key: string]: number } = {}
        const step = 4 // Sample every 4th pixel for performance
        
        for (let i = 0; i < data.length; i += step * 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // Skip transparent pixels
          if (a < 128) continue

          const hex = rgbToHex(r, g, b)
          colorMap[hex] = (colorMap[hex] || 0) + 1
        }

        // Get top 5 colors
        const sortedColors = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([color]) => color)

        resolve(sortedColors)
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
