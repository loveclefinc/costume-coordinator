import type { CloudProvider, TokenPair } from '../types'
import { SyncError } from '../types'
import { accessTokenCache } from './access-token-cache'
import { secureTokenStore } from './secure-token-store'
import {
  refreshDropboxToken,
  refreshGoogleToken,
  assertOnline,
} from '../oauth/oauth-client'

export class TokenManager {
  async getAccessToken(provider: CloudProvider): Promise<string> {
    assertOnline()
    const cached = accessTokenCache.get(provider)
    if (cached) return cached

    const stored = await secureTokenStore.getRefreshToken(provider)
    if (!stored?.refreshToken) {
      throw new SyncError('クラウドに接続されていません。', 'NOT_CONNECTED')
    }

    const pair = await this.refresh(provider, stored.refreshToken)
    accessTokenCache.set(provider, pair.accessToken, pair.expiresAt)
    if (pair.refreshToken && pair.refreshToken !== stored.refreshToken) {
      await secureTokenStore.saveRefreshToken(
        provider,
        pair.refreshToken,
        stored.accountLabel,
      )
    }
    return pair.accessToken
  }

  private async refresh(provider: CloudProvider, refreshToken: string): Promise<TokenPair> {
    if (provider === 'google-drive') {
      return refreshGoogleToken(refreshToken)
    }
    return refreshDropboxToken(refreshToken)
  }

  cacheAccessToken(provider: CloudProvider, pair: TokenPair): void {
    accessTokenCache.set(provider, pair.accessToken, pair.expiresAt)
  }

  async disconnect(provider: CloudProvider): Promise<void> {
    accessTokenCache.clear(provider)
    await secureTokenStore.clear(provider)
  }

  async getConnectedProvider(): Promise<CloudProvider | null> {
    return secureTokenStore.getConnectedProvider()
  }
}

export const tokenManager = new TokenManager()
