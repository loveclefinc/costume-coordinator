import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { storage, Event } from '../utils/storage'
import { FirebaseSync } from '../services/firebaseSync'
import { DataMigration } from '../services/dataMigration'

export function useEventsWithSync() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firebaseSync, setFirebaseSync] = useState<FirebaseSync | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Initialize storage and Firebase sync
  useEffect(() => {
    const initSync = async () => {
      try {
        if (!user?.uid) {
          throw new Error('User not authenticated')
        }

        // Initialize local storage
        await storage.init()

        // Initialize Firebase sync
        const sync = new FirebaseSync(user.uid)
        setFirebaseSync(sync)

        // Check if migration is needed
        const migration = new DataMigration(user.uid)
        const needsMigration = await migration.isMigrationNeeded()

        if (needsMigration) {
          setIsSyncing(true)
          await migration.migrateAllData()
          setIsSyncing(false)
        }

        // Load events from Firebase (or local if not synced yet)
        const cloudEvents = await sync.getAllEvents()
        if (cloudEvents.length > 0) {
          setEvents(cloudEvents)
        } else {
          const localEvents = await storage.getAllEvents()
          setEvents(localEvents)
        }

        // Subscribe to real-time updates
        const unsubscribe = sync.subscribeToEvents((updatedEvents) => {
          setEvents(updatedEvents)
        })

        return unsubscribe
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize sync')
      } finally {
        setLoading(false)
      }
    }

    const unsubscribe = initSync()
    return () => {
      unsubscribe?.then((unsub) => unsub?.())
    }
  }, [user])

  const addEvent = useCallback(
    async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newEvent: Event = {
          ...event,
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // Save to local storage
        await storage.addEvent(newEvent)

        // Save to Firebase if available
        if (firebaseSync) {
          await firebaseSync.saveEvent(newEvent)
        }

        setEvents((prev) => [...prev, newEvent])
        return newEvent
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add event'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const updateEvent = useCallback(
    async (id: string, updates: Partial<Event>) => {
      try {
        const existing = await storage.getEvent(id)
        if (!existing) throw new Error('Event not found')

        const updated: Event = {
          ...existing,
          ...updates,
          id,
          createdAt: existing.createdAt,
          updatedAt: Date.now(),
        }

        // Update local storage
        await storage.updateEvent(updated)

        // Update Firebase if available
        if (firebaseSync) {
          await firebaseSync.saveEvent(updated)
        }

        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update event'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const deleteEvent = useCallback(
    async (id: string) => {
      try {
        // Delete from local storage
        await storage.deleteEvent(id)

        // Delete from Firebase if available
        if (firebaseSync) {
          await firebaseSync.deleteEvent(id)
        }

        setEvents((prev) => prev.filter((e) => e.id !== id))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete event'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const getEvent = useCallback(
    async (id: string) => {
      try {
        return await storage.getEvent(id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get event'
        setError(message)
        throw err
      }
    },
    []
  )

  return {
    events,
    loading: loading || isSyncing,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
    isSyncing,
  }
}
