import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloudSyncService } from '../../src/cloud/sync/sync-service'
import type { CloudSyncDocument } from '../../src/cloud/types'
import { emptyCloudDocument } from '../../src/cloud/sync/merge'

vi.mock('../../src/cloud/token/token-manager', () => ({
  tokenManager: {
    getConnectedProvider: vi.fn(async () => 'google-drive' as const),
    getAccessToken: vi.fn(async () => 'test-token'),
  },
}))

vi.mock('../../src/cloud/sync/local-data-store', () => ({
  localDataStore: {
    init: vi.fn(async () => undefined),
    getAllData: vi.fn(async () => ({
      events: [],
      costumes: [],
      usageHistory: [],
    })),
    bulkApply: vi.fn(async () => undefined),
    getSyncMeta: vi.fn(async () => null),
    setSyncMeta: vi.fn(async () => undefined),
  },
}))

describe('CloudSyncService', () => {
  it('throws when offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const service = new CloudSyncService()
    await expect(service.sync()).rejects.toMatchObject({ code: 'NETWORK_OFFLINE' })
  })
})

describe('emptyCloudDocument', () => {
  it('has valid empty shape', () => {
    const doc = emptyCloudDocument()
    expect(doc.records).toEqual([])
    expect(doc.version).toBe(1)
  })
})
