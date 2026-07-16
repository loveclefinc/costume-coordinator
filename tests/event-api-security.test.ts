import { describe, expect, it, vi } from 'vitest'
import eventApiWorker, {
  areCostumePhotoSlotsComplete,
  MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH,
  sanitizeCostumeComponents,
  sanitizePublishedAssignmentReasons,
  type Env,
} from '../workers/event-api/src/index'
import type { CostumeComponentPayload } from '../shared/event-api-types'
import {
  PhotoUploadApiError,
  assertPhotoContentLength,
  readBoundedPhotoRequest,
  validateUploadedPhoto,
} from '../workers/event-api/src/photo-upload-security'

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

type StatementCall = {
  query: string
  bindValues: unknown[]
}

async function createWorkerEnv(options: {
  mediaObject?: { body: BodyInit }
  mediaContentType?: string
  maxPhotoBytes?: string
  costumeComponentsJson?: string
  existingSourceCostume?: { id: string; componentsJson: string; ownerId?: string }
  replacementPhotoKeys?: string[]
  existingPhotoSlots?: Record<number, { id: string }>
  photoCount?: number
  submissionCostumes?: Array<{
    id: string
    source_costume_id: string | null
    name: string
    components_json: string
    photo_count: number
    uploaded_slots: string | null
  }>
  snapshotParticipants?: Array<{
    id: string
    display_name: string
    created_at: number
    costume_count: number
    photo_count: number
    last_submit: number | null
  }>
  snapshotCostumes?: Array<Record<string, unknown> & { id: string; participant_id: string }>
  snapshotPhotos?: Record<string, Array<{
    id: string
    costume_id: string
    content_type: string
    sort_order: number
  }>>
  resultsJson?: string | null
} = {}) {
  const participantToken = 'participant-test-token'
  const adminToken = 'admin-test-token'
  const statementCalls: StatementCall[] = []
  const statementFor = (call: StatementCall) => {
    const statement = {
      bind: (...boundValues: unknown[]) => {
        call.bindValues = boundValues
        return statement
      },
      all: async () => {
        if (call.query.includes('SELECT id, display_name, token_hash FROM participants')) {
          return {
            results: [
              {
                id: 'participant-1',
                display_name: 'Alice',
                token_hash: await sha256(participantToken),
              },
            ],
          }
        }
        if (call.query.includes('SELECT token_hash FROM participants')) {
          return { results: [{ token_hash: await sha256(participantToken) }] }
        }
        if (call.query.includes('SELECT c.id, c.source_costume_id, c.name, c.components_json')) {
          return { results: options.submissionCostumes ?? [] }
        }
        if (call.query.includes('SELECT p.id, p.display_name, p.created_at')) {
          return { results: options.snapshotParticipants ?? [] }
        }
        if (call.query.includes('SELECT c.*, p.display_name as participant_name')) {
          return { results: options.snapshotCostumes ?? [] }
        }
        if (call.query.includes('SELECT id, costume_id, content_type, sort_order FROM photos')) {
          const costumeId = String(call.bindValues[0] ?? '')
          return { results: options.snapshotPhotos?.[costumeId] ?? [] }
        }
        if (call.query.includes('SELECT r2_key FROM photos WHERE event_id = ? AND costume_id = ?')) {
          return {
            results: (options.replacementPhotoKeys ?? []).map((r2_key) => ({ r2_key })),
          }
        }
        return { results: [] }
      },
      first: async () => {
        if (call.query.includes('SELECT * FROM events')) {
          return {
            id: 'event-1',
            name: 'Demo',
            event_date: '2026-07-22',
            description: '',
            theme_json: null,
            results_json: options.resultsJson ?? null,
            expires_at: Date.now() + 60_000,
            admin_token: await sha256(adminToken),
            invite_token: 'invite-hash',
            retention_days: 7,
            created_at: Date.now(),
          }
        }
        if (call.query.includes('source_costume_id = ?')) {
          return options.existingSourceCostume &&
            (options.existingSourceCostume.ownerId ?? 'participant-1') === call.bindValues[1]
            ? {
                id: options.existingSourceCostume.id,
                name: 'コンサート用スタイル',
                colors_json: '[]',
                tone: 'dark',
                pattern: 'plain',
                season_json: '[]',
                type: null,
                silhouette: null,
                suit_style: null,
                suit_breasting: null,
                suit_lapel: null,
                components_json: options.existingSourceCostume.componentsJson,
                preferences_json: '[]',
              }
            : null
        }
        if (call.query.includes('SELECT id, participant_id, components_json FROM costumes')) {
          return {
            id: 'costume-1',
            participant_id: 'participant-1',
            components_json: options.costumeComponentsJson ?? '[]',
          }
        }
        if (call.query.includes('SELECT id FROM photos') && call.query.includes('sort_order = ?')) {
          const slot = Number(call.bindValues[2])
          return options.existingPhotoSlots?.[slot] ?? null
        }
        if (call.query.includes('SELECT COUNT(*) as c FROM costumes')) return { c: 0 }
        if (call.query.includes('SELECT COUNT(*) as c FROM photos')) {
          return { c: options.photoCount ?? 0 }
        }
        if (call.query.includes('SELECT COALESCE(SUM(size_bytes)')) return { total: 0 }
        if (call.query.includes('FROM photos p')) {
          return {
            id: 'photo-1',
            r2_key: 'event-1/costume-1/photo-1',
            content_type: options.mediaContentType ?? 'image/jpeg',
            event_id: 'event-1',
            participant_id: 'participant-1',
            expires_at: Date.now() + 60_000,
            admin_token: await sha256(adminToken),
          }
        }
        return null
      },
      run: async () => ({ success: true }),
    }
    return statement
  }

  const photos = {
    get: vi.fn(async () => options.mediaObject ?? null),
    put: vi.fn(),
    delete: vi.fn(),
  }
  const env = {
    DB: {
      prepare: (query: string) => {
        const call = { query, bindValues: [] }
        statementCalls.push(call)
        return statementFor(call)
      },
      batch: vi.fn(async (statements: unknown[]) =>
        statements.map(() => ({ success: true }))),
    },
    PHOTOS: photos,
    ALLOWED_ORIGINS: 'https://dress.l-clef.com',
    MAX_PHOTOS_PER_COSTUME: '3',
    MAX_PHOTO_BYTES: options.maxPhotoBytes ?? '5242880',
    MAX_COSTUMES_PER_PARTICIPANT: '5',
    MAX_EVENT_STORAGE_BYTES: '524288000',
  } as unknown as Env
  return { env, participantToken, adminToken, photos, statementCalls }
}

