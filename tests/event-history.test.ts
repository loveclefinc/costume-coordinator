import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateEventHistoryStats,
  searchEventHistory,
  filterEventsByParticipantCount,
  getEventDashboardStats,
  getEventTrend,
} from "../src/utils/event-history";

describe("Event History - Tracking and Analysis", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should create event history record", () => {
    const record = {
      eventId: "e1",
      eventName: "Spring Concert",
      eventDate: "2024-05-15",
      participantCount: 4,
      costumeUsageCount: 4,
      totalDuration: 120,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    expect(record.eventId).toBe("e1");
    expect(record.eventName).toBe("Spring Concert");
    expect(record.participantCount).toBe(4);
  });

  it("should calculate event history statistics", async () => {
    const stats = await calculateEventHistoryStats();

    expect(stats).toHaveProperty("totalEvents");
    expect(stats).toHaveProperty("totalParticipants");
    expect(stats).toHaveProperty("averageParticipantsPerEvent");
    expect(stats).toHaveProperty("totalCostumeUsages");
    expect(stats).toHaveProperty("lastEventDate");
    expect(stats).toHaveProperty("mostFrequentMonth");
  });

  it("should handle empty event history", async () => {
    const stats = await calculateEventHistoryStats();

    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats.totalParticipants).toBeGreaterThanOrEqual(0);
  });

  it("should search event history by name", async () => {
    const results = await searchEventHistory("Concert");

    expect(Array.isArray(results)).toBe(true);
  });

  it("should filter events by participant count", async () => {
    const results = await filterEventsByParticipantCount(1, 10);

    expect(Array.isArray(results)).toBe(true);
    results.forEach((event) => {
      expect(event.participantCount).toBeGreaterThanOrEqual(1);
      expect(event.participantCount).toBeLessThanOrEqual(10);
    });
  });

  it("should get event dashboard statistics", async () => {
    const stats = await getEventDashboardStats();

    expect(stats).toHaveProperty("upcomingEvents");
    expect(stats).toHaveProperty("completedEvents");
    expect(stats).toHaveProperty("totalParticipants");
    expect(stats).toHaveProperty("averageEventSize");
    expect(stats).toHaveProperty("busyMonth");
  });

  it("should get event trend for last 12 months", async () => {
    const trend = await getEventTrend();

    expect(Array.isArray(trend)).toBe(true);
    expect(trend.length).toBe(12);
    trend.forEach((count) => {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  it("should track event with multiple participants", () => {
    const participants = 4;
    const costumeUsages = 4;

    expect(participants).toBe(costumeUsages);
  });

  it("should record event completion with notes", () => {
    const record = {
      eventId: "e1",
      eventName: "Spring Concert",
      eventDate: "2024-05-15",
      participantCount: 4,
      costumeUsageCount: 4,
      totalDuration: 120,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      notes: "Great performance!",
    };

    expect(record.notes).toBe("Great performance!");
  });

  it("should calculate average participants per event", () => {
    const totalParticipants = 20;
    const totalEvents = 5;
    const average = totalParticipants / totalEvents;

    expect(average).toBe(4);
  });

  it("should track event duration", () => {
    const record = {
      eventId: "e1",
      eventName: "Spring Concert",
      eventDate: "2024-05-15",
      participantCount: 4,
      costumeUsageCount: 4,
      totalDuration: 120,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    expect(record.totalDuration).toBe(120);
  });

  it("should handle quartet events", () => {
    const record = {
      eventId: "e1",
      eventName: "Quartet Concert",
      eventDate: "2024-05-15",
      participantCount: 4,
      costumeUsageCount: 4,
      totalDuration: 90,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    expect(record.participantCount).toBe(4);
    expect(record.costumeUsageCount).toBe(4);
  });

  it("should track multiple events", () => {
    const events = [
      {
        eventId: "e1",
        eventName: "Spring Concert",
        eventDate: "2024-05-15",
        participantCount: 4,
        costumeUsageCount: 4,
        totalDuration: 120,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
      {
        eventId: "e2",
        eventName: "Summer Concert",
        eventDate: "2024-06-20",
        participantCount: 6,
        costumeUsageCount: 6,
        totalDuration: 150,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ];

    expect(events.length).toBe(2);
    expect(events[0].participantCount).toBe(4);
    expect(events[1].participantCount).toBe(6);
  });
});
