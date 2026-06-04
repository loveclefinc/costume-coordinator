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

/** 作成日からのサーバー保存の絶対上限（日数） */
export const MAX_STORAGE_DAYS_FROM_CREATION = 14

const MAX_STORAGE_MS = MAX_STORAGE_DAYS_FROM_CREATION * 86400000

/**
 * 保存期限を extendDays 延長（既定 7 日）。作成から最大14日まで。
 * これ以上延長できない場合は null。
 */
export function extendExpiresAt(
  currentExpiresAtMs: number,
  createdAtMs: number,
  extendDays = 7,
): number | null {
  const capMs = createdAtMs + MAX_STORAGE_MS
  if (currentExpiresAtMs >= capMs) return null
  const next = Math.min(capMs, currentExpiresAtMs + extendDays * 86400000)
  if (next <= currentExpiresAtMs) return null
  return next
}

export function canExtendRetention(currentExpiresAtMs: number, createdAtMs: number): boolean {
  return extendExpiresAt(currentExpiresAtMs, createdAtMs, 7) !== null
}
