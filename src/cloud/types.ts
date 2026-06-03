import type { Costume, Event, UsageHistory } from '../utils/storage'

export const CLOUD_APP_FOLDER = 'CostumeCoordinator'
export const CLOUD_DATA_FILE = 'data.json'
export const SYNC_DOCUMENT_VERSION = 1 as const

export type CloudProvider = 'google-drive' | 'dropbox'

export type SyncRecordType = 'event' | 'costume' | 'usageHistory'

export interface SyncRecord {
  id: string
  type: SyncRecordType
  updatedAt: number
  data: Event | Costume | UsageHistory
}

export interface CloudSyncDocument {
  version: typeof SYNC_DOCUMENT_VERSION
  updatedAt: string
  records: SyncRecord[]
}

export interface SyncMeta {
  provider: CloudProvider
  accountLabel: string
  lastSyncAt: string | null
  lastSyncError: string | null
  pendingConflicts: number
}

export interface TokenPair {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export interface MergeResult {
  records: SyncRecord[]
  conflicts: SyncConflict[]
}

export interface SyncConflict {
  recordId: string
  type: SyncRecordType
  localUpdatedAt: number
  remoteUpdatedAt: number
}

export type SyncErrorCode =
  | 'AUTH_EXPIRED'
  | 'NETWORK_OFFLINE'
  | 'RATE_LIMITED'
  | 'FILE_CORRUPT'
  | 'SYNC_CONFLICT'
  | 'NOT_CONNECTED'
  | 'CONFIG_MISSING'
  | 'UNKNOWN'

export class SyncError extends Error {
  constructor(
    message: string,
    public readonly code: SyncErrorCode,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'SyncError'
  }
}

export interface SyncStatus {
  connected: boolean
  provider: CloudProvider | null
  accountLabel: string | null
  lastSyncAt: string | null
  lastError: string | null
  syncing: boolean
  pendingConflicts: number
  online: boolean
}
