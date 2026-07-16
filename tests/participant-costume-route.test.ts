import { describe, expect, it } from 'vitest'
import {
  buildParticipantCostumeAddPath,
  buildParticipantReturnPath,
} from '../src/utils/participant-costume-route'

describe('participant costume routes', () => {
  it('builds a participant-only add route and preserves the invite token', () => {
    expect(buildParticipantCostumeAddPath('evt/1', 'invite token')).toBe(
      '/events/evt%2F1/participate/costumes/add?t=invite%20token',
    )
  })

  it('returns to the participate route after save or cancel', () => {
    expect(buildParticipantReturnPath('evt_1', 'tok')).toBe(
      '/events/evt_1/participate?t=tok',
    )
    expect(buildParticipantReturnPath('evt_1')).toBe('/events/evt_1/participate')
  })
})
