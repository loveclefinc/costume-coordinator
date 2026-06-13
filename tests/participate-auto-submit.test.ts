import { describe, expect, it } from 'vitest'
import {
  resolveSubmitPhaseAfterStatusCheck,
  shouldStartAutoSubmit,
} from '../src/utils/participate-auto-submit'

describe('participate-auto-submit', () => {
  it('does not auto-submit after error or when already done', () => {
    expect(
      shouldStartAutoSubmit({
        joined: true,
        participantToken: 'tok',
        wardrobeReady: true,
        submitPhase: 'error',
        autoSubmitStarted: false,
      }),
    ).toBe(false)

    expect(
      shouldStartAutoSubmit({
        joined: true,
        participantToken: 'tok',
        wardrobeReady: true,
        submitPhase: 'done',
        autoSubmitStarted: false,
      }),
    ).toBe(false)
  })

  it('starts auto-submit only when ready and idle', () => {
    expect(
      shouldStartAutoSubmit({
        joined: true,
        participantToken: 'tok',
        wardrobeReady: true,
        submitPhase: 'idle',
        autoSubmitStarted: false,
      }),
    ).toBe(true)

    expect(
      shouldStartAutoSubmit({
        joined: true,
        participantToken: 'tok',
        wardrobeReady: true,
        submitPhase: 'idle',
        autoSubmitStarted: true,
      }),
    ).toBe(false)
  })

  it('does not reset in-progress phases when server says not submitted', () => {
    expect(resolveSubmitPhaseAfterStatusCheck('submitting', false)).toBe('submitting')
    expect(resolveSubmitPhaseAfterStatusCheck('picking', false)).toBe('picking')
    expect(resolveSubmitPhaseAfterStatusCheck('error', false)).toBe('error')
    expect(resolveSubmitPhaseAfterStatusCheck('idle', true)).toBe('done')
  })
})
