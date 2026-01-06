/**
 * Costume Coordinator theme colors
 */

import { Platform } from "react-native";

const tintColorLight = "#FF6B9D"; // Pink accent
const tintColorDark = "#FF8FB3";

export const Colors = {
  light: {
    text: "#1A1A1A",
    textSecondary: "#6B6B6B",
    textDisabled: "#BDBDBD",
    background: "#FFFFFF",
    card: "#F8F8F8",
    elevated: "#FFFFFF",
    tint: tintColorLight,
    secondary: "#9B59B6", // Purple
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
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
    tint: tintColorDark,
    secondary: "#C99FE0",
    icon: "#A8ADAF",
    tabIconDefault: "#A8ADAF",
    tabIconSelected: tintColorDark,
    border: "#404040",
    error: "#FF453A",
    success: "#34C759",
    warning: "#FFB340",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  button: 12,
  card: 16,
  modal: 24,
  thumbnail: 8,
};
