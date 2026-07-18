import { describe, expect, it, vi } from 'vitest'
import type { CostumeThemeMatch } from '../src/utils/costume-theme-match'
import { DEFAULT_UPLOAD_LIMITS } from '../shared/upload-limits'
import { EventApiError } from '../src/event-server/client'
import { submitPickedCostumesIdempotent } from '../src/utils/submit-participant-costumes'

const createPruneAutoOutfitsMock = () => vi.fn().mockResolvedValue({
  deletedCostumeCount: 0,
  deletedPhotoCount: 0,
})

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

const autoOutfitMatch = (): CostumeThemeMatch => {
  const match = completeOutfitMatch()
  return {
    ...match,
    costume: {
      ...match.costume,
      id: 'favorite-outfit:auto-ownerhash-1',
      name: '自動提案スーツコーデ',
    },
  }
}

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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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
      {
        fetchStatus,
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
        createCostume,
        uploadPhoto,
        dataUrlToBlob,
      },
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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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
        pruneAutoOutfits: createPruneAutoOutfitsMock(),
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

  it('prunes stale auto outfits before applying capacity checks and uploading the active one', async () => {
    const pruneAutoOutfits = createPruneAutoOutfitsMock()
    const createCostume = vi.fn().mockResolvedValue({ costumeId: 'cos_active_auto' })
    const uploadPhoto = vi.fn().mockResolvedValue({ photoId: 'ph', viewUrl: 'https://x' })
    const stale = {
      id: 'cos_stale_auto',
      sourceCostumeId: 'favorite-outfit:auto-ownerhash-2',
      name: '古い自動提案',
      photoCount: 3,
    }
    const regular = [0, 1, 2, 3].map((index) => ({
      id: `cos_regular_${index}`,
      sourceCostumeId: `local-${index}`,
      name: `衣装${index}`,
      photoCount: 1,
    }))
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({
        participantId: 'p1', displayName: '太郎', costumeCount: 5, photoCount: 7,
        submitted: true, costumes: [...regular, stale],
      })
      .mockResolvedValueOnce({
        participantId: 'p1', displayName: '太郎', costumeCount: 4, photoCount: 4,
        submitted: true, costumes: regular,
      })
      .mockResolvedValueOnce({
        participantId: 'p1', displayName: '太郎', costumeCount: 5, photoCount: 7,
        submitted: true, costumes: regular,
      })

    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [autoOutfitMatch()],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        pruneAutoOutfits,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn().mockResolvedValue({
          blob: new Blob(['x']), contentType: 'image/jpeg',
        }),
      },
    )).resolves.toBe(1)

    expect(pruneAutoOutfits).toHaveBeenCalledWith('evt_1', 'token', {
      activeSourceCostumeIds: ['favorite-outfit:auto-ownerhash-1'],
    })
    expect(fetchStatus).toHaveBeenCalledTimes(3)
    expect(pruneAutoOutfits.mock.invocationCallOrder[0])
      .toBeLessThan(createCostume.mock.invocationCallOrder[0])
    expect(createCostume.mock.invocationCallOrder[0])
      .toBeLessThan(uploadPhoto.mock.invocationCallOrder[0])
  })

  it('stops before writes when stale auto cleanup requires a newer Worker', async () => {
    const pruneAutoOutfits = vi.fn().mockRejectedValue(new EventApiError(
      '自動提案コーデのオンライン提出にはイベントAPIの更新が必要です。',
      426,
    ))
    const createCostume = vi.fn()
    const uploadPhoto = vi.fn()
    const fetchStatus = vi.fn().mockResolvedValue({
      participantId: 'p1', displayName: '太郎', costumeCount: 1, photoCount: 3,
      submitted: true,
      costumes: [{
        id: 'cos_stale_auto',
        sourceCostumeId: 'favorite-outfit:auto-old-1',
        name: '古い自動提案',
        photoCount: 3,
      }],
    })

    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('dress-1', '単品ドレス')],
      DEFAULT_UPLOAD_LIMITS,
      {
        fetchStatus,
        pruneAutoOutfits,
        createCostume,
        uploadPhoto,
        dataUrlToBlob: vi.fn(),
      },
    )).rejects.toThrow(/イベントAPIの更新が必要/)

    expect(pruneAutoOutfits).toHaveBeenCalledWith('evt_1', 'token', {
      activeSourceCostumeIds: [],
    })
    expect(createCostume).not.toHaveBeenCalled()
    expect(uploadPhoto).not.toHaveBeenCalled()
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

    const compositePrune = createPruneAutoOutfitsMock()
    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [completeOutfitMatch()],
      oldWorkerLimits,
      {
        fetchStatus,
        pruneAutoOutfits: compositePrune,
        createCostume: vi.fn(),
        uploadPhoto: vi.fn(),
        dataUrlToBlob: vi.fn(),
      },
    )).rejects.toThrow(/複数アイテム/)
    expect(compositePrune).not.toHaveBeenCalled()

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

    const legacyPrune = createPruneAutoOutfitsMock()
    await expect(submitPickedCostumesIdempotent(
      'evt_1',
      'token',
      [costumeMatch('dress-1', '単品ドレス')],
      oldWorkerLimits,
      {
        fetchStatus,
        pruneAutoOutfits: legacyPrune,
        createCostume: legacyCreate,
        uploadPhoto: legacyUpload,
        dataUrlToBlob: vi.fn().mockResolvedValue({
          blob: new Blob(['x']), contentType: 'image/jpeg',
        }),
      },
    )).resolves.toBe(1)
    expect(legacyPrune).not.toHaveBeenCalled()
  })
})
