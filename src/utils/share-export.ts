/**
 * Share and Export Utilities for PWA
 * Handles Web Share API, CSV/JSON export, and QR code generation
 */

export interface EventData {
  id: string;
  name: string;
  eventDate: string;
  participants: ParticipantData[];
  costumes: CostumeAssignment[];
}

export interface ParticipantData {
  id: string;
  name: string;
  role?: string;
  selectedCostumeId?: string;
  selectedCostumeName?: string;
}

export interface CostumeAssignment {
  participantId: string;
  participantName: string;
  costumeId: string;
  costumeName: string;
  colors: string[];
}

/**
 * Share event using Web Share API
 * Falls back to copy-to-clipboard if Share API not available
 */
export async function shareEvent(event: EventData): Promise<void> {
  const shareText = `
イベント: ${event.name}
開催日: ${new Date(event.eventDate).toLocaleDateString('ja-JP')}
参加者: ${event.participants.length}名

参加者衣装情報:
${event.participants
  .map((p) => `- ${p.name}${p.selectedCostumeName ? `: ${p.selectedCostumeName}` : ''}`)
  .join('\n')}
  `.trim();

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${event.name} - イベント情報`,
        text: shareText,
      });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
        throw error;
      }
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      alert('イベント情報をコピーしました');
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      throw new Error('共有機能が利用できません');
    }
  }
}

/**
 * Export event data as CSV
 */
export function exportEventAsCSV(event: EventData): void {
  const headers = ['参加者名', '衣装', '色'];
  const rows = event.participants.map((p) => [
    p.name,
    p.selectedCostumeName || '-',
    event.costumes
      .filter((c) => c.participantId === p.id)
      .map((c) => c.colors.join(','))
      .join(';') || '-',
  ]);

  const csv = [
    `イベント: ${event.name}`,
    `開催日: ${new Date(event.eventDate).toLocaleDateString('ja-JP')}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  downloadFile(csv, `${event.name}_${Date.now()}.csv`, 'text/csv');
}

/**
 * Export event data as JSON
 */
export function exportEventAsJSON(event: EventData): void {
  const json = JSON.stringify(event, null, 2);
  downloadFile(json, `${event.name}_${Date.now()}.json`, 'application/json');
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate QR code data URL for event participation
 * Returns a data URL that can be used with an img tag
 */
export async function generateEventQRCode(
  eventId: string,
  eventName: string,
  shareUrl?: string,
): Promise<string> {
  const payload =
    shareUrl ??
    JSON.stringify({
      eventId,
      eventName,
      timestamp: Date.now(),
    })
  const encodedData = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedData}`
}

/**
 * Generate event participation link
 */
export function generateEventLink(eventId: string, baseUrl: string = window.location.origin): string {
  const path = `/costume-coordinator/events/${eventId}`;
  return `${baseUrl}${path}`;
}

/**
 * Share event via Web Share API with QR code
 */
export async function shareEventWithQR(event: EventData, qrCodeUrl: string): Promise<void> {
  const shareText = `
イベント: ${event.name}
開催日: ${new Date(event.eventDate).toLocaleDateString('ja-JP')}
参加者: ${event.participants.length}名

このリンクから参加できます:
${generateEventLink(event.id)}
  `.trim();

  if (navigator.share) {
    try {
      // Try to share with files if available
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], 'event-qr.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${event.name} - イベント参加`,
          text: shareText,
          files: [file],
        });
      } else {
        // Fallback to text share
        await navigator.share({
          title: `${event.name} - イベント参加`,
          text: shareText,
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share with QR failed:', error);
        // Fallback to text share
        await shareEvent(event);
      }
    }
  } else {
    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(generateEventLink(event.id));
      alert('イベントリンクをコピーしました');
    } catch (error) {
      console.error('Clipboard copy failed:', error);
    }
  }
}
