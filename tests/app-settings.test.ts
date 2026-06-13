import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
  getRecentUsageExcludeDays,
  setRecentUsageExcludeDays,
} from '../src/utils/app-settings'

const store = new Map<string, string>()

describe('app-settings', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
    })
  })

  it('returns default when unset', () => {
    expect(getRecentUsageExcludeDays()).toBe(DEFAULT_RECENT_USAGE_EXCLUDE_DAYS)
  })

  it('persists recent usage exclude days', () => {
    setRecentUsageExcludeDays(14)
    expect(getRecentUsageExcludeDays()).toBe(14)
  })

  it('clamps invalid values to safe range', () => {
    setRecentUsageExcludeDays(999)
    expect(getRecentUsageExcludeDays()).toBe(365)

    setRecentUsageExcludeDays(0)
    expect(getRecentUsageExcludeDays()).toBe(0)
  })
})
