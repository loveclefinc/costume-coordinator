import {
  CLOUD_APP_FOLDER,
  CLOUD_DATA_FILE,
  SYNC_DOCUMENT_VERSION,
  SyncError,
  type CloudSyncDocument,
} from '../types'
import type { CloudStorageProvider } from './cloud-storage-interface'

export class GoogleDriveStorage implements CloudStorageProvider {
  readonly providerId = 'google-drive' as const

  constructor(private getAccessToken: () => Promise<string>) {}

  async download(): Promise<CloudSyncDocument | null> {
    const token = await this.getAccessToken()
    const folderId = await this.ensureAppFolder(token)
    const fileId = await this.findDataFile(token, folderId)
    if (!fileId) return null

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw await apiError(res)
    }
    return parseDocument(await res.text())
  }

  async upload(document: CloudSyncDocument): Promise<void> {
    const token = await this.getAccessToken()
    const folderId = await this.ensureAppFolder(token)
    const fileId = await this.findDataFile(token, folderId)
    const body = JSON.stringify(document)

    if (fileId) {
      const res = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body,
        },
      )
      if (!res.ok) throw await apiError(res)
    } else {
      const metadata = {
        name: CLOUD_DATA_FILE,
        parents: [folderId],
        mimeType: 'application/json',
      }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([body], { type: 'application/json' }))

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      )
      if (!res.ok) throw await apiError(res)
    }
  }

  private async ensureAppFolder(token: string): Promise<string> {
    const q = encodeURIComponent(
      `mimeType='application/vnd.google-apps.folder' and name='${CLOUD_APP_FOLDER}' and trashed=false`,
    )
    const search = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!search.ok) throw await apiError(search)
    const data = await search.json()
    if (data.files?.[0]?.id) return data.files[0].id

    const create = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: CLOUD_APP_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    })
    if (!create.ok) throw await apiError(create)
    const folder = await create.json()
    return folder.id
  }

  private async findDataFile(token: string, folderId: string): Promise<string | null> {
    const q = encodeURIComponent(
      `name='${CLOUD_DATA_FILE}' and '${folderId}' in parents and trashed=false`,
    )
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) throw await apiError(res)
    const data = await res.json()
    return data.files?.[0]?.id ?? null
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
  return new SyncError(`Google Drive API エラー: ${res.statusText}`, 'UNKNOWN')
}
