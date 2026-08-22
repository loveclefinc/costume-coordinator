import { describe, expect, it, vi } from 'vitest'
import { EVENT_API_ALLOWED_METHODS } from '../workers/event-api/src/cors-policy'
import { persistUploadWithRollback } from '../workers/event-api/src/upload-persistence'

describe('event API hardening', () => {
  it('allows DELETE in browser CORS preflight', () => {
    expect(EVENT_API_ALLOWED_METHODS.split(',').map((value) => value.trim())).toContain('DELETE')
  })

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

    await expect(
      persistUploadWithRollback({ putObject, insertRecord, deleteObject }),
    ).rejects.toBe(failure)

    expect(deleteObject).toHaveBeenCalledTimes(1)
  })
})
