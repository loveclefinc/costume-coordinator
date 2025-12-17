/**
 * Image analysis utilities for costume color and pattern detection
 */

export type ColorCategory = "warm" | "cool" | "neutral";
export type Tone = "pastel" | "vivid" | "dark" | "neutral";
export type Pattern = "solid" | "floral" | "stripe" | "dot" | "other";

export interface ColorAnalysis {
  primary: string; // HEX color
  secondary?: string;
  colorCategory: ColorCategory;
  tone: Tone;
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-1
  v: number; // 0-1
}

/**
 * Convert HEX color to HSV
 */
export function hexToHSV(hex: string): HSV {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta !== 0) {
    s = delta / max;

    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }

  return {
    h: h * 360,
    s,
    v,
  };
}

/**
 * Convert HSV to HEX
 */
export function hsvToHex(hsv: HSV): string {
  const { h, s, v } = hsv;
  const hNorm = h / 360;

  const i = Math.floor(hNorm * 6);
  const f = hNorm * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0,
    g = 0,
    b = 0;

  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Categorize color as warm, cool, or neutral based on hue
 */
export function categorizeColor(hue: number): ColorCategory {
  // Hue circle: 0°=red, 60°=yellow, 120°=green, 180°=cyan, 240°=blue, 300°=magenta
  if ((hue >= 0 && hue < 60) || hue >= 330) {
    return "warm"; // Red to yellow, magenta to red
  }
  if (hue >= 60 && hue < 150) {
    return "neutral"; // Yellow to green
  }
  if (hue >= 150 && hue < 270) {
    return "cool"; // Green to blue
  }
  return "warm"; // Magenta to red
}

/**
 * Categorize tone based on saturation and value
 */
export function categorizeTone(saturation: number, value: number): Tone {
  if (saturation < 0.3 && value > 0.7) {
    return "pastel";
  }
  if (saturation > 0.6 && value > 0.6) {
    return "vivid";
  }
  if (value < 0.4) {
    return "dark";
  }
  return "neutral";
}

/**
 * Analyze color from HEX string
 */
export function analyzeColor(hexColor: string): ColorAnalysis {
  const hsv = hexToHSV(hexColor);
  return {
    primary: hexColor,
    colorCategory: categorizeColor(hsv.h),
    tone: categorizeTone(hsv.s, hsv.v),
  };
}

/**
 * Check if two colors are similar (within threshold)
 */
export function areSimilarColors(hex1: string, hex2: string, hueThreshold = 30): boolean {
  const hsv1 = hexToHSV(hex1);
  const hsv2 = hexToHSV(hex2);

  // Calculate hue difference (accounting for circular nature)
  let hueDiff = Math.abs(hsv1.h - hsv2.h);
  if (hueDiff > 180) {
    hueDiff = 360 - hueDiff;
  }

  return hueDiff < hueThreshold;
}

/**
 * Get color name from HEX (simplified)
 */
export function getColorName(hex: string): string {
  const hsv = hexToHSV(hex);
  const { h, s, v } = hsv;

  if (v < 0.2) return "黒";
  if (s < 0.1 && v > 0.9) return "白";
  if (s < 0.1) return "グレー";

  // Hue-based color names
  if (h >= 0 && h < 30) return "赤";
  if (h >= 30 && h < 60) return "オレンジ";
  if (h >= 60 && h < 90) return "黄色";
  if (h >= 90 && h < 150) return "緑";
  if (h >= 150 && h < 210) return "青緑";
  if (h >= 210 && h < 270) return "青";
  if (h >= 270 && h < 330) return "紫";
  return "赤";
}


/**
 * Extract dominant color from image URI
 * Returns the most prominent color in the image as HEX string
 */
export async function extractDominantColor(imageUri: string): Promise<string | null> {
  try {
    // For web/mobile, we'll use a simplified approach
    // In a real implementation, you would use image processing libraries
    // For now, return null to trigger manual color selection
    return null;
  } catch (error) {
    console.error("Failed to extract color:", error);
    return null;
  }
}
