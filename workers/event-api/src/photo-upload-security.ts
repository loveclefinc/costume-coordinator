export const SUPPORTED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type PhotoMimeType = (typeof SUPPORTED_PHOTO_MIME_TYPES)[number]

export type PhotoUploadErrorCode =
  | 'unsupported_image_type'
  | 'empty_image'
  | 'image_too_large'
  | 'invalid_image_data'

export class PhotoUploadApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: PhotoUploadErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'PhotoUploadApiError'
  }
}

export function normalizePhotoMimeType(contentType: string | null): PhotoMimeType | null {
  const normalized = (contentType ?? '').split(';', 1)[0].trim().toLowerCase()
  return SUPPORTED_PHOTO_MIME_TYPES.includes(normalized as PhotoMimeType)
    ? (normalized as PhotoMimeType)
    : null
}

export function assertPhotoContentLength(
  contentLength: string | null,
  maxBytes: number,
): void {
  if (contentLength == null || contentLength.trim() === '') return
  if (!/^\d+$/.test(contentLength.trim())) {
    throw new PhotoUploadApiError(
      400,
      'invalid_image_data',
      '画像データを確認できませんでした。別の画像を選んでください。',
    )
  }
  const size = Number(contentLength)
  if (!Number.isSafeInteger(size) || size > maxBytes) {
    throw new PhotoUploadApiError(
      413,
      'image_too_large',
      '画像の容量が大きすぎます。小さい画像を選んでください。',
    )
  }
  if (size === 0) {
    throw new PhotoUploadApiError(
      400,
      'empty_image',
      '画像が空です。別の画像を選んでください。',
    )
  }
}

/**
 * Read an untrusted request body without accumulating more than maxBytes.
 * Content-Length is only an early rejection hint; the streamed byte count is
 * authoritative because clients can omit or forge that header.
 */
export async function readBoundedPhotoRequest(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  assertPhotoContentLength(request.headers.get('Content-Length'), maxBytes)

  const body = request.body
  if (!body) {
    throw new PhotoUploadApiError(
      400,
      'empty_image',
      '画像が空です。別の画像を選んでください。',
    )
  }

  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!(value instanceof Uint8Array)) {
        throw new PhotoUploadApiError(
          400,
          'invalid_image_data',
          '画像データを読み込めませんでした。別の画像を選んでください。',
        )
      }

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new PhotoUploadApiError(
          413,
          'image_too_large',
          '画像の容量が大きすぎます。小さい画像を選んでください。',
        )
      }
      if (value.byteLength > 0) chunks.push(value)
    }
  } catch (error) {
    if (error instanceof PhotoUploadApiError) throw error
    await reader.cancel().catch(() => undefined)
    throw new PhotoUploadApiError(
      400,
      'invalid_image_data',
      '画像データを読み込めませんでした。別の画像を選んでください。',
    )
  } finally {
    reader.releaseLock()
  }

  if (totalBytes === 0) {
    throw new PhotoUploadApiError(
      400,
      'empty_image',
      '画像が空です。別の画像を選んでください。',
    )
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function hasJpegSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function hasPngSignature(bytes: Uint8Array): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  )
}

function hasWebpSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
}

export function validateUploadedPhoto(
  contentType: string | null,
  bytes: Uint8Array,
  maxBytes: number,
): PhotoMimeType {
  const mimeType = normalizePhotoMimeType(contentType)
  if (!mimeType) {
    throw new PhotoUploadApiError(
      415,
      'unsupported_image_type',
      'JPEG、PNG、WebP形式の画像を選んでください。',
    )
  }
  if (bytes.byteLength === 0) {
    throw new PhotoUploadApiError(
      400,
      'empty_image',
      '画像が空です。別の画像を選んでください。',
    )
  }
  if (bytes.byteLength > maxBytes) {
    throw new PhotoUploadApiError(
      413,
      'image_too_large',
      '画像の容量が大きすぎます。小さい画像を選んでください。',
    )
  }

  const signatureMatches =
    (mimeType === 'image/jpeg' && hasJpegSignature(bytes)) ||
    (mimeType === 'image/png' && hasPngSignature(bytes)) ||
    (mimeType === 'image/webp' && hasWebpSignature(bytes))
  if (!signatureMatches) {
    throw new PhotoUploadApiError(
      400,
      'invalid_image_data',
      '画像形式とデータが一致しません。別の画像を選んでください。',
    )
  }
  return mimeType
}
