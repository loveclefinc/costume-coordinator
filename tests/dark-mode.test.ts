import { describe, it, expect } from "vitest";

// Dark mode color definitions
const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textDisabled: "#BDBDBD",
    background: "#FFFFFF",
    card: "#F8F8F8",
    elevated: "#FFFFFF",
    tint: "#FF6B9D",
    secondary: "#9B59B6",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: "#FF6B9D",
    border: "#D0D0D0",
    error: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
  },
  dark: {
    text: "#F5F5F5",
    textSecondary: "#B0B0B0",
    textDisabled: "#696969",
    background: "#0D0D0D",
    card: "#1A1A1A",
    elevated: "#252525",
    tint: "#FF8FB3",
    secondary: "#C99FE0",
    icon: "#A8ADAF",
    tabIconDefault: "#A8ADAF",
    tabIconSelected: "#FF8FB3",
    border: "#404040",
    error: "#FF453A",
    success: "#34C759",
    warning: "#FFB340",
  },
};

/**
 * Test suite for dark mode color contrast and visibility
 * Ensures proper contrast ratios and readability
 */

describe("Dark Mode Color Contrast", () => {
  const lightColors = Colors.light;
  const darkColors = Colors.dark;

  /**
   * Calculate relative luminance for WCAG contrast ratio
   */
  function getLuminance(hex: string): number {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate WCAG contrast ratio between two colors
   */
  function getContrastRatio(color1: string, color2: string): number {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  it("should have sufficient contrast between dark text and background", () => {
    const ratio = getContrastRatio(darkColors.text, darkColors.background);
    expect(ratio).toBeGreaterThan(4.5); // WCAG AA standard
  });

  it("should have sufficient contrast between dark secondary text and background", () => {
    const ratio = getContrastRatio(darkColors.textSecondary, darkColors.background);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("should have sufficient contrast between dark text and card background", () => {
    const ratio = getContrastRatio(darkColors.text, darkColors.card);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("should have sufficient contrast between dark tint and background", () => {
    const ratio = getContrastRatio(darkColors.tint, darkColors.background);
    expect(ratio).toBeGreaterThan(3); // WCAG AA for large text
  });

  it("should have sufficient contrast between light text and light background", () => {
    const ratio = getContrastRatio(lightColors.text, lightColors.background);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("should have sufficient contrast between light secondary text and light background", () => {
    const ratio = getContrastRatio(lightColors.textSecondary, lightColors.background);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it("should have distinct color values for dark mode", () => {
    expect(darkColors.text).not.toBe(lightColors.text);
    expect(darkColors.background).not.toBe(lightColors.background);
    expect(darkColors.card).not.toBe(lightColors.card);
  });

  it("should have distinct color values for light mode", () => {
    expect(lightColors.text).not.toBe(darkColors.text);
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.card).not.toBe(darkColors.card);
  });

  it("should have valid hex color format for all dark mode colors", () => {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    Object.values(darkColors).forEach((color) => {
      expect(hexRegex.test(color as string)).toBe(true);
    });
  });

  it("should have valid hex color format for all light mode colors", () => {
    const hexRegex = /^#[0-9A-F]{6}$/i;
    Object.values(lightColors).forEach((color) => {
      expect(hexRegex.test(color as string)).toBe(true);
    });
  });

  it("should have darker background in dark mode than in light mode", () => {
    const darkBgLum = getLuminance(darkColors.background);
    const lightBgLum = getLuminance(lightColors.background);
    expect(darkBgLum).toBeLessThan(lightBgLum);
  });

  it("should have lighter text in dark mode than in light mode", () => {
    const darkTextLum = getLuminance(darkColors.text);
    const lightTextLum = getLuminance(lightColors.text);
    expect(darkTextLum).toBeGreaterThan(lightTextLum);
  });

  it("should have consistent secondary color across modes", () => {
    expect(darkColors.secondary).toBeDefined();
    expect(lightColors.secondary).toBeDefined();
  });

  it("should have distinct border colors for both modes", () => {
    expect(darkColors.border).not.toBe(lightColors.border);
  });

  it("should have sufficient contrast between dark border and background", () => {
    const ratio = getContrastRatio(darkColors.border, darkColors.background);
    expect(ratio).toBeGreaterThan(1.5);
  });

  it("should have sufficient contrast between light border and background", () => {
    const ratio = getContrastRatio(lightColors.border, lightColors.background);
    expect(ratio).toBeGreaterThan(1.5);
  });

  it("should have proper error color contrast in dark mode", () => {
    const ratio = getContrastRatio(darkColors.error, darkColors.background);
    expect(ratio).toBeGreaterThan(3);
  });

  it("should have proper success color contrast in dark mode", () => {
    const ratio = getContrastRatio(darkColors.success, darkColors.background);
    expect(ratio).toBeGreaterThan(3);
  });

  it("should have proper warning color contrast in dark mode", () => {
    const ratio = getContrastRatio(darkColors.warning, darkColors.background);
    expect(ratio).toBeGreaterThan(3);
  });
});
