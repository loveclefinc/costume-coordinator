import type { RetentionDays } from './event-api-types'

/** イベント日 23:59:59.999 UTC（date は YYYY-MM-DD） */
export function endOfEventDayMs(dateStr: string): number {
  const d = dateStr.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return Date.now() + 14 * 86400000
  }
  return new Date(`${d}T23:59:59.999Z`).getTime()
}

/**
 * 保持期限: 作成から retentionDays 日 と、イベント日翌日 のうち遅い方（最大14日キャップ）
 */
export function computeExpiresAt(
  createdAtMs: number,
  eventDateStr: string,
  retentionDays: RetentionDays,
): number {
  const capMs = createdAtMs + 14 * 86400000
  const retentionMs = createdAtMs + retentionDays * 86400000
  const afterEventMs = endOfEventDayMs(eventDateStr) + 86400000
  return Math.min(capMs, Math.max(retentionMs, afterEventMs))
}

export function isExpired(expiresAtMs: number, nowMs = Date.now()): boolean {
  return nowMs >= expiresAtMs
}
