export type CostumeAnalysisUiStatus =
  | 'idle'
  | 'analyzing'
  | 'success'
  | 'needs_review'
  | 'error'
  | 'manual'

export const LOW_COSTUME_ANALYSIS_CONFIDENCE = 0.7

export interface CostumeAnalysisReviewSignals {
  confidence: number
  warnings?: readonly string[]
  uncertainFields?: readonly string[]
}

export function resolveCostumeAnalysisUiStatus(
  signals: CostumeAnalysisReviewSignals,
): 'success' | 'needs_review' {
  const hasWarnings = (signals.warnings?.length ?? 0) > 0
  const hasUncertainFields = (signals.uncertainFields?.length ?? 0) > 0
  return signals.confidence < LOW_COSTUME_ANALYSIS_CONFIDENCE || hasWarnings || hasUncertainFields
    ? 'needs_review'
    : 'success'
}

export function analysisResultRequiresConfirmation(status: CostumeAnalysisUiStatus): boolean {
  return status === 'success' || status === 'needs_review'
}

export function canSaveAfterCostumeAnalysis(
  status: CostumeAnalysisUiStatus,
  confirmed: boolean,
): boolean {
  if (status === 'analyzing') return false
  return !analysisResultRequiresConfirmation(status) || confirmed
}

const FIELD_LABELS: Record<string, string> = {
  dominantColors: '色',
  dominant_colors: '色',
  tone: 'トーン',
  pattern: '柄',
  silhouette: 'シルエット',
  formality: 'フォーマル度',
  garmentType: '衣装の種類',
  garment_type: '衣装の種類',
  shortDescription: '見た目の説明',
  short_description: '見た目の説明',
  suitStyle: 'スーツの形式',
  suit_style: 'スーツの形式',
  suitBreasting: '前釦',
  suit_breasting: '前釦',
  suitLapel: 'ラペル',
  suit_lapel: 'ラペル',
}

export function costumeAnalysisFieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}
