import { describe, expect, it, vi } from 'vitest'
import eventApiWorker, {
  MAX_PUBLISHED_ASSIGNMENT_REASON_LENGTH,
  sanitizePublishedAssignmentReasons,
  type Env,
} from '../workers/event-api/src/index'
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
} = {}) {
  const participantToken = 'participant-test-token'
  const statementCalls: StatementCall[] = []
  const statementFor = (call: StatementCall) => {
    const statement = {
      bind: (...boundValues: unknown[]) => {
        call.bindValues = boundValues
        return statement
      },
      all: async () => ({
        results: call.query.includes('FROM participants')
          ? [
              {
                id: 'participant-1',
                display_name: 'Alice',
                token_hash: await sha256(participantToken),
              },
            ]
          : [],
      }),
      first: async () => {
        if (call.query.includes('SELECT * FROM events')) {
          return {
            id: 'event-1',
            name: 'Demo',
            event_date: '2026-07-22',
            description: '',
            theme_json: null,
            results_json: null,
            expires_at: Date.now() + 60_000,
            admin_token: 'admin-hash',
            invite_token: 'invite-hash',
            retention_days: 7,
            created_at: Date.now(),
          }
        }
        if (call.query.includes('SELECT id, participant_id FROM costumes')) {
          return { id: 'costume-1', participant_id: 'participant-1' }
        }
        if (call.query.includes('SELECT COUNT(*) as c FROM costumes')) return { c: 0 }
        if (call.query.includes('SELECT COUNT(*) as c FROM photos')) return { c: 0 }
        if (call.query.includes('SELECT COALESCE(SUM(size_bytes)')) return { total: 0 }
        if (call.query.includes('FROM photos p')) {
          return {
            id: 'photo-1',
            r2_key: 'event-1/costume-1/photo-1',
            content_type: options.mediaContentType ?? 'image/jpeg',
            event_id: 'event-1',
            participant_id: 'participant-1',
            expires_at: Date.now() + 60_000,
            admin_token: 'admin-hash',
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
    },
    PHOTOS: photos,
    ALLOWED_ORIGINS: 'https://dress.l-clef.com',
    MAX_PHOTOS_PER_COSTUME: '3',
    MAX_PHOTO_BYTES: options.maxPhotoBytes ?? '5242880',
    MAX_COSTUMES_PER_PARTICIPANT: '5',
    MAX_EVENT_STORAGE_BYTES: '524288000',
  } as unknown as Env
  return { env, participantToken, photos, statementCalls }
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
    const insert = statementCalls.find((call) => call.query.includes('INSERT INTO costumes'))
    expect(insert?.query.match(/\?/g)).toHaveLength(17)
    expect(insert?.bindValues).toHaveLength(17)
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
