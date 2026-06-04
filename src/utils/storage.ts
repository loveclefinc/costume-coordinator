// IndexedDB storage utility for PWA local persistence

const DB_NAME = 'CostumeCoordinator'
const DB_VERSION = 2

export interface Costume {
  id: string
  name: string
  image: string // Base64 encoded image
  colors: string[]
  tone: string // 'warm' | 'cool' | 'neutral'
  pattern: string // 'solid' | 'striped' | 'floral' | 'geometric' | 'other'
  season: string[] // ['spring', 'summer', 'autumn', 'winter']
  type?: string // 'dress' | 'suit' | 'shirt' | 'necktie' | 'bowtie' | 'accessory' | 'other'
  createdAt: number
  updatedAt: number
}

export interface EventThemePreferences {
  // Color unification strategy
  colorUnification: 'unified' | 'varied'
  
  // Color preferences (1st/2nd/3rd choice)
  colors1stChoice: string[]
  colors2ndChoice: string[]
  colors3rdChoice: string[]
  
  // Tone preferences (1st/2nd/3rd choice)
  tones1stChoice: string[]
  tones2ndChoice: string[]
  tones3rdChoice: string[]
  
  // Pattern preferences (1st/2nd/3rd choice)
  patterns1stChoice: string[]
  patterns2ndChoice: string[]
  patterns3rdChoice: string[]
  
  // Additional settings
  avoidSimilarColors: boolean
  recentUsageExcludeDays: number
}

export interface Event {
  id: string
  name: string
  date: string
  description: string
  participants: string[]
  costumes: { [participantId: string]: string } // participantId -> costumeId
  /** 参加者名 → 希望衣装 ID の順位 */
  participantPreferences?: Record<string, string[]>
  themePreferences?: EventThemePreferences // Optional for backward compatibility
  /** Cloudflare イベント API でホストしている場合 */
  hostedOnServer?: boolean
  serverExpiresAt?: number
  createdAt: number
  updatedAt: number
}

export interface UsageHistory {
  id: string
  costumeId: string
  eventId: string
  participantName: string
  usedAt: number
}

export interface SyncMetaRecord {
  id: 'default'
  provider: 'google-drive' | 'dropbox'
  accountLabel: string
  lastSyncAt: string | null
  lastSyncError: string | null
  pendingConflicts: number
}

class CostumeStorage {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create Costumes store
        if (!db.objectStoreNames.contains('costumes')) {
          const costumeStore = db.createObjectStore('costumes', { keyPath: 'id' })
          costumeStore.createIndex('name', 'name', { unique: false })
          costumeStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id' })
          eventStore.createIndex('date', 'date', { unique: false })
          eventStore.createIndex('createdAt', 'createdAt', { unique: false })
        }

        // Create Usage History store
        if (!db.objectStoreNames.contains('usageHistory')) {
          const historyStore = db.createObjectStore('usageHistory', { keyPath: 'id' })
          historyStore.createIndex('costumeId', 'costumeId', { unique: false })
          historyStore.createIndex('eventId', 'eventId', { unique: false })
          historyStore.createIndex('usedAt', 'usedAt', { unique: false })
        }

        // Cloud sync metadata (no secrets)
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'id' })
        }
      }
    })
  }

  // Costume operations
  async addCostume(costume: Costume): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes'], 'readwrite')
      const store = transaction.objectStore('costumes')
      const request = store.add(costume)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as string)
    })
  }

  async getCostume(id: string): Promise<Costume | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes'], 'readonly')
      const store = transaction.objectStore('costumes')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getAllCostumes(): Promise<Costume[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes'], 'readonly')
      const store = transaction.objectStore('costumes')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async updateCostume(costume: Costume): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes'], 'readwrite')
      const store = transaction.objectStore('costumes')
      const request = store.put(costume)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteCostume(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes'], 'readwrite')
      const store = transaction.objectStore('costumes')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Event operations
  async addEvent(event: Event): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite')
      const store = transaction.objectStore('events')
      const request = store.put(event)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(event.id)
    })
  }

  async getEvent(id: string): Promise<Event | undefined> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly')
      const store = transaction.objectStore('events')
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getAllEvents(): Promise<Event[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly')
      const store = transaction.objectStore('events')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async updateEvent(event: Event): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite')
      const store = transaction.objectStore('events')
      const request = store.put(event)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite')
      const store = transaction.objectStore('events')
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Usage History operations
  async addUsageHistory(history: UsageHistory): Promise<string> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usageHistory'], 'readwrite')
      const store = transaction.objectStore('usageHistory')
      const request = store.add(history)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result as string)
    })
  }

  async getUsageHistoryByCostume(costumeId: string): Promise<UsageHistory[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usageHistory'], 'readonly')
      const store = transaction.objectStore('usageHistory')
      const index = store.index('costumeId')
      const request = index.getAll(costumeId)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getAllUsageHistory(): Promise<UsageHistory[]> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usageHistory'], 'readonly')
      const store = transaction.objectStore('usageHistory')
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getRecentUsageHistory(days: number = 30): Promise<UsageHistory[]> {
    if (!this.db) throw new Error('Database not initialized')

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['usageHistory'], 'readonly')
      const store = transaction.objectStore('usageHistory')
      const index = store.index('usedAt')
      const range = IDBKeyRange.lowerBound(cutoffTime)
      const request = index.getAll(range)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async getSyncMeta(): Promise<SyncMetaRecord | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMeta'], 'readonly')
      const store = transaction.objectStore('syncMeta')
      const request = store.get('default')

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result ?? null)
    })
  }

  async setSyncMeta(meta: Omit<SyncMetaRecord, 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMeta'], 'readwrite')
      const store = transaction.objectStore('syncMeta')
      const request = store.put({ id: 'default' as const, ...meta })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearSyncMeta(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['syncMeta'], 'readwrite')
      const request = transaction.objectStore('syncMeta').delete('default')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['costumes', 'events', 'usageHistory'], 'readwrite')

      transaction.objectStore('costumes').clear()
      transaction.objectStore('events').clear()
      transaction.objectStore('usageHistory').clear()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => resolve()
    })
  }
}

// Export singleton instance
export const storage = new CostumeStorage()
