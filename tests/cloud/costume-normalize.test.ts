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
    expect(c.colors[0]).toBe('#ABC')
    expect(c.pattern).toBe('plain')
    expect(c.season).toEqual([])
  })

  it('keeps dress silhouette and strips it for non-dress types', () => {
    const dress = normalizeCostume({
      id: '1',
      name: 'Dress',
      image: 'data:image/png;base64,x',
      colors: ['blue'],
      tone: 'vivid',
      pattern: 'floral',
      type: 'dress',
      silhouette: 'princess',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(dress.silhouette).toBe('princess')

    const suit = normalizeCostume({
      id: '2',
      name: 'Suit',
      image: 'data:image/png;base64,x',
      colors: ['black'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      silhouette: 'a_line',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(suit.silhouette).toBeUndefined()
  })

  it('keeps suit breasting and strips it for non-suit types', () => {
    const suit = normalizeCostume({
      id: '2',
      name: 'Suit',
      image: 'data:image/png;base64,x',
      colors: ['black'],
      tone: 'dark',
      pattern: 'plain',
      type: 'suit',
      suitBreasting: 'double',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(suit.suitBreasting).toBe('double')

    const dress = normalizeCostume({
      id: '3',
      name: 'Dress',
      image: 'data:image/png;base64,x',
      colors: ['blue'],
      tone: 'vivid',
      pattern: 'floral',
      type: 'dress',
      suitBreasting: 'single',
      createdAt: 1,
      updatedAt: 2,
    })
    expect(dress.suitBreasting).toBeUndefined()
  })
})
