import type { Costume, Event, UsageHistory } from '../../utils/storage'
import type {
  CloudSyncDocument,
  MergeResult,
  SyncConflict,
  SyncRecord,
  SyncRecordType,
} from '../types'
import { SYNC_DOCUMENT_VERSION } from '../types'

export function localDataToRecords(
  events: Event[],
  costumes: Costume[],
  usageHistory: UsageHistory[],
): SyncRecord[] {
  const records: SyncRecord[] = []
  for (const e of events) {
    records.push({ id: e.id, type: 'event', updatedAt: e.updatedAt, data: e })
  }
  for (const c of costumes) {
    records.push({ id: c.id, type: 'costume', updatedAt: c.updatedAt, data: c })
  }
  for (const h of usageHistory) {
    records.push({ id: h.id, type: 'usageHistory', updatedAt: h.usedAt, data: h })
  }
  return records
}

export function recordsToLocalData(records: SyncRecord[]): {
  events: Event[]
  costumes: Costume[]
  usageHistory: UsageHistory[]
} {
  const events: Event[] = []
  const costumes: Costume[] = []
  const usageHistory: UsageHistory[] = []

  for (const r of records) {
    if (r.type === 'event') events.push(r.data as Event)
    else if (r.type === 'costume') costumes.push(r.data as Costume)
    else if (r.type === 'usageHistory') usageHistory.push(r.data as UsageHistory)
  }

  return { events, costumes, usageHistory }
}

function recordFingerprint(r: SyncRecord): string {
  return JSON.stringify({ type: r.type, data: r.data })
}

export function mergeRecords(
  local: SyncRecord[],
  remote: SyncRecord[],
  lastSyncAt: string | null,
): MergeResult {
  const map = new Map<string, SyncRecord>()
  const conflicts: SyncConflict[] = []
  const syncCutoff = lastSyncAt ? new Date(lastSyncAt).getTime() : 0

  const all = [...local, ...remote]
  for (const record of all) {
    const key = `${record.type}:${record.id}`
    const existing = map.get(key)

    if (!existing) {
      map.set(key, record)
      continue
    }

    const localRec = local.find((r) => r.type === record.type && r.id === record.id)
    const remoteRec = remote.find((r) => r.type === record.type && r.id === record.id)

    if (
      lastSyncAt &&
      localRec &&
      remoteRec &&
      localRec.updatedAt > syncCutoff &&
      remoteRec.updatedAt > syncCutoff &&
      recordFingerprint(localRec) !== recordFingerprint(remoteRec)
    ) {
      conflicts.push({
        recordId: record.id,
        type: record.type as SyncRecordType,
        localUpdatedAt: localRec.updatedAt,
        remoteUpdatedAt: remoteRec.updatedAt,
      })
    }

    const winner = existing.updatedAt >= record.updatedAt ? existing : record
    map.set(key, winner)
  }

  return { records: Array.from(map.values()), conflicts }
}

export function buildCloudDocument(records: SyncRecord[]): CloudSyncDocument {
  const maxUpdated = records.reduce((m, r) => Math.max(m, r.updatedAt), 0)
  return {
    version: SYNC_DOCUMENT_VERSION,
    updatedAt: new Date(maxUpdated || Date.now()).toISOString(),
    records,
  }
}

export function emptyCloudDocument(): CloudSyncDocument {
  return {
    version: SYNC_DOCUMENT_VERSION,
    updatedAt: new Date().toISOString(),
    records: [],
  }
}
