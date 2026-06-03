import { useState, useEffect, useCallback } from 'react'
import { storage, Costume } from '../utils/storage'
import { normalizeCostume, normalizeCostumeList } from '../utils/costume-normalize'

export function useCostumes() {
  const [costumes, setCostumes] = useState<Costume[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize storage and load costumes
  useEffect(() => {
    const initStorage = async () => {
      try {
        await storage.init()
        const allCostumes = await storage.getAllCostumes()
        setCostumes(normalizeCostumeList(allCostumes))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load costumes')
      } finally {
        setLoading(false)
      }
    }

    initStorage()
  }, [])

  const addCostume = useCallback(async (costume: Omit<Costume, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCostume: Costume = normalizeCostume({
        ...costume,
        id: `costume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      await storage.addCostume(newCostume)
      setCostumes(prev => [...prev, newCostume])
      return newCostume
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add costume'
      setError(message)
      throw err
    }
  }, [])

  const updateCostume = useCallback(async (id: string, updates: Partial<Costume>) => {
    try {
      const existing = await storage.getCostume(id)
      if (!existing) throw new Error('Costume not found')

      const updated: Costume = normalizeCostume({
        ...existing,
        ...updates,
        id,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
      })
      await storage.updateCostume(updated)
      setCostumes(prev => prev.map(c => c.id === id ? updated : c))
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update costume'
      setError(message)
      throw err
    }
  }, [])

  const deleteCostume = useCallback(async (id: string) => {
    try {
      await storage.deleteCostume(id)
      setCostumes(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete costume'
      setError(message)
      throw err
    }
  }, [])

  const getCostume = useCallback(async (id: string) => {
    try {
      return await storage.getCostume(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get costume'
      setError(message)
      throw err
    }
  }, [])

  return {
    costumes,
    loading,
    error,
    addCostume,
    updateCostume,
    deleteCostume,
    getCostume,
  }
}
