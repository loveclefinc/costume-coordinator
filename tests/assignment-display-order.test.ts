import { describe, expect, it } from 'vitest'
import { arrangeAssignmentsForStage } from '../src/utils/assignment-display-order'

const rows = [
  { participantName: 'A', colors: ['blue'] },
  { participantName: 'B', colors: ['red'] },
  { participantName: 'C', colors: ['yellow'] },
  { participantName: 'D', colors: ['green'] },
]

describe('arrangeAssignmentsForStage', () => {
  it('keeps the selected assignment order when stage balancing is off', () => {
    expect(arrangeAssignmentsForStage(rows, 'participant_order').map((row) => row.participantName))
      .toEqual(['A', 'B', 'C', 'D'])
  })

  it('creates a natural stage flow when colors are varied', () => {
    expect(arrangeAssignmentsForStage(rows, 'balanced').map((row) => row.colors[0]))
      .toEqual(['red', 'yellow', 'green', 'blue'])
  })

  it('keeps all assignments when arranging stage balance', () => {
    expect(arrangeAssignmentsForStage(rows, 'balanced')).toHaveLength(rows.length)
  })
})
