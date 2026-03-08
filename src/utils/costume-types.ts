/**
 * 衣装管理システムの拡張型定義
 * スーツ、ネクタイ、蝶ネクタイ、ワイシャツに対応
 */

// アイテムタイプ定義
export enum ItemType {
  SUIT = "suit",
  NECKTIE = "necktie",
  BOW_TIE = "bow_tie",
  DRESS_SHIRT = "dress_shirt",
}

// アイテムタイプの表示名
export const ItemTypeLabels: Record<ItemType, string> = {
  [ItemType.SUIT]: "スーツ",
  [ItemType.NECKTIE]: "ネクタイ",
  [ItemType.BOW_TIE]: "蝶ネクタイ",
  [ItemType.DRESS_SHIRT]: "ワイシャツ",
};

// 各アイテムタイプの属性
export interface ItemAttributes {
  [ItemType.SUIT]: {
    color: string;
    tone: string;
    pattern: string;
    material: string;
    fit: "slim" | "regular" | "relaxed";
    season: "spring" | "summer" | "fall" | "winter" | "all";
  };
  [ItemType.NECKTIE]: {
    color: string;
    pattern: string;
    material: string;
    width: "narrow" | "standard" | "wide";
    length: "short" | "standard" | "long";
    texture: "smooth" | "textured" | "knit";
  };
  [ItemType.BOW_TIE]: {
    color: string;
    pattern: string;
    material: string;
    style: "classic" | "modern" | "oversized";
    adjustable: boolean;
    texture: "smooth" | "textured" | "knit";
  };
  [ItemType.DRESS_SHIRT]: {
    color: string;
    pattern: string;
    material: string;
    collar: "spread" | "point" | "club" | "wing";
    sleeve: "short" | "long" | "three_quarter";
    fit: "slim" | "regular" | "relaxed";
    texture: "smooth" | "textured" | "oxford";
  };
}

// 拡張衣装型定義
export interface ExtendedCostume {
  id: string;
  userId: string;
  itemType: ItemType;
  name: string;
  imageUrl: string;
  photoUrls: string[];
  attributes: ItemAttributes[ItemType];
  createdAt: string;
  updatedAt: string;
  usageHistory: {
    eventId: string;
    date: string;
    coordinateWith?: {
      suit?: string;
      necktie?: string;
      bowTie?: string;
      dressShirt?: string;
    };
  }[];
}

// コーディネート組み合わせ型
export interface Coordinate {
  suit: ExtendedCostume;
  necktie?: ExtendedCostume | null;
  bowTie?: ExtendedCostume | null;
  dressShirt?: ExtendedCostume | null;
  compatibilityScore: number;
  colorHarmony: number;
  patternBalance: number;
  materialBalance: number;
  seasonMatch: number;
  recommendations: string[];
}

// 色相性スコア計算用
export interface ColorCompatibility {
  primary: string;
  secondary: string;
  compatibility: number;
  reason: string;
}

// 柄相性スコア計算用
export interface PatternCompatibility {
  pattern1: string;
  pattern2: string;
  compatibility: number;
  reason: string;
}

// 素材相性スコア計算用
export interface MaterialCompatibility {
  material1: string;
  material2: string;
  compatibility: number;
  reason: string;
}

// コーディネート推奨エンジン用
export interface CoordinateRecommendation {
  suit: ExtendedCostume;
  recommendedNecktie: ExtendedCostume | null;
  recommendedBowTie: ExtendedCostume | null;
  recommendedDressShirt: ExtendedCostume | null;
  overallScore: number;
  breakdown: {
    colorScore: number;
    patternScore: number;
    materialScore: number;
    seasonScore: number;
    styleScore: number;
  };
  alternatives: Coordinate[];
}

