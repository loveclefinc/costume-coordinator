import { describe, it, expect } from 'vitest'
import { runSystemOptimization } from '../src/utils/system-optimizer'
import type { Costume, EventThemePreferences } from '../src/utils/storage'

const theme: EventThemePreferences = {
  colorUnification: 'unified',
  colors1stChoice: ['blue'],
  colors2ndChoice: [],
  colors3rdChoice: [],
  tones1stChoice: ['vivid'],
  tones2ndChoice: [],
  tones3rdChoice: [],
  patterns1stChoice: ['plain'],
  patterns2ndChoice: [],
  patterns3rdChoice: [],
  silhouettes1stChoice: [],
  silhouettes2ndChoice: [],
  silhouettes3rdChoice: [],
  suitStyles1stChoice: [],
  suitStyles2ndChoice: [],
  suitStyles3rdChoice: [],
  suitBreasting1stChoice: [],
  suitBreasting2ndChoice: [],
  suitBreasting3rdChoice: [],
  avoidSimilarColors: false,
}

function costume(id: string, name: string, colors: string[]): Costume {
  const now = Date.now()
  return {
    id,
    name,
    image: 'data:image/png;base64,x',
    colors,
    tone: 'vivid',
    pattern: 'plain',
    season: [],
    createdAt: now,
    updatedAt: now,
  }
}

describe('runSystemOptimization', () => {
  it('returns a primary assignment and deduplicated alternatives', () => {
    const outcome = runSystemOptimization(
      {
        participants: [
          { id: 'a', name: 'A', preferences: ['c1'] },
          { id: 'b', name: 'B', preferences: ['c2'] },
        ],
        costumes: [costume('c1', 'Blue A', ['blue']), costume('c2', 'Blue B', ['blue'])],
        usageHistory: [],
        themePreferences: theme,
      },
      3,
    )

    expect(outcome.selected).toHaveLength(2)
    expect(outcome.selected[0].costumeId).not.toBe(outcome.selected[1].costumeId)
    expect(outcome.harmonyScore).toBeGreaterThan(0)
  })

  it('returns up to 3 event-wide outfit image candidates', () => {
    const outcome = runSystemOptimization(
      {
        participants: [
          { id: 'a', name: 'A', preferences: ['c1', 'c2', 'c3', 'c4'] },
          { id: 'b', name: 'B', preferences: ['c1', 'c2', 'c3', 'c4'] },
          { id: 'c', name: 'C', preferences: ['c1', 'c2', 'c3', 'c4'] },
        ],
        costumes: [
          costume('c1', 'Blue 1', ['blue']),
          costume('c2', 'Blue 2', ['blue']),
          costume('c3', 'Blue 3', ['blue']),
          costume('c4', 'Blue 4', ['blue']),
        ],
        usageHistory: [],
        themePreferences: theme,
      },
      3,
    )

    const eventWideCandidates = [
      outcome.selected,
      ...outcome.alternatives.map((proposal) => proposal.assignments),
    ]

    expect(eventWideCandidates).toHaveLength(3)
    eventWideCandidates.forEach((assignments) => {
      expect(assignments).toHaveLength(3)
      expect(new Set(assignments.map((row) => row.participantId))).toHaveLength(3)
      expect(new Set(assignments.map((row) => row.costumeId))).toHaveLength(3)
    })
  })

  it('assigns unique costumes for 10 participants from 5 candidates each', () => {
    const participants = Array.from({ length: 10 }, (_, index) => {
      const offset = index * 5
      return {
        id: `p${index + 1}`,
        name: `参加者${index + 1}`,
        preferences: Array.from({ length: 5 }, (__, i) => `c${offset + i + 1}`),
      }
    })
    const costumes = Array.from({ length: 50 }, (_, index) => (
      costume(`c${index + 1}`, `衣装${index + 1}`, ['blue'])
    ))

    const outcome = runSystemOptimization({
      participants,
      costumes,
      usageHistory: [],
      themePreferences: theme,
      recentUsageExcludeDays: 30,
    })

    const assignedIds = new Set(outcome.selected.map((row) => row.costumeId))
    expect(outcome.selected).toHaveLength(10)
    expect(assignedIds).toHaveLength(10)
    expect(outcome.harmonyScore).toBeGreaterThan(0)
  })
})
