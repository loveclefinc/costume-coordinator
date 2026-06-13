import { describe, it, expect, vi } from 'vitest'
import type { Costume, Event } from '../src/utils/storage'
import {
  createEventInviteBundle,
  createParticipantSubmissionBundle,
  importEventInvite,
  importParticipantSubmission,
  parseCollaborationBundle,
} from '../src/utils/collaboration-bundle'

const baseEvent: Event = {
  id: 'evt_1',
  name: 'Test Live',
  date: '2026-06-01',
  description: '',
  participants: ['Alice'],
  costumes: {},
  participantPreferences: {},
  createdAt: 1,
  updatedAt: 1,
}

const costume: Costume = {
  id: 'c_1',
  name: 'Red dress',
  image: 'data:image/png;base64,x',
  colors: ['#E53935', 'red'],
  tone: 'vivid',
  pattern: 'plain',
  season: [],
  createdAt: 1,
  updatedAt: 1,
}

describe('collaboration-bundle', () => {
  it('parses event-invite JSON', () => {
    const bundle = createEventInviteBundle(baseEvent)
    const parsed = parseCollaborationBundle(JSON.stringify(bundle))
    expect(parsed.type).toBe('event-invite')
    if (parsed.type === 'event-invite') {
      expect(parsed.event.id).toBe('evt_1')
    }
  })

  it('imports new event invite', async () => {
    const bundle = createEventInviteBundle(baseEvent)
    const addEvent = vi.fn()
    const result = await importEventInvite(bundle, {
      getEvent: async () => undefined,
      addEvent,
      updateEvent: vi.fn(),
    })
    expect(result.created).toBe(true)
    expect(result.eventId).toBe('evt_1')
    expect(addEvent).toHaveBeenCalledOnce()
  })

  it('merges participant submission with costumes and preferences', async () => {
    const bundle = createParticipantSubmissionBundle({
      event: baseEvent,
      participantName: 'Bob',
      costumes: [costume],
      preferences: ['c_1'],
    })

    const updateEvent = vi.fn()

    const result = await importParticipantSubmission(bundle, {
      getEvent: async () => ({ ...baseEvent }),
      updateEvent,
    })

    expect(result.participantName).toBe('Bob')
    expect(result.costumesAdded).toBe(1)
    expect(result.participantAdded).toBe(true)
    expect(updateEvent).toHaveBeenCalledOnce()

    const updated = updateEvent.mock.calls[0][0] as Event
    expect(updated.participants).toContain('Bob')
    expect(updated.participantPreferences?.Bob).toEqual(['c_1'])
    expect(updated.importedCostumes).toEqual([
      expect.objectContaining({
        id: 'c_1',
        sourceParticipantName: 'Bob',
      }),
    ])
  })

  it('rejects submission when event missing on device', async () => {
    const bundle = createParticipantSubmissionBundle({
      event: baseEvent,
      participantName: 'Bob',
      costumes: [],
      preferences: [],
    })

    await expect(
      importParticipantSubmission(bundle, {
        getEvent: async () => undefined,
        updateEvent: vi.fn(),
      }),
    ).rejects.toThrow(/参加用ファイル/)
  })
})
