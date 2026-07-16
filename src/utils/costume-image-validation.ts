import { formatBytes } from '../../shared/upload-limits'

export const SUPPORTED_COSTUME_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const COSTUME_IMAGE_ACCEPT = SUPPORTED_COSTUME_IMAGE_MIME_TYPES.join(',')
export const MAX_COSTUME_IMAGE_BYTES = 5 * 1024 * 1024

const ALLOWED_COSTUME_IMAGE_TYPES = new Set<string>(SUPPORTED_COSTUME_IMAGE_MIME_TYPES)

export function normalizeImageContentType(contentType: string): string {
  return contentType.split(';', 1)[0].trim().toLowerCase()
}

export function validateCostumeImage(
  image: Pick<Blob, 'size' | 'type'>,
): string | null {
  const contentType = normalizeImageContentType(image.type)
  if (!ALLOWED_COSTUME_IMAGE_TYPES.has(contentType)) {
    return 'JPEG、PNG、WebP の画像を選んでください'
  }
  if (image.size <= 0) {
    return '空の画像ファイルは使用できません'
  }
  if (image.size > MAX_COSTUME_IMAGE_BYTES) {
    return `画像は ${formatBytes(MAX_COSTUME_IMAGE_BYTES)} 以下にしてください（現在 ${formatBytes(image.size)}）`
  }
  return null
}
