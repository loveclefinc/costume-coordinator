import { useEffect, useMemo, useState } from 'react'
import type { EventThemePreferencesPayload } from '../../shared/event-api-types'
import {
  analyzeImage,
  classifyTone,
  fileToDataUrl,
  hexToThemeColorName,
} from '../utils/image-analysis'
import {
  COLOR_LABELS,
  getAllowedThemeChoices,
  hasThemePreferences,
  mapAnalysisToThemeChoices,
  formatThemeSummary,
  PATTERN_LABELS,
  themeColorSwatchHex,
  TONE_LABELS,
} from '../utils/event-theme-ui'
import ImageColorEyedropper, { type EyedropperTarget } from './ImageColorEyedropper'
import './ThemeGuidedCostumeFields.css'

export interface ThemeGuidedCostumeValues {
  colors: string[]
  tone: string
  pattern: string
}

interface ThemeGuidedCostumeFieldsProps {
  theme?: EventThemePreferencesPayload
  values: ThemeGuidedCostumeValues
  onChange: (values: ThemeGuidedCostumeValues) => void
  photoPreviewUrl: string | null
  disabled?: boolean
}

export default function ThemeGuidedCostumeFields({
  theme,
  values,
  onChange,
  photoPreviewUrl,
  disabled = false,
}: ThemeGuidedCostumeFieldsProps) {
  const allowed = useMemo(() => getAllowedThemeChoices(theme), [theme])
  const themed = hasThemePreferences(theme)
  const [analyzing, setAnalyzing] = useState(false)
  const [eyedropperTarget, setEyedropperTarget] = useState<EyedropperTarget | null>(null)

  useEffect(() => {
    if (!photoPreviewUrl || !themed) return
    let cancelled = false

    const runAnalysis = async () => {
      setAnalyzing(true)
      try {
        const analysis = await analyzeImage(photoPreviewUrl)
        if (cancelled) return
        const mapped = mapAnalysisToThemeChoices(analysis, theme)
        onChange(mapped)
      } finally {
        if (!cancelled) setAnalyzing(false)
      }
    }

    void runAnalysis()
    return () => {
      cancelled = true
    }
  }, [photoPreviewUrl, themed, theme, onChange])

  const handleEyedropperPick = (_target: EyedropperTarget, hex: string) => {
    const name = hexToThemeColorName(hex)
    const color = name && allowed.colors.includes(name)
      ? name
      : allowed.colors[0]
    const detectedTone = classifyTone(hex)
    if (color) {
      onChange({
        ...values,
        colors: [color],
        tone: allowed.tones.includes(detectedTone) ? detectedTone : values.tone,
      })
    }
    setEyedropperTarget(null)
  }

  const toggleColor = (color: string) => {
    const next = values.colors.includes(color)
      ? values.colors.filter((c) => c !== color)
      : [color]
    onChange({ ...values, colors: next })
  }

  return (
    <div className="theme-guided-costume-fields">
      {themed && theme && (
        <div className="theme-guided-summary">
          <h4>このイベントのテーマ</h4>
          <ul>
            {formatThemeSummary(theme).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="theme-guided-hint">
            写真を選ぶと、テーマの範囲内で色を自動判定します。合わない場合は色ボタンやスポイトで調整してください。
          </p>
        </div>
      )}

      {photoPreviewUrl && (
        <div className="theme-guided-photo-preview">
          <ImageColorEyedropper
            imageUrl={photoPreviewUrl}
            activeTarget={eyedropperTarget}
            onPick={handleEyedropperPick}
            onCancel={() => setEyedropperTarget(null)}
            disabled={disabled}
          />
          {analyzing && <p className="theme-guided-analyzing">色を自動判定中…</p>}
          <button
            type="button"
            className={`theme-guided-eyedropper-btn${eyedropperTarget === 'primary' ? ' active' : ''}`}
            onClick={() => setEyedropperTarget(eyedropperTarget === 'primary' ? null : 'primary')}
            disabled={disabled}
          >
            🎯 写真から色を取得
          </button>
        </div>
      )}

      <div className="theme-guided-field">
        <span className="theme-guided-label">色{themed ? '（イベント設定から選択）' : ''}</span>
        {themed ? (
          <div className="theme-guided-color-grid">
            {allowed.colors.map((color) => (
              <button
                key={color}
                type="button"
                className={`theme-guided-color-btn${values.colors.includes(color) ? ' selected' : ''}`}
                style={{ backgroundColor: themeColorSwatchHex(color) }}
                title={COLOR_LABELS[color] ?? color}
                disabled={disabled}
                onClick={() => toggleColor(color)}
              />
            ))}
          </div>
        ) : (
          <input
            type="color"
            disabled={disabled}
            onChange={(e) => onChange({ ...values, colors: [e.target.value] })}
          />
        )}
        {values.colors.length > 0 && (
          <p className="theme-guided-selected">
            選択: {values.colors.map((c) => COLOR_LABELS[c] ?? c).join('、')}
          </p>
        )}
      </div>

      <label className="theme-guided-field">
        <span className="theme-guided-label">トーン</span>
        <select
          value={values.tone}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, tone: e.target.value })}
        >
          {allowed.tones.map((tone) => (
            <option key={tone} value={tone}>
              {TONE_LABELS[tone] ?? tone}
            </option>
          ))}
        </select>
      </label>

      <label className="theme-guided-field">
        <span className="theme-guided-label">柄</span>
        <select
          value={values.pattern}
          disabled={disabled}
          onChange={(e) => onChange({ ...values, pattern: e.target.value })}
        >
          {allowed.patterns.map((pattern) => (
            <option key={pattern} value={pattern}>
              {PATTERN_LABELS[pattern] ?? pattern}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export async function buildPhotoPreviewUrl(files: File[]): Promise<string | null> {
  if (files.length === 0) return null
  return fileToDataUrl(files[0])
}
