import { useState, useEffect, useCallback } from 'react'
import { storage, Event } from '../utils/storage'
import { EVENTS_CHANGED_EVENT } from '../utils/ensure-local-participant-event'
import { pruneRemovedParticipantEvents } from '../utils/prune-participant-events'

async function loadAllEvents(): Promise<Event[]> {
  await storage.init()
  await pruneRemovedParticipantEvents()
  const allEvents = await storage.getAllEvents()
  const migrated: Event[] = []
  for (const ev of allEvents) {
    if (ev.participants.length === 0) {
      const fixed: Event = {
        ...ev,
        participants: ['代表者'],
        updatedAt: Date.now(),
      }
      await storage.updateEvent(fixed)
      migrated.push(fixed)
    } else {
      migrated.push(ev)
    }
  }
  return migrated
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reloadEvents = useCallback(async () => {
    try {
      const migrated = await loadAllEvents()
      setEvents(migrated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    }
  }, [])

  useEffect(() => {
    void reloadEvents().finally(() => setLoading(false))
  }, [reloadEvents])

  useEffect(() => {
    const onChanged = () => {
      void reloadEvents()
    }
    window.addEventListener(EVENTS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(EVENTS_CHANGED_EVENT, onChanged)
  }, [reloadEvents])

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
    reloadEvents,
  }
}
