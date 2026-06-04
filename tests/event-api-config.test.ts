import { describe, it, expect } from 'vitest'
import { normalizeEventApiBaseUrl } from '../src/event-server/config'

describe('normalizeEventApiBaseUrl', () => {
  it('expands account workers.dev subdomain to worker URL', () => {
    expect(normalizeEventApiBaseUrl('https://loveclef.workers.dev')).toBe(
      'https://costume-coordinator-events.loveclef.workers.dev',
    )
  })

  it('keeps full worker URL unchanged', () => {
    expect(
      normalizeEventApiBaseUrl('https://costume-coordinator-events.loveclef.workers.dev'),
    ).toBe('https://costume-coordinator-events.loveclef.workers.dev')
  })
})
