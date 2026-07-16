import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/event-server/config', () => ({
  getEventApiBaseUrl: () => 'https://events.example.test',
}))

import { fetchAdminSnapshot, uploadServerPhoto } from '../src/event-server/client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('event admin authentication', () => {
  it('keeps the admin token out of the URL and sends it only as a header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      event: {},
      participants: [],
      costumes: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchAdminSnapshot('evt_1', 'admin-secret')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://events.example.test/api/events/evt_1/snapshot')
    expect(String(url)).not.toContain('admin-secret')
    expect((init.headers as Headers).get('X-Admin-Token')).toBe('admin-secret')
  })

  it('uses a non-secret component index while keeping the participant token in a header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      photoId: 'photo-1',
      viewUrl: 'https://events.example.test/photo',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    await uploadServerPhoto(
      'evt_1',
      'costume_1',
      'participant-secret',
      new Blob(['x']),
      'image/jpeg',
      2,
    )

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://events.example.test/api/events/evt_1/costumes/costume_1/photos?componentIndex=2',
    )
    expect(String(url)).not.toContain('participant-secret')
    expect((init.headers as Headers).get('X-Participant-Token')).toBe('participant-secret')
  })
})
