import { describe, expect, it } from 'vitest'
import { outfitCandidateBadge } from '../src/components/EventCostumeMatcher'
import { autoOutfitSuggestionMatchesQuery } from '../src/pages/Costumes'
import type { AutoOutfitSuggestion } from '../src/utils/favorite-combinations'
import type { Costume } from '../src/utils/storage'

function costume(id: string, name: string, type: string): Costume {
  return {
    id,
    name,
    type,
    image: `data:image/jpeg;base64,${id}`,
    colors: [],
    tone: 'neutral',
    pattern: 'plain',
    season: [],
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('outfit UI presentation', () => {
  it('distinguishes auto suggestions, saved favorites, and imported complete outfits', () => {
    expect(outfitCandidateBadge({
      id: 'favorite-outfit:auto-123-1',
      componentCostumeIds: ['blouse-1', 'skirt-1'],
      componentCostumeNames: ['白ブラウス', '紺スカート'],
    })).toBe('自動提案コーデ')

    expect(outfitCandidateBadge({
      id: 'favorite-outfit:concert-set',
      componentCostumeIds: ['suit-1', 'shirt-1'],
      componentCostumeNames: ['紺スーツ', '白シャツ'],
    })).toBe('保存済みコーデ')

    expect(outfitCandidateBadge({
      id: 'server-costume-1',
      componentCostumeIds: ['dress-1', 'brooch-1'],
      componentCostumeNames: ['青ドレス', '銀ブローチ'],
    })).toBe('完成コーデ')

    expect(outfitCandidateBadge({
      id: 'dress-1',
      componentCostumeIds: [],
      componentCostumeNames: [],
    })).toBeNull()
  })

  it('searches an unsaved suggestion by status and every component', () => {
    const owner = costume('blouse-1', '白ブラウス', 'blouse')
    const skirt = costume('skirt-1', '紺スカート', 'skirt')
    const suggestion: AutoOutfitSuggestion = {
      owner,
      pieces: [skirt],
      score: 78,
      reasons: ['トップスとボトムスを完成コーデに統合'],
      costume: {
        ...owner,
        id: 'favorite-outfit:auto-separates-1',
        name: 'おすすめ: 白ブラウス + 紺スカート',
        componentCostumeIds: [owner.id, skirt.id],
        componentCostumeNames: [owner.name, skirt.name],
        wearingPhotos: [skirt.image],
      },
    }

    expect(autoOutfitSuggestionMatchesQuery(suggestion, '自動提案')).toBe(true)
    expect(autoOutfitSuggestionMatchesQuery(suggestion, '未保存')).toBe(true)
    expect(autoOutfitSuggestionMatchesQuery(suggestion, 'ブラウス スカート')).toBe(true)
    expect(autoOutfitSuggestionMatchesQuery(suggestion, 'タキシード')).toBe(false)
  })
})
