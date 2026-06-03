import type { CloudProvider } from '../types'

interface CachedAccessToken {
  accessToken: string
  expiresAt: number
}

/**
 * In-memory only — never persisted (per security requirements).
 */
export class AccessTokenCache {
  private cache = new Map<CloudProvider, CachedAccessToken>()

  set(provider: CloudProvider, accessToken: string, expiresAt: number): void {
    this.cache.set(provider, { accessToken, expiresAt })
  }

  get(provider: CloudProvider): string | null {
    const entry = this.cache.get(provider)
    if (!entry) return null
    if (Date.now() >= entry.expiresAt - 60_000) {
      this.cache.delete(provider)
      return null
    }
    return entry.accessToken
  }

  clear(provider?: CloudProvider): void {
    if (provider) {
      this.cache.delete(provider)
    } else {
      this.cache.clear()
    }
  }
}

export const accessTokenCache = new AccessTokenCache()
