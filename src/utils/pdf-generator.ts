import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

interface ParticipantInfo {
  name: string;
  instrument: string;
  photoUri?: string;
  selectedCostumeName?: string;
  selectedCostumeImage?: string;
}

interface EventInfo {
  name: string;
  eventDate: string;
}

/**
 * Convert image file to base64 string
 */
export const imageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    } as any);
    return base64;
  } catch (error) {
    console.error("Failed to convert image to base64:", error);
    return "";
  }
};

/**
 * Generate HTML content for PDF with participant information
 */
export const generatePDFHTML = async (
  event: EventInfo,
  participants: ParticipantInfo[]
): Promise<string> => {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          background-color: #f5f5f5;
          color: #333;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          padding: 40px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 3px solid #FF6B9D;
          padding-bottom: 20px;
        }
        
        .header h1 {
          font-size: 32px;
          color: #FF6B9D;
          margin-bottom: 10px;
        }
        
        .header p {
          font-size: 16px;
          color: #666;
        }
        
        .event-info {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .event-info p {
          margin: 8px 0;
          font-size: 14px;
        }
        
        .event-info strong {
          color: #FF6B9D;
        }
        
        .participants {
          margin-top: 30px;
        }
        
        .participant-card {
          page-break-inside: avoid;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background-color: #fafafa;
        }
        
        .participant-header {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #FF6B9D;
          padding-bottom: 15px;
        }
        
        .participant-photo {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 20px;
          border: 3px solid #FF6B9D;
        }
        
        .participant-name {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        
        .participant-instrument {
          font-size: 14px;
          color: #666;
        }
        
        .costume-section {
          margin-top: 15px;
        }
        
        .costume-section h3 {
          font-size: 16px;
          color: #FF6B9D;
          margin-bottom: 10px;
        }
        
        .costume-info {
          display: flex;
          gap: 20px;
        }
        
        .costume-image {
          width: 120px;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #ddd;
        }
        
        .costume-details {
          flex: 1;
        }
        
        .costume-name {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 10px;
        }
        
        .footer {
          margin-top: 40px;
          text-align: center;
          border-top: 1px solid #ddd;
          padding-top: 20px;
          font-size: 12px;
          color: #999;
        }
        
        @media print {
          body {
            background-color: white;
          }
          
          .participant-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎭 衣装情報レポート</h1>
          <p>${event.name}</p>
        </div>
        
        <div class="event-info">
          <p><strong>イベント名:</strong> ${event.name}</p>
          <p><strong>開催日:</strong> ${new Date(event.eventDate).toLocaleDateString("ja-JP")}</p>
          <p><strong>参加者数:</strong> ${participants.length}名</p>
        </div>
        
        <div class="participants">
  `;

  // Add participant cards
  for (const participant of participants) {
    const photoBase64 = participant.photoUri
      ? `data:image/jpeg;base64,${await imageToBase64(participant.photoUri)}`
      : "";
    const costumeImageBase64 = participant.selectedCostumeImage
      ? `data:image/jpeg;base64,${await imageToBase64(participant.selectedCostumeImage)}`
      : "";

    html += `
      <div class="participant-card">
        <div class="participant-header">
          ${
            photoBase64
              ? `<img src="${photoBase64}" alt="${participant.name}" class="participant-photo">`
              : '<div style="width: 80px; height: 80px; border-radius: 50%; background-color: #ddd; margin-right: 20px;"></div>'
          }
          <div>
            <div class="participant-name">${participant.name}</div>
            <div class="participant-instrument">🎵 ${participant.instrument}</div>
          </div>
        </div>
        
        ${
          participant.selectedCostumeName
            ? `
          <div class="costume-section">
            <h3>選択衣装</h3>
            <div class="costume-info">
              ${
                costumeImageBase64
                  ? `<img src="${costumeImageBase64}" alt="${participant.selectedCostumeName}" class="costume-image">`
                  : ""
              }
              <div class="costume-details">
                <div class="costume-name">${participant.selectedCostumeName}</div>
              </div>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  html += `
        </div>
        
        <div class="footer">
          <p>このレポートは Costume Coordinator で生成されました</p>
          <p>生成日時: ${new Date().toLocaleString("ja-JP")}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

/**
 * Generate PDF file from HTML content
 */
export const generatePDFFromHTML = async (
  htmlContent: string,
  fileName: string
): Promise<string> => {
  try {
    // For now, we'll save as HTML since react-native-html-to-pdf has limitations
    // In production, use a proper PDF library
    const filePath = `/tmp/${fileName}.html`;

    await FileSystem.writeAsStringAsync(filePath, htmlContent);

    return filePath;
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    throw error;
  }
};

/**
 * Share generated PDF file
 */
export const sharePDFFile = async (filePath: string, fileName: string) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: "text/html",
        dialogTitle: `${fileName}を共有`,
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  } catch (error) {
    console.error("Failed to share PDF:", error);
    throw error;
  }
};

/**
 * Generate and share PDF with participant information
 */
export const generateAndSharePDF = async (
  event: EventInfo,
  participants: ParticipantInfo[]
): Promise<void> => {
  try {
    // Generate HTML content
    const htmlContent = await generatePDFHTML(event, participants);

    // Generate PDF file
    const sanitizedEventName = event.name.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `costume_report_${sanitizedEventName}_${Date.now()}`;
    const filePath = await generatePDFFromHTML(htmlContent, fileName);

    // Share the file
    await sharePDFFile(filePath, fileName);
  } catch (error) {
    console.error("Failed to generate and share PDF:", error);
    throw error;
  }
};
