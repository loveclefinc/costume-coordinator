/**
 * コーディネート推奨エンジン
 * スーツ、ネクタイ、蝶ネクタイ、ワイシャツの相性を計算
 */

import {
  ExtendedCostume,
  Coordinate,
  CoordinateRecommendation,
  ItemType,
  ColorCompatibilityMatrix,
  PatternCompatibilityMatrix,
  MaterialCompatibilityMatrix,
  SeasonCompatibilityMatrix,
} from "./costume-types";

/**
 * 2つの色の相性スコアを計算
 */
export const calculateColorCompatibility = (color1: string, color2: string): number => {
  const normalizedColor1 = color1.toLowerCase();
  const normalizedColor2 = color2.toLowerCase();

  if (ColorCompatibilityMatrix[normalizedColor1]) {
    return ColorCompatibilityMatrix[normalizedColor1][normalizedColor2] || 0.5;
  }

  // デフォルト相性スコア
  return 0.5;
};

/**
 * 2つの柄の相性スコアを計算
 */
export const calculatePatternCompatibility = (pattern1: string, pattern2: string): number => {
  const normalizedPattern1 = pattern1.toLowerCase();
  const normalizedPattern2 = pattern2.toLowerCase();

  if (PatternCompatibilityMatrix[normalizedPattern1]) {
    return PatternCompatibilityMatrix[normalizedPattern1][normalizedPattern2] || 0.5;
  }

  // デフォルト相性スコア
  return 0.5;
};

/**
 * 2つの素材の相性スコアを計算
 */
export const calculateMaterialCompatibility = (material1: string, material2: string): number => {
  const normalizedMaterial1 = material1.toLowerCase();
  const normalizedMaterial2 = material2.toLowerCase();

  if (MaterialCompatibilityMatrix[normalizedMaterial1]) {
    return MaterialCompatibilityMatrix[normalizedMaterial1][normalizedMaterial2] || 0.5;
  }

  // デフォルト相性スコア
  return 0.5;
};

/**
 * 季節の相性スコアを計算
 */
export const calculateSeasonCompatibility = (season1: string, season2: string): number => {
  const normalizedSeason1 = season1.toLowerCase();
  const normalizedSeason2 = season2.toLowerCase();

  if (SeasonCompatibilityMatrix[normalizedSeason1]) {
    return SeasonCompatibilityMatrix[normalizedSeason1][normalizedSeason2] || 0.5;
  }

  // デフォルト相性スコア
  return 0.5;
};

/**
 * スーツとネクタイの総合相性スコアを計算
 */
export const calculateSuitNecktieCompatibility = (suit: ExtendedCostume, necktie: ExtendedCostume): number => {
  if (suit.itemType !== ItemType.SUIT || necktie.itemType !== ItemType.NECKTIE) {
    return 0;
  }

  const suitAttrs = suit.attributes as any;
  const neckTieAttrs = necktie.attributes as any;

  // 色相性（40%）
  const colorScore = calculateColorCompatibility(suitAttrs.color, neckTieAttrs.color) * 0.4;

  // 柄相性（30%）
  const patternScore = calculatePatternCompatibility(suitAttrs.pattern, neckTieAttrs.pattern) * 0.3;

  // 素材相性（20%）
  const materialScore = calculateMaterialCompatibility(suitAttrs.material, neckTieAttrs.material) * 0.2;

  // トーン相性（10%）
  const toneScore = (suitAttrs.tone === neckTieAttrs.tone ? 1.0 : 0.6) * 0.1;

  return colorScore + patternScore + materialScore + toneScore;
};

/**
 * スーツと蝶ネクタイの総合相性スコアを計算
 */
