export { useCloudSync } from '../contexts/CloudSyncContext'

import type { CloudProvider } from '../cloud/types'
import { secureTokenStore } from '../cloud/token/secure-token-store'
import { accessTokenCache } from '../cloud/token/access-token-cache'
import { tokenManager } from '../cloud/token/token-manager'
import { localDataStore } from '../cloud/sync/local-data-store'
import { cloudSyncService } from '../cloud/sync/sync-service'

export async function completeOAuthCallback(
  provider: CloudProvider,
  code: string,
  codeVerifier: string,
): Promise<void> {
  const { exchangeGoogleCode, exchangeDropboxCode } = await import(
    '../cloud/oauth/oauth-client'
  )

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