async function expectPhotoUploadError(
  promise: Promise<unknown>,
  expected: Partial<PhotoUploadApiError>,
): Promise<void> {
  try {
    await promise
    throw new Error('Expected photo upload validation to fail')
  } catch (error) {
    expect(error).toBeInstanceOf(PhotoUploadApiError)
    expect(error).toMatchObject(expected)
  }
}

describe('photo upload validation', () => {
  it('accepts JPEG, PNG, and WebP only when MIME and magic bytes agree', () => {
    expect(validateUploadedPhoto('image/jpeg', JPEG_BYTES, 100)).toBe('image/jpeg')
    expect(validateUploadedPhoto('image/png; charset=binary', PNG_BYTES, 100)).toBe('image/png')
    expect(validateUploadedPhoto('IMAGE/WEBP', WEBP_BYTES, 100)).toBe('image/webp')
  })

  it('rejects unsupported MIME, empty, oversized, and mismatched signatures', () => {
    expect(() => validateUploadedPhoto('image/gif', JPEG_BYTES, 100)).toThrowError(
      expect.objectContaining({ status: 415, code: 'unsupported_image_type' }),
    )
    expect(() => validateUploadedPhoto('image/jpeg', new Uint8Array(), 100)).toThrowError(
      expect.objectContaining({ status: 400, code: 'empty_image' }),
    )
    expect(() => validateUploadedPhoto('image/jpeg', JPEG_BYTES, 3)).toThrowError(
      expect.objectContaining({ status: 413, code: 'image_too_large' }),
    )
    expect(() => validateUploadedPhoto('image/png', JPEG_BYTES, 100)).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_image_data' }),
    )
  })

  it('rejects an invalid or oversized Content-Length before reading the body', () => {
    expect(() => assertPhotoContentLength('101', 100)).toThrowError(
      expect.objectContaining({ status: 413, code: 'image_too_large' }),
    )
    expect(() => assertPhotoContentLength('not-a-number', 100)).toThrowError(
      expect.objectContaining({ status: 400, code: 'invalid_image_data' }),
    )
  })

  it('reads a chunked body that stays within the configured bound', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4]))
        controller.close()
      },
    })
    const request = { headers: new Headers(), body: stream } as Request

    await expect(readBoundedPhotoRequest(request, 4)).resolves.toEqual(
      new Uint8Array([1, 2, 3, 4]),
    )
  })

  it('cancels a chunked body as soon as its streamed size exceeds the bound', async () => {
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3]))
        controller.enqueue(new Uint8Array([4, 5, 6]))
      },
      cancel() {
        cancelled = true
      },
    })
    const request = { headers: new Headers(), body: stream } as Request

    await expectPhotoUploadError(readBoundedPhotoRequest(request, 4), {
      status: 413,
      code: 'image_too_large',
    })
    expect(cancelled).toBe(true)
  })
})

