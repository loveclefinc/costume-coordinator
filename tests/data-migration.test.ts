import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  validateExportedData,
  calculateExportSize,
} from "../src/utils/data-migration";
import { ExportedData } from "../src/utils/data-migration";

describe("Data Migration", () => {
  describe("Validate Exported Data", () => {
    it("should validate correct exported data", () => {
      const validData: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const result = validateExportedData(validData);
      expect(result).toBe(true);
    });

    it("should reject data with missing version", () => {
      const invalidData = {
        exportedAt: new Date().toISOString(),
        events: [],
      } as any;

      const result = validateExportedData(invalidData);
      expect(result).toBe(false);
    });

    it("should reject data with wrong version", () => {
      const invalidData: ExportedData = {
        version: "2.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const result = validateExportedData(invalidData);
      expect(result).toBe(false);
    });

    it("should reject data with non-array fields", () => {
      const invalidData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: "not an array",
      } as any;

      const result = validateExportedData(invalidData);
      expect(result).toBe(false);
    });

    it("should reject data with missing exportedAt", () => {
      const invalidData = {
        version: "1.0.0",
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      } as any;

      const result = validateExportedData(invalidData);
      expect(result).toBe(false);
    });
  });

  describe("Calculate Export Size", () => {
    it("should calculate export size correctly", () => {
      const data: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [{ id: "1", name: "Event 1" }],
        costumes: [{ id: "1", name: "Suit 1" }],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const size = calculateExportSize(data);

      expect(typeof size).toBe("number");
      expect(size).toBeGreaterThan(0);
    });

    it("should calculate larger size for more data", () => {
      const smallData: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const largeData: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: Array(100).fill({ id: "1", name: "Event 1" }),
        costumes: Array(100).fill({ id: "1", name: "Suit 1" }),
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const smallSize = calculateExportSize(smallData);
      const largeSize = calculateExportSize(largeData);

      expect(largeSize).toBeGreaterThan(smallSize);
    });

    it("should calculate size for complex data structures", () => {
      const complexData: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [
          {
            id: "1",
            name: "Event 1",
            date: "2024-03-10",
            location: "Tokyo",
            description: "A large event with many participants",
          },
        ],
        costumes: [
          {
            id: "1",
            name: "Navy Suit",
            color: "navy",
            pattern: "solid",
            material: "wool",
            attributes: {
              fit: "regular",
              season: "all",
            },
          },
        ],
        participants: [
          {
            id: "1",
            name: "John Doe",
            instrument: "Violin",
            selected_costume_id: "1",
          },
        ],
        usageHistory: [
          {
            id: "1",
            costume_id: "1",
            event_id: "1",
            date: "2024-03-10",
          },
        ],
        optimizationResults: [
          {
            id: "1",
            event_id: "1",
            participant_id: "1",
            score: 0.95,
            recommendations: ["Good color match", "Excellent material compatibility"],
          },
        ],
        settings: {
          language: "ja",
          theme: "dark",
          notifications: true,
        },
      };

      const size = calculateExportSize(complexData);

      expect(typeof size).toBe("number");
      expect(size).toBeGreaterThan(0);
      expect(size).toBeGreaterThan(100); // Should be reasonably large
    });

    it("should handle empty data", () => {
      const emptyData: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      const size = calculateExportSize(emptyData);

      expect(typeof size).toBe("number");
      expect(size).toBeGreaterThan(0);
    });
  });

  describe("Export Data Structure", () => {
    it("should have correct export data structure", () => {
      const data: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("exportedAt");
      expect(data).toHaveProperty("events");
      expect(data).toHaveProperty("costumes");
      expect(data).toHaveProperty("participants");
      expect(data).toHaveProperty("usageHistory");
      expect(data).toHaveProperty("optimizationResults");
      expect(data).toHaveProperty("settings");
    });

    it("should have correct array types", () => {
      const data: ExportedData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        events: [],
        costumes: [],
        participants: [],
        usageHistory: [],
        optimizationResults: [],
        settings: {},
      };

      expect(Array.isArray(data.events)).toBe(true);
      expect(Array.isArray(data.costumes)).toBe(true);
      expect(Array.isArray(data.participants)).toBe(true);
      expect(Array.isArray(data.usageHistory)).toBe(true);
      expect(Array.isArray(data.optimizationResults)).toBe(true);
      expect(typeof data.settings).toBe("object");
    });
  });
});
