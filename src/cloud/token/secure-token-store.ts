import type { CloudProvider } from '../types'

const DB_NAME = 'CostumeCoordinatorSecure'
const DB_VERSION = 1
const STORE = 'oauth_refresh'
const DEVICE_KEY_ID = 'device_aes_key'

interface StoredRefreshToken {
  provider: CloudProvider
  ciphertext: string
  iv: string
  accountLabel: string
  updatedAt: string
}

/**
 * Refresh tokens in IndexedDB with AES-GCM (device-bound key).
 * Never uses localStorage.
 */
export class SecureTokenStore {
  private db: IDBDatabase | null = null
  private cryptoKey: CryptoKey | null = null

  async init(): Promise<void> {
    if (this.db) return
    this.db = await this.openDb()
    this.cryptoKey = await this.getOrCreateDeviceKey()
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result!)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'provider' })
        }
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'id' })
        }
      }
    })
  }

  private async getOrCreateDeviceKey(): Promise<CryptoKey> {
    const existing = await this.getRawKey()
    if (existing) {
      return crypto.subtle.importKey('raw', existing, 'AES-GCM', false, ['encrypt', 'decrypt'])
    }
    const raw = crypto.getRandomValues(new Uint8Array(32))
    await this.saveRawKey(raw)
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }

  private getRawKey(): Promise<ArrayBuffer | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['keys'], 'readonly')
      const req = tx.objectStore('keys').get(DEVICE_KEY_ID)
      req.onsuccess = () => resolve((req.result?.key as ArrayBuffer) ?? null)
      req.onerror = () => reject(req.error)
    })
  }

  private saveRawKey(raw: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['keys'], 'readwrite')
      const req = tx.objectStore('keys').put({ id: DEVICE_KEY_ID, key: raw.buffer })
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  private async encrypt(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plaintext)
    const cipher = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.cryptoKey!,
      encoded,
    )
    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipher))),
      iv: btoa(String.fromCharCode(...iv)),
    }
  }

  private async decrypt(ciphertext: string, iv: string): Promise<string> {
    const cipherBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0))
    const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      this.cryptoKey!,
      cipherBytes,
    )
    return new TextDecoder().decode(plain)
  }

  async saveRefreshToken(
    provider: CloudProvider,
    refreshToken: string,
    accountLabel: string,
  ): Promise<void> {
    await this.init()
    const { ciphertext, iv } = await this.encrypt(refreshToken)
    const record: StoredRefreshToken = {
      provider,
      ciphertext,
      iv,
      accountLabel,
      updatedAt: new Date().toISOString(),
    }
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE], 'readwrite')
      const req = tx.objectStore(STORE).put(record)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }

  async getRefreshToken(provider: CloudProvider): Promise<{
    refreshToken: string
    accountLabel: string
  } | null> {
    await this.init()
    const record = await new Promise<StoredRefreshToken | undefined>((resolve, reject) => {
      const tx = this.db!.transaction([STORE], 'readonly')
      const req = tx.objectStore(STORE).get(provider)
      req.onsuccess = () => resolve(req.result as StoredRefreshToken | undefined)
      req.onerror = () => reject(req.error)
    })
    if (!record) return null
    const refreshToken = await this.decrypt(record.ciphertext, record.iv)
    return { refreshToken, accountLabel: record.accountLabel }
  }

  async getConnectedProvider(): Promise<CloudProvider | null> {
    await this.init()
    const providers: CloudProvider[] = ['google-drive', 'dropbox']
    for (const p of providers) {
      const t = await this.getRefreshToken(p)
      if (t) return p
    }
    return null
  }

  async getAccountLabel(provider: CloudProvider): Promise<string | null> {
    const t = await this.getRefreshToken(provider)
    return t?.accountLabel ?? null
  }

  async clear(provider: CloudProvider): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE], 'readwrite')
      const req = tx.objectStore(STORE).delete(provider)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  }
}

export const secureTokenStore = new SecureTokenStore()
