import { describe, expect, it } from 'vitest'
import {
  MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH,
  buildAssignmentReasonMap,
  compactAssignmentReasons,
} from '../src/utils/assignment-reasons'

describe('published assignment reasons', () => {
  it('keeps deterministic optimizer reasons and omits numeric score details', () => {
    expect(compactAssignmentReasons([
      'テーマ色第1希望',
      'スコア: 91.2',
      '希望順位: 1位',
    ])).toEqual(['テーマ色第1希望', '希望順位: 1位'])
  })

  it('deduplicates, limits and shortens reasons for the public result', () => {
    const long = `テーマに合う${'衣'.repeat(200)}`
    const result = compactAssignmentReasons([
      '柄の組み合わせが調和',
      '柄の組み合わせが調和',
      '色のバランスが良好',
      long,
      '4件目は表示しない',
    ])

    expect(result).toHaveLength(3)
    expect(result[2]).toHaveLength(MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH)
  })

  it('uses a truthful system fallback without model-generated wording', () => {
    expect(compactAssignmentReasons([])).toEqual([
      'テーマとグループ全体の調和をもとに選びました',
    ])
  })

  it('builds reasons by participant name', () => {
    expect(buildAssignmentReasonMap([
      { participantName: ' Alice ', reason: ['テーマ色第1希望'] },
      { participantName: 'Bob', reason: ['希望順位: 2位'] },
    ])).toEqual({
      Alice: ['テーマ色第1希望'],
      Bob: ['希望順位: 2位'],
    })
  })

  it('keeps older published assignments useful when reasons are absent', () => {
    expect(buildAssignmentReasonMap([
      { participantName: 'Legacy participant' },
    ])).toEqual({
      'Legacy participant': ['テーマとグループ全体の調和をもとに選びました'],
    })
  })
})