describe('event photo storage boundary', () => {
  it('rejects SVG without writing to R2', async () => {
    const { env, participantToken, photos } = await createWorkerEnv()
    const request = new Request(
      'https://worker.test/api/events/event-1/costumes/costume-1/photos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'image/svg+xml',
          'X-Participant-Token': participantToken,
        },
        body: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      },
    )

    const response = await eventApiWorker.fetch(request, env, {} as never)
    expect(response.status).toBe(415)
    expect(await response.json()).toMatchObject({ code: 'unsupported_image_type' })
    expect(photos.put).not.toHaveBeenCalled()
  })

  it('normalizes valid image metadata before storing the photo', async () => {
    const { env, participantToken, photos, statementCalls } = await createWorkerEnv()
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes/costume-1/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'IMAGE/JPEG; charset=binary',
          'X-Participant-Token': participantToken,
        },
        body: JPEG_BYTES,
      }),
      env,
      {} as never,
    )

    expect(response.status).toBe(201)
    expect(photos.put).toHaveBeenCalledTimes(1)
    expect(photos.put.mock.calls[0][2]).toEqual({ httpMetadata: { contentType: 'image/jpeg' } })
    const insert = statementCalls.find((call) => call.query.includes('INSERT INTO photos'))
    expect(insert?.bindValues[4]).toBe('image/jpeg')
    expect(insert?.bindValues).toHaveLength(8)
  })

  it('rejects an oversized streamed body without writing to R2', async () => {
    const { env, participantToken, photos } = await createWorkerEnv({ maxPhotoBytes: '3' })
    let cancelled = false
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(JPEG_BYTES)
      },
      cancel() {
        cancelled = true
      },
    })
    const request = new Request(
      'https://worker.test/api/events/event-1/costumes/costume-1/photos',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Participant-Token': participantToken,
        },
        body,
        duplex: 'half',
      } as RequestInit & { duplex: 'half' },
    )

    const response = await eventApiWorker.fetch(request, env, {} as never)
    expect(response.status).toBe(413)
    expect(cancelled).toBe(true)
    expect(photos.put).not.toHaveBeenCalled()
  })

  it('serves authenticated media with private no-store and nosniff headers', async () => {
    const { env, participantToken } = await createWorkerEnv({
      mediaObject: { body: JPEG_BYTES },
    })
    const response = await eventApiWorker.fetch(
      new Request(
        `https://worker.test/api/media/photo-1?participant=${encodeURIComponent(participantToken)}`,
      ),
      env,
      {} as never,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('downgrades legacy SVG metadata to a non-active content type', async () => {
    const { env, participantToken } = await createWorkerEnv({
      mediaObject: { body: new TextEncoder().encode('<svg></svg>') },
      mediaContentType: 'image/svg+xml',
    })
    const response = await eventApiWorker.fetch(
      new Request(
        `https://worker.test/api/media/photo-1?participant=${encodeURIComponent(participantToken)}`,
      ),
      env,
      {} as never,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('binds every create-costume column exactly once', async () => {
    const { env, participantToken, statementCalls } = await createWorkerEnv()
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': participantToken,
        },
        body: JSON.stringify({
          name: 'Blue dress',
          colors: ['#0000FF'],
          tone: 'dark',
          pattern: 'solid',
          season: [],
          preferences: [],
        }),
      }),
      env,
      {} as never,
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ photosReset: false })
    const insert = statementCalls.find((call) => call.query.includes('INSERT INTO costumes'))
    expect(insert?.query.match(/\?/g)).toHaveLength(18)
    expect(insert?.bindValues).toHaveLength(18)
    expect(insert?.bindValues[14]).toBe('[]')
  })
})

