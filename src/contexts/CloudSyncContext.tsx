import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { CloudProvider, SyncStatus } from '../cloud/types'
import { cloudSyncService } from '../cloud/sync/sync-service'
import { startGoogleOAuth, startDropboxOAuth } from '../cloud/oauth/oauth-client'
import { tokenManager } from '../cloud/token/token-manager'
import { accessTokenCache } from '../cloud/token/access-token-cache'

type CloudSyncContextValue = {
  status: SyncStatus
  message: { type: 'success' | 'error'; text: string } | null
  setMessage: (m: { type: 'success' | 'error'; text: string } | null) => void
  refreshStatus: () => Promise<void>
  connectGoogle: () => Promise<void>
  connectDropbox: () => Promise<void>
  syncNow: () => Promise<void>
  logout: () => Promise<void>
}

const CloudSyncContext = createContext<CloudSyncContextValue | undefined>(undefined)

export function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    provider: null,
    accountLabel: null,
    lastSyncAt: null,
    lastError: null,
    syncing: false,
    pendingConflicts: 0,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  })
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const refreshStatus = useCallback(async () => {
    const s = await cloudSyncService.getStatus()
    setStatus(s)
  }, [])

  useEffect(() => {
    void refreshStatus()
    cloudSyncService.startAutoSync()

    const onOnline = () => {
      void refreshStatus()
      void cloudSyncService.sync().catch(() => undefined)
    }
    const onOffline = () => void refreshStatus()

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      cloudSyncService.stopAutoSync()
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [refreshStatus])

  const connectGoogle = async () => {
    try {
      await startGoogleOAuth()
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : '接続を開始できませんでした',
      })
    }
  }

  const connectDropbox = async () => {
    try {
      await startDropboxOAuth()
    } catch (e) {
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : '接続を開始できませんでした',
      })
    }
  }

  const syncNow = async () => {
    setMessage(null)
    try {
      const { conflicts } = await cloudSyncService.sync()
      await refreshStatus()
      if (conflicts > 0) {
        setMessage({
          type: 'error',
          text: `同期完了（競合 ${conflicts} 件は最新の更新を採用しました）`,
        })
      } else {
        setMessage({ type: 'success', text: '同期が完了しました' })
      }
    } catch (e) {
      await refreshStatus()
      setMessage({
        type: 'error',
        text: e instanceof Error ? e.message : '同期に失敗しました',
      })
    }
  }

  const logout = async () => {
    await cloudSyncService.disconnect()
    accessTokenCache.clear()
    setMessage({ type: 'success', text: 'ログアウトしました（クラウド接続を解除）' })
    await refreshStatus()
  }

  return (
    <CloudSyncContext.Provider
      value={{
        status,
        message,
        setMessage,
        refreshStatus,
        connectGoogle,
        connectDropbox,
        syncNow,
        logout,
      }}
    >
      {children}
    </CloudSyncContext.Provider>
  )
}

export function useCloudSync() {
  const ctx = useContext(CloudSyncContext)
  if (!ctx) {
    throw new Error('useCloudSync must be used within CloudSyncProvider')
  }
  return {
    ...ctx,
    disconnect: ctx.logout,
  }
}
