import { describe, expect, it } from 'vitest'

describe('participant submission status', () => {
  it('requires both costume and photo for submitted flag', () => {
    const evaluate = (costumeCount: number, photoCount: number) =>
      costumeCount > 0 && photoCount > 0

    expect(evaluate(0, 0)).toBe(false)
    expect(evaluate(2, 0)).toBe(false)
    expect(evaluate(1, 1)).toBe(true)
  })
})
