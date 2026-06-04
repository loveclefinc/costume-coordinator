import { describe, it, expect } from 'vitest'
import {
  DEFAULT_UPLOAD_LIMITS,
  formatBytes,
  maxBytesPerParticipant,
} from '../shared/upload-limits'

describe('upload-limits', () => {
  it('formats megabytes', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5MB')
    expect(formatBytes(524288000)).toBe('500MB')
  })

  it('max per participant is bounded', () => {
    const max = maxBytesPerParticipant(DEFAULT_UPLOAD_LIMITS)
    expect(max).toBe(5 * 3 * 5 * 1024 * 1024)
    expect(max).toBeLessThan(DEFAULT_UPLOAD_LIMITS.maxEventStorageBytes)
  })
})
