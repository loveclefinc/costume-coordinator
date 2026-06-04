import { describe, it, expect } from 'vitest'
import {
  computeExpiresAt,
  endOfEventDayMs,
  extendExpiresAt,
  canExtendRetention,
  isExpired,
} from '../shared/event-expiry'

describe('event-expiry', () => {
  it('endOfEventDayMs parses YYYY-MM-DD', () => {
    const end = endOfEventDayMs('2026-06-15')
    expect(new Date(end).toISOString()).toBe('2026-06-15T23:59:59.999Z')
  })

  it('computeExpiresAt caps at 14 days from creation', () => {
    const created = new Date('2026-06-01T00:00:00Z').getTime()
    const expires = computeExpiresAt(created, '2026-06-20', 7)
    expect(expires).toBe(created + 14 * 86400000)
  })

  it('computeExpiresAt extends to day after event when that beats retention window', () => {
    const created = new Date('2026-06-10T00:00:00Z').getTime()
    const expires = computeExpiresAt(created, '2026-06-20', 7)
    const afterEvent = endOfEventDayMs('2026-06-20') + 86400000
    expect(expires).toBe(afterEvent)
  })

  it('isExpired', () => {
    expect(isExpired(Date.now() - 1000)).toBe(true)
    expect(isExpired(Date.now() + 86400000)).toBe(false)
  })

  it('extendExpiresAt adds 7 days up to 14-day cap', () => {
    const created = new Date('2026-06-01T00:00:00Z').getTime()
    const current = created + 7 * 86400000
    const next = extendExpiresAt(current, created, 7)
    expect(next).toBe(created + 14 * 86400000)
    expect(canExtendRetention(next!, created)).toBe(false)
  })

  it('extendExpiresAt returns null at cap', () => {
    const created = new Date('2026-06-01T00:00:00Z').getTime()
    const cap = created + 14 * 86400000
    expect(extendExpiresAt(cap, created, 7)).toBeNull()
  })
})
