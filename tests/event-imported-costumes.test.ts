import { describe, expect, it } from 'vitest'
import type { Costume } from '../src/utils/storage'
import {
  countImportCostumeChanges,
  mergeEventImportedCostumes,
} from '../src/utils/event-imported-costumes'

const costume = (id: string, name: string): Costume => ({
  id,
  name,
  image: '',
  colors: [],
  tone: 'vivid',
  pattern: 'plain',
  season: [],
  createdAt: 1,
  updatedAt: 1,
})

describe('event-imported-costumes', () => {
  it('merges costumes by id', () => {
    const merged = mergeEventImportedCostumes(
      [costume('a', 'old')],
      [costume('a', 'new'), costume('b', 'second')],
    )
    expect(merged).toHaveLength(2)
    expect(merged.find((c) => c.id === 'a')?.name).toBe('new')
  })

  it('counts added and updated costumes', () => {
    const existing = [costume('a', 'a')]
    const incoming = [costume('a', 'a2'), costume('b', 'b')]
    expect(countImportCostumeChanges(existing, incoming)).toEqual({ added: 1, updated: 1 })
  })
})
