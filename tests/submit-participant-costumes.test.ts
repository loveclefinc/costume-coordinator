import { describe, expect, it, vi } from 'vitest'
import type { CostumeThemeMatch } from '../src/utils/costume-theme-match'
import { DEFAULT_UPLOAD_LIMITS } from '../shared/upload-limits'
import { submitPickedCostumesIdempotent } from '../src/utils/submit-participant-costumes'

const costumeMatch = (id: string, name: string): CostumeThemeMatch => ({
  costume: {
    id,
    name,
    image: 'data:image/jpeg;base64,abc',
    colors: ['blue'],
    tone: 'neutral',
    pattern: 'plain',
    season: [],
    createdAt: 1,
    updatedAt: 1,
  },
  score: 1,
  scorePercent: 100,
  reasons: [],
})

describe('submitPickedCostumesIdempotent', () => {
  it('reuses existing server costumes instead of creating duplicates', async () => {
    const createCostume = vi.fn()
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph1', viewUrl: 'https://x' })
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 0,
        submitted: false,
        costumes: [
          { id: 'cos_old1', name: '赤ドレス', photoCount: 0 },
          { id: 'cos_old2', name: '青スーツ', photoCount: 0 },
        ],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 2,
        submitted: true,
        costumes: [
          { id: 'cos_old1', name: '赤ドレス', photoCount: 1 },
          { id: 'cos_old2', name: '青スーツ', photoCount: 1 },
        ],
      })

    const count = await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('local1', '赤ドレス'), costumeMatch('local2', '青スーツ')],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']), contentType: 'image/jpeg' }),
      },
    )

    expect(createCostume).not.toHaveBeenCalled()
    expect(uploadPhoto).toHaveBeenCalledTimes(2)
    expect(count).toBe(2)
  })

  it('creates only missing costumes up to the server limit', async () => {
    const createCostume = vi.fn().mockResolvedValue({ costumeId: 'cos_new' })
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph1', viewUrl: 'https://x' })
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 0,
        photoCount: 0,
        submitted: false,
        costumes: [],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 1,
        photoCount: 1,
        submitted: true,
        costumes: [{ id: 'cos_new', name: '赤ドレス', photoCount: 1 }],
      })

    const count = await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('local1', '赤ドレス')],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']), contentType: 'image/jpeg' }),
      },
    )

    expect(createCostume).toHaveBeenCalledOnce()
    expect(createCostume).toHaveBeenCalledWith(
      'evt_1',
      'token',
      expect.objectContaining({ sourceCostumeId: 'local1', name: '赤ドレス' }),
    )
    expect(count).toBe(1)
  })

  it('uses the hidden source costume id before the display name', async () => {
    const createCostume = vi.fn()
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph1', viewUrl: 'https://x' })
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 1,
        submitted: false,
        costumes: [
          { id: 'cos_other', sourceCostumeId: 'local2', name: '同じ名前', photoCount: 1 },
          { id: 'cos_target', sourceCostumeId: 'local1', name: '同じ名前', photoCount: 0 },
        ],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 2,
        submitted: true,
        costumes: [],
      })

    await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('local1', '同じ名前')],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']), contentType: 'image/jpeg' }),
      },
    )

    expect(createCostume).not.toHaveBeenCalled()
    expect(uploadPhoto).toHaveBeenCalledWith(
      'evt_1',
      'cos_target',
      'token',
      expect.any(Blob),
      'image/jpeg',
    )
  })

  it('uploads photos to each server costume when multiple costumes have the same name', async () => {
    const createCostume = vi.fn()
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph1', viewUrl: 'https://x' })
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 0,
        submitted: false,
        costumes: [
          { id: 'cos_same1', name: '同じ名前', photoCount: 0 },
          { id: 'cos_same2', name: '同じ名前', photoCount: 0 },
        ],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 2,
        photoCount: 2,
        submitted: true,
        costumes: [
          { id: 'cos_same1', name: '同じ名前', photoCount: 1 },
          { id: 'cos_same2', name: '同じ名前', photoCount: 1 },
        ],
      })

    const count = await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('local1', '同じ名前'), costumeMatch('local2', '同じ名前')],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({ blob: new Blob(['x']), contentType: 'image/jpeg' }),
      },
    )

    expect(createCostume).not.toHaveBeenCalled()
    expect(uploadPhoto).toHaveBeenNthCalledWith(
      1,
      'evt_1',
      'cos_same1',
      'token',
      expect.any(Blob),
      'image/jpeg',
    )
    expect(uploadPhoto).toHaveBeenNthCalledWith(
      2,
      'evt_1',
      'cos_same2',
      'token',
      expect.any(Blob),
      'image/jpeg',
    )
    expect(count).toBe(2)
  })
})
