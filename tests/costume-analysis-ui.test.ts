import { describe, expect, it } from 'vitest'
import {
  canSaveAfterCostumeAnalysis,
  resolveCostumeAnalysisUiStatus,
} from '../src/utils/costume-analysis-ui'
import {
  MAX_COSTUME_IMAGE_BYTES,
  validateCostumeImage,
} from '../src/utils/costume-image-validation'
import { COSTUME_ANALYSIS_DISCLOSURE_TEXT } from '../src/components/CostumePhotoAnalysisPanel'

describe('costume analysis UI state', () => {
  it('discloses on-device processing and its conservative scope', () => {
    expect(COSTUME_ANALYSIS_DISCLOSURE_TEXT).toContain('端末内')
    expect(COSTUME_ANALYSIS_DISCLOSURE_TEXT).toContain('外部のAIサービスへ写真を送信しません')
    expect(COSTUME_ANALYSIS_DISCLOSURE_TEXT).toContain('利用者が確認')
    expect(COSTUME_ANALYSIS_DISCLOSURE_TEXT).toContain('入力候補')
  })

  it('requires explicit confirmation after a successful result is applied', () => {
    const status = resolveCostumeAnalysisUiStatus({
      confidence: 0.92,
      warnings: [],
      uncertainFields: [],
    })

    expect(status).toBe('success')
    expect(canSaveAfterCostumeAnalysis(status, false)).toBe(false)
    expect(canSaveAfterCostumeAnalysis(status, true)).toBe(true)
  })

  it('marks low confidence and uncertain fields for review', () => {
    expect(resolveCostumeAnalysisUiStatus({ confidence: 0.69 })).toBe('needs_review')
    expect(resolveCostumeAnalysisUiStatus({
      confidence: 0.95,
      uncertainFields: ['silhouette'],
    })).toBe('needs_review')
  })

  it('allows saving after manual fallback while blocking an active analysis', () => {
    expect(canSaveAfterCostumeAnalysis('manual', false)).toBe(true)
    expect(canSaveAfterCostumeAnalysis('error', false)).toBe(true)
    expect(canSaveAfterCostumeAnalysis('analyzing', true)).toBe(false)
  })
})

describe('costume analysis image validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])(
    'accepts supported image type %s',
    (type) => {
      expect(validateCostumeImage({ type, size: 1024 })).toBeNull()
    },
  )

  it('rejects unsupported formats and files larger than 5MB', () => {
    expect(validateCostumeImage({ type: 'image/heic', size: 1024 })).toContain('JPEG')
    expect(validateCostumeImage({
      type: 'image/jpeg',
      size: MAX_COSTUME_IMAGE_BYTES + 1,
    })).toContain('5MB')
  })
})
