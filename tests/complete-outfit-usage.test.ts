import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isCostumeRecentlyUsed } from '../src/utils/costume-theme-match'
import { recordCostumeUsage } from '../src/utils/usage-tracker'
import type { Costume, UsageHistory } from '../src/utils/storage'

const storageMock = vi.hoisted(() => ({
  addUsageHistory: vi.fn(),
}))

vi.mock('../src/utils/storage', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/utils/storage')>()
  return { ...original, storage: storageMock }
})

const outfit: Costume = {
  id: 'favorite-outfit:formal',
  name: '本番コーデ',
  image: 'data:image/jpeg;base64,suit',
  wearingPhotos: [
    'data:image/jpeg;base64,shirt',
    'data:image/jpeg;base64,tie',
  ],
  componentCostumeIds: ['suit-1', 'shirt-1', 'tie-1'],
  componentCostumeNames: ['紺スーツ', '白シャツ', '赤ネクタイ'],
  colors: ['navy', 'white', 'red'],
  tone: 'dark',
  pattern: 'dot',
  season: [],
  type: 'suit',
  createdAt: 1,
  updatedAt: 2,
}

describe('complete outfit usage history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageMock.addUsageHistory.mockResolvedValue(undefined)
  })

  it('records every physical component when one complete outfit is selected', async () => {
    await recordCostumeUsage(
      'event-1',
      { 花子: outfit.id },
      [outfit],
    )

    expect(storageMock.addUsageHistory).toHaveBeenCalledTimes(3)
    expect(storageMock.addUsageHistory.mock.calls.map(([history]) => history.costumeId)).toEqual([
      'suit-1',
      'shirt-1',
      'tie-1',
    ])
  })

  it('excludes an outfit when any one of its physical components was used recently', () => {
    const recentTieUse: UsageHistory = {
      id: 'usage-1',
      costumeId: 'tie-1',
      eventId: 'event-old',
      participantName: '花子',
      usedAt: Date.now() - 60_000,
    }

    expect(isCostumeRecentlyUsed(outfit, [recentTieUse], 30)).toBe(true)
    expect(isCostumeRecentlyUsed('unrelated', [recentTieUse], 30)).toBe(false)
  })
})
