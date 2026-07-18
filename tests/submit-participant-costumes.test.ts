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

const completeOutfitMatch = (): CostumeThemeMatch => ({
  ...costumeMatch('favorite-outfit:formal-set', '本番スーツコーデ'),
  costume: {
    ...costumeMatch('favorite-outfit:formal-set', '本番スーツコーデ').costume,
    image: 'data:image/jpeg;base64,suit',
    wearingPhotos: [
      'data:image/jpeg;base64,shirt',
      'data:image/jpeg;base64,tie',
    ],
    type: 'suit',
    componentCostumeIds: ['suit-1', 'shirt-1', 'tie-1'],
    componentCostumeNames: ['紺スーツ', '白シャツ', '赤ネクタイ'],
  },
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

  it('resumes a complete outfit by uploading only its missing component photos', async () => {
    const createCostume = vi.fn().mockResolvedValue({
      costumeId: 'cos_outfit',
      photosReset: false,
    })
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph', viewUrl: 'https://x' })
    const dataUrlToBlob = vi.fn().mockResolvedValue({
      blob: new Blob(['x']),
      contentType: 'image/jpeg',
    })
    const components = [
      { sourceCostumeId: 'suit-1', name: '紺スーツ', type: 'suit', photoUploaded: true },
      { sourceCostumeId: 'shirt-1', name: '白シャツ', photoUploaded: false },
      { sourceCostumeId: 'tie-1', name: '赤ネクタイ', photoUploaded: false },
    ]
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 1,
        photoCount: 1,
        submitted: false,
        costumes: [{
          id: 'cos_outfit',
          sourceCostumeId: 'favorite-outfit:formal-set',
          name: '本番スーツコーデ',
          photoCount: 1,
          components,
        }],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 1,
        photoCount: 3,
        submitted: true,
        costumes: [{
          id: 'cos_outfit',
          sourceCostumeId: 'favorite-outfit:formal-set',
          name: '本番スーツコーデ',
          photoCount: 3,
          components: components.map((component) => ({ ...component, photoUploaded: true })),
        }],
      })

    const count = await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [completeOutfitMatch()],
      DEFAULT_UPLOAD_LIMITS,
      { fetchStatus, createCostume, uploadPhoto, dataUrlToBlob },
    )

    expect(createCostume).toHaveBeenCalledOnce()
    expect(dataUrlToBlob).toHaveBeenNthCalledWith(1, 'data:image/jpeg;base64,shirt')
    expect(dataUrlToBlob).toHaveBeenNthCalledWith(2, 'data:image/jpeg;base64,tie')
    expect(uploadPhoto).toHaveBeenNthCalledWith(
      1,
      'evt_1',
      'cos_outfit',
      'token',
      expect.any(Blob),
      'image/jpeg',
      1,
    )
    expect(uploadPhoto).toHaveBeenNthCalledWith(
      2,
      'evt_1',
      'cos_outfit',
      'token',
      expect.any(Blob),
      'image/jpeg',
      2,
    )
    expect(count).toBe(1)
  })

  it('reuploads every component after the Worker resets edited outfit metadata', async () => {
    const createCostume = vi.fn().mockResolvedValue({
      costumeId: 'cos_outfit',
      photosReset: true,
    })
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph', viewUrl: 'https://x' })
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 1,
        photoCount: 3,
        submitted: true,
        costumes: [{
          id: 'cos_outfit',
          sourceCostumeId: 'favorite-outfit:formal-set',
          name: '変更前の名前',
          photoCount: 3,
          components: [
            { sourceCostumeId: 'suit-1', name: '紺スーツ', photoUploaded: true },
            { sourceCostumeId: 'shirt-1', name: '白シャツ', photoUploaded: true },
            { sourceCostumeId: 'tie-1', name: '赤ネクタイ', photoUploaded: true },
          ],
        }],
      })
      .mockResolvedValueOnce({
        participantId: 'p1',
        displayName: '太郎',
        costumeCount: 1,
        photoCount: 3,
        submitted: true,
        costumes: [],
      })

    await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [completeOutfitMatch()],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({
          blob: new Blob(['x']),
          contentType: 'image/jpeg',
        }),
      },
    )

    expect(uploadPhoto).toHaveBeenCalledTimes(3)
    expect(uploadPhoto.mock.calls.map((call) => call[5])).toEqual([0, 1, 2])
  })

  it('creates one server candidate and three ordered photo slots for a complete outfit', async () => {
    const createCostume = vi.fn().mockResolvedValue({ costumeId: 'cos_outfit' })
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph', viewUrl: 'https://x' })
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
        photoCount: 3,
        submitted: true,
        costumes: [],
      })

    await submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [completeOutfitMatch()],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({
          blob: new Blob(['x']),
          contentType: 'image/jpeg',
        }),
      },
    )

    expect(createCostume).toHaveBeenCalledWith(
      'evt_1',
      'token',
      expect.objectContaining({
        sourceCostumeId: 'favorite-outfit:formal-set',
        components: [
          { sourceCostumeId: 'suit-1', name: '紺スーツ', type: 'suit', revision: 1 },
          { sourceCostumeId: 'shirt-1', name: '白シャツ', revision: 1 },
          { sourceCostumeId: 'tie-1', name: '赤ネクタイ', revision: 1 },
        ],
      }),
    )
    expect(uploadPhoto).toHaveBeenCalledTimes(3)
    expect(uploadPhoto.mock.calls.map((call) => call[5])).toEqual([0, 1, 2])
  })

  it('keeps legacy online submission usable when the Worker has no outfit capability', async () => {
    const oldWorkerLimits = { ...DEFAULT_UPLOAD_LIMITS, maxOutfitComponents: undefined }
    const fetchStatus = vi.fn().mockResolvedValue({
      participantId: 'p1',
      displayName: '太郎',
      costumeCount: 0,
      photoCount: 0,
      submitted: false,
      costumes: [],
    })

    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [completeOutfitMatch()],
      oldWorkerLimits,
      {
        fetchStatus,
        createCostume: vi.fn(),
        uploadPhoto: vi.fn(),
        dataUrlToBlob: vi.fn(),
      },
    )).rejects.toThrow(/複数アイテム/)

    const legacyCreate = vi.fn().mockResolvedValue({ costumeId: 'cos_single' })
    const legacyUpload = vi.fn().mockResolvedValue({ photoId: 'ph', viewUrl: 'https://x' })
    fetchStatus
      .mockResolvedValueOnce({
        participantId: 'p1', displayName: '太郎', costumeCount: 0, photoCount: 0,
        submitted: false, costumes: [],
      })
      .mockResolvedValueOnce({
        participantId: 'p1', displayName: '太郎', costumeCount: 1, photoCount: 1,
        submitted: true, costumes: [],
      })

    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('dress-1', '単品ドレス')],
      oldWorkerLimits,
      {
        fetchStatus,
        createCostume: legacyCreate,
        uploadPhoto: legacyUpload,
        dataUrlToBlob: vi.fn().mockResolvedValue({
          blob: new Blob(['x']), contentType: 'image/jpeg',
        }),
      },
    )).resolves.toBe(1)
  })
})