describe('complete outfit persistence boundary', () => {
  const components: CostumeComponentPayload[] = [
    { sourceCostumeId: 'suit-1', name: 'ネイビースーツ', type: 'suit' },
    { sourceCostumeId: 'shirt-1', name: '白シャツ', type: 'shirt' },
    { sourceCostumeId: 'tie-1', name: 'ボルドーネクタイ', type: 'necktie' },
  ]

  it('advertises the complete-outfit component capability', async () => {
    const { env } = await createWorkerEnv()
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/health'),
      env,
      {} as never,
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      uploadLimits: { maxPhotosPerCostume: 3, maxOutfitComponents: 3 },
    })
  })

  it('strictly validates, normalizes, and bounds outfit components', () => {
    expect(sanitizeCostumeComponents(undefined)).toEqual([])
    expect(
      sanitizeCostumeComponents([
        { sourceCostumeId: ' suit-1 ', name: '  Navy   suit ', type: ' suit ' },
        { sourceCostumeId: 'shirt-1', name: 'White shirt' },
      ]),
    ).toEqual([
      { sourceCostumeId: 'suit-1', name: 'Navy suit', type: 'suit' },
      { sourceCostumeId: 'shirt-1', name: 'White shirt' },
    ])
    expect(sanitizeCostumeComponents([components[0]])).toBeNull()
    expect(sanitizeCostumeComponents([...components, { sourceCostumeId: 'pin', name: 'Pin' }]))
      .toBeNull()
    expect(sanitizeCostumeComponents([components[0], { ...components[1], sourceCostumeId: 'suit-1' }]))
      .toBeNull()
    expect(sanitizeCostumeComponents([{ ...components[0], name: '' }, components[1]])).toBeNull()
    expect(sanitizeCostumeComponents(components, 2)).toBeNull()
  })

  it('requires every declared component slot while leaving legacy single items compatible', () => {
    expect(areCostumePhotoSlotsComplete([], [])).toBe(false)
    expect(areCostumePhotoSlotsComplete([], [2])).toBe(true)
    expect(areCostumePhotoSlotsComplete(components, [0, 2])).toBe(false)
    expect(areCostumePhotoSlotsComplete(components, [2, 0, 1])).toBe(true)
  })

  it('stores a composed outfit as one candidate with canonical component metadata', async () => {
    const { env, participantToken, statementCalls } = await createWorkerEnv()
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': participantToken,
        },
        body: JSON.stringify({
          sourceCostumeId: 'favorite-outfit:formal-1',
          name: 'コンサート用スタイル',
          colors: ['#000080', '#FFFFFF'],
          tone: 'dark',
          pattern: 'plain',
          components,
        }),
      }),
      env,
      {} as never,
    )

    expect(response.status).toBe(201)
    const insert = statementCalls.find((call) => call.query.includes('INSERT INTO costumes'))
    expect(insert?.bindValues).toHaveLength(18)
    expect(insert?.bindValues[14]).toBe(JSON.stringify(components))
  })

  it('rejects a composite without the reserved source prefix', async () => {
    const { env, participantToken, statementCalls } = await createWorkerEnv()
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': participantToken,
        },
        body: JSON.stringify({
          sourceCostumeId: 'plain-costume-id',
          name: 'コンサート用スタイル',
          colors: [],
          tone: 'dark',
          pattern: 'plain',
          components,
        }),
      }),
      env,
      {} as never,
    )

    expect(response.status).toBe(400)
    expect(statementCalls.some((call) => call.query.includes('INSERT INTO costumes'))).toBe(false)
  })

  it('returns the same server costume for an exact retry and safely replaces changed components', async () => {
    const exact = await createWorkerEnv({
      existingSourceCostume: { id: 'costume-existing', componentsJson: JSON.stringify(components) },
    })
    const requestBody = {
      sourceCostumeId: 'favorite-outfit:formal-1',
      name: 'コンサート用スタイル',
      colors: [],
      tone: 'dark',
      pattern: 'plain',
      components,
    }
    const exactResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': exact.participantToken,
        },
        body: JSON.stringify(requestBody),
      }),
      exact.env,
      {} as never,
    )
    expect(exactResponse.status).toBe(200)
    expect(await exactResponse.json()).toEqual({
      costumeId: 'costume-existing',
      photosReset: false,
    })
    expect(exact.photos.delete).not.toHaveBeenCalled()

    const changedComponents = [components[0], components[2]]
    const conflict = await createWorkerEnv({
      existingSourceCostume: { id: 'costume-existing', componentsJson: JSON.stringify(components) },
      replacementPhotoKeys: ['event-1/costume-existing/photo-1'],
    })
    const conflictResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': conflict.participantToken,
        },
        body: JSON.stringify({ ...requestBody, components: changedComponents }),
      }),
      conflict.env,
      {} as never,
    )
    expect(conflictResponse.status).toBe(200)
    expect(await conflictResponse.json()).toEqual({
      costumeId: 'costume-existing',
      photosReset: true,
    })
    expect(conflict.photos.delete).toHaveBeenCalledWith('event-1/costume-existing/photo-1')
    const deleteRows = conflict.statementCalls.find((call) =>
      call.query.includes('DELETE FROM photos WHERE event_id = ? AND costume_id = ?'))
    const update = conflict.statementCalls.find((call) => call.query.includes('UPDATE costumes SET'))
    expect(deleteRows?.bindValues).toEqual(['event-1', 'costume-existing'])
    expect(update?.bindValues.slice(-3)).toEqual(['costume-existing', 'event-1', 'participant-1'])
    expect(update?.bindValues[10]).toBe(JSON.stringify(changedComponents))
  })

  it('also resets photos when core costume metadata changes', async () => {
    const changed = await createWorkerEnv({
      existingSourceCostume: { id: 'costume-existing', componentsJson: JSON.stringify(components) },
      replacementPhotoKeys: ['event-1/costume-existing/photo-1'],
    })
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': changed.participantToken,
        },
        body: JSON.stringify({
          sourceCostumeId: 'favorite-outfit:formal-1',
          name: 'コンサート用スタイル（改訂）',
          colors: [],
          tone: 'dark',
          pattern: 'plain',
          components,
        }),
      }),
      changed.env,
      {} as never,
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ photosReset: true })
    expect(changed.photos.delete).toHaveBeenCalledTimes(1)
    const update = changed.statementCalls.find((call) => call.query.includes('UPDATE costumes SET'))
    expect(update?.bindValues[0]).toBe('コンサート用スタイル（改訂）')
  })

  it('never replaces a costume owned by another participant', async () => {
    const isolated = await createWorkerEnv({
      existingSourceCostume: {
        id: 'other-costume',
        componentsJson: JSON.stringify(components),
        ownerId: 'participant-2',
      },
      replacementPhotoKeys: ['event-1/other-costume/photo-1'],
    })
    const response = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Participant-Token': isolated.participantToken,
        },
        body: JSON.stringify({
          sourceCostumeId: 'favorite-outfit:formal-1',
          name: 'コンサート用スタイル',
          colors: [],
          tone: 'dark',
          pattern: 'plain',
          components,
        }),
      }),
      isolated.env,
      {} as never,
    )

    expect(response.status).toBe(201)
    expect(isolated.photos.delete).not.toHaveBeenCalled()
    const lookup = isolated.statementCalls.find((call) =>
      call.query.includes('source_costume_id = ?'))
    expect(lookup?.bindValues).toEqual([
      'event-1',
      'participant-1',
      'favorite-outfit:formal-1',
    ])
  })

  it('uses componentIndex as an idempotent ordered photo slot', async () => {
    const upload = await createWorkerEnv({ costumeComponentsJson: JSON.stringify(components) })
    const response = await eventApiWorker.fetch(
      new Request(
        'https://worker.test/api/events/event-1/costumes/costume-1/photos?componentIndex=1',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Participant-Token': upload.participantToken,
          },
          body: JPEG_BYTES,
        },
      ),
      upload.env,
      {} as never,
    )
    expect(response.status).toBe(201)
    const insert = upload.statementCalls.find((call) => call.query.includes('INSERT INTO photos'))
    expect(insert?.bindValues[6]).toBe(1)

    const retry = await createWorkerEnv({
      costumeComponentsJson: JSON.stringify(components),
      existingPhotoSlots: { 1: { id: 'photo-existing' } },
    })
    const retryResponse = await eventApiWorker.fetch(
      new Request(
        'https://worker.test/api/events/event-1/costumes/costume-1/photos?componentIndex=1',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Participant-Token': retry.participantToken,
          },
          body: JPEG_BYTES,
        },
      ),
      retry.env,
      {} as never,
    )
    expect(retryResponse.status).toBe(200)
    expect(await retryResponse.json()).toMatchObject({ photoId: 'photo-existing' })
    expect(retry.photos.put).not.toHaveBeenCalled()

    const missingIndex = await createWorkerEnv({ costumeComponentsJson: JSON.stringify(components) })
    const missingResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/costumes/costume-1/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'X-Participant-Token': missingIndex.participantToken,
        },
        body: JPEG_BYTES,
      }),
      missingIndex.env,
      {} as never,
    )
    expect(missingResponse.status).toBe(400)
    expect(missingIndex.photos.put).not.toHaveBeenCalled()
  })

  it('keeps legacy single-item uploads on the original index-free contract', async () => {
    const legacy = await createWorkerEnv({ costumeComponentsJson: '[]' })
    const response = await eventApiWorker.fetch(
      new Request(
        'https://worker.test/api/events/event-1/costumes/costume-1/photos?componentIndex=0',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'image/jpeg',
            'X-Participant-Token': legacy.participantToken,
          },
          body: JPEG_BYTES,
        },
      ),
      legacy.env,
      {} as never,
    )

    expect(response.status).toBe(400)
    expect(legacy.photos.put).not.toHaveBeenCalled()
  })

  it('reports per-component progress and does not mark a partial outfit submitted', async () => {
    const lastSubmit = 123456
    const snapshotCostume = {
      id: 'costume-1',
      event_id: 'event-1',
      participant_id: 'participant-1',
      source_costume_id: 'favorite-outfit:formal-1',
      participant_name: 'Alice',
      name: 'コンサート用スタイル',
      colors_json: '["#000080"]',
      tone: 'dark',
      pattern: 'plain',
      season_json: '[]',
      type: 'suit',
      silhouette: null,
      suit_style: null,
      suit_breasting: null,
      suit_lapel: null,
      components_json: JSON.stringify(components),
      preferences_json: '[]',
      created_at: 1,
      updated_at: lastSubmit,
    }
    const envState = await createWorkerEnv({
      resultsJson: JSON.stringify({
        updatedAt: lastSubmit,
        assignments: [{ participantName: 'Alice', costumeId: 'costume-1', reasons: [] }],
      }),
      submissionCostumes: [
        {
          id: 'costume-1',
          source_costume_id: 'favorite-outfit:formal-1',
          name: 'コンサート用スタイル',
          components_json: JSON.stringify(components),
          photo_count: 2,
          uploaded_slots: '0,2',
        },
      ],
      snapshotParticipants: [
        {
          id: 'participant-1',
          display_name: 'Alice',
          created_at: 1,
          costume_count: 1,
          photo_count: 2,
          last_submit: lastSubmit,
        },
      ],
      snapshotCostumes: [snapshotCostume],
      snapshotPhotos: {
        'costume-1': [
          { id: 'photo-0', costume_id: 'costume-1', content_type: 'image/jpeg', sort_order: 0 },
          { id: 'photo-2', costume_id: 'costume-1', content_type: 'image/jpeg', sort_order: 2 },
        ],
      },
    })

    const statusResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/participant/status', {
        headers: { 'X-Participant-Token': envState.participantToken },
      }),
      envState.env,
      {} as never,
    )
    expect(statusResponse.status).toBe(200)
    const status = await statusResponse.json() as {
      submitted: boolean
      costumes: Array<{
        expectedPhotoCount: number
        components: Array<CostumeComponentPayload & { photoUploaded: boolean }>
      }>
    }
    expect(status.submitted).toBe(false)
    expect(status.costumes[0].expectedPhotoCount).toBe(3)
    expect(status.costumes[0].components.map((component) => component.photoUploaded))
      .toEqual([true, false, true])

    const snapshotResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/snapshot', {
        headers: { 'X-Admin-Token': envState.adminToken },
      }),
      envState.env,
      {} as never,
    )
    expect(snapshotResponse.status).toBe(200)
    const snapshot = await snapshotResponse.json() as {
      participants: Array<{ submittedAt: number | null; expectedPhotoCount?: number }>
      costumes: Array<{ components?: CostumeComponentPayload[] }>
    }
    expect(snapshot.participants[0].submittedAt).toBeNull()
    expect(snapshot.participants[0].expectedPhotoCount).toBe(3)
    expect(snapshot.costumes[0].components).toEqual(components)

    const publishedResponse = await eventApiWorker.fetch(
      new Request('https://worker.test/api/events/event-1/results', {
        headers: { 'X-Participant-Token': envState.participantToken },
      }),
      envState.env,
      {} as never,
    )
    expect(publishedResponse.status).toBe(200)
    const published = await publishedResponse.json() as {
      assignments: Array<{ costume: { components?: CostumeComponentPayload[] } }>
    }
    expect(published.assignments[0].costume.components).toEqual(components)
  })
})

