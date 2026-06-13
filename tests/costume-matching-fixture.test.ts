import { describe, it, expect } from 'vitest'
import { optimizeCostumeAssignments } from '../src/utils/optimizer'
import { enrichCostumeColors } from '../src/utils/theme-colors'
import type { Costume, EventThemePreferences } from '../src/utils/storage'

const themeFromEventForm: EventThemePreferences = {
  colorUnification: 'unified',
  colors1stChoice: ['red', 'pink'],
  colors2ndChoice: ['blue'],
  colors3rdChoice: [],
  tones1stChoice: ['vivid', 'pastel'],
  tones2ndChoice: ['neutral'],
  tones3rdChoice: [],
  patterns1stChoice: ['plain'],
  patterns2ndChoice: ['floral'],
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

const themeVaried: EventThemePreferences = {
  ...themeFromEventForm,
  colorUnification: 'varied',
}

const themeVariedDistinct: EventThemePreferences = {
  ...themeFromEventForm,
  colorUnification: 'varied_distinct',
  avoidSimilarColors: true,
}

/** 衣装追加画面相当（HEX + solid） */
function costumesAsSavedFromAddCostume(): Costume[] {
  const now = Date.now()
  return [
    {
      id: 'c-alice-red',
      name: '佐藤 — 赤ドレス',
      image: 'data:image/png;base64,x',
      colors: ['#E63946', '#F1FAEE'],
      tone: 'vivid',
      pattern: 'solid',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-bob-blue',
      name: '鈴木 — 青スーツ',
      image: 'data:image/png;base64,x',
      colors: ['#457B9D', '#A8DADC'],
      tone: 'pastel',
      pattern: 'floral',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-charlie-yellow',
      name: '高橋 — 黄トップ',
      image: 'data:image/png;base64,x',
      colors: ['#F4A261', '#2A9D8F'],
      tone: 'vivid',
      pattern: 'stripe',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-diana-pink',
      name: '田中 — ピンク衣装',
      image: 'data:image/png;base64,x',
      colors: ['#FF6B9D', '#FFFFFF'],
      tone: 'pastel',
      pattern: 'solid',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}

function costumesWithNamedColors(): Costume[] {
  const now = Date.now()
  return [
    {
      id: 'c-alice-red',
      name: '佐藤 — 赤ドレス',
      image: 'data:image/png;base64,x',
      colors: ['red', 'white'],
      tone: 'vivid',
      pattern: 'plain',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-bob-blue',
      name: '鈴木 — 青スーツ',
      image: 'data:image/png;base64,x',
      colors: ['blue', 'white'],
      tone: 'pastel',
      pattern: 'floral',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-charlie-yellow',
      name: '高橋 — 黄トップ',
      image: 'data:image/png;base64,x',
      colors: ['yellow', 'green'],
      tone: 'vivid',
      pattern: 'stripe',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c-diana-pink',
      name: '田中 — ピンク衣装',
      image: 'data:image/png;base64,x',
      colors: ['pink', 'white'],
      tone: 'pastel',
      pattern: 'plain',
      season: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}

const fictionalParticipants = [
  { id: '佐藤 美咲', name: '佐藤 美咲', preferences: ['c-diana-pink', 'c-alice-red'] },
  { id: '鈴木 健太', name: '鈴木 健太', preferences: ['c-bob-blue'] },
  { id: '高橋 陽子', name: '高橋 陽子', preferences: [] },
  { id: '田中 一郎', name: '田中 一郎', preferences: ['c-charlie-yellow'] },
]

describe('架空イベント参加者 — 衣装マッチング', () => {
  it('4人に4着を重複なく割り当てる（色名データ）', () => {
    const result = optimizeCostumeAssignments({
      participants: fictionalParticipants,
      costumes: costumesWithNamedColors(),
      usageHistory: [],
      themePreferences: themeFromEventForm,
    })

    expect(result.assignments).toHaveLength(4)
    expect(new Set(result.assignments.map((a) => a.costumeId)).size).toBe(4)
    expect(result.harmonyScore).toBeGreaterThan(0.45)

    const bob = result.assignments.find((a) => a.participantName === '鈴木 健太')!
    expect(bob.costumeId).toBe('c-bob-blue')
  })

  it('HEX + solid でも enrich 経由でテーマ色・柄（plain）が効く', () => {
    const raw = costumesAsSavedFromAddCostume()
    expect(enrichCostumeColors(raw[0].colors)).toContain('red')

    const result = optimizeCostumeAssignments({
      participants: fictionalParticipants,
      costumes: raw,
      usageHistory: [],
      themePreferences: themeFromEventForm,
    })

    expect(result.assignments).toHaveLength(4)
    const reasonJoined = result.assignments.map((a) => a.reason.join(' ')).join(' ')
    expect(reasonJoined).toMatch(/テーマ色第1希望/)
    expect(reasonJoined).toMatch(/テーマ柄第1希望/)

    const tanaka = result.assignments.find((a) => a.participantName === '田中 一郎')!
    expect(tanaka.costumeId).toBe('c-charlie-yellow')
  })

  it('参加者希望を反映する', () => {
    const result = optimizeCostumeAssignments({
      participants: [
        { id: '鈴木 健太', name: '鈴木 健太', preferences: ['c-bob-blue'] },
        { id: '佐藤 美咲', name: '佐藤 美咲', preferences: [] },
      ],
      costumes: costumesWithNamedColors(),
      usageHistory: [],
      themePreferences: themeFromEventForm,
    })

    const bob = result.assignments.find((a) => a.participantName === '鈴木 健太')!
    expect(bob.costumeId).toBe('c-bob-blue')
    expect(bob.reason.join(' ')).toMatch(/希望順位/)
  })

  it('colorUnification unified は理由に含まれる', () => {
    const result = optimizeCostumeAssignments({
      participants: fictionalParticipants.slice(0, 2),
      costumes: costumesWithNamedColors(),
      usageHistory: [],
      themePreferences: themeFromEventForm,
    })

    const text = result.assignments.map((a) => a.reason.join(' ')).join(' ')
    expect(text).toMatch(/色味統一/)
  })

  it('colorUnification varied は色味バラけを理由に含む', () => {
    const result = optimizeCostumeAssignments({
      participants: fictionalParticipants.slice(0, 2),
      costumes: costumesWithNamedColors(),
      usageHistory: [],
      themePreferences: themeVaried,
    })

    const text = result.assignments.map((a) => a.reason.join(' ')).join(' ')
    expect(text).toMatch(/色味バラけ/)
    expect(text).not.toMatch(/似た色を回避/)
  })

  it('colorUnification varied_distinct は似た色回避を理由に含む', () => {
    const result = optimizeCostumeAssignments({
      participants: fictionalParticipants.slice(0, 2),
      costumes: costumesWithNamedColors(),
      usageHistory: [],
      themePreferences: themeVariedDistinct,
    })

    const text = result.assignments.map((a) => a.reason.join(' ')).join(' ')
    expect(text).toMatch(/色味バラけ/)
    expect(text).toMatch(/似た色を回避/)
  })
})