export const calculateSuitBowTieCompatibility = (suit: ExtendedCostume, bowTie: ExtendedCostume): number => {
  if (suit.itemType !== ItemType.SUIT || bowTie.itemType !== ItemType.BOW_TIE) {
    return 0;
  }

  const suitAttrs = suit.attributes as any;
  const bowTieAttrs = bowTie.attributes as any;

  // 色相性（45%）
  const colorScore = calculateColorCompatibility(suitAttrs.color, bowTieAttrs.color) * 0.45;

  // 柄相性（25%）
  const patternScore = calculatePatternCompatibility(suitAttrs.pattern, bowTieAttrs.pattern) * 0.25;

  // 素材相性（20%）
  const materialScore = calculateMaterialCompatibility(suitAttrs.material, bowTieAttrs.material) * 0.2;

  // スタイル相性（10%）
  const styleScore = (suitAttrs.fit === "slim" && bowTieAttrs.style === "modern" ? 1.0 : 0.7) * 0.1;

  return colorScore + patternScore + materialScore + styleScore;
};

/**
 * スーツとワイシャツの総合相性スコアを計算
 */
export const calculateSuitDressShirtCompatibility = (suit: ExtendedCostume, dressShirt: ExtendedCostume): number => {
  if (suit.itemType !== ItemType.SUIT || dressShirt.itemType !== ItemType.DRESS_SHIRT) {
    return 0;
  }

  const suitAttrs = suit.attributes as any;
  const shirtAttrs = dressShirt.attributes as any;

  // 色相性（35%）
  const colorScore = calculateColorCompatibility(suitAttrs.color, shirtAttrs.color) * 0.35;

  // 柄相性（25%）
  const patternScore = calculatePatternCompatibility(suitAttrs.pattern, shirtAttrs.pattern) * 0.25;

  // 素材相性（20%）
  const materialScore = calculateMaterialCompatibility(suitAttrs.material, shirtAttrs.material) * 0.2;

  // フィット相性（20%）
  const fitScore = (suitAttrs.fit === shirtAttrs.fit ? 1.0 : 0.7) * 0.2;

  return colorScore + patternScore + materialScore + fitScore;
};

/**
 * ネクタイとワイシャツの総合相性スコアを計算
 */
export const calculateNecktieShirtCompatibility = (necktie: ExtendedCostume, dressShirt: ExtendedCostume): number => {
  if (necktie.itemType !== ItemType.NECKTIE || dressShirt.itemType !== ItemType.DRESS_SHIRT) {
    return 0;
  }

  const neckTieAttrs = necktie.attributes as any;
  const shirtAttrs = dressShirt.attributes as any;

  // 色相性（40%）
  const colorScore = calculateColorCompatibility(neckTieAttrs.color, shirtAttrs.color) * 0.4;

  // 柄相性（35%）
  const patternScore = calculatePatternCompatibility(neckTieAttrs.pattern, shirtAttrs.pattern) * 0.35;

  // 素材相性（25%）
  const materialScore = calculateMaterialCompatibility(neckTieAttrs.material, shirtAttrs.material) * 0.25;

  return colorScore + patternScore + materialScore;
};

/**
 * 完全なコーディネートの総合スコアを計算
 */
export const calculateCoordinateScore = (coordinate: Coordinate): number => {
  const scores: number[] = [];

  // スーツ + ネクタイ
  if (coordinate.necktie) {
    scores.push(calculateSuitNecktieCompatibility(coordinate.suit, coordinate.necktie));
  }

  // スーツ + 蝶ネクタイ
  if (coordinate.bowTie) {
    scores.push(calculateSuitBowTieCompatibility(coordinate.suit, coordinate.bowTie));
  }

  // スーツ + ワイシャツ
  if (coordinate.dressShirt) {
    scores.push(calculateSuitDressShirtCompatibility(coordinate.suit, coordinate.dressShirt));
  }

  // ネクタイ + ワイシャツ
  if (coordinate.necktie && coordinate.dressShirt) {
    scores.push(calculateNecktieShirtCompatibility(coordinate.necktie, coordinate.dressShirt));
  }

  // 平均スコアを計算
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
};

/**
 * スーツに対する最適なコーディネートを推奨
 */
