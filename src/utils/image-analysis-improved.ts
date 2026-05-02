/**
 * Improved image analysis utility with k-means clustering for better color extraction
 */

export interface ColorCluster {
  center: [number, number, number]
  pixels: [number, number, number][]
}

/**
 * Extract dominant colors using k-means clustering
 */
export async function extractDominantColorsImproved(imageUrl: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        // Scale down for faster processing
        const scale = 0.25
        canvas.width = Math.max(100, img.width * scale)
        canvas.height = Math.max(100, img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Extract all pixels with better filtering
        const pixels: [number, number, number][] = []
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // Skip transparent and near-white/black pixels
          if (a < 128) continue
          const brightness = (r + g + b) / 3
          if (brightness < 10 || brightness > 245) continue

          pixels.push([r, g, b])
        }

        if (pixels.length === 0) {
          resolve(['#808080'])
          return
        }

        // Cluster similar colors using k-means
        const k = 5
        const clusters = kMeansClustering(pixels, k)

        // Sort by cluster size and convert to hex
        const sortedColors = clusters
          .sort((a, b) => b.pixels.length - a.pixels.length)
          .map(cluster => rgbToHex(cluster.center[0], cluster.center[1], cluster.center[2]))

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
 * K-means clustering for color grouping
 */
function kMeansClustering(pixels: [number, number, number][], k: number): ColorCluster[] {
  if (pixels.length === 0) return []

  // Initialize centers randomly from pixels
  const centers: [number, number, number][] = []
  for (let i = 0; i < Math.min(k, pixels.length); i++) {
    const idx = Math.floor(Math.random() * pixels.length)
    centers.push([...pixels[idx]])
  }

  let clusters: ColorCluster[] = []
  let converged = false
  let iterations = 0
  const maxIterations = 10

  while (!converged && iterations < maxIterations) {
    // Assign pixels to nearest center
    clusters = centers.map(center => ({
      center,
      pixels: [],
    }))

    for (const pixel of pixels) {
      let minDist = Infinity
      let nearestCluster = 0

      for (let i = 0; i < centers.length; i++) {
        const dist = colorDistance(pixel, centers[i])
        if (dist < minDist) {
          minDist = dist
          nearestCluster = i
        }
      }

      clusters[nearestCluster].pixels.push(pixel)
    }

    // Update centers
    const newCenters: [number, number, number][] = []
    converged = true

    for (const cluster of clusters) {
      if (cluster.pixels.length === 0) {
        newCenters.push(cluster.center)
        continue
      }

      const avg: [number, number, number] = [
        Math.round(cluster.pixels.reduce((sum, p) => sum + p[0], 0) / cluster.pixels.length),
        Math.round(cluster.pixels.reduce((sum, p) => sum + p[1], 0) / cluster.pixels.length),
        Math.round(cluster.pixels.reduce((sum, p) => sum + p[2], 0) / cluster.pixels.length),
      ]

      if (colorDistance(avg, cluster.center) > 1) {
        converged = false
      }

      newCenters.push(avg)
    }

    centers.splice(0, centers.length, ...newCenters)
    iterations++
  }

  return clusters.filter(c => c.pixels.length > 0)
}

/**
 * Calculate Euclidean distance between two RGB colors
 */
function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  const dr = color1[0] - color2[0]
  const dg = color1[1] - color2[1]
  const db = color1[2] - color2[2]
  return Math.sqrt(dr * dr + dg * dg + db * db)
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
