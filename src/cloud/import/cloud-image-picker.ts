import type { CloudProvider } from '../types'
import { SyncError } from '../types'
import { tokenManager } from '../token/token-manager'
import { CLOUD_APP_FOLDER, CLOUD_DATA_FILE } from '../types'

export interface CloudImageFile {
  id: string
  name: string
  size: number
  modifiedAt: string
  thumbnailUrl?: string
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']

export async function searchCloudImages(
  provider: CloudProvider,
  query: string = '',
): Promise<CloudImageFile[]> {
  const token = await tokenManager.getAccessToken(provider)
  if (provider === 'dropbox') {
    return searchDropboxImages(token, query)
  }
  return searchGoogleDriveImages(token, query)
}

export async function downloadCloudImage(
  provider: CloudProvider,
  file: CloudImageFile,
): Promise<string> {
  const token = await tokenManager.getAccessToken(provider)
  if (provider === 'dropbox') {
    return downloadDropboxImage(token, file.id)
  }
  return downloadGoogleDriveImage(token, file.id)
}

async function searchDropboxImages(token: string, query: string): Promise<CloudImageFile[]> {
  const res = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: query.trim() || 'jpg',
      options: {
        path: '',
        max_results: 50,
        file_extensions: IMAGE_EXTENSIONS,
        file_status: 'active',
      },
    }),
  })

  if (!res.ok) {
    throw await apiError(res, 'Dropbox')
  }

  const data = await res.json()
  const files: CloudImageFile[] = []

  for (const match of data.matches ?? []) {
    const meta = match.metadata?.metadata ?? match.metadata
    if (!meta || meta['.tag'] !== 'file') continue
    if (meta.name === CLOUD_DATA_FILE) continue

    files.push({
      id: meta.path_display ?? meta.path_lower ?? meta.id,
      name: meta.name,
      size: meta.size ?? 0,
      modifiedAt: meta.client_modified ?? meta.server_modified ?? '',
    })
  }

  return files
}

async function downloadDropboxImage(token: string, path: string): Promise<string> {
  const res = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })

  if (!res.ok) {
    throw await apiError(res, 'Dropbox')
  }

  const blob = await res.blob()
  return blobToDataUrl(blob)
}

async function searchGoogleDriveImages(token: string, query: string): Promise<CloudImageFile[]> {
  const folderId = await findAppFolderId(token)
  const parts = [
    `'${folderId}' in parents`,
    "mimeType contains 'image/'",
    'trashed=false',
  ]
  if (query.trim()) {
    parts.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`)
  }
  const q = encodeURIComponent(parts.join(' and '))

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=50&fields=files(id,name,size,modifiedTime,thumbnailLink)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) {
    throw await apiError(res, 'Google Drive')
  }

  const data = await res.json()
  return (data.files ?? [])
    .filter((f: { name: string }) => f.name !== CLOUD_DATA_FILE)
    .map((f: { id: string; name: string; size?: string; modifiedTime?: string; thumbnailLink?: string }) => ({
      id: f.id,
      name: f.name,
      size: Number(f.size ?? 0),
      modifiedAt: f.modifiedTime ?? '',
      thumbnailUrl: f.thumbnailLink,
    }))
}

async function findAppFolderId(token: string): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${CLOUD_APP_FOLDER}' and trashed=false`,
  )
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) {
    throw await apiError(res, 'Google Drive')
  }
  const data = await res.json()
  const id = data.files?.[0]?.id
  if (!id) {
    throw new SyncError(
      `${CLOUD_APP_FOLDER} フォルダが見つかりません。先にクラウド同期を行ってください。`,
      'UNKNOWN',
    )
  }
  return id
}

async function downloadGoogleDriveImage(token: string, fileId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!res.ok) {
    throw await apiError(res, 'Google Drive')
  }

  const blob = await res.blob()
  return blobToDataUrl(blob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(blob)
  })
}

async function apiError(res: Response, provider: string): Promise<SyncError> {
  if (res.status === 401) {
    return new SyncError('認証の有効期限が切れました。設定から再接続してください。', 'AUTH_EXPIRED')
  }
  if (res.status === 429) {
    return new SyncError('API 制限に達しました。しばらく待って再試行してください。', 'RATE_LIMITED')
  }
  let detail = res.statusText
  try {
    const j = await res.json()
    detail = j.error_summary ?? j.error?.message ?? j.error ?? detail
  } catch {
    /* ignore */
  }
  return new SyncError(`${provider} API エラー: ${detail}`, 'UNKNOWN')
}
