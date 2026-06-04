/** オンライン提出の容量制限（Worker env と PWA で共通の既定値） */

export type UploadLimits = {
  /** 1枚あたりの最大バイト数 */
  maxPhotoBytes: number
  /** 1衣装あたりの最大枚数 */
  maxPhotosPerCostume: number
  /** 1人あたりの最大衣装数 */
  maxCostumesPerParticipant: number
  /** 1イベントあたりの R2 合計上限（全参加者） */
  maxEventStorageBytes: number
}

export const DEFAULT_UPLOAD_LIMITS: UploadLimits = {
  maxPhotoBytes: 5 * 1024 * 1024,
  maxPhotosPerCostume: 3,
  maxCostumesPerParticipant: 5,
  /** 10GB アカウントでも余裕を残すため 1 イベント 500MB 上限 */
  maxEventStorageBytes: 500 * 1024 * 1024,
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
  return `${bytes}B`
}

/** 理論上の1人あたり最大（衣装数 × 枚数 × 1枚上限） */
export function maxBytesPerParticipant(limits: UploadLimits): number {
  return (
    limits.maxCostumesPerParticipant *
    limits.maxPhotosPerCostume *
    limits.maxPhotoBytes
  )
}
