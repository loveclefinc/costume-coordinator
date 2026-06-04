/** GitHub Pages ビルド時に VITE_EVENT_API_URL を設定（末尾スラッシュなし） */
export function getEventApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_EVENT_API_URL as string | undefined
  if (!url || typeof url !== 'string' || !url.trim()) return null
  return url
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\/$/, '')
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
