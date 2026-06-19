import { describe, expect, it, vi, beforeEach } from 'vitest'
import { importAdminSnapshotToLocal } from '../src/event-server/import-from-server'
import type { EventAdminSnapshot } from '../shared/event-api-types'

const storageMock = vi.hoisted(() => ({
  init: vi.fn(),
  getEvent: vi.fn(),
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
    storageMock.updateEvent.mockResolvedValue(undefined)
  })

  it('stores imported costumes on the event record, not the personal wardrobe', async () => {
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
          photos: [
            {
              id: 'ph1',
              costumeId: 'cos_1',
              contentType: 'image/jpeg',
              sortOrder: 0,
              viewUrl: 'https://example.com/a.jpg',
            },
          ],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }

    const result = await importAdminSnapshotToLocal(snapshot, 'evt_1')

    expect(storageMock.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        importedCostumes: [
          expect.objectContaining({
            id: 'cos_1',
            sourceParticipantName: '花子',
            image: 'https://example.com/a.jpg',
          }),
        ],
      }),
    )
    expect(result.importedCostumes).toHaveLength(1)
    expect(result.importedCostumes[0].sourceEventId).toBeUndefined()
  })

  it('does not add an abandoned zero-costume join to the active participant list', async () => {
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
      participants: [{ id: 'ghost', displayName: '途中参加', submittedAt: null, costumeCount: 0 }],
      costumes: [],
    }

    await importAdminSnapshotToLocal(snapshot, 'evt_1')

    expect(storageMock.updateEvent).toHaveBeenCalledWith(
      expect.objectContaining({ participants: ['代表者'] }),
    )
  })
})
