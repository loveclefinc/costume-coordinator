import { canExtendRetention } from '../../shared/event-expiry'

export function formatServerExpiryLabel(expiresAtMs: number): string {
  const formatted = new Date(expiresAtMs).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const remaining = expiresAtMs - Date.now()
  if (remaining <= 0) return `${formatted}（期限切れ）`
  const days = Math.ceil(remaining / 86400000)
  return `${formatted}（あと約${days}日）`
}

export function canExtendServerRetention(
  expiresAtMs: number | undefined,
  createdAtMs: number | undefined,
): boolean {
  if (expiresAtMs == null || createdAtMs == null) return false
  return canExtendRetention(expiresAtMs, createdAtMs)
}
