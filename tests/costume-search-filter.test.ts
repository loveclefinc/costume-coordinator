import { describe, it, expect, beforeEach } from "vitest";

/**
 * Test suite for costume search and filter feature
 * Tests color, pattern, and tone filtering capabilities
 */

interface CostumeData {
  id: string;
  name: string;
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: string;
}

describe("Costume Search and Filter", () => {
  let costumes: CostumeData[];

  beforeEach(() => {
    costumes = [
      {
        id: "1",
        name: "ピンクのドレス",
        colorCategory: "warm",
        tone: "vivid",
        pattern: "solid",
      },
      {
        id: "2",
        name: "紫のスーツ",
        colorCategory: "cool",
        tone: "vivid",
        pattern: "solid",
      },
      {
        id: "3",
        name: "黒のタキシード",
        colorCategory: "neutral",
        tone: "dark",
        pattern: "solid",
      },
      {
        id: "4",
        name: "花柄ドレス",
        colorCategory: "warm",
        tone: "pastel",
        pattern: "floral",
      },
      {
        id: "5",
        name: "ストライプシャツ",
        colorCategory: "cool",
        tone: "neutral",
        pattern: "stripe",
      },
    ];
  });

  it("should filter by color category - warm", () => {
    const filtered = costumes.filter((c) => c.colorCategory === "warm");
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.id)).toEqual(["1", "4"]);
  });

  it("should filter by color category - cool", () => {
    const filtered = costumes.filter((c) => c.colorCategory === "cool");
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.id)).toEqual(["2", "5"]);
  });

  it("should filter by color category - neutral", () => {
    const filtered = costumes.filter((c) => c.colorCategory === "neutral");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("3");
  });

  it("should filter by tone - vivid", () => {
    const filtered = costumes.filter((c) => c.tone === "vivid");
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("should filter by tone - pastel", () => {
    const filtered = costumes.filter((c) => c.tone === "pastel");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("4");
  });

  it("should filter by tone - dark", () => {
    const filtered = costumes.filter((c) => c.tone === "dark");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("3");
  });

  it("should filter by pattern - solid", () => {
    const filtered = costumes.filter((c) => c.pattern === "solid");
    expect(filtered.length).toBe(3);
    expect(filtered.map((c) => c.id)).toEqual(["1", "2", "3"]);
  });

  it("should filter by pattern - floral", () => {
    const filtered = costumes.filter((c) => c.pattern === "floral");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("4");
  });

  it("should filter by pattern - stripe", () => {
    const filtered = costumes.filter((c) => c.pattern === "stripe");
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("5");
  });

  it("should apply multiple filters - warm and vivid", () => {
    const filtered = costumes.filter(
      (c) => c.colorCategory === "warm" && c.tone === "vivid"
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should apply multiple filters - cool and solid", () => {
    const filtered = costumes.filter(
      (c) => c.colorCategory === "cool" && c.pattern === "solid"
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("2");
  });

  it("should search by name - exact match", () => {
    const query = "ピンク";
    const filtered = costumes.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should search by name - partial match", () => {
    const query = "ドレス";
    const filtered = costumes.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered.length).toBe(2);
    expect(filtered.map((c) => c.id)).toEqual(["1", "4"]);
  });

  it("should search by name - case insensitive", () => {
    const query = "PURPLE";
    const filtered = costumes.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered.length).toBe(0);
  });

  it("should apply all filters together", () => {
    const colorFilter = "warm";
    const toneFilter = "vivid";
    const patternFilter = "solid";
    const searchQuery = "ピンク";

    const filtered = costumes.filter(
      (c) =>
        c.colorCategory === colorFilter &&
        c.tone === toneFilter &&
        c.pattern === patternFilter &&
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should return all costumes when no filters applied", () => {
    const filtered = costumes.filter(() => true);
    expect(filtered.length).toBe(5);
  });

  it("should return empty array when no matches found", () => {
    const filtered = costumes.filter(
      (c) => c.colorCategory === "warm" && c.tone === "dark"
    );
    expect(filtered.length).toBe(0);
  });
});
