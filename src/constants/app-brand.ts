/** OAuth 同意画面・ホームページで一致させる公式アプリ名（英語） */
export const APP_DISPLAY_NAME = 'Costume Coordinator'

/** 画面上のメイン表示名（日本語） */
export const APP_DISPLAY_NAME_JA = '衣装コーディネーター'

/** 本番公開 URL（カスタムドメイン） */
export const APP_PUBLIC_ORIGIN = 'https://dress.l-clef.com'

/** クラウド同期フォルダ名（Dropbox / Google Drive） */
export const CLOUD_FOLDER_NAME = 'CostumeCoordinator'

/** 通知・共有用のアプリアイコン（public 配下） */
export const APP_ICON_NOTIFICATION = '/icon-192.png'

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

/** ブラウザ通知などで使う絶対 URL */
export function getAppIconUrl(asset: string = APP_ICON_NOTIFICATION): string {
  const path = resolveAppPath(asset)
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.href).href
  }
  return `${APP_PUBLIC_ORIGIN}${path}`
}
