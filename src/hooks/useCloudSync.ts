import { useCallback, useEffect, useState } from 'react'
import type { CloudProvider, SyncStatus } from '../cloud/types'
import { cloudSyncService } from '../cloud/sync/sync-service'
import { startGoogleOAuth, startDropboxOAuth } from '../cloud/oauth/oauth-client'
import { tokenManager } from '../cloud/token/token-manager'
import { secureTokenStore } from '../cloud/token/secure-token-store'
import { accessTokenCache } from '../cloud/token/access-token-cache'
import { localDataStore } from '../cloud/sync/local-data-store'

export function useCloudSync() {
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    provider: null,
    accountLabel: null,
    lastSyncAt: null,
    lastError: null,
    syncing: false,
    pendingConflicts: 0,
    online: navigator.onLine,
  })
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', () => void refreshStatus())

    return () => {
      cloudSyncService.stopAutoSync()
      window.removeEventListener('online', onOnline)
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

  const disconnect = async () => {
    const provider = await tokenManager.getConnectedProvider()
    if (provider) {
      await tokenManager.disconnect(provider)
      accessTokenCache.clear()
    }
    cloudSyncService.stopAutoSync()
    setMessage({ type: 'success', text: 'クラウド接続を解除しました' })
    await refreshStatus()
  }

  return {
    status,
    message,
    setMessage,
    refreshStatus,
    connectGoogle,
    connectDropbox,
    syncNow,
    disconnect,
  }
}

export async function completeOAuthCallback(
  provider: CloudProvider,
  code: string,
  codeVerifier: string,
): Promise<void> {
  const {
    exchangeGoogleCode,
    exchangeDropboxCode,
  } = await import('../cloud/oauth/oauth-client')

  const pair =
    provider === 'google-drive'
      ? await exchangeGoogleCode(code, codeVerifier)
      : await exchangeDropboxCode(code, codeVerifier)

  const other: CloudProvider = provider === 'dropbox' ? 'google-drive' : 'dropbox'
  await secureTokenStore.clear(other)
  accessTokenCache.clear(other)

  if (pair.refreshToken) {
    await secureTokenStore.saveRefreshToken(provider, pair.refreshToken, pair.accountLabel)
  }
  tokenManager.cacheAccessToken(provider, pair)

  await localDataStore.setSyncMeta({
    provider,
    accountLabel: pair.accountLabel,
    lastSyncAt: null,
    lastSyncError: null,
    pendingConflicts: 0,
  })

  cloudSyncService.startAutoSync()
  await cloudSyncService.sync()
}
