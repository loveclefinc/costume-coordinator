import { describe, expect, it, vi } from 'vitest'
import { applyEventApiCors } from '../workers/event-api/src/cors-policy'
import { persistUploadWithRollback } from '../workers/event-api/src/upload-persistence'
import worker, { type Env } from '../workers/event-api/src/index'

const ALLOWED_ORIGINS =
  'https://dress.l-clef.com,https://loveclefinc.github.io,http://localhost:3000,http://localhost:5173'

function dummyEnv(): Env {
  return {
    DB: {} as D1Database,
    PHOTOS: {} as R2Bucket,
    ALLOWED_ORIGINS,
    MAX_PHOTOS_PER_COSTUME: '3',
    MAX_PHOTO_BYTES: '5242880',
    MAX_COSTUMES_PER_PARTICIPANT: '5',
    MAX_EVENT_STORAGE_BYTES: '524288000',
  }
}

function dummyCtx(): ExecutionContext {
  return {
    waitUntil() {},
    passThroughOnException() {},
    props: {},
  } as ExecutionContext
}

describe('event API DELETE CORS preflight', () => {
  it('answers OPTIONS DELETE with origin, methods, and admin header', async () => {
    const request = new Request('https://costume-coordinator-events.example/api/events/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://dress.l-clef.com',
        'Access-Control-Request-Method': 'DELETE',
        'Access-Control-Request-Headers': 'X-Admin-Token',
      },
    })

    const response = await worker.fetch(request, dummyEnv(), dummyCtx())

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://dress.l-clef.com')
    const methods = response.headers.get('Access-Control-Allow-Methods') ?? ''
    expect(methods.split(',').map((value) => value.trim())).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    )
    const allowHeaders = response.headers.get('Access-Control-Allow-Headers') ?? ''
    expect(allowHeaders.toLowerCase()).toContain('x-admin-token')
    expect(allowHeaders.toLowerCase()).toContain('x-participant-token')
    expect(allowHeaders.toLowerCase()).toContain('content-type')
  })

  it('does not reflect a disallowed origin', () => {
    const request = new Request('https://costume-coordinator-events.example/api/events/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example',
        'Access-Control-Request-Method': 'DELETE',
      },
    })
    const response = applyEventApiCors(new Response(null, { status: 204 }), request, ALLOWED_ORIGINS)
    expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('https://evil.example')
  })
})

describe('R2 upload persistence rollback', () => {
  it('keeps the R2 object when the D1 record succeeds', async () => {
    const putObject = vi.fn(async () => undefined)
    const insertRecord = vi.fn(async () => undefined)
    const deleteObject = vi.fn(async () => undefined)

    await expect(
      persistUploadWithRollback({ putObject, insertRecord, deleteObject }),
    ).resolves.toBeUndefined()

    expect(putObject).toHaveBeenCalledTimes(1)
    expect(insertRecord).toHaveBeenCalledTimes(1)
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('deletes the just-uploaded R2 object when the D1 record fails', async () => {
    const failure = new Error('D1 insert failed')
    const putObject = vi.fn(async () => undefined)
    const insertRecord = vi.fn(async () => {
      throw failure
    })
    const deleteObject = vi.fn(async () => undefined)

    await expect(
      persistUploadWithRollback({ putObject, insertRecord, deleteObject }),
    ).rejects.toBe(failure)

    expect(putObject).toHaveBeenCalledTimes(1)
    expect(insertRecord).toHaveBeenCalledTimes(1)
    expect(deleteObject).toHaveBeenCalledTimes(1)
  })

  it('preserves the original D1 error even if rollback deletion also fails', async () => {
    const failure = new Error('D1 insert failed')
    const putObject = vi.fn(async () => undefined)
    const insertRecord = vi.fn(async () => {
      throw failure
    })
    const deleteObject = vi.fn(async () => {
      throw new Error('R2 delete failed')
    })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(
      persistUploadWithRollback({ putObject, insertRecord, deleteObject }),
    ).rejects.toBe(failure)

    expect(deleteObject).toHaveBeenCalledTimes(1)
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })

  it('does not insert a D1 row when R2 put fails', async () => {
    const putFailure = new Error('R2 put failed')
    const putObject = vi.fn(async () => {
      throw putFailure
    })
    const insertRecord = vi.fn(async () => undefined)
    const deleteObject = vi.fn(async () => undefined)

    await expect(
      persistUploadWithRollback({ putObject, insertRecord, deleteObject }),
    ).rejects.toBe(putFailure)

    expect(insertRecord).not.toHaveBeenCalled()
    expect(deleteObject).not.toHaveBeenCalled()
  })
})
