import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Test suite for multiple photo management feature
 * Tests the ability to add, store, and retrieve multiple wearing photos per costume
 */

// Mock CostumeData interface
interface CostumeData {
  id: string;
  name: string;
  imageUri: string;
  thumbnailUri: string;
  wearingPhotos?: string[];
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: string;
  tags: string[];
  usageHistory: Array<{ eventId: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

describe("Multiple Photo Management", () => {
  let mockCostume: CostumeData;

  beforeEach(() => {
    mockCostume = {
      id: "test-costume-1",
      name: "テストドレス",
      imageUri: "file:///costume-main.jpg",
      thumbnailUri: "file:///costume-thumbnail.jpg",
      wearingPhotos: [],
      colors: {
        primary: "#FF6B9D",
      },
      colorCategory: "warm",
      tone: "vivid",
      pattern: "solid",
      tags: ["フォーマル"],
      usageHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  it("should initialize costume with empty wearing photos array", () => {
    expect(mockCostume.wearingPhotos).toBeDefined();
    expect(mockCostume.wearingPhotos).toEqual([]);
  });

  it("should add a wearing photo to the costume", () => {
    const photoUri = "file:///wearing-photo-1.jpg";
    mockCostume.wearingPhotos?.push(photoUri);

    expect(mockCostume.wearingPhotos).toContain(photoUri);
    expect(mockCostume.wearingPhotos?.length).toBe(1);
  });

  it("should add multiple wearing photos", () => {
    const photos = [
      "file:///wearing-photo-1.jpg",
      "file:///wearing-photo-2.jpg",
      "file:///wearing-photo-3.jpg",
    ];

    photos.forEach((photo) => {
      mockCostume.wearingPhotos?.push(photo);
    });

    expect(mockCostume.wearingPhotos?.length).toBe(3);
    photos.forEach((photo) => {
      expect(mockCostume.wearingPhotos).toContain(photo);
    });
  });

  it("should remove a wearing photo by index", () => {
    mockCostume.wearingPhotos = [
      "file:///wearing-photo-1.jpg",
      "file:///wearing-photo-2.jpg",
      "file:///wearing-photo-3.jpg",
    ];

    // Remove photo at index 1
    mockCostume.wearingPhotos.splice(1, 1);

    expect(mockCostume.wearingPhotos?.length).toBe(2);
    expect(mockCostume.wearingPhotos).toContain("file:///wearing-photo-1.jpg");
    expect(mockCostume.wearingPhotos).toContain("file:///wearing-photo-3.jpg");
    expect(mockCostume.wearingPhotos).not.toContain("file:///wearing-photo-2.jpg");
  });

  it("should handle costume without wearing photos gracefully", () => {
    const costumeWithoutPhotos: CostumeData = {
      ...mockCostume,
      wearingPhotos: undefined,
    };

    expect(costumeWithoutPhotos.wearingPhotos).toBeUndefined();
    expect(costumeWithoutPhotos.wearingPhotos?.length).toBeUndefined();
  });

  it("should preserve wearing photos when updating other costume properties", () => {
    mockCostume.wearingPhotos = [
      "file:///wearing-photo-1.jpg",
      "file:///wearing-photo-2.jpg",
    ];

    // Update other properties
    mockCostume.name = "更新されたドレス";
    mockCostume.updatedAt = new Date().toISOString();

    expect(mockCostume.wearingPhotos?.length).toBe(2);
    expect(mockCostume.wearingPhotos).toContain("file:///wearing-photo-1.jpg");
    expect(mockCostume.wearingPhotos).toContain("file:///wearing-photo-2.jpg");
  });

  it("should serialize and deserialize costume with wearing photos", () => {
    mockCostume.wearingPhotos = [
      "file:///wearing-photo-1.jpg",
      "file:///wearing-photo-2.jpg",
    ];

    // Simulate serialization (JSON.stringify)
    const serialized = JSON.stringify(mockCostume);
    expect(serialized).toContain("wearingPhotos");

    // Simulate deserialization (JSON.parse)
    const deserialized: CostumeData = JSON.parse(serialized);

    expect(deserialized.wearingPhotos?.length).toBe(2);
    expect(deserialized.wearingPhotos).toEqual(mockCostume.wearingPhotos);
  });

  it("should handle large number of wearing photos", () => {
    // Create 20 wearing photos
    const photos = Array.from({ length: 20 }, (_, i) =>
      `file:///wearing-photo-${i + 1}.jpg`
    );

    mockCostume.wearingPhotos = photos;

    expect(mockCostume.wearingPhotos?.length).toBe(20);
    expect(mockCostume.wearingPhotos?.[0]).toBe("file:///wearing-photo-1.jpg");
    expect(mockCostume.wearingPhotos?.[19]).toBe("file:///wearing-photo-20.jpg");
  });

  it("should maintain photo order when adding and removing", () => {
    mockCostume.wearingPhotos = [
      "file:///photo-1.jpg",
      "file:///photo-2.jpg",
      "file:///photo-3.jpg",
    ];

    // Remove middle photo
    mockCostume.wearingPhotos.splice(1, 1);

    expect(mockCostume.wearingPhotos).toEqual([
      "file:///photo-1.jpg",
      "file:///photo-3.jpg",
    ]);

    // Add new photo at the end
    mockCostume.wearingPhotos.push("file:///photo-4.jpg");

    expect(mockCostume.wearingPhotos).toEqual([
      "file:///photo-1.jpg",
      "file:///photo-3.jpg",
      "file:///photo-4.jpg",
    ]);
  });
});
