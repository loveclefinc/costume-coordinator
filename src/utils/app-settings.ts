const RECENT_USAGE_EXCLUDE_DAYS_KEY = 'costume-coordinator-recent-usage-exclude-days'

export const DEFAULT_RECENT_USAGE_EXCLUDE_DAYS = 30

export function getRecentUsageExcludeDays(): number {
  try {
    const raw = localStorage.getItem(RECENT_USAGE_EXCLUDE_DAYS_KEY)
    if (raw == null || raw === '') return DEFAULT_RECENT_USAGE_EXCLUDE_DAYS
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_RECENT_USAGE_EXCLUDE_DAYS
    return Math.min(parsed, 365)
  } catch {
    return DEFAULT_RECENT_USAGE_EXCLUDE_DAYS
  }
}

export function setRecentUsageExcludeDays(days: number): void {
  const normalized = Number.isFinite(days) ? Math.max(0, Math.min(365, Math.trunc(days))) : DEFAULT_RECENT_USAGE_EXCLUDE_DAYS
  try {
    localStorage.setItem(RECENT_USAGE_EXCLUDE_DAYS_KEY, String(normalized))
  } catch {
    /* ignore quota / private mode */
  }
}
