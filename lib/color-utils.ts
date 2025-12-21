/**
 * Color utility functions
 */

export type ColorName = "red" | "green" | "yellow" | "blue" | "pink" | "purple" | "orange" | "white" | "black" | "brown" | "gray" | "gold" | "silver";

const COLOR_MAP: Record<ColorName, string> = {
  red: "#FF0000",
  green: "#00FF00",
  yellow: "#FFFF00",
  blue: "#0000FF",
  pink: "#FF69B4",
  purple: "#800080",
  orange: "#FFA500",
  white: "#FFFFFF",
  black: "#000000",
  brown: "#8B4513",
  gray: "#808080",
  gold: "#FFD700",
  silver: "#C0C0C0",
};

/**
 * Convert color name to HEX value
 */
export function colorNameToHex(colorName: ColorName): string {
  return COLOR_MAP[colorName];
}

/**
 * Check if a HEX color matches any of the specified color names
 */
export function matchesSpecificColors(hex: string, colorNames: ColorName[]): boolean {
  if (colorNames.length === 0) return true;
  
  // Convert hex to RGB
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  for (const colorName of colorNames) {
    const targetHex = COLOR_MAP[colorName];
    const tr = parseInt(targetHex.slice(1, 3), 16);
    const tg = parseInt(targetHex.slice(3, 5), 16);
    const tb = parseInt(targetHex.slice(5, 7), 16);
    
    // Calculate color distance (Euclidean distance in RGB space)
    const distance = Math.sqrt(
      Math.pow(r - tr, 2) +
      Math.pow(g - tg, 2) +
      Math.pow(b - tb, 2)
    );
    
    // If distance is less than threshold (100 out of 441 max), consider it a match
    if (distance < 100) {
      return true;
    }
  }
  
  return false;
}
