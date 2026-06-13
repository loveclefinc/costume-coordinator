import { describe, it, expect, beforeEach } from 'vitest'
import { optimizeCostumeAssignments, calculateHarmonyScore } from '../src/utils/optimizer'
import { Costume, EventThemePreferences, UsageHistory } from '../src/utils/storage'

describe('Event Theme Optimization', () => {
  let mockCostumes: Costume[]
  let mockThemePreferences: EventThemePreferences
  let mockUsageHistory: UsageHistory[]

  beforeEach(() => {
    mockCostumes = [
      {
        id: 'costume1',
        name: 'Red Dress',
        image: 'data:image/png;base64,test',
        colors: ['red', 'white'],
        tone: 'vivid',
        pattern: 'plain',
        season: ['spring', 'summer'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'costume2',
        name: 'Blue Outfit',
        image: 'data:image/png;base64,test',
        colors: ['blue', 'white'],
        tone: 'cool',
        pattern: 'stripe',
        season: ['spring', 'summer'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'costume3',
        name: 'Yellow Top',
        image: 'data:image/png;base64,test',
        colors: ['yellow', 'black'],
        tone: 'vivid',
        pattern: 'plain',
        season: ['spring', 'summer', 'autumn'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'costume4',
        name: 'Pink Dress',
        image: 'data:image/png;base64,test',
        colors: ['pink', 'white'],
        tone: 'pastel',
        pattern: 'floral',
        season: ['spring', 'summer'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    mockThemePreferences = {
      colorUnification: 'unified',
      colors1stChoice: ['red', 'blue'],
      colors2ndChoice: ['yellow'],
      colors3rdChoice: ['pink'],
      tones1stChoice: ['vivid'],
      tones2ndChoice: ['cool'],
      tones3rdChoice: ['pastel'],
      patterns1stChoice: ['plain'],
      patterns2ndChoice: ['stripe'],
      patterns3rdChoice: ['floral'],
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

    mockUsageHistory = []
  })

  describe('Basic Optimization', () => {
    it('should optimize costume assignments with theme preferences', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      expect(result.assignments).toBeDefined()
      expect(result.assignments.length).toBe(2)
      expect(result.harmonyScore).toBeGreaterThan(0)
    })

    it('should assign different costumes to different participants', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      const assignedCostumeIds = result.assignments.map(a => a.costumeId)
      const uniqueIds = new Set(assignedCostumeIds)
      expect(uniqueIds.size).toBe(assignedCostumeIds.length)
    })
  })

  describe('Theme Preference Scoring', () => {
    it('should prioritize 1st choice colors', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      // Red and Blue are 1st choice colors
      const assignedCostume = result.assignments[0].costume
      expect(['red', 'blue']).toContain(assignedCostume.colors[0])
    })

    it('should prioritize 1st choice tones', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      const assignedCostume = result.assignments[0].costume
      expect(assignedCostume.tone).toBe('vivid')
    })

    it('should prioritize 1st choice patterns', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      const assignedCostume = result.assignments[0].costume
      expect(assignedCostume.pattern).toBe('plain')
    })
  })

  describe('Participant Preferences', () => {
    it('should consider participant preferences when available', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: ['costume2'] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      // Alice's preference should be considered
      expect(result.assignments).toBeDefined()
      expect(result.assignments.length).toBe(2)
    })
  })

  describe('Usage History', () => {
    it('should exclude recently used costumes from assignment', () => {
      const recentUsage: UsageHistory[] = [
        {
          id: 'usage1',
          costumeId: 'costume1',
          eventId: 'event1',
          participantName: 'Alice',
          usedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
        },
      ]

      const participants = [{ id: 'p1', name: 'Alice', preferences: [] }]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: recentUsage,
        themePreferences: mockThemePreferences,
        recentUsageExcludeDays: 30,
      })

      expect(result.assignments[0].costumeId).not.toBe('costume1')
    })

    it('should respect recentUsageExcludeDays from app settings input', () => {
      const recentUsage: UsageHistory[] = [
        {
          id: 'usage1',
          costumeId: 'costume1',
          eventId: 'event1',
          participantName: 'Alice',
          usedAt: Date.now() - 35 * 24 * 60 * 60 * 1000,
        },
      ]

      const participants = [{ id: 'p1', name: 'Alice', preferences: [] }]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: recentUsage,
        themePreferences: mockThemePreferences,
        recentUsageExcludeDays: 30,
      })

      expect(result.assignments[0].costumeId).toBe('costume1')
    })
  })

  describe('Avoid Similar Colors', () => {
    it('should avoid similar colors when setting is enabled', () => {
      const prefs = { ...mockThemePreferences, avoidSimilarColors: true }

      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: prefs,
      })

      expect(result.assignments.length).toBe(2)
      // Should have assigned costumes
      expect(result.assignments[0].costume).toBeDefined()
    })
  })

  describe('Harmony Score', () => {
    it('should calculate harmony score', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      expect(result.harmonyScore).toBeGreaterThanOrEqual(0)
      expect(result.harmonyScore).toBeLessThanOrEqual(1)
    })

    it('should return 0 for empty assignments', () => {
      const score = calculateHarmonyScore([])
      expect(score).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty costumes list', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: [],
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      expect(result.assignments).toEqual([])
      expect(result.harmonyScore).toBe(0)
    })

    it('should handle more participants than costumes', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
        { id: 'p3', name: 'Charlie', preferences: [] },
        { id: 'p4', name: 'Diana', preferences: [] },
        { id: 'p5', name: 'Eve', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      // Should assign as many as possible
      expect(result.assignments.length).toBeLessThanOrEqual(mockCostumes.length)
    })

    it('should handle no theme preferences', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
        { id: 'p2', name: 'Bob', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
      })

      expect(result.assignments).toBeDefined()
      expect(result.assignments.length).toBe(2)
    })
  })

  describe('Reason Generation', () => {
    it('should generate reasons for assignments', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      const assignment = result.assignments[0]
      expect(assignment.reason).toBeDefined()
      expect(Array.isArray(assignment.reason)).toBe(true)
      expect(assignment.reason.length).toBeGreaterThan(0)
    })

    it('should include theme preference reasons', () => {
      const participants = [
        { id: 'p1', name: 'Alice', preferences: [] },
      ]

      const result = optimizeCostumeAssignments({
        participants,
        costumes: mockCostumes,
        usageHistory: mockUsageHistory,
        themePreferences: mockThemePreferences,
      })

      const assignment = result.assignments[0]
      const reasonText = assignment.reason.join(' ')
      // Should mention theme preferences
      expect(reasonText).toMatch(/テーマ|スコア/)
    })
  })
})
