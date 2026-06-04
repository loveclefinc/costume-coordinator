/** wrangler.toml の `name` と一致させる */
export const EVENT_WORKER_SCRIPT_NAME = 'costume-coordinator-events'

/**
 * GitHub Pages ビルド時に VITE_EVENT_API_URL を設定（末尾スラッシュなし）。
 * 誤って `https://loveclef.workers.dev` だけ入れている場合は Worker URL に補正する。
 */
export function normalizeEventApiBaseUrl(url: string): string | null {
  const trimmed = url.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '')
  if (!trimmed) return null
  try {
    const host = new URL(trimmed).hostname
    const parts = host.split('.')
    if (parts.length === 3 && parts[1] === 'workers' && parts[2] === 'dev') {
      return `https://${EVENT_WORKER_SCRIPT_NAME}.${parts[0]}.workers.dev`
    }
    return trimmed
  } catch {
    return null
  }
}

export function getEventApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_EVENT_API_URL as string | undefined
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null
  return normalizeEventApiBaseUrl(raw)
}

/** 設定ミス検出用: ビルド時の生の値がサブドメインだけか */
export function isMisconfiguredEventApiUrl(): boolean {
  const raw = import.meta.env.VITE_EVENT_API_URL as string | undefined
  if (!raw?.trim()) return false
  try {
    const host = new URL(raw.trim().replace(/^["']|["']$/g, '')).hostname
    const parts = host.split('.')
    return parts.length === 3 && parts[1] === 'workers' && parts[2] === 'dev'
  } catch {
    return false
  }
}

export function isEventServerEnabled(): boolean {
  return getEventApiBaseUrl() != null
}

export function appBasePath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export function absoluteAppUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${appBasePath()}${p}`
  }
  return `${appBasePath()}${p}`
}
