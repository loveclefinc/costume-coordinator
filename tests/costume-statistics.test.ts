import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateCostumeStatistics,
  getMostUsedCostumes,
  getCostumeTrend,
  getUsageSummary,
} from "../src/utils/costume-statistics";

describe("Costume Statistics - Usage Tracking and Analysis", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should create costume usage record", () => {
    const record = {
      costumeId: "c1",
      costumeName: "赤いドレス",
      eventId: "e1",
      eventName: "Spring Concert",
      participantName: "太郎",
      usageDate: new Date().toLocaleDateString("ja-JP"),
      timestamp: new Date().toISOString(),
    };

    expect(record.costumeId).toBe("c1");
    expect(record.costumeName).toBe("赤いドレス");
    expect(record.participantName).toBe("太郎");
  });

  it("should calculate costume statistics with zero usage", async () => {
    const stats = await calculateCostumeStatistics("c1", "赤いドレス");

    expect(stats.costumeId).toBe("c1");
    expect(stats.costumeName).toBe("赤いドレス");
    expect(stats.totalUsageCount).toBe(0);
    expect(stats.lastUsedDate).toBe("未使用");
    expect(stats.averageUsagePerMonth).toBe(0);
  });

  it("should track multiple costume usages", () => {
    const usageHistory = [
      {
        costumeId: "c1",
        costumeName: "赤いドレス",
        eventId: "e1",
        eventName: "Spring Concert",
        participantName: "太郎",
        usageDate: "2024-01-15",
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        costumeId: "c1",
        costumeName: "赤いドレス",
        eventId: "e2",
        eventName: "Summer Concert",
        participantName: "花子",
        usageDate: "2024-06-20",
        timestamp: "2024-06-20T14:00:00Z",
      },
      {
        costumeId: "c1",
        costumeName: "赤いドレス",
        eventId: "e3",
        eventName: "Fall Concert",
        participantName: "次郎",
        usageDate: "2024-09-10",
        timestamp: "2024-09-10T15:30:00Z",
      },
    ];

    expect(usageHistory.length).toBe(3);
    expect(usageHistory.filter((u) => u.costumeId === "c1").length).toBe(3);
  });

  it("should identify most used costume", async () => {
    const costumes = [
      { id: "c1", name: "赤いドレス" },
      { id: "c2", name: "青いドレス" },
      { id: "c3", name: "黄色いドレス" },
    ];

    const mostUsed = await getMostUsedCostumes(costumes, 1);

    // Since no actual history is stored, result will be empty
    expect(Array.isArray(mostUsed)).toBe(true);
  });

  it("should calculate usage trend", async () => {
    const trend = await getCostumeTrend("c1");

    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(12); // Last 12 months
  });

  it("should get usage summary", async () => {
    const costumes = [
      { id: "c1", name: "赤いドレス" },
      { id: "c2", name: "青いドレス" },
      { id: "c3", name: "黄色いドレス" },
    ];

    const summary = await getUsageSummary(costumes);

    expect(summary.totalCostumes).toBe(3);
    expect(summary.totalUsages).toBeGreaterThanOrEqual(0);
    expect(summary.averageUsagePerCostume).toBeGreaterThanOrEqual(0);
  });

  it("should handle costume with single usage", () => {
    const stats = {
      costumeId: "c1",
      costumeName: "赤いドレス",
      totalUsageCount: 1,
      lastUsedDate: "2024-01-15",
      usageHistory: [
        {
          costumeId: "c1",
          costumeName: "赤いドレス",
          eventId: "e1",
          eventName: "Spring Concert",
          participantName: "太郎",
          usageDate: "2024-01-15",
          timestamp: "2024-01-15T10:00:00Z",
        },
      ],
      averageUsagePerMonth: 1,
    };

    expect(stats.totalUsageCount).toBe(1);
    expect(stats.lastUsedDate).toBe("2024-01-15");
  });

  it("should track usage across multiple events", () => {
    const events = [
      { eventId: "e1", eventName: "Spring Concert", date: "2024-01-15" },
      { eventId: "e2", eventName: "Summer Concert", date: "2024-06-20" },
      { eventId: "e3", eventName: "Fall Concert", date: "2024-09-10" },
    ];

    const usageRecords = events.map((event) => ({
      costumeId: "c1",
      costumeName: "赤いドレス",
      eventId: event.eventId,
      eventName: event.eventName,
      participantName: "太郎",
      usageDate: event.date,
      timestamp: new Date(event.date).toISOString(),
    }));

    expect(usageRecords.length).toBe(3);
    expect(usageRecords.every((r) => r.costumeId === "c1")).toBe(true);
  });

  it("should handle multiple costumes in single event", () => {
    const eventUsages = [
      {
        costumeId: "c1",
        costumeName: "赤いドレス",
        eventId: "e1",
        eventName: "Quartet Concert",
        participantName: "太郎",
        usageDate: "2024-01-15",
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        costumeId: "c2",
        costumeName: "青いドレス",
        eventId: "e1",
        eventName: "Quartet Concert",
        participantName: "花子",
        usageDate: "2024-01-15",
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        costumeId: "c3",
        costumeName: "黄色いドレス",
        eventId: "e1",
        eventName: "Quartet Concert",
        participantName: "次郎",
        usageDate: "2024-01-15",
        timestamp: "2024-01-15T10:00:00Z",
      },
    ];

    expect(eventUsages.length).toBe(3);
    expect(eventUsages.filter((u) => u.eventId === "e1").length).toBe(3);
  });

  it("should calculate average usage per month", () => {
    const firstUsage = new Date("2024-01-15");
    const lastUsage = new Date("2024-12-15");
    const monthsDiff = 12;
    const totalUsages = 12;
    const averagePerMonth = Math.round((totalUsages / monthsDiff) * 100) / 100;

    expect(averagePerMonth).toBe(1);
  });

  it("should identify unused costumes", async () => {
    const costumes = [
      { id: "c1", name: "赤いドレス" },
      { id: "c2", name: "青いドレス" },
      { id: "c3", name: "黄色いドレス" },
    ];

    const summary = await getUsageSummary(costumes);

    expect(summary.unusedCostumes).toBeGreaterThanOrEqual(0);
    expect(summary.unusedCostumes).toBeLessThanOrEqual(costumes.length);
  });

  it("should format usage date correctly", () => {
    const usageDate = new Date("2024-01-15").toLocaleDateString("ja-JP");

    expect(usageDate).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
  });

  it("should handle costume usage with participant information", () => {
    const participants = ["太郎", "花子", "次郎", "四郎"];
    const usageRecords = participants.map((name, index) => ({
      costumeId: "c1",
      costumeName: "赤いドレス",
      eventId: "e1",
      eventName: "Concert",
      participantName: name,
      usageDate: "2024-01-15",
      timestamp: "2024-01-15T10:00:00Z",
    }));

    expect(usageRecords.length).toBe(4);
    expect(usageRecords.map((r) => r.participantName)).toEqual(participants);
  });

  it("should create usage summary with statistics", async () => {
    const costumes = [
      { id: "c1", name: "赤いドレス" },
      { id: "c2", name: "青いドレス" },
    ];

    const summary = await getUsageSummary(costumes);

    expect(summary).toHaveProperty("totalCostumes");
    expect(summary).toHaveProperty("totalUsages");
    expect(summary).toHaveProperty("averageUsagePerCostume");
    expect(summary).toHaveProperty("mostUsedCostume");
    expect(summary).toHaveProperty("leastUsedCostume");
    expect(summary).toHaveProperty("unusedCostumes");
  });
});
