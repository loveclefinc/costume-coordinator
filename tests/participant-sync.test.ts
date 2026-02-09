import { describe, it, expect, beforeEach } from "vitest";
import {
  parseEventDataFromAirDrop,
  mergeParticipants,
  getSyncStatusSummary,
  validateParticipantData,
  filterValidParticipants,
  createSyncReport,
} from "../src/utils/participant-sync";

describe("Participant Sync - AirDrop Data Parsing and Merging", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should parse valid event data from AirDrop", () => {
    const eventJson = JSON.stringify({
      id: "event-1",
      name: "Spring Concert",
      eventDate: "2024-05-15",
      participants: [
        { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      ],
      createdAt: "2024-01-01T00:00:00Z",
    });

    const result = parseEventDataFromAirDrop(eventJson);

    expect(result).not.toBeNull();
    expect(result?.id).toBe("event-1");
    expect(result?.name).toBe("Spring Concert");
    expect(result?.participants.length).toBe(1);
  });

  it("should return null for invalid JSON", () => {
    const invalidJson = "{ invalid json }";
    const result = parseEventDataFromAirDrop(invalidJson);

    expect(result).toBeNull();
  });

  it("should return null for missing required fields", () => {
    const eventJson = JSON.stringify({
      name: "Spring Concert",
      // missing id and eventDate
      participants: [],
    });

    const result = parseEventDataFromAirDrop(eventJson);

    expect(result).toBeNull();
  });

  it("should merge participants without duplicates", () => {
    const existing = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const received = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p3", name: "次郎", instrument: "チェロ", createdAt: "2024-01-02T00:00:00Z" },
    ];

    const merged = mergeParticipants(existing, received);

    expect(merged.length).toBe(3);
    expect(merged.find((p) => p.id === "p1")).toBeDefined();
    expect(merged.find((p) => p.id === "p2")).toBeDefined();
    expect(merged.find((p) => p.id === "p3")).toBeDefined();
  });

  it("should update existing participant with new data", () => {
    const existing = [
      {
        id: "p1",
        name: "太郎",
        instrument: "バイオリン",
        selectedCostumeName: "赤いドレス",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const received = [
      {
        id: "p1",
        name: "太郎",
        instrument: "バイオリン",
        selectedCostumeName: "青いドレス",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ];

    const merged = mergeParticipants(existing, received);

    expect(merged.length).toBe(1);
    expect(merged[0].selectedCostumeName).toBe("青いドレス");
  });

  it("should handle empty existing participants", () => {
    const received = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const merged = mergeParticipants([], received);

    expect(merged.length).toBe(2);
  });

  it("should generate sync status summary", () => {
    const summary = getSyncStatusSummary(5, 3, 7);

    expect(summary).toContain("同期完了");
    expect(summary).toContain("2人追加");
    expect(summary).toContain("7人");
  });

  it("should validate participant data", () => {
    const validParticipant = {
      id: "p1",
      name: "太郎",
      instrument: "バイオリン",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(validateParticipantData(validParticipant)).toBe(true);
  });

  it("should reject participant with missing id", () => {
    const invalidParticipant = {
      id: "",
      name: "太郎",
      instrument: "バイオリン",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(validateParticipantData(invalidParticipant)).toBe(false);
  });

  it("should reject participant with missing name", () => {
    const invalidParticipant = {
      id: "p1",
      name: "",
      instrument: "バイオリン",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(validateParticipantData(invalidParticipant)).toBe(false);
  });

  it("should reject participant with missing instrument", () => {
    const invalidParticipant = {
      id: "p1",
      name: "太郎",
      instrument: "",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(validateParticipantData(invalidParticipant)).toBe(false);
  });

  it("should reject participant with name exceeding max length", () => {
    const invalidParticipant = {
      id: "p1",
      name: "a".repeat(101),
      instrument: "バイオリン",
      createdAt: "2024-01-01T00:00:00Z",
    };

    expect(validateParticipantData(invalidParticipant)).toBe(false);
  });

  it("should filter out invalid participants", () => {
    const participants = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p3", name: "次郎", instrument: "チェロ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const valid = filterValidParticipants(participants);

    expect(valid.length).toBe(2);
    expect(valid.find((p) => p.name === "太郎")).toBeDefined();
    expect(valid.find((p) => p.name === "次郎")).toBeDefined();
  });

  it("should create sync report", () => {
    const received = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const valid = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const existing = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const merged = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const report = createSyncReport(received, valid, existing, merged);

    expect(report.totalReceived).toBe(2);
    expect(report.validParticipants).toBe(2);
    expect(report.invalidParticipants).toBe(0);
    expect(report.newParticipants).toBe(1);
    expect(report.totalParticipants).toBe(2);
  });

  it("should handle quartet sync", () => {
    const received = [
      { id: "p1", name: "Violin 1", instrument: "バイオリン1", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p2", name: "Violin 2", instrument: "バイオリン2", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p3", name: "Viola", instrument: "ビオラ", createdAt: "2024-01-01T00:00:00Z" },
      { id: "p4", name: "Cello", instrument: "チェロ", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const merged = mergeParticipants([], received);

    expect(merged.length).toBe(4);
    expect(merged.every((p) => validateParticipantData(p))).toBe(true);
  });

  it("should merge participants from multiple AirDrop events", () => {
    const existing = [
      { id: "p1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-01T00:00:00Z" },
    ];

    const firstAirDrop = [
      { id: "p2", name: "花子", instrument: "ビオラ", createdAt: "2024-01-02T00:00:00Z" },
    ];

    const secondAirDrop = [
      { id: "p3", name: "次郎", instrument: "チェロ", createdAt: "2024-01-03T00:00:00Z" },
    ];

    let merged = mergeParticipants(existing, firstAirDrop);
    merged = mergeParticipants(merged, secondAirDrop);

    expect(merged.length).toBe(3);
    expect(merged.map((p) => p.name)).toEqual(["太郎", "花子", "次郎"]);
  });
});
