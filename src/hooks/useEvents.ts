import { useState, useEffect, useCallback } from 'react'
import { storage, Event } from '../utils/storage'

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initStorage = async () => {
      try {
        await storage.init()
        const allEvents = await storage.getAllEvents()
        setEvents(allEvents)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load events')
      } finally {
        setLoading(false)
      }
    }

    initStorage()
  }, [])

  const addEvent = useCallback(async (
    event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { id?: string },
  ) => {
    try {
      const newEvent: Event = {
        ...event,
        id: options?.id ?? `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await storage.addEvent(newEvent)
      setEvents(prev => [...prev, newEvent])
      return newEvent
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add event'
      setError(message)
      throw err
    }
  }, [])

  const updateEvent = useCallback(async (id: string, updates: Partial<Event>) => {
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
      await storage.updateEvent(updated)
      setEvents(prev => prev.map(e => e.id === id ? updated : e))
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event'
      setError(message)
      throw err
    }
  }, [])

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await storage.deleteEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event'
      setError(message)
      throw err
    }
  }, [])

  const getEvent = useCallback(async (id: string) => {
    try {
      return await storage.getEvent(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get event'
      setError(message)
      throw err
    }
  }, [])

  return {
    events,
    loading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    getEvent,
  }
}
