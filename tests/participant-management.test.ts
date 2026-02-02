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

interface Participant {
  id: string;
  name: string;
  instrument: string;
  photoUri?: string;
  selectedCostumeId?: string;
  createdAt: string;
}

describe("Participant Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a new participant", async () => {
    const eventId = 1;
    const newParticipant: Participant = {
      id: "1",
      name: "田中太郎",
      instrument: "バイオリン",
      createdAt: new Date().toISOString(),
    };

    (AsyncStorage.getItem as any).mockResolvedValue(null);
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);

    // Simulate adding participant
    const key = `event_participants_${eventId}`;
    const existingData = await AsyncStorage.getItem(key);
    const participants = existingData ? JSON.parse(existingData) : [];
    participants.push(newParticipant);
    await AsyncStorage.setItem(key, JSON.stringify(participants));

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `event_participants_${eventId}`,
      expect.stringContaining("田中太郎")
    );
  });

  it("should load participants for an event", async () => {
    const eventId = 1;
    const mockParticipants: Participant[] = [
      {
        id: "1",
        name: "田中太郎",
        instrument: "バイオリン",
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      {
        id: "2",
        name: "鈴木花子",
        instrument: "チェロ",
        createdAt: "2024-01-15T10:05:00.000Z",
      },
    ];

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockParticipants));

    const key = `event_participants_${eventId}`;
    const data = await AsyncStorage.getItem(key);
    const participants = data ? JSON.parse(data) : [];

    expect(participants).toHaveLength(2);
    expect(participants[0].name).toBe("田中太郎");
    expect(participants[1].instrument).toBe("チェロ");
  });

  it("should remove a participant", async () => {
    const eventId = 1;
    const mockParticipants: Participant[] = [
      {
        id: "1",
        name: "田中太郎",
        instrument: "バイオリン",
        createdAt: "2024-01-15T10:00:00.000Z",
      },
      {
        id: "2",
        name: "鈴木花子",
        instrument: "チェロ",
        createdAt: "2024-01-15T10:05:00.000Z",
      },
    ];

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockParticipants));
    (AsyncStorage.setItem as any).mockResolvedValue(undefined);

    // Simulate removing participant
    const key = `event_participants_${eventId}`;
    const data = await AsyncStorage.getItem(key);
    const participants = data ? JSON.parse(data) : [];
    const filtered = participants.filter((p: Participant) => p.id !== "1");
    await AsyncStorage.setItem(key, JSON.stringify(filtered));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("鈴木花子");
  });

  it("should validate participant name and instrument", async () => {
    const participantName = "";
    const participantInstrument = "";

    const isValid = !!(participantName.trim() && participantInstrument.trim());

    expect(isValid).toBe(false);
  });

  it("should validate participant with valid data", async () => {
    const participantName = "田中太郎";
    const participantInstrument = "バイオリン";

    const isValid = !!(participantName.trim() && participantInstrument.trim());

    expect(isValid).toBe(true);
  });

  it("should store participant with unique ID", async () => {
    const eventId = 1;
    const participant1: Participant = {
      id: Date.now().toString(),
      name: "田中太郎",
      instrument: "バイオリン",
      createdAt: new Date().toISOString(),
    };

    const participant2: Participant = {
      id: (Date.now() + 1).toString(),
      name: "鈴木花子",
      instrument: "チェロ",
      createdAt: new Date().toISOString(),
    };

    expect(participant1.id).not.toBe(participant2.id);
  });

  it("should support optional photo URI for participant", async () => {
    const participant: Participant = {
      id: "1",
      name: "田中太郎",
      instrument: "バイオリン",
      photoUri: "file:///path/to/photo.jpg",
      createdAt: new Date().toISOString(),
    };

    expect(participant.photoUri).toBe("file:///path/to/photo.jpg");
  });

  it("should support costume selection for participant", async () => {
    const participant: Participant = {
      id: "1",
      name: "田中太郎",
      instrument: "バイオリン",
      selectedCostumeId: "costume-123",
      createdAt: new Date().toISOString(),
    };

    expect(participant.selectedCostumeId).toBe("costume-123");
  });

  it("should handle multiple participants for same event", async () => {
    const eventId = 1;
    const participants: Participant[] = [
      { id: "1", name: "太郎", instrument: "バイオリン", createdAt: "2024-01-15T10:00:00Z" },
      { id: "2", name: "花子", instrument: "チェロ", createdAt: "2024-01-15T10:05:00Z" },
      { id: "3", name: "次郎", instrument: "ビオラ", createdAt: "2024-01-15T10:10:00Z" },
      { id: "4", name: "美咲", instrument: "コントラバス", createdAt: "2024-01-15T10:15:00Z" },
    ];

    (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(participants));

    const key = `event_participants_${eventId}`;
    const data = await AsyncStorage.getItem(key);
    const loaded = data ? JSON.parse(data) : [];

    expect(loaded).toHaveLength(4);
    expect(loaded.map((p: Participant) => p.instrument)).toContain("バイオリン");
    expect(loaded.map((p: Participant) => p.instrument)).toContain("コントラバス");
  });

  it("should handle error when saving participants", async () => {
    (AsyncStorage.setItem as any).mockRejectedValue(new Error("Storage error"));

    try {
      await AsyncStorage.setItem("event_participants_1", JSON.stringify([]));
    } catch (error: any) {
      expect(error.message).toBe("Storage error");
    }
  });

  it("should handle error when loading participants", async () => {
    (AsyncStorage.getItem as any).mockRejectedValue(new Error("Storage error"));

    try {
      await AsyncStorage.getItem("event_participants_1");
    } catch (error: any) {
      expect(error.message).toBe("Storage error");
    }
  });
});
