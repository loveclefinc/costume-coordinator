import { describe, expect, it } from 'vitest'
import {
  filterEventCostumes,
  filterPersonalWardrobeCostumes,
  findCostumeById,
  isPersonalWardrobeCostume,
  resolveEventCostumeCatalog,
} from '../src/utils/costume-scope'
import type { Costume } from '../src/utils/storage'

const personal: Costume = {
  id: 'c1',
  name: '自分のドレス',
  image: '',
  colors: ['blue'],
  tone: 'neutral',
  pattern: 'plain',
  season: [],
  createdAt: 1,
  updatedAt: 1,
}

const eventCostume: Costume = {
  id: 'c2',
  name: '他参加者のドレス',
  image: '',
  colors: ['red'],
  tone: 'neutral',
  pattern: 'plain',
  season: [],
  sourceEventId: 'evt_1',
  sourceParticipantName: '花子',
  createdAt: 1,
  updatedAt: 1,
}

describe('costume-scope', () => {
  it('separates personal wardrobe from event submissions', () => {
    const all = [personal, eventCostume]
    expect(filterPersonalWardrobeCostumes(all)).toEqual([personal])
    expect(filterEventCostumes(all, 'evt_1')).toEqual([eventCostume])
    expect(isPersonalWardrobeCostume(eventCostume)).toBe(false)
  })

  it('prefers event catalog for optimization when present', () => {
    expect(resolveEventCostumeCatalog([personal], [eventCostume])).toEqual([eventCostume])
    expect(resolveEventCostumeCatalog([personal], [])).toEqual([personal])
  })

  it('finds costumes in event catalog first', () => {
    expect(findCostumeById('c2', [personal], [eventCostume])).toEqual(eventCostume)
    expect(findCostumeById('c1', [personal], [eventCostume])).toEqual(personal)
  })
})
