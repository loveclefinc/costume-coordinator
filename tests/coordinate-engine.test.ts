import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateColorCompatibility,
  calculatePatternCompatibility,
  calculateMaterialCompatibility,
  calculateSeasonCompatibility,
  calculateSuitNecktieCompatibility,
  calculateSuitBowTieCompatibility,
  calculateSuitDressShirtCompatibility,
  calculateNecktieShirtCompatibility,
  calculateCoordinateScore,
  recommendCoordinate,
  recommendCoordinatesForMultipleSuits,
} from "../src/utils/coordinate-engine";
import { ExtendedCostume, ItemType, Coordinate } from "../src/utils/costume-types";

describe("Coordinate Engine", () => {
  let mockSuit: ExtendedCostume;
  let mockNecktie: ExtendedCostume;
  let mockBowTie: ExtendedCostume;
  let mockDressShirt: ExtendedCostume;

  beforeEach(() => {
    mockSuit = {
      id: "suit1",
      userId: "user1",
      itemType: ItemType.SUIT,
      name: "Navy Suit",
      imageUrl: "https://example.com/suit.jpg",
      photoUrls: [],
      attributes: {
        color: "navy",
        tone: "cool",
        pattern: "solid",
        material: "wool",
        fit: "regular",
        season: "all",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageHistory: [],
    };

    mockNecktie = {
      id: "tie1",
      userId: "user1",
      itemType: ItemType.NECKTIE,
      name: "Red Necktie",
      imageUrl: "https://example.com/tie.jpg",
      photoUrls: [],
      attributes: {
        color: "red",
        pattern: "solid",
        material: "silk",
        width: "standard",
        length: "standard",
        texture: "smooth",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageHistory: [],
    };

    mockBowTie = {
      id: "bowtie1",
      userId: "user1",
      itemType: ItemType.BOW_TIE,
      name: "Black Bow Tie",
      imageUrl: "https://example.com/bowtie.jpg",
      photoUrls: [],
      attributes: {
        color: "black",
        pattern: "solid",
        material: "silk",
        style: "classic",
        adjustable: true,
        texture: "smooth",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageHistory: [],
    };

    mockDressShirt = {
      id: "shirt1",
      userId: "user1",
      itemType: ItemType.DRESS_SHIRT,
      name: "White Dress Shirt",
      imageUrl: "https://example.com/shirt.jpg",
      photoUrls: [],
      attributes: {
        color: "white",
        pattern: "solid",
        material: "cotton",
        collar: "point",
        sleeve: "long",
        fit: "regular",
        texture: "smooth",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageHistory: [],
    };
  });

  describe("Color Compatibility", () => {
    it("should calculate color compatibility between navy and red", () => {
      const score = calculateColorCompatibility("navy", "red");
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 1.0 for same colors", () => {
      const score = calculateColorCompatibility("navy", "navy");
      expect(score).toBe(1.0);
    });

    it("should return default score for unknown colors", () => {
      const score = calculateColorCompatibility("unknown1", "unknown2");
      expect(score).toBe(0.5);
    });
  });

  describe("Pattern Compatibility", () => {
    it("should calculate pattern compatibility", () => {
      const score = calculatePatternCompatibility("solid", "stripe");
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 0.8 for solid and solid patterns", () => {
      const score = calculatePatternCompatibility("solid", "solid");
      expect(score).toBe(0.8);
    });
  });

  describe("Material Compatibility", () => {
    it("should calculate material compatibility", () => {
      const score = calculateMaterialCompatibility("wool", "silk");
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 0.9 for wool and silk", () => {
      const score = calculateMaterialCompatibility("wool", "silk");
      expect(score).toBe(0.9);
    });
  });

  describe("Season Compatibility", () => {
    it("should calculate season compatibility", () => {
      const score = calculateSeasonCompatibility("spring", "summer");
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 1.0 for same seasons", () => {
      const score = calculateSeasonCompatibility("spring", "spring");
      expect(score).toBe(1.0);
    });
  });

  describe("Suit and Necktie Compatibility", () => {
    it("should calculate suit and necktie compatibility", () => {
      const score = calculateSuitNecktieCompatibility(mockSuit, mockNecktie);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should return 0 for non-suit items", () => {
      const score = calculateSuitNecktieCompatibility(mockNecktie, mockNecktie);
      expect(score).toBe(0);
    });
  });

  describe("Suit and Bow Tie Compatibility", () => {
    it("should calculate suit and bow tie compatibility", () => {
      const score = calculateSuitBowTieCompatibility(mockSuit, mockBowTie);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Suit and Dress Shirt Compatibility", () => {
    it("should calculate suit and dress shirt compatibility", () => {
      const score = calculateSuitDressShirtCompatibility(mockSuit, mockDressShirt);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Necktie and Shirt Compatibility", () => {
    it("should calculate necktie and shirt compatibility", () => {
      const score = calculateNecktieShirtCompatibility(mockNecktie, mockDressShirt);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe("Coordinate Score", () => {
    it("should calculate coordinate score", () => {
      const coordinate: Coordinate = {
        suit: mockSuit,
        necktie: mockNecktie,
        bowTie: mockBowTie,
        dressShirt: mockDressShirt,
        compatibilityScore: 0,
        colorHarmony: 0,
        patternBalance: 0,
        materialBalance: 0,
        seasonMatch: 0,
        recommendations: [],
      };

      const score = calculateCoordinateScore(coordinate);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it("should handle coordinates with missing items", () => {
      const coordinate: Coordinate = {
        suit: mockSuit,
        necktie: mockNecktie,
        compatibilityScore: 0,
        colorHarmony: 0,
        patternBalance: 0,
        materialBalance: 0,
        seasonMatch: 0,
        recommendations: [],
      };

      const score = calculateCoordinateScore(coordinate);
      expect(typeof score).toBe("number");
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Coordinate Recommendation", () => {
    it("should recommend coordinate for a suit", () => {
      const recommendation = recommendCoordinate(mockSuit, [mockNecktie], [mockBowTie], [mockDressShirt]);

      expect(recommendation).toBeDefined();
      expect(recommendation.suit).toEqual(mockSuit);
      expect(recommendation.recommendedNecktie).toBeDefined();
      expect(recommendation.overallScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.overallScore).toBeLessThanOrEqual(1);
    });

    it("should generate alternatives", () => {
      const recommendation = recommendCoordinate(
        mockSuit,
        [mockNecktie, mockNecktie, mockNecktie, mockNecktie],
        [mockBowTie],
        [mockDressShirt]
      );

      expect(recommendation.alternatives).toBeDefined();
      expect(Array.isArray(recommendation.alternatives)).toBe(true);
    });

    it("should handle empty item lists", () => {
      const recommendation = recommendCoordinate(mockSuit, [], [], []);

      expect(recommendation).toBeDefined();
      expect(recommendation.recommendedNecktie).toBeNull();
      expect(recommendation.recommendedBowTie).toBeNull();
      expect(recommendation.recommendedDressShirt).toBeNull();
    });

    it("should throw error for non-suit items", () => {
      expect(() => {
        recommendCoordinate(mockNecktie, [mockNecktie], [], []);
      }).toThrow("Suit must be of type SUIT");
    });
  });

  describe("Multiple Suits Recommendation", () => {
    it("should recommend coordinates for multiple suits", () => {
      const suits = [mockSuit, mockSuit];
      const recommendations = recommendCoordinatesForMultipleSuits(suits, [mockNecktie], [mockBowTie], [mockDressShirt]);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBe(2);
      expect(recommendations[0].suit).toEqual(mockSuit);
    });
  });

  describe("Breakdown Scores", () => {
    it("should provide detailed breakdown scores", () => {
      const recommendation = recommendCoordinate(mockSuit, [mockNecktie], [mockBowTie], [mockDressShirt]);

      expect(recommendation.breakdown).toBeDefined();
      expect(recommendation.breakdown.colorScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.breakdown.patternScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.breakdown.materialScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.breakdown.seasonScore).toBeGreaterThanOrEqual(0);
      expect(recommendation.breakdown.styleScore).toBeGreaterThanOrEqual(0);
    });
  });
});
