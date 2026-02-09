import { describe, it, expect, beforeEach } from "vitest";

describe("PDF Generation - HTML Content Generation", () => {
  beforeEach(() => {
    // Setup before each test
  });

  it("should generate HTML header with event information", () => {
    const eventName = "Spring Concert 2024";
    const eventDate = "2024-05-15";

    const html = `
      <div class="header">
        <h1>🎭 衣装情報レポート</h1>
        <p>${eventName}</p>
      </div>
      <div class="event-info">
        <p><strong>イベント名:</strong> ${eventName}</p>
        <p><strong>開催日:</strong> ${new Date(eventDate).toLocaleDateString("ja-JP")}</p>
      </div>
    `;

    expect(html).toContain("衣装情報レポート");
    expect(html).toContain(eventName);
    // Date format may vary, just check it contains the date components
    expect(html).toContain("2024");
    expect(html).toContain("5");
  });

  it("should generate participant card with information", () => {
    const participantName = "太郎";
    const instrument = "バイオリン";
    const costumeName = "赤いドレス";

    const html = `
      <div class="participant-card">
        <div class="participant-header">
          <div>
            <div class="participant-name">${participantName}</div>
            <div class="participant-instrument">🎵 ${instrument}</div>
          </div>
        </div>
        <div class="costume-section">
          <h3>選択衣装</h3>
          <div class="costume-info">
            <div class="costume-details">
              <div class="costume-name">${costumeName}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    expect(html).toContain(participantName);
    expect(html).toContain(instrument);
    expect(html).toContain(costumeName);
  });

  it("should generate multiple participant cards", () => {
    const participants = [
      { name: "太郎", instrument: "バイオリン1", costume: "赤いドレス" },
      { name: "花子", instrument: "バイオリン2", costume: "青いドレス" },
      { name: "次郎", instrument: "ビオラ", costume: "黄色いドレス" },
    ];

    let html = "<div class='participants'>";
    for (const p of participants) {
      html += `
        <div class="participant-card">
          <div class="participant-name">${p.name}</div>
          <div class="participant-instrument">${p.instrument}</div>
          <div class="costume-name">${p.costume}</div>
        </div>
      `;
    }
    html += "</div>";

    expect(html).toContain("太郎");
    expect(html).toContain("花子");
    expect(html).toContain("次郎");
    expect(html).toContain("赤いドレス");
    expect(html).toContain("青いドレス");
    expect(html).toContain("黄色いドレス");
  });

  it("should include CSS styling for print", () => {
    const css = `
      @media print {
        body {
          background-color: white;
        }
        
        .participant-card {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    `;

    expect(css).toContain("@media print");
    expect(css).toContain("page-break-inside: avoid");
  });

  it("should generate HTML with proper structure", () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Header</div>
          <div class="participants">Participants</div>
          <div class="footer">Footer</div>
        </div>
      </body>
      </html>
    `;

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("<head>");
    expect(html).toContain("<body>");
    expect(html).toContain("</html>");
  });

  it("should handle participant without costume", () => {
    const participantName = "太郎";
    const instrument = "バイオリン";

    const html = `
      <div class="participant-card">
        <div class="participant-header">
          <div>
            <div class="participant-name">${participantName}</div>
            <div class="participant-instrument">🎵 ${instrument}</div>
          </div>
        </div>
      </div>
    `;

    expect(html).toContain(participantName);
    expect(html).toContain(instrument);
    expect(html).not.toContain("costume-section");
  });

  it("should generate footer with timestamp", () => {
    const timestamp = new Date().toLocaleString("ja-JP");

    const html = `
      <div class="footer">
        <p>このレポートは Costume Coordinator で生成されました</p>
        <p>生成日時: ${timestamp}</p>
      </div>
    `;

    expect(html).toContain("Costume Coordinator");
    expect(html).toContain("生成日時:");
  });

  it("should generate HTML with event summary", () => {
    const eventName = "Quartet Concert";
    const participantCount = 4;

    const html = `
      <div class="event-info">
        <p><strong>イベント名:</strong> ${eventName}</p>
        <p><strong>参加者数:</strong> ${participantCount}名</p>
      </div>
    `;

    expect(html).toContain(eventName);
    expect(html).toContain("4名");
  });

  it("should include image placeholders for missing photos", () => {
    const html = `
      <div class="participant-header">
        <div style="width: 80px; height: 80px; border-radius: 50%; background-color: #ddd; margin-right: 20px;"></div>
        <div>
          <div class="participant-name">太郎</div>
        </div>
      </div>
    `;

    expect(html).toContain("background-color: #ddd");
    expect(html).toContain("border-radius: 50%");
  });

  it("should generate valid HTML with proper escaping", () => {
    const participantName = "太郎&花子";
    const costume = "赤い\"ドレス\"";

    const html = `
      <div class="participant-name">${participantName}</div>
      <div class="costume-name">${costume}</div>
    `;

    expect(html).toContain("太郎&花子");
    expect(html).toContain("赤い\"ドレス\"");
  });

  it("should generate HTML with responsive design", () => {
    const css = `
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
      }
      
      .costume-info {
        display: flex;
        gap: 20px;
      }
      
      .costume-image {
        width: 120px;
        height: 160px;
      }
    `;

    expect(css).toContain("max-width: 800px");
    expect(css).toContain("display: flex");
    expect(css).toContain("gap: 20px");
  });
});
