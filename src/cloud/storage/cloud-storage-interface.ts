import type { CloudSyncDocument } from '../types'

export interface CloudStorageProvider {
  readonly providerId: 'google-drive' | 'dropbox'
  download(): Promise<CloudSyncDocument | null>
  upload(document: CloudSyncDocument): Promise<void>
}
