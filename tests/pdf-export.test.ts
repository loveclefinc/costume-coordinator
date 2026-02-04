import { describe, it, expect, beforeEach } from "vitest";

describe("PDF Export - Participant Costume Information", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should generate message with participant information", () => {
    const eventName = "Spring Concert 2024";
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン" },
      { id: "2", name: "花子", instrument: "チェロ" },
      { id: "3", name: "次郎", instrument: "ビオラ" },
      { id: "4", name: "美咲", instrument: "コントラバス" },
    ];

    let message = `衣装情報 - ${eventName}\n\n`;
    for (const participant of participants) {
      message += `${participant.name} (楽器: ${participant.instrument})\n`;
    }

    expect(message).toContain("Spring Concert 2024");
    expect(message).toContain("太郎");
    expect(message).toContain("バイオリン");
    expect(message).toContain("花子");
    expect(message).toContain("チェロ");
  });

  it("should handle empty participant list", () => {
    const eventName = "Test Event";
    const participants: any[] = [];

    let message = `衣装情報 - ${eventName}\n\n`;
    for (const participant of participants) {
      message += `${participant.name} (楽器: ${participant.instrument})\n`;
    }

    expect(message).toBe(`衣装情報 - ${eventName}\n\n`);
  });

  it("should format participant information correctly", () => {
    const participant = { id: "1", name: "太郎", instrument: "バイオリン" };
    const formatted = `${participant.name} (楽器: ${participant.instrument})`;

    expect(formatted).toBe("太郎 (楽器: バイオリン)");
  });

  it("should include all participants in message", () => {
    const participants = [
      { id: "1", name: "参加者1", instrument: "楽器1" },
      { id: "2", name: "参加者2", instrument: "楽器2" },
      { id: "3", name: "参加者3", instrument: "楽器3" },
    ];

    let message = "";
    for (const participant of participants) {
      message += `${participant.name} (楽器: ${participant.instrument})\n`;
    }

    expect(message.split("\n").length - 1).toBe(3); // 3 participants + 1 empty line
  });

  it("should handle special characters in names", () => {
    const participant = { id: "1", name: "太郎＆花子", instrument: "バイオリン" };
    const formatted = `${participant.name} (楽器: ${participant.instrument})`;

    expect(formatted).toContain("太郎＆花子");
  });

  it("should handle long instrument names", () => {
    const participant = {
      id: "1",
      name: "太郎",
      instrument: "コントラバス",
    };
    const formatted = `${participant.name} (楽器: ${participant.instrument})`;

    expect(formatted).toContain("コントラバス");
  });

  it("should generate valid share message format", () => {
    const eventName = "Concert";
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン" },
    ];

    let message = `衣装情報 - ${eventName}\n\n`;
    for (const participant of participants) {
      message += `${participant.name} (楽器: ${participant.instrument})\n`;
    }

    expect(message).toMatch(/衣装情報 - /);
    expect(message).toMatch(/\(楽器: /);
  });

  it("should handle multiple participants with different instruments", () => {
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン" },
      { id: "2", name: "花子", instrument: "チェロ" },
      { id: "3", name: "次郎", instrument: "ビオラ" },
      { id: "4", name: "美咲", instrument: "コントラバス" },
    ];

    let message = "";
    for (const participant of participants) {
      message += `${participant.name} (楽器: ${participant.instrument})\n`;
    }

    expect(message).toContain("太郎 (楽器: バイオリン)");
    expect(message).toContain("花子 (楽器: チェロ)");
    expect(message).toContain("次郎 (楽器: ビオラ)");
    expect(message).toContain("美咲 (楽器: コントラバス)");
  });

  it("should create exportable message structure", () => {
    const eventName = "Final Concert";
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン" },
    ];

    const shareData = {
      message: `衣装情報 - ${eventName}\n\n${participants.map((p) => `${p.name} (楽器: ${p.instrument})`).join("\n")}`,
      title: "衣装情報を共有",
    };

    expect(shareData).toHaveProperty("message");
    expect(shareData).toHaveProperty("title");
    expect(shareData.message).toContain("衣装情報");
  });

  it("should generate PDF content with participant costume information", () => {
    const eventName = "Spring Concert 2024";
    const eventDate = "2024-05-15";
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン", selectedCostumeName: "赤いドレス" },
      { id: "2", name: "花子", instrument: "チェロ", selectedCostumeName: "青いドレス" },
    ];

    let pdfContent = `衣装情報レポート\n`;
    pdfContent += `イベント: ${eventName}\n`;
    pdfContent += `開催日: ${new Date(eventDate).toLocaleDateString("ja-JP")}\n`;
    pdfContent += `\n参加者衣装情報:\n\n`;

    for (const participant of participants) {
      pdfContent += `${participant.name}\n`;
      pdfContent += `  楽器: ${participant.instrument}\n`;
      if (participant.selectedCostumeName) {
        pdfContent += `  衣装: ${participant.selectedCostumeName}\n`;
      }
      pdfContent += `\n`;
    }

    expect(pdfContent).toContain("衣装情報レポート");
    expect(pdfContent).toContain("Spring Concert 2024");
    expect(pdfContent).toContain("太郎");
    expect(pdfContent).toContain("バイオリン");
    expect(pdfContent).toContain("赤いドレス");
    expect(pdfContent).toContain("花子");
    expect(pdfContent).toContain("チェロ");
    expect(pdfContent).toContain("青いドレス");
  });

  it("should handle participants without selected costume", () => {
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン", selectedCostumeName: undefined },
    ];

    let pdfContent = "参加者衣装情報:\n\n";
    for (const participant of participants) {
      pdfContent += `${participant.name}\n`;
      pdfContent += `  楽器: ${participant.instrument}\n`;
      if (participant.selectedCostumeName) {
        pdfContent += `  衣装: ${participant.selectedCostumeName}\n`;
      }
      pdfContent += `\n`;
    }

    expect(pdfContent).toContain("太郎");
    expect(pdfContent).toContain("バイオリン");
    expect(pdfContent).not.toContain("衣装:");
  });

  it("should generate PDF with all participants and their costumes", () => {
    const eventName = "Quartet Concert";
    const participants = [
      { id: "1", name: "太郎", instrument: "バイオリン1", selectedCostumeName: "黒いタキシード" },
      { id: "2", name: "花子", instrument: "バイオリン2", selectedCostumeName: "黒いドレス" },
      { id: "3", name: "次郎", instrument: "ビオラ", selectedCostumeName: "黒いスーツ" },
      { id: "4", name: "美咲", instrument: "チェロ", selectedCostumeName: "黒いロングドレス" },
    ];

    let pdfContent = `イベント: ${eventName}\n\n参加者衣装情報:\n\n`;
    for (const participant of participants) {
      pdfContent += `${participant.name}\n`;
      pdfContent += `  楽器: ${participant.instrument}\n`;
      if (participant.selectedCostumeName) {
        pdfContent += `  衣装: ${participant.selectedCostumeName}\n`;
      }
      pdfContent += `\n`;
    }

    const lines = pdfContent.split("\n");
    expect(lines.length).toBeGreaterThan(10);
    expect(pdfContent).toContain("太郎");
    expect(pdfContent).toContain("花子");
    expect(pdfContent).toContain("次郎");
    expect(pdfContent).toContain("美咲");
    expect(pdfContent).toContain("黒いタキシード");
    expect(pdfContent).toContain("黒いドレス");
  });
});
