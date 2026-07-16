import {
  analysisResultRequiresConfirmation,
  costumeAnalysisFieldLabel,
  type CostumeAnalysisUiStatus,
} from '../utils/costume-analysis-ui'

export const COSTUME_ANALYSIS_DISCLOSURE_TEXT =
  '写真の確認はこの端末内で行い、外部のAIサービスへ写真を送信しません。色・トーン・判定できる柄だけを入力候補にし、衣装の種類やシルエットは利用者が確認します。'

interface CostumePhotoAnalysisPanelProps {
  status: CostumeAnalysisUiStatus
  canAnalyze: boolean
  disabled?: boolean
  confidence?: number
  warnings: string[]
  uncertainFields: string[]
  errorMessage?: string
  confirmed: boolean
  onAnalyze: () => void
  onManual: () => void
  onConfirmedChange: (checked: boolean) => void
}

const STATUS_LABELS: Record<CostumeAnalysisUiStatus, string> = {
  idle: '未解析',
  analyzing: '確認中',
  success: '入力済み',
  needs_review: '要確認',
  error: '確認失敗',
  manual: '手動入力',
}

function statusMessage(status: CostumeAnalysisUiStatus): string {
  switch (status) {
    case 'analyzing':
      return '端末内で写真の色や模様を確認しています。'
    case 'success':
      return '色・トーン・柄の候補を入力しました。内容を確認し、必要に応じて修正してください。'
    case 'needs_review':
      return '写真だけでは判定が難しい項目があります。内容を確認して修正してください。'
    case 'error':
      return '写真から入力できませんでした。フォームはそのまま手入力できます。'
    case 'manual':
      return '手入力に切り替えました。内容を修正して保存できます。'
    default:
      return '写真を選ぶと、この端末内で色・トーン・柄の候補を入力します。'
  }
}

export default function CostumePhotoAnalysisPanel({
  status,
  canAnalyze,
  disabled = false,
  confidence,
  warnings,
  uncertainFields,
  errorMessage,
  confirmed,
  onAnalyze,
  onManual,
  onConfirmedChange,
}: CostumePhotoAnalysisPanelProps) {
  const isAnalyzing = status === 'analyzing'
  const hasResult = confidence !== undefined
  const requiresConfirmation = analysisResultRequiresConfirmation(status)

  return (
    <section
      className={`costume-analysis-card costume-analysis-card--${status}`}
      aria-labelledby="costume-analysis-heading"
    >
      <div className="costume-analysis-heading-row">
        <h3 id="costume-analysis-heading">端末内で写真を確認</h3>
        <span className="costume-analysis-status-badge">{STATUS_LABELS[status]}</span>
      </div>

      <div className="costume-analysis-live" aria-live="polite" aria-atomic="true">
        <p>{statusMessage(status)}</p>
      </div>

      <p id="costume-analysis-disclosure" className="costume-analysis-disclosure">
        {COSTUME_ANALYSIS_DISCLOSURE_TEXT}
      </p>

      {status === 'error' && errorMessage && (
        <p className="costume-analysis-error" role="alert">{errorMessage}</p>
      )}

      {hasResult && (
        <div className="costume-analysis-review">
          <p className="costume-analysis-confidence">
            柄候補の確かさ: <strong>{Math.round(confidence * 100)}%</strong>
          </p>

          {uncertainFields.length > 0 && (
            <div className="costume-analysis-notice">
              <strong>確認が必要な項目</strong>
              <ul>
                {uncertainFields.map((field) => (
                  <li key={field}>{costumeAnalysisFieldLabel(field)}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="costume-analysis-notice">
              <strong>写真から判断しにくかった点</strong>
              <ul>
                {warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {requiresConfirmation && (
            <label className="costume-analysis-confirmation">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => onConfirmedChange(event.target.checked)}
                disabled={disabled || isAnalyzing}
              />
              <span>入力された候補を確認し、必要な箇所を修正しました</span>
            </label>
          )}
        </div>
      )}

      <div className="costume-analysis-actions">
        <button
          type="button"
          className="costume-analysis-primary"
          onClick={onAnalyze}
          disabled={disabled || isAnalyzing || !canAnalyze}
          aria-describedby="costume-analysis-disclosure"
        >
          {isAnalyzing ? '端末内で確認中…' : 'もう一度写真から入力'}
        </button>
        <button
          type="button"
          className="costume-analysis-manual"
          onClick={onManual}
          disabled={disabled && !isAnalyzing}
        >
          {status === 'manual' ? '手入力を続ける' : '手入力に切り替える'}
        </button>
      </div>

      {!canAnalyze && status !== 'analyzing' && (
        <p className="add-costume-field-hint">写真を選ぶと端末内で入力候補を作れます。</p>
      )}
    </section>
  )
}
