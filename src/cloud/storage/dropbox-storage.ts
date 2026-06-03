import {
  CLOUD_APP_FOLDER,
  CLOUD_DATA_FILE,
  SYNC_DOCUMENT_VERSION,
  SyncError,
  type CloudSyncDocument,
} from '../types'
import type { CloudStorageProvider } from './cloud-storage-interface'

const DATA_PATH = `/${CLOUD_APP_FOLDER}/${CLOUD_DATA_FILE}`

export class DropboxStorage implements CloudStorageProvider {
  readonly providerId = 'dropbox' as const

  constructor(private getAccessToken: () => Promise<string>) {}

  async download(): Promise<CloudSyncDocument | null> {
    const token = await this.getAccessToken()
    await this.ensureFolder(token)

    const res = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: DATA_PATH }),
      },
    })

    if (res.status === 409) {
      const err = await res.json().catch(() => ({}))
      if (err?.error?.['.tag'] === 'path' && err?.error?.path?.['.tag'] === 'not_found') {
        return null
      }
    }

    if (!res.ok) {
      throw await apiError(res)
    }

    return parseDocument(await res.text())
  }

  async upload(document: CloudSyncDocument): Promise<void> {
    const token = await this.getAccessToken()
    await this.ensureFolder(token)
    const body = JSON.stringify(document)

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: DATA_PATH,
          mode: 'overwrite',
          autorename: false,
          mute: true,
        }),
      },
      body,
    })

    if (!res.ok) throw await apiError(res)
  }

  private async ensureFolder(token: string): Promise<void> {
    const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: `/${CLOUD_APP_FOLDER}`,
        autorename: false,
      }),
    })
    if (res.ok) return
    const err = await res.json().catch(() => ({}))
    if (err?.error?.['.tag'] === 'path' && err?.error?.path?.['.tag'] === 'conflict') {
      return
    }
    if (!res.ok) throw await apiError(res)
  }
}

function parseDocument(text: string): CloudSyncDocument {
  try {
    const doc = JSON.parse(text) as CloudSyncDocument
    if (doc.version !== SYNC_DOCUMENT_VERSION || !Array.isArray(doc.records)) {
      throw new Error('Invalid schema')
    }
    return doc
  } catch {
    throw new SyncError('クラウド上のデータファイルが破損しています。', 'FILE_CORRUPT')
  }
}

async function apiError(res: Response): Promise<SyncError> {
  if (res.status === 401) {
    return new SyncError('認証の有効期限が切れました。再接続してください。', 'AUTH_EXPIRED')
  }
  if (res.status === 429) {
    return new SyncError('API 制限に達しました。', 'RATE_LIMITED')
  }
  return new SyncError(`Dropbox API エラー: ${res.statusText}`, 'UNKNOWN')
}
