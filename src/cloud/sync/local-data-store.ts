import { storage, type Costume, type Event, type UsageHistory } from '../../utils/storage'
import { collectEventImportedCostumeIds, isPersonalWardrobeCostume } from '../../utils/costume-scope'
import type { SyncMeta } from '../types'

export class LocalDataStore {
  async init(): Promise<void> {
    await storage.init()
  }

  async getAllData(): Promise<{
    events: Event[]
    costumes: Costume[]
    usageHistory: UsageHistory[]
  }> {
    await storage.init()
    const [events, costumes, usageHistory] = await Promise.all([
      storage.getAllEvents(),
      storage.getPersonalCostumes(),
      storage.getAllUsageHistory(),
    ])
    return { events, costumes, usageHistory }
  }

  async bulkApply(
    events: Event[],
    costumes: Costume[],
    usageHistory: UsageHistory[],
  ): Promise<void> {
    await storage.init()
    const [existingEvents, existingCostumes] = await Promise.all([
      storage.getAllEvents(),
      storage.getAllCostumes(),
    ])

    const eventIds = new Set(events.map((e) => e.id))
    const costumeIds = new Set(costumes.map((c) => c.id))

    for (const e of existingEvents) {
      if (!eventIds.has(e.id)) await storage.deleteEvent(e.id)
    }
    for (const c of existingCostumes) {
      if (!costumeIds.has(c.id)) await storage.deleteCostume(c.id)
    }

    const importedIds = collectEventImportedCostumeIds(events)

    for (const e of events) {
      const existing = await storage.getEvent(e.id)
      if (existing) await storage.updateEvent(e)
      else await storage.addEvent(e)
    }
    for (const c of costumes) {
      if (!isPersonalWardrobeCostume(c, importedIds)) continue
      const existing = await storage.getCostume(c.id)
      if (existing) await storage.updateCostume(c)
      else await storage.addCostume(c)
    }
    for (const h of usageHistory) {
      try {
        await storage.addUsageHistory(h)
      } catch {
        /* duplicate */
      }
    }
  }

  async getSyncMeta(): Promise<SyncMeta | null> {
    await storage.init()
    const row = await storage.getSyncMeta()
    if (!row) return null
    const { id: _id, ...meta } = row
    return meta
  }

  async setSyncMeta(meta: SyncMeta): Promise<void> {
    await storage.init()
    await storage.setSyncMeta({
      ...meta,
      pendingConflicts: meta.pendingConflicts ?? 0,
    })
  }

  async clearSyncMeta(): Promise<void> {
    await storage.init()
    await storage.clearSyncMeta()
  }
}

export const localDataStore = new LocalDataStore()
