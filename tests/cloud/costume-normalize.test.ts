import { describe, it, expect } from 'vitest'
import { normalizeCostume, normalizeCostumeColors } from '../../src/utils/costume-normalize'

describe('costume-normalize', () => {
  it('converts legacy colors object to array', () => {
    expect(
      normalizeCostumeColors({ primary: '#ff0000', secondary: '#00ff00' }),
    ).toEqual(['#ff0000', '#00ff00'])
  })

  it('normalizes full costume with imageUri', () => {
    const c = normalizeCostume({
      id: '1',
      name: 'Test',
      imageUri: 'data:image/png;base64,x',
      colors: { primary: '#abc' },
      tone: 'neutral',
      pattern: 'solid',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(c.image).toBe('data:image/png;base64,x')
    expect(c.colors).toEqual(['#abc'])
    expect(c.season).toEqual([])
  })
})
