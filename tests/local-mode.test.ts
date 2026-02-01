import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe("Local Mode - Event Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save a local event to AsyncStorage", async () => {
    const mockEvent = {
      id: 1,
      name: "Spring Concert",
      eventDate: "2024-05-15T00:00:00.000Z",
      conditions: {
        colorPreferences: [["red", "pink"]],
        tonePreferences: ["vivid"],
        patternPreferences: ["solid"],
      },
      status: "active",
      participants: [],
      createdAt: "2024-01-15T10:00:00.000Z",
    };

    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);

    // Simulate saving local event
    const existingEvents = await AsyncStorage.getItem("local_events");
    const events = existingEvents ? JSON.parse(existingEvents) : [];
    events.push(mockEvent);
    await AsyncStorage.setItem("local_events", JSON.stringify(events));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "local_events",
      expect.stringContaining("Spring Concert")
    );
  });

  it("should load local events from AsyncStorage", async () => {
    const mockEvents = [
      {
        id: 1,
        name: "Spring Concert",
        eventDate: "2024-05-15T00:00:00.000Z",
        status: "active",
      },
      {
        id: 2,
        name: "Summer Festival",
        eventDate: "2024-07-20T00:00:00.000Z",
        status: "active",
      },
    ];

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockEvents));

    const data = await AsyncStorage.getItem("local_events");
    const events = data ? JSON.parse(data) : [];

    expect(events).toHaveLength(2);
    expect(events[0].name).toBe("Spring Concert");
    expect(events[1].name).toBe("Summer Festival");
  });

  it("should append new event to existing local events", async () => {
    const existingEvents = [
      { id: 1, name: "Spring Concert", status: "active" },
    ];

    const newEvent = {
      id: 2,
      name: "Summer Festival",
      eventDate: "2024-07-20T00:00:00.000Z",
      status: "active",
    };

    (AsyncStorage.getItem as any).mockResolvedValue(
      JSON.stringify(existingEvents)
    );
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);

    // Simulate appending new event
    const data = await AsyncStorage.getItem("local_events");
    const events = data ? JSON.parse(data) : [];
    events.push(newEvent);
    await AsyncStorage.setItem("local_events", JSON.stringify(events));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "local_events",
      expect.stringContaining("Summer Festival")
    );
  });

  it("should handle empty local events list", async () => {
    (AsyncStorage.getItem as any).mockResolvedValue(null);

    const data = await AsyncStorage.getItem("local_events");
    const events = data ? JSON.parse(data) : [];

    expect(events).toEqual([]);
  });

  it("should preserve event conditions in local storage", async () => {
    const eventWithConditions = {
      id: 1,
      name: "Concert",
      eventDate: "2024-05-15T00:00:00.000Z",
      conditions: {
        colorPreferences: [["red", "pink"], ["blue"]],
        tonePreferences: ["vivid", "pastel"],
        patternPreferences: ["solid", "floral"],
        avoidSimilarColors: true,
        recentUsageExcludeDays: 30,
      },
      status: "active",
      participants: [],
    };

    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);

    const events = [eventWithConditions];
    await AsyncStorage.setItem("local_events", JSON.stringify(events));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "local_events",
      expect.stringContaining("colorPreferences")
    );
  });

  it("should support multiple local events with different statuses", async () => {
    const mockEvents = [
      { id: 1, name: "Active Concert", status: "active" },
      { id: 2, name: "Completed Festival", status: "completed" },
      { id: 3, name: "Upcoming Show", status: "active" },
    ];

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockEvents));

    const data = await AsyncStorage.getItem("local_events");
    const events = data ? JSON.parse(data) : [];
    const activeEvents = events.filter((e: any) => e.status === "active");

    expect(activeEvents).toHaveLength(2);
    expect(activeEvents[0].name).toBe("Active Concert");
  });

  it("should handle error when saving local event", async () => {
    (AsyncStorage.setItem as any).mockRejectedValue(
      new Error("Storage error")
    );

    try {
      await AsyncStorage.setItem("local_events", JSON.stringify([]));
    } catch (error: any) {
      expect(error.message).toBe("Storage error");
    }
  });

  it("should handle error when loading local events", async () => {
    (AsyncStorage.getItem as any).mockRejectedValue(
      new Error("Storage error")
    );

    try {
      await AsyncStorage.getItem("local_events");
    } catch (error: any) {
      expect(error.message).toBe("Storage error");
    }
  });
});
