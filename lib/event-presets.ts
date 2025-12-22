/**
 * Event condition presets for common themes
 */

export interface EventPreset {
  name: string;
  icon: string;
  description: string;
  conditions: {
    colorCategory?: "warm" | "cool" | "neutral";
    tone?: "pastel" | "vivid" | "dark" | "neutral";
    specificColors?: string[];
    patternRules?: {
      allowFloral: boolean;
      floralMaxCount?: number;
      patternPreferences?: string[];
    };
    avoidSimilarColors: boolean;
    recentUsageExcludeDays: number;
  };
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    name: "クリスマス",
    icon: "🎄",
    description: "赤・緑・金色のクリスマステーマ",
    conditions: {
      specificColors: ["red", "green", "gold", "white"],
      tone: "vivid",
      patternRules: {
        allowFloral: false,
        patternPreferences: ["solid", "geometric", "stripe"],
      },
      avoidSimilarColors: true,
      recentUsageExcludeDays: 30,
    },
  },
  {
    name: "ハロウィン",
    icon: "🎃",
    description: "オレンジ・黒・紫のハロウィンテーマ",
    conditions: {
      specificColors: ["orange", "black", "purple"],
      tone: "vivid",
      patternRules: {
        allowFloral: false,
        patternPreferences: ["solid", "geometric", "stripe"],
      },
      avoidSimilarColors: true,
      recentUsageExcludeDays: 30,
    },
  },
  {
    name: "春祭り",
    icon: "🌸",
    description: "パステルカラーと花柄の春テーマ",
    conditions: {
      colorCategory: "warm",
      tone: "pastel",
      specificColors: ["pink", "yellow", "white"],
      patternRules: {
        allowFloral: true,
        patternPreferences: ["floral", "solid"],
      },
      avoidSimilarColors: false,
      recentUsageExcludeDays: 30,
    },
  },
  {
    name: "夏祭り",
    icon: "🎆",
    description: "ビビッドカラーの夏テーマ",
    conditions: {
      tone: "vivid",
      specificColors: ["blue", "yellow", "red", "white"],
      patternRules: {
        allowFloral: true,
        patternPreferences: ["floral", "stripe", "dot"],
      },
      avoidSimilarColors: true,
      recentUsageExcludeDays: 30,
    },
  },
  {
    name: "フォーマル",
    icon: "👔",
    description: "黒・白・グレーのフォーマルテーマ",
    conditions: {
      colorCategory: "neutral",
      tone: "dark",
      specificColors: ["black", "white", "gray", "silver"],
      patternRules: {
        allowFloral: false,
        patternPreferences: ["solid"],
      },
      avoidSimilarColors: true,
      recentUsageExcludeDays: 30,
    },
  },
  {
    name: "バレンタイン",
    icon: "💝",
    description: "ピンク・赤・白のバレンタインテーマ",
    conditions: {
      colorCategory: "warm",
      tone: "pastel",
      specificColors: ["pink", "red", "white"],
      patternRules: {
        allowFloral: true,
        patternPreferences: ["solid", "floral", "dot"],
      },
      avoidSimilarColors: false,
      recentUsageExcludeDays: 30,
    },
  },
];
