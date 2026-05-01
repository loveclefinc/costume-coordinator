import { db } from '../config/firebase'
import { ref, set, get, update, remove, onValue } from 'firebase/database'
import { Event, Costume } from '../utils/storage'

/**
 * Firebase Realtime Database sync service
 * Syncs events and costumes to cloud for multi-device access
 */

export class FirebaseSync {
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Events
  async saveEvent(event: Event): Promise<void> {
    const eventRef = ref(db, `users/${this.userId}/events/${event.id}`)
    await set(eventRef, {
      ...event,
      syncedAt: new Date().toISOString(),
    })
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const eventRef = ref(db, `users/${this.userId}/events/${eventId}`)
    const snapshot = await get(eventRef)
    return snapshot.val() || null
  }

  async getAllEvents(): Promise<Event[]> {
    const eventsRef = ref(db, `users/${this.userId}/events`)
    const snapshot = await get(eventsRef)
    const data = snapshot.val()
    return data ? Object.values(data) : []
  }

  async deleteEvent(eventId: string): Promise<void> {
    const eventRef = ref(db, `users/${this.userId}/events/${eventId}`)
    await remove(eventRef)
  }

  subscribeToEvents(callback: (events: Event[]) => void): () => void {
    const eventsRef = ref(db, `users/${this.userId}/events`)
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val()
      const events = data ? Object.values(data) : []
      callback(events as Event[])
    })
    return unsubscribe
  }

  // Costumes
  async saveCostume(costume: Costume): Promise<void> {
    const costumeRef = ref(db, `users/${this.userId}/costumes/${costume.id}`)
    await set(costumeRef, {
      ...costume,
      syncedAt: new Date().toISOString(),
    })
  }

  async getCostume(costumeId: string): Promise<Costume | null> {
    const costumeRef = ref(db, `users/${this.userId}/costumes/${costumeId}`)
    const snapshot = await get(costumeRef)
    return snapshot.val() || null
  }

  async getAllCostumes(): Promise<Costume[]> {
    const costumesRef = ref(db, `users/${this.userId}/costumes`)
    const snapshot = await get(costumesRef)
    const data = snapshot.val()
    return data ? Object.values(data) : []
  }

  async deleteCostume(costumeId: string): Promise<void> {
    const costumeRef = ref(db, `users/${this.userId}/costumes/${costumeId}`)
    await remove(costumeRef)
  }

  subscribeToCostumes(callback: (costumes: Costume[]) => void): () => void {
    const costumesRef = ref(db, `users/${this.userId}/costumes`)
    const unsubscribe = onValue(costumesRef, (snapshot) => {
      const data = snapshot.val()
      const costumes = data ? Object.values(data) : []
      callback(costumes as Costume[])
    })
    return unsubscribe
  }

  // Sync all data
  async syncAllData(events: Event[], costumes: Costume[]): Promise<void> {
    const userRef = ref(db, `users/${this.userId}`)
    await set(userRef, {
      events: events.reduce((acc, event) => {
        acc[event.id] = { ...event, syncedAt: new Date().toISOString() }
        return acc
      }, {} as Record<string, any>),
      costumes: costumes.reduce((acc, costume) => {
        acc[costume.id] = { ...costume, syncedAt: new Date().toISOString() }
        return acc
      }, {} as Record<string, any>),
      lastSyncAt: new Date().toISOString(),
    })
  }

  // Merge local and cloud data (for conflict resolution)
  async mergeData(localEvents: Event[], localCostumes: Costume[]): Promise<{ events: Event[]; costumes: Costume[] }> {
    const cloudEvents = await this.getAllEvents()
    const cloudCostumes = await this.getAllCostumes()

    // Simple merge strategy: newer data wins
    const mergedEvents = this.mergeArrays(localEvents, cloudEvents)
    const mergedCostumes = this.mergeArrays(localCostumes, cloudCostumes)

    return { events: mergedEvents, costumes: mergedCostumes }
  }

  private mergeArrays<T extends { id: string; updatedAt?: string }>(local: T[], cloud: T[]): T[] {
    const map = new Map<string, T>()

    // Add cloud data first
    cloud.forEach((item) => {
      map.set(item.id, item)
    })

    // Override with local data if newer
    local.forEach((item) => {
      const cloudItem = map.get(item.id)
      if (!cloudItem || (item.updatedAt && cloudItem.updatedAt && item.updatedAt > cloudItem.updatedAt)) {
        map.set(item.id, item)
      }
    })

    return Array.from(map.values())
  }
}