export const recommendCoordinate = (
  suit: ExtendedCostume,
  availableNecktie: ExtendedCostume[] = [],
  availableBowTie: ExtendedCostume[] = [],
  availableDressShirt: ExtendedCostume[] = []
): CoordinateRecommendation => {
  if (suit.itemType !== ItemType.SUIT) {
    throw new Error("Suit must be of type SUIT");
  }

  // 各アイテムの最適な組み合わせを計算
  let bestNecktie: ExtendedCostume | null = null;
  let bestNecktieScore = 0;

  for (const necktie of availableNecktie) {
    const score = calculateSuitNecktieCompatibility(suit, necktie);
    if (score > bestNecktieScore) {
      bestNecktieScore = score;
      bestNecktie = necktie;
    }
  }

  let bestBowTie: ExtendedCostume | null = null;
  let bestBowTieScore = 0;

  for (const bowTie of availableBowTie) {
    const score = calculateSuitBowTieCompatibility(suit, bowTie);
    if (score > bestBowTieScore) {
      bestBowTieScore = score;
      bestBowTie = bowTie;
    }
  }

  let bestDressShirt: ExtendedCostume | null = null;
  let bestDressShirtScore = 0;

  for (const dressShirt of availableDressShirt) {
    const score = calculateSuitDressShirtCompatibility(suit, dressShirt);
    if (score > bestDressShirtScore) {
      bestDressShirtScore = score;
      bestDressShirt = dressShirt;
    }
  }

  // 最適なコーディネートを構築
  const bestCoordinate: Coordinate = {
    suit,
    necktie: bestNecktie,
    bowTie: bestBowTie,
    dressShirt: bestDressShirt,
    compatibilityScore: 0,
    colorHarmony: 0,
    patternBalance: 0,
    materialBalance: 0,
    seasonMatch: 0,
    recommendations: [],
  };

  bestCoordinate.compatibilityScore = calculateCoordinateScore(bestCoordinate);

  // 代替案を生成
  const alternatives: Coordinate[] = [];

  // トップ3の代替案を生成
  const allNecktieScores = availableNecktie
    .map((n) => ({
      item: n,
      score: calculateSuitNecktieCompatibility(suit, n),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(1, 4); // 最高スコアを除いた上位3つ

  for (const { item } of allNecktieScores) {
    const altCoord: Coordinate = {
      suit,
      necktie: item,
      bowTie: bestBowTie,
      dressShirt: bestDressShirt,
      compatibilityScore: 0,
      colorHarmony: 0,
      patternBalance: 0,
      materialBalance: 0,
      seasonMatch: 0,
      recommendations: [],
    };
    altCoord.compatibilityScore = calculateCoordinateScore(altCoord);
    alternatives.push(altCoord);
  }

  return {
    suit,
    recommendedNecktie: bestNecktie,
    recommendedBowTie: bestBowTie,
    recommendedDressShirt: bestDressShirt,
    overallScore: bestCoordinate.compatibilityScore,
    breakdown: {
      colorScore: bestNecktieScore * 0.4 + bestBowTieScore * 0.45 + bestDressShirtScore * 0.35,
      patternScore: bestNecktieScore * 0.3 + bestBowTieScore * 0.25 + bestDressShirtScore * 0.25,
      materialScore: bestNecktieScore * 0.2 + bestBowTieScore * 0.2 + bestDressShirtScore * 0.2,
      seasonScore: 0.8,
      styleScore: 0.75,
    },
    alternatives,
  };
};

/**
 * 複数のスーツに対する最適なコーディネートを推奨
 */
export const recommendCoordinatesForMultipleSuits = (
  suits: ExtendedCostume[],
  availableNecktie: ExtendedCostume[] = [],
  availableBowTie: ExtendedCostume[] = [],
  availableDressShirt: ExtendedCostume[] = []
): CoordinateRecommendation[] => {
  return suits.map((suit) =>
    recommendCoordinate(suit, availableNecktie, availableBowTie, availableDressShirt)
  );
};
