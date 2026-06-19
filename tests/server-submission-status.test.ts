import { describe, expect, it } from 'vitest'
import {
  activeServerParticipants,
  areActiveSubmissionsComplete,
  pendingServerParticipants,
} from '../src/utils/server-submission-status'
import type { ServerParticipant } from '../shared/event-api-types'

const participant = (
  displayName: string,
  costumeCount: number,
  submittedAt: number | null,
  photoCount?: number,
): ServerParticipant => ({
  id: displayName,
  displayName,
  costumeCount,
  submittedAt,
  photoCount,
})

describe('server submission status', () => {
  it('does not let an abandoned zero-costume join block results', () => {
    const rows = [
      participant('未開始', 0, null),
      participant('提出済み', 2, 1),
    ]

    expect(activeServerParticipants(rows).map((row) => row.displayName)).toEqual(['提出済み'])
    expect(pendingServerParticipants(rows)).toEqual([])
    expect(areActiveSubmissionsComplete(rows)).toBe(true)
  })

  it('keeps a participant with costumes but no photo as pending', () => {
    const rows = [
      participant('写真待ち', 5, null),
      participant('提出済み', 2, 1),
    ]

    expect(pendingServerParticipants(rows).map((row) => row.displayName)).toEqual(['写真待ち'])
    expect(areActiveSubmissionsComplete(rows)).toBe(false)
  })

  it('keeps a participant with only some photos uploaded as pending', () => {
    const rows = [participant('送信途中', 5, 1, 3)]

    expect(pendingServerParticipants(rows).map((row) => row.displayName)).toEqual(['送信途中'])
    expect(areActiveSubmissionsComplete(rows)).toBe(false)
  })
})
