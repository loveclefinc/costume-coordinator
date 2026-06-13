import { beforeEach, describe, expect, it, vi } from 'vitest'

const MockEventApiError = vi.hoisted(
  () =>
    class extends Error {
      status: number
      constructor(message: string, status: number) {
        super(message)
        this.name = 'EventApiError'
        this.status = status
      }
    },
)

const storageMock = vi.hoisted(() => ({
  init: vi.fn(),
  getEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getAllEvents: vi.fn(),
}))

const sessionMock = vi.hoisted(() => ({
  clearEventParticipantSession: vi.fn(),
  clearEventSession: vi.fn(),
  getEventSession: vi.fn(),
  isParticipantDeviceEvent: vi.fn(),
}))

const fetchEventPublicMock = vi.hoisted(() => vi.fn())

vi.mock('../src/utils/storage', () => ({
  storage: storageMock,
}))

vi.mock('../src/event-server/session', () => sessionMock)

vi.mock('../src/event-server/config', () => ({
  isEventServerEnabled: vi.fn(() => true),
}))

vi.mock('../src/event-server/client', () => ({
  fetchEventPublic: fetchEventPublicMock,
  EventApiError: MockEventApiError,
}))

vi.mock('../src/utils/ensure-local-participant-event', () => ({
  notifyEventsChanged: vi.fn(),
}))

import { cancelLocalParticipation } from '../src/utils/cancel-participation'
import { pruneRemovedParticipantEvents } from '../src/utils/prune-participant-events'
import { notifyEventsChanged } from '../src/utils/ensure-local-participant-event'

describe('participant event lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.init.mockResolvedValue(undefined)
    storageMock.getEvent.mockResolvedValue({ id: 'evt_1' })
    storageMock.deleteEvent.mockResolvedValue(undefined)
    storageMock.getAllEvents.mockResolvedValue([{ id: 'evt_1' }])
    sessionMock.isParticipantDeviceEvent.mockReturnValue(true)
    sessionMock.getEventSession.mockReturnValue({ inviteToken: 'invite' })
  })

  it('cancelLocalParticipation clears session and removes local event', async () => {
    await cancelLocalParticipation('evt_1')

    expect(sessionMock.clearEventParticipantSession).toHaveBeenCalledWith('evt_1')
    expect(storageMock.deleteEvent).toHaveBeenCalledWith('evt_1')
    expect(notifyEventsChanged).toHaveBeenCalledOnce()
  })

  it('pruneRemovedParticipantEvents removes local copy when server returns 404', async () => {
    fetchEventPublicMock.mockRejectedValue(new MockEventApiError('not found', 404))

    const removed = await pruneRemovedParticipantEvents()

    expect(removed).toBe(1)
    expect(storageMock.deleteEvent).toHaveBeenCalledWith('evt_1')
    expect(sessionMock.clearEventSession).toHaveBeenCalledWith('evt_1')
    expect(notifyEventsChanged).toHaveBeenCalledOnce()
  })
})
