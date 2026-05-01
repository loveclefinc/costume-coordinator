import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { storage, Costume } from '../utils/storage'
import { FirebaseSync } from '../services/firebaseSync'
import { DataMigration } from '../services/dataMigration'

export function useCostumesWithSync() {
  const { user } = useAuth()
  const [costumes, setCostumes] = useState<Costume[]>([])
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

        // Load costumes from Firebase (or local if not synced yet)
        const cloudCostumes = await sync.getAllCostumes()
        if (cloudCostumes.length > 0) {
          setCostumes(cloudCostumes)
        } else {
          const localCostumes = await storage.getAllCostumes()
          setCostumes(localCostumes)
        }

        // Subscribe to real-time updates
        const unsubscribe = sync.subscribeToCostumes((updatedCostumes) => {
          setCostumes(updatedCostumes)
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

  const addCostume = useCallback(
    async (costume: Omit<Costume, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newCostume: Costume = {
          ...costume,
          id: `costume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // Save to local storage
        await storage.addCostume(newCostume)

        // Save to Firebase if available
        if (firebaseSync) {
          await firebaseSync.saveCostume(newCostume)
        }

        setCostumes((prev) => [...prev, newCostume])
        return newCostume
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add costume'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const updateCostume = useCallback(
    async (id: string, updates: Partial<Costume>) => {
      try {
        const existing = await storage.getCostume(id)
        if (!existing) throw new Error('Costume not found')

        const updated: Costume = {
          ...existing,
          ...updates,
          id,
          createdAt: existing.createdAt,
          updatedAt: Date.now(),
        }

        // Update local storage
        await storage.updateCostume(updated)

        // Update Firebase if available
        if (firebaseSync) {
          await firebaseSync.saveCostume(updated)
        }

        setCostumes((prev) => prev.map((c) => (c.id === id ? updated : c)))
        return updated
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update costume'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const deleteCostume = useCallback(
    async (id: string) => {
      try {
        // Delete from local storage
        await storage.deleteCostume(id)

        // Delete from Firebase if available
        if (firebaseSync) {
          await firebaseSync.deleteCostume(id)
        }

        setCostumes((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete costume'
        setError(message)
        throw err
      }
    },
    [firebaseSync]
  )

  const getCostume = useCallback(
    async (id: string) => {
      try {
        return await storage.getCostume(id)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get costume'
        setError(message)
        throw err
      }
    },
    []
  )

  return {
    costumes,
    loading: loading || isSyncing,
    error,
    addCostume,
    updateCostume,
    deleteCostume,
    getCostume,
    isSyncing,
  }
}
