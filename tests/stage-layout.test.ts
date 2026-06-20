import { describe, expect, it } from 'vitest'
import {
  findStageBreakToAdd,
  moveStageBreak,
  normalizeStageBreaks,
  orderStageAssignments,
  splitStageRows,
} from '../src/utils/stage-layout'

describe('stage layout', () => {
  const assignments = ['a', 'b', 'c', 'd'].map((participantId) => ({ participantId }))

  it('supports any number of rows', () => {
    expect(splitStageRows(assignments, [1, 3]).map((row) => row.map((item) => item.participantId)))
      .toEqual([['a'], ['b', 'c'], ['d']])
  })

  it('normalizes duplicate, invalid, and legacy breaks', () => {
    expect(normalizeStageBreaks(4, [3, 1, 3, 0, 4])).toEqual([1, 3])
    expect(normalizeStageBreaks(4, undefined, 2)).toEqual([2])
  })

  it('applies a saved participant order without dropping new participants', () => {
    expect(orderStageAssignments(assignments, ['c', 'a']).map((item) => item.participantId))
      .toEqual(['c', 'a', 'b', 'd'])
  })

  it('moves a row divider without crossing another divider', () => {
    expect(moveStageBreak([2], 2, 1, 5)).toEqual([3])
    expect(moveStageBreak([2, 3], 2, 1, 5)).toEqual([2, 3])
    expect(moveStageBreak([1], 1, -1, 5)).toEqual([1])
  })

  it('splits the largest row when another divider is added', () => {
    expect(findStageBreakToAdd([], 5)).toBe(3)
    expect(findStageBreakToAdd([2], 6)).toBe(4)
    expect(findStageBreakToAdd([1, 2, 3], 4)).toBeNull()
  })
})
