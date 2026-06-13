import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ensureLocalParticipantEvent } from '../src/utils/ensure-local-participant-event'

const storageMock = vi.hoisted(() => ({
  init: vi.fn(),
  getEvent: vi.fn(),
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
}))

vi.mock('../src/utils/storage', () => ({
  storage: storageMock,
}))

describe('ensureLocalParticipantEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.init.mockResolvedValue(undefined)
  })

  it('creates a new local event from public info', async () => {
    storageMock.getEvent.mockResolvedValue(undefined)
    storageMock.addEvent.mockResolvedValue('evt_1')

    const event = await ensureLocalParticipantEvent(
      {
        id: 'evt_1',
        name: '春コン',
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
      '太郎',
    )

    expect(storageMock.addEvent).toHaveBeenCalledOnce()
    expect(event.participants).toContain('太郎')
    expect(event.hostedOnServer).toBe(true)
  })

  it('updates existing event and adds participant', async () => {
    storageMock.getEvent.mockResolvedValue({
      id: 'evt_1',
      name: '旧名',
      date: '2026-01-01',
      description: '',
      participants: ['代表者'],
      costumes: {},
      createdAt: 1,
      updatedAt: 1,
    })
    storageMock.updateEvent.mockResolvedValue(undefined)

    const event = await ensureLocalParticipantEvent(
      {
        id: 'evt_1',
        name: '春コン',
        date: '2026-04-01',
        description: '更新',
        expiresAt: Date.now() + 86400000,
        uploadLimits: {
          maxPhotoBytes: 1,
          maxPhotosPerCostume: 1,
          maxCostumesPerParticipant: 3,
          maxEventStorageBytes: 1,
        },
      },
      '花子',
    )

    expect(storageMock.updateEvent).toHaveBeenCalledOnce()
    expect(event.participants).toEqual(expect.arrayContaining(['代表者', '花子']))
    expect(event.name).toBe('春コン')
  })
})
