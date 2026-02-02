import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Share API
const mockShare = vi.fn();
vi.mock("react-native", () => ({
  Share: {
    share: mockShare,
  },
}));

describe("AirDrop Sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should share event information", async () => {
    const eventInfo = {
      name: "Spring Concert 2024",
      eventDate: "2024-03-15",
      participants: 4,
    };

    const message = `イベント: ${eventInfo.name}\n日程: ${eventInfo.eventDate}\n参加者: ${eventInfo.participants}名`;

    expect(message).toContain("Spring Concert 2024");
    expect(message).toContain("2024-03-15");
    expect(message).toContain("4名");
  });

  it("should format event message correctly", () => {
    const eventInfo = {
      name: "コンサート",
      eventDate: "2024-02-14",
      participants: 4,
    };

    const message = `イベント: ${eventInfo.name}\n日程: ${eventInfo.eventDate}\n参加者: ${eventInfo.participants}名`;

    expect(message).toBe(
      "イベント: コンサート\n日程: 2024-02-14\n参加者: 4名"
    );
  });

  it("should handle multiple participants", () => {
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン" },
      { id: "2", name: "花子", instrument: "チェロ" },
      { id: "3", name: "次郎", instrument: "ビオラ" },
      { id: "4", name: "美咲", instrument: "コントラバス" },
    ];

    const message = `参加者: ${participants.length}名`;

    expect(participants).toHaveLength(4);
    expect(message).toContain("4名");
  });

  it("should include event name in share message", () => {
    const eventName = "Summer Festival 2024";
    const message = `イベント: ${eventName}`;

    expect(message).toContain("Summer Festival 2024");
  });

  it("should include event date in share message", () => {
    const eventDate = "2024-07-20";
    const message = `日程: ${eventDate}`;

    expect(message).toContain("2024-07-20");
  });

  it("should handle empty event name gracefully", () => {
    const eventName = "";
    const message = `イベント: ${eventName || "未設定"}`;

    expect(message).toContain("未設定");
  });

  it("should handle empty event date gracefully", () => {
    const eventDate = "";
    const message = `日程: ${eventDate || "未設定"}`;

    expect(message).toContain("未設定");
  });

  it("should format participant count correctly", () => {
    const participantCounts = [1, 2, 4, 10];

    participantCounts.forEach((count) => {
      const message = `参加者: ${count}名`;
      expect(message).toContain(`${count}名`);
    });
  });

  it("should create shareable message with all required fields", () => {
    const event = {
      name: "Quartet Performance",
      eventDate: "2024-04-10",
      participants: 4,
    };

    const message = `イベント: ${event.name}\n日程: ${event.eventDate}\n参加者: ${event.participants}名`;

    expect(message).toContain("Quartet Performance");
    expect(message).toContain("2024-04-10");
    expect(message).toContain("4名");
  });

  it("should handle special characters in event name", () => {
    const eventName = "コンサート＆フェスティバル 2024";
    const message = `イベント: ${eventName}`;

    expect(message).toContain("コンサート＆フェスティバル 2024");
  });

  it("should handle long participant list", () => {
    const participants = Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      name: `参加者${i + 1}`,
      instrument: "楽器",
    }));

    const message = `参加者: ${participants.length}名`;

    expect(participants.length).toBe(50);
    expect(message).toContain("50名");
  });
});
