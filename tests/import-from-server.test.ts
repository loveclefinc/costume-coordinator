import { describe, expect, it, vi, beforeEach } from 'vitest'
import { importAdminSnapshotToLocal } from '../src/event-server/import-from-server'
import type { EventAdminSnapshot } from '../shared/event-api-types'

const storageMock = vi.hoisted(() => ({
  init: vi.fn(),
  getEvent: vi.fn(),
  getCostume: vi.fn(),
  addCostume: vi.fn(),
  updateCostume: vi.fn(),
  updateEvent: vi.fn(),
}))

vi.mock('../src/utils/storage', () => ({
  storage: storageMock,
}))

describe('importAdminSnapshotToLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.init.mockResolvedValue(undefined)
    storageMock.getEvent.mockResolvedValue({
      id: 'evt_1',
      participants: ['代表者'],
      costumes: {},
    })
    storageMock.getCostume.mockResolvedValue(undefined)
    storageMock.addCostume.mockResolvedValue(undefined)
    storageMock.updateEvent.mockResolvedValue(undefined)
  })

  it('tags imported costumes as event-scoped, not personal wardrobe', async () => {
    const snapshot: EventAdminSnapshot = {
      event: {
        id: 'evt_1',
        name: 'テスト',
        date: '2026-04-01',
        description: '',
        expiresAt: Date.now() + 86400000,
        uploadLimits: {
          maxPhotoBytes: 1,
          maxPhotosPerCostume: 1,
          maxCostumesPerParticipant: 3,
          maxEventStorageBytes: 1,
        },
      },
      participants: [{ id: 'p1', displayName: '花子', submittedAt: 1, costumeCount: 1 }],
      costumes: [
        {
          id: 'cos_1',
          participantId: 'p1',
          participantName: '花子',
          name: '赤ドレス',
          colors: ['red'],
          tone: 'vivid',
          pattern: 'plain',
          season: [],
          preferences: [],
          photos: [{ id: 'ph1', costumeId: 'cos_1', contentType: 'image/jpeg', sortOrder: 0, viewUrl: 'https://example.com/a.jpg' }],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }

    await importAdminSnapshotToLocal(snapshot, 'evt_1')

    expect(storageMock.addCostume).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cos_1',
        sourceEventId: 'evt_1',
        sourceParticipantName: '花子',
      }),
    )
  })
})
