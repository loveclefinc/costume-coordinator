/** OAuth 同意画面・ホームページで一致させる公式アプリ名 */
export const APP_DISPLAY_NAME = 'Costume Coordinator'

/** 本番公開 URL（カスタムドメイン） */
export const APP_PUBLIC_ORIGIN = 'https://dress.l-clef.com'

/** クラウド同期フォルダ名（Dropbox / Google Drive） */
export const CLOUD_FOLDER_NAME = 'CostumeCoordinator'

/** Vite base からアプリの URL パス prefix を返す（`/` のときは空文字） */
export function getAppBasePath(): string {
  const raw = import.meta.env.BASE_URL || '/'
  if (raw === '/') return ''
  return raw.replace(/\/$/, '')
}

export function resolveAppPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getAppBasePath()
  return base ? `${base}${normalized}` : normalized
}
