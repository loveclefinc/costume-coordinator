import { describe, expect, it } from 'vitest'
import { sortAssignmentsForDisplay } from '../src/utils/assignment-display-order'

const rows = [
  { participantName: 'A', colors: ['blue'] },
  { participantName: 'B', colors: ['red'] },
  { participantName: 'C', colors: ['yellow'] },
  { participantName: 'D', colors: ['green'] },
]

describe('sortAssignmentsForDisplay', () => {
  it('keeps participant order as the default stage order', () => {
    expect(sortAssignmentsForDisplay(rows, 'participant_order').map((row) => row.participantName))
      .toEqual(['A', 'B', 'C', 'D'])
  })

  it('sorts assignments in rainbow stage order', () => {
    expect(sortAssignmentsForDisplay(rows, 'rainbow').map((row) => row.colors[0]))
      .toEqual(['red', 'yellow', 'green', 'blue'])
  })

  it('alternates color positions for contrast stage order', () => {
    expect(sortAssignmentsForDisplay(rows, 'contrast').map((row) => row.colors[0]))
      .toEqual(['red', 'blue', 'yellow', 'green'])
  })
})
