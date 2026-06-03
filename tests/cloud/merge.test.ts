import { describe, it, expect } from 'vitest'
import { mergeRecords, localDataToRecords, buildCloudDocument } from '../../src/cloud/sync/merge'
import type { Event, Costume } from '../../src/utils/storage'

const baseEvent = (id: string, updatedAt: number): Event => ({
  id,
  name: `Event ${id}`,
  date: '2026-01-01',
  description: '',
  participants: [],
  costumes: {},
  createdAt: updatedAt,
  updatedAt,
})

const baseCostume = (id: string, updatedAt: number): Costume => ({
  id,
  name: `Costume ${id}`,
  image: '',
  colors: [],
  tone: 'neutral',
  pattern: 'solid',
  season: [],
  createdAt: updatedAt,
  updatedAt,
})

describe('mergeRecords', () => {
  it('picks newer record by updatedAt', () => {
    const local = localDataToRecords(
      [baseEvent('e1', 100)],
      [baseCostume('c1', 100)],
      [],
    )
    const remote = localDataToRecords(
      [baseEvent('e1', 200)],
      [baseCostume('c1', 50)],
      [],
    )
    const { records, conflicts } = mergeRecords(local, remote, null)
    expect(conflicts).toHaveLength(0)
    const event = records.find((r) => r.id === 'e1' && r.type === 'event')
    const costume = records.find((r) => r.id === 'c1' && r.type === 'costume')
    expect(event?.updatedAt).toBe(200)
    expect(costume?.updatedAt).toBe(100)
  })

  it('detects conflict when both sides changed after last sync', () => {
    const lastSync = new Date(1000).toISOString()
    const local = localDataToRecords([baseEvent('e1', 2000)], [], [])
    const remote = localDataToRecords(
      [{ ...baseEvent('e1', 3000), name: 'Remote name' }],
      [],
      [],
    )
    const { conflicts } = mergeRecords(local, remote, lastSync)
    expect(conflicts.length).toBeGreaterThanOrEqual(1)
  })

  it('buildCloudDocument sets version and updatedAt', () => {
    const doc = buildCloudDocument(
      localDataToRecords([baseEvent('e1', 5000)], [], []),
    )
    expect(doc.version).toBe(1)
    expect(doc.records).toHaveLength(1)
    expect(new Date(doc.updatedAt).getTime()).toBeGreaterThan(0)
  })
})