// 色相性マトリックス
export const ColorCompatibilityMatrix: Record<string, Record<string, number>> = {
  // 基本色の相性
  red: {
    red: 1.0,
    darkred: 0.9,
    pink: 0.8,
    white: 0.9,
    black: 0.85,
    navy: 0.7,
    gray: 0.75,
    gold: 0.8,
    silver: 0.7,
  },
  navy: {
    navy: 1.0,
    darkblue: 0.95,
    lightblue: 0.8,
    white: 0.95,
    black: 0.9,
    red: 0.7,
    gray: 0.85,
    gold: 0.75,
    silver: 0.8,
  },
  black: {
    black: 1.0,
    darkgray: 0.95,
    gray: 0.85,
    white: 0.9,
    red: 0.85,
    navy: 0.9,
    gold: 0.8,
    silver: 0.85,
  },
  white: {
    white: 1.0,
    lightgray: 0.95,
    gray: 0.85,
    black: 0.9,
    navy: 0.95,
    red: 0.9,
    blue: 0.9,
    gold: 0.8,
  },
  gray: {
    gray: 1.0,
    darkgray: 0.95,
    lightgray: 0.9,
    white: 0.85,
    black: 0.85,
    navy: 0.85,
    red: 0.75,
    blue: 0.8,
  },
  gold: {
    gold: 1.0,
    orange: 0.9,
    brown: 0.85,
    red: 0.8,
    black: 0.8,
    white: 0.8,
    navy: 0.75,
  },
};

// 柄相性マトリックス
export const PatternCompatibilityMatrix: Record<string, Record<string, number>> = {
  solid: {
    solid: 0.8,
    stripe: 0.9,
    check: 0.85,
    dot: 0.85,
    floral: 0.7,
    geometric: 0.8,
    paisley: 0.75,
  },
  stripe: {
    solid: 0.9,
    stripe: 0.6,
    check: 0.65,
    dot: 0.7,
    floral: 0.5,
    geometric: 0.7,
    paisley: 0.6,
  },
  check: {
    solid: 0.85,
    stripe: 0.65,
    check: 0.5,
    dot: 0.6,
    floral: 0.4,
    geometric: 0.6,
    paisley: 0.5,
  },
  dot: {
    solid: 0.85,
    stripe: 0.7,
    check: 0.6,
    dot: 0.5,
    floral: 0.6,
    geometric: 0.7,
    paisley: 0.6,
  },
  floral: {
    solid: 0.7,
    stripe: 0.5,
    check: 0.4,
    dot: 0.6,
    floral: 0.4,
    geometric: 0.5,
    paisley: 0.6,
  },
};

// 素材相性マトリックス
export const MaterialCompatibilityMatrix: Record<string, Record<string, number>> = {
  wool: {
    wool: 0.9,
    cotton: 0.85,
    silk: 0.9,
    linen: 0.7,
    polyester: 0.8,
    blend: 0.85,
  },
  cotton: {
    wool: 0.85,
    cotton: 0.9,
    silk: 0.8,
    linen: 0.85,
    polyester: 0.75,
    blend: 0.8,
  },
  silk: {
    wool: 0.9,
    cotton: 0.8,
    silk: 0.95,
    linen: 0.7,
    polyester: 0.75,
    blend: 0.8,
  },
  linen: {
    wool: 0.7,
    cotton: 0.85,
    silk: 0.7,
    linen: 0.8,
    polyester: 0.6,
    blend: 0.7,
  },
  polyester: {
    wool: 0.8,
    cotton: 0.75,
    silk: 0.75,
    linen: 0.6,
    polyester: 0.85,
    blend: 0.8,
  },
};

// 季節相性マトリックス
export const SeasonCompatibilityMatrix: Record<string, Record<string, number>> = {
  spring: {
    spring: 1.0,
    summer: 0.7,
    fall: 0.7,
    winter: 0.5,
    all: 0.9,
  },
  summer: {
    spring: 0.7,
    summer: 1.0,
    fall: 0.5,
    winter: 0.3,
    all: 0.9,
  },
  fall: {
    spring: 0.7,
    summer: 0.5,
    fall: 1.0,
    winter: 0.8,
    all: 0.9,
  },
  winter: {
    spring: 0.5,
    summer: 0.3,
    fall: 0.8,
    winter: 1.0,
    all: 0.9,
  },
  all: {
    spring: 0.9,
    summer: 0.9,
    fall: 0.9,
    winter: 0.9,
    all: 1.0,
  },
};