describe('published assignment reason persistence boundary', () => {
  it('rejects malformed values and safely bounds, trims, and deduplicates reasons', () => {
    expect(sanitizePublishedAssignmentReasons('not-an-array')).toBeNull()
    expect(sanitizePublishedAssignmentReasons(['valid', 123])).toBeNull()

    const overlong = `テーマに調和${'衣'.repeat(200)}`
    const sanitized = sanitizePublishedAssignmentReasons([
      '  テーマ色に調和  ',
      'テーマ色に調和',
      overlong,
      '柄のバランスが良い',
      '4件目は保存しない',
    ])
    expect(sanitized).toHaveLength(3)
    expect(sanitized?.[0]).toBe('テーマ色に調和')
    expect(sanitized?.[1]).toHaveLength(MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH)
  })

  it('round-trips sanitized reasons and keeps legacy assignments compatible', () => {
    const reasons = sanitizePublishedAssignmentReasons(['テーマ第1希望', '全体の色調に調和'])
    const stored = JSON.stringify({
      updatedAt: 123,
      assignments: [{ participantName: 'Alice', costumeId: 'costume-1', reasons }],
    })
    const restored = JSON.parse(stored) as {
      assignments: Array<{ reasons?: unknown }>
    }
    expect(sanitizePublishedAssignmentReasons(restored.assignments[0].reasons)).toEqual(reasons)
    expect(sanitizePublishedAssignmentReasons(undefined)).toEqual([])
  })
})
