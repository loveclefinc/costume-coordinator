/**
 * Client-facing costume image report (PDF export).
 * Focused on sharing visual costume proposals with clients, not print layouts.
 */

import { APP_DISPLAY_NAME } from '../constants/app-brand'

export interface ClientReportAssignment {
  participantName: string
  costumeName: string
  costumeImage?: string
  colors: string[]
  tone?: string
  pattern?: string
}

export interface ClientReportEvent {
  name: string
  eventDate: string
  description?: string
}

const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: 'ビビッド',
  dark: 'ダーク',
  neutral: 'ニュートラル',
  warm: 'ウォーム',
  cool: 'クール',
}

const PATTERN_LABELS: Record<string, string> = {
  solid: '無地',
  striped: 'ストライプ',
  stripe: 'ストライプ',
  floral: '花柄',
  geometric: '幾何学',
  check: 'チェック',
  dot: 'ドット',
  other: 'その他',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toImageSrc(image?: string): string | null {
  if (!image) return null
  if (image.startsWith('data:')) return image
  if (/^https?:\/\//i.test(image) || image.startsWith('blob:')) return image
  return `data:image/jpeg;base64,${image}`
}

async function resolveImageForPdfExport(image?: string): Promise<string | undefined> {
  if (!image) return undefined
  if (image.startsWith('data:') || image.startsWith('blob:')) return image
  if (/^https?:\/\//i.test(image)) {
    try {
      const response = await fetch(image, { mode: 'cors' })
      if (!response.ok) return image
      const blob = await response.blob()
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
        reader.readAsDataURL(blob)
      })
    } catch {
      return image
    }
  }
  return `data:image/jpeg;base64,${image}`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function renderColorSwatches(colors: string[]): string {
  if (colors.length === 0) return ''
  return colors
    .map(
      (color) =>
        `<span class="color-swatch" style="background-color:${escapeHtml(color)}" title="${escapeHtml(color)}"></span>`,
    )
    .join('')
}

function renderAssignmentCard(assignment: ClientReportAssignment): string {
  const imageSrc = toImageSrc(assignment.costumeImage)
  const toneLabel = assignment.tone ? TONE_LABELS[assignment.tone] || assignment.tone : ''
  const patternLabel = assignment.pattern
    ? PATTERN_LABELS[assignment.pattern] || assignment.pattern
    : ''
  const meta = [toneLabel, patternLabel].filter(Boolean).join(' · ')

  return `
    <article class="assignment-card">
      <div class="assignment-image">
        ${
          imageSrc
            ? `<img src="${imageSrc}" alt="${escapeHtml(assignment.costumeName)}" />`
            : `<div class="assignment-image-placeholder">写真なし</div>`
        }
      </div>
      <div class="assignment-body">
        <p class="participant-name">${escapeHtml(assignment.participantName)}</p>
        ${meta ? `<p class="costume-meta">${escapeHtml(meta)}</p>` : ''}
        ${assignment.colors.length > 0 ? `<div class="color-row">${renderColorSwatches(assignment.colors)}</div>` : ''}
      </div>
    </article>
  `
}

/**
 * Build self-contained HTML for a client-facing costume proposal.
 */
export function buildClientReportHtml(
  event: ClientReportEvent,
  assignments: ClientReportAssignment[],
): string {
  const generatedAt = new Date().toLocaleString('ja-JP')
  const cards = assignments.map(renderAssignmentCard).join('')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>衣装コーディネート提案 - ${escapeHtml(event.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', 'Yu Gothic', sans-serif;
      background: #f4f1ec;
      color: #1a1a1a;
      line-height: 1.5;
    }
    .report {
      width: 794px;
      margin: 0 auto;
      background: #fff;
      padding: 40px 36px 32px;
    }
    .report-header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #1a1a1a;
    }
    .report-label {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .report-title {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .report-meta {
      font-size: 14px;
      color: #555;
    }
    .report-description {
      margin-top: 12px;
      font-size: 13px;
      color: #444;
      white-space: pre-wrap;
    }
    .assignment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .assignment-card {
      border: 1px solid #e5e0d8;
      border-radius: 12px;
      overflow: hidden;
      background: #faf9f7;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .assignment-image {
      width: 100%;
      aspect-ratio: 3 / 4;
      background: #ece8e2;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .assignment-image img {
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }
    .assignment-image-placeholder {
      font-size: 13px;
      color: #888;
    }
    .assignment-body {
      padding: 14px 16px 16px;
    }
    .participant-name {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .costume-meta {
      font-size: 12px;
      color: #777;
      margin-bottom: 8px;
    }
    .color-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .color-swatch {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.12);
      display: inline-block;
    }
    .report-footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #e5e0d8;
      font-size: 11px;
      color: #999;
      text-align: center;
    }
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #888;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="report" id="client-costume-report">
    <header class="report-header">
      <p class="report-label">Costume Proposal</p>
      <h1 class="report-title">${escapeHtml(event.name)}</h1>
      <p class="report-meta">${formatDate(event.eventDate)} · ${assignments.length}名</p>
      ${event.description ? `<p class="report-description">${escapeHtml(event.description)}</p>` : ''}
    </header>
    ${
      assignments.length > 0
        ? `<div class="assignment-grid">${cards}</div>`
        : `<p class="empty-state">衣装が割り当てられた参加者がいません。</p>`
    }
    <footer class="report-footer">
      <p>${escapeHtml(APP_DISPLAY_NAME)} · 作成日時 ${generatedAt}</p>
    </footer>
  </div>
</body>
</html>`
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'event'
}

/**
 * Export client costume report as a downloadable PDF file.
 */
export async function exportClientCostumeReportPdf(
  event: ClientReportEvent,
  assignments: ClientReportAssignment[],
): Promise<void> {
  if (assignments.length === 0) {
    throw new Error('提出用レポートを作成する衣装割り当てがありません')
  }

  const resolvedAssignments = await Promise.all(
    assignments.map(async (assignment) => ({
      ...assignment,
      costumeImage: await resolveImageForPdfExport(assignment.costumeImage),
    })),
  )

  const html = buildClientReportHtml(event, resolvedAssignments)
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.innerHTML = html
  document.body.appendChild(container)

  const reportRoot = container.querySelector('#client-costume-report') as HTMLElement | null
  if (!reportRoot) {
    document.body.removeChild(container)
    throw new Error('レポートの生成に失敗しました')
  }

  try {
    const html2pdf = (await import('html2pdf.js')).default
    const filename = `衣装提案_${sanitizeFilename(event.name)}_${Date.now()}.pdf`

    await html2pdf()
      .set({
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      } as Record<string, unknown>)
      .from(reportRoot)
      .save()
  } finally {
    document.body.removeChild(container)
  }
}
