import type { CloudProvider, SyncStatus } from '../types'
import { SyncError } from '../types'
import { GoogleDriveStorage } from '../storage/google-drive-storage'
import { DropboxStorage } from '../storage/dropbox-storage'
import type { CloudStorageProvider } from '../storage/cloud-storage-interface'
import { tokenManager } from '../token/token-manager'
import { secureTokenStore } from '../token/secure-token-store'
import { localDataStore } from './local-data-store'
import {
  buildCloudDocument,
  emptyCloudDocument,
  localDataToRecords,
  mergeRecords,
  recordsToLocalData,
} from './merge'
import { assertOnline } from '../oauth/oauth-client'
import { accessTokenCache } from '../token/access-token-cache'

const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000

export class CloudSyncService {
  private autoSyncTimer: ReturnType<typeof setInterval> | null = null
  private syncing = false

  private createProvider(provider: CloudProvider): CloudStorageProvider {
    const getToken = () => tokenManager.getAccessToken(provider)
    if (provider === 'google-drive') {
      return new GoogleDriveStorage(getToken)
    }
    return new DropboxStorage(getToken)
  }

  async getStatus(): Promise<SyncStatus> {
    const provider = await tokenManager.getConnectedProvider()
    const meta = await localDataStore.getSyncMeta()
    return {
      connected: !!provider,
      provider,
      accountLabel: meta?.accountLabel ?? (provider ? await secureTokenStore.getAccountLabel(provider) : null),
      lastSyncAt: meta?.lastSyncAt ?? null,
      lastError: meta?.lastSyncError ?? null,
      syncing: this.syncing,
      pendingConflicts: meta?.pendingConflicts ?? 0,
      online: navigator.onLine,
    }
  }

  async sync(): Promise<{ conflicts: number }> {
    if (this.syncing) return { conflicts: 0 }
    this.syncing = true

    try {
      assertOnline()
      const provider = await tokenManager.getConnectedProvider()
      if (!provider) {
        throw new SyncError('クラウドに接続されていません。', 'NOT_CONNECTED')
      }

      await localDataStore.init()
      const cloud = this.createProvider(provider)
      const meta = await localDataStore.getSyncMeta()
      const lastSyncAt = meta?.lastSyncAt ?? null

      const local = await localDataStore.getAllData()
      const localRecords = localDataToRecords(
        local.events,
        local.costumes,
        local.usageHistory,
      )

      let remoteDoc = await cloud.download()
      if (!remoteDoc) {
        remoteDoc = emptyCloudDocument()
      }

      const { records, conflicts } = mergeRecords(
        localRecords,
        remoteDoc.records,
        lastSyncAt,
      )

      const merged = recordsToLocalData(records)
      await localDataStore.bulkApply(
        merged.events,
        merged.costumes,
        merged.usageHistory,
      )

      const uploadDoc = buildCloudDocument(records)
      await cloud.upload(uploadDoc)

      const accountLabel =
        meta?.accountLabel ?? (await secureTokenStore.getAccountLabel(provider)) ?? provider

      await localDataStore.setSyncMeta({
        provider,
        accountLabel,
        lastSyncAt: new Date().toISOString(),
        lastSyncError: conflicts.length > 0
          ? `同期競合が ${conflicts.length} 件ありました（新しいデータを採用）`
          : null,
        pendingConflicts: conflicts.length,
      })

      if (conflicts.length > 0) {
        console.warn('[CloudSync] Conflicts resolved with LWW:', conflicts)
      }

      return { conflicts: conflicts.length }
    } catch (err) {
      const message = err instanceof SyncError ? err.message : '同期に失敗しました'
      const provider = await tokenManager.getConnectedProvider()
      if (provider) {
        const meta = await localDataStore.getSyncMeta()
        await localDataStore.setSyncMeta({
          provider,
          accountLabel: meta?.accountLabel ?? provider,
          lastSyncAt: meta?.lastSyncAt ?? null,
          lastSyncError: message,
          pendingConflicts: meta?.pendingConflicts ?? 0,
        })
      }
      throw err
    } finally {
      this.syncing = false
    }
  }

  startAutoSync(): void {
    this.stopAutoSync()
    this.autoSyncTimer = setInterval(() => {
      void this.sync().catch((e) => console.warn('[CloudSync] Auto sync failed:', e))
    }, AUTO_SYNC_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void this.sync().catch((e) => console.warn('[CloudSync] Visibility sync failed:', e))
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    ;(this as { _onVisible?: () => void })._onVisible = onVisible
  }

  stopAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }
    const handler = (this as { _onVisible?: () => void })._onVisible
    if (handler) {
      document.removeEventListener('visibilitychange', handler)
    }
  }

  async disconnect(): Promise<void> {
    this.stopAutoSync()
    const provider = await tokenManager.getConnectedProvider()
    if (provider) {
      await tokenManager.disconnect(provider)
    }
    accessTokenCache.clear()
  }
}

export const cloudSyncService = new CloudSyncService()
