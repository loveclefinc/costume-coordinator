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

  it('imports a complete outfit as one optimizer candidate with ordered component photos', async () => {
    const snapshot: EventAdminSnapshot = {
      event: {
        id: 'evt_1',
        name: 'テスト',
        date: '2026-04-01',
        description: '',
        expiresAt: Date.now() + 86400000,
        uploadLimits: {
          maxPhotoBytes: 1,
          maxPhotosPerCostume: 3,
          maxCostumesPerParticipant: 3,
          maxEventStorageBytes: 1,
          maxOutfitComponents: 3,
        },
      },
      participants: [{
        id: 'p1',
        displayName: '花子',
        submittedAt: 1,
        costumeCount: 1,
        photoCount: 3,
      }],
      costumes: [{
        id: 'cos_outfit',
        participantId: 'p1',
        participantName: '花子',
        name: 'ネイビー本番コーデ',
        colors: ['navy', 'white', 'red'],
        tone: 'dark',
        pattern: 'dot',
        season: [],
        type: 'suit',
        components: [
          { sourceCostumeId: 'suit-1', name: '紺スーツ', type: 'suit' },
          { sourceCostumeId: 'shirt-1', name: '白シャツ', type: 'shirt' },
          { sourceCostumeId: 'tie-1', name: '赤ネクタイ', type: 'necktie' },
        ],
        preferences: [],
        photos: [
          {
            id: 'ph-tie', costumeId: 'cos_outfit', contentType: 'image/jpeg',
            sortOrder: 2, viewUrl: 'https://example.com/tie.jpg',
          },
          {
            id: 'ph-suit', costumeId: 'cos_outfit', contentType: 'image/jpeg',
            sortOrder: 0, viewUrl: 'https://example.com/suit.jpg',
          },
          {
            id: 'ph-shirt', costumeId: 'cos_outfit', contentType: 'image/jpeg',
            sortOrder: 1, viewUrl: 'https://example.com/shirt.jpg',
          },
        ],
        createdAt: 1,
        updatedAt: 2,
      }],
    }

    const result = await importAdminSnapshotToLocal(snapshot, 'evt_1')

    expect(result.importedCostumes).toHaveLength(1)
    expect(result.importedCostumes[0]).toEqual(expect.objectContaining({
      id: 'cos_outfit',
      image: 'https://example.com/suit.jpg',
      wearingPhotos: [
        'https://example.com/shirt.jpg',
        'https://example.com/tie.jpg',
      ],
      componentCostumeIds: ['suit-1', 'shirt-1', 'tie-1'],
      componentCostumeNames: ['紺スーツ', '白シャツ', '赤ネクタイ'],
    }))
  })

  it('does not import an incomplete complete-outfit candidate', async () => {
    const snapshot: EventAdminSnapshot = {
      event: {
        id: 'evt_1', name: 'テスト', date: '2026-04-01', description: '',
        expiresAt: Date.now() + 86400000,
        uploadLimits: {
          maxPhotoBytes: 1, maxPhotosPerCostume: 3,
          maxCostumesPerParticipant: 3, maxEventStorageBytes: 1,
          maxOutfitComponents: 3,
        },
      },
      participants: [{ id: 'p1', displayName: '花子', submittedAt: null, costumeCount: 1 }],
      costumes: [{
        id: 'cos_partial', participantId: 'p1', participantName: '花子',
        name: '途中コーデ', colors: ['navy'], tone: 'dark', pattern: 'plain',
        season: [], preferences: [],
        components: [
          { sourceCostumeId: 'suit-1', name: '紺スーツ' },
          { sourceCostumeId: 'shirt-1', name: '白シャツ' },
        ],
        photos: [{
          id: 'ph-suit', costumeId: 'cos_partial', contentType: 'image/jpeg',
          sortOrder: 0, viewUrl: 'https://example.com/suit.jpg',
        }],
        createdAt: 1, updatedAt: 1,
      }],
    }

    const result = await importAdminSnapshotToLocal(snapshot, 'evt_1')

    expect(result.importedCostumes).toEqual([])
  })
})
