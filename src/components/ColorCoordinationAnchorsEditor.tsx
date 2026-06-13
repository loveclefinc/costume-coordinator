import { useState } from 'react'
import ImageColorEyedropper, { type EyedropperTarget } from './ImageColorEyedropper'
import type { ColorCoordinationAnchor } from '../utils/storage'
import {
  COLOR_COORDINATION_MODE_LABELS,
  createEmptyColorAnchor,
} from '../utils/color-coordination'
import { THEME_COLOR_NAMES, THEME_COLOR_REF_HEX } from '../utils/theme-colors'
import './ColorCoordinationAnchorsEditor.css'

const COLOR_OPTIONS = [...THEME_COLOR_NAMES]

interface ColorCoordinationAnchorsEditorProps {
  anchors: ColorCoordinationAnchor[]
  onChange: (anchors: ColorCoordinationAnchor[]) => void
}

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default function ColorCoordinationAnchorsEditor({
  anchors,
  onChange,
}: ColorCoordinationAnchorsEditorProps) {
  const [eyedropper, setEyedropper] = useState<{
    anchorId: string
    target: EyedropperTarget
  } | null>(null)

  const updateAnchor = (id: string, patch: Partial<ColorCoordinationAnchor>) => {
    onChange(anchors.map((anchor) => (anchor.id === id ? { ...anchor, ...patch } : anchor)))
  }

  const removeAnchor = (id: string) => {
    onChange(anchors.filter((anchor) => anchor.id !== id))
  }

  const toggleColor = (id: string, color: string) => {
    const anchor = anchors.find((entry) => entry.id === id)
    if (!anchor) return
    const colors = anchor.colors.includes(color)
      ? anchor.colors.filter((entry) => entry !== color)
      : [...anchor.colors, color]
    updateAnchor(id, { colors })
  }

  const handleImageUpload = async (id: string, file: File | undefined) => {
    if (!file) return
    const image = await readImageAsDataUrl(file)
    updateAnchor(id, { image })
  }

  const activeAnchor = eyedropper
    ? anchors.find((entry) => entry.id === eyedropper.anchorId)
    : undefined

  return (
    <div className="color-anchors-editor">
      <p className="color-anchors-lead">
        ゲストやソリストなど、すでに衣装が決まっている出演者の色を基準に設定できます。
        「重ならない」は似た色を避け、「合わせる」は似た色を優先します。写真から色を拾うこともできます。
      </p>

      {anchors.map((anchor) => (
        <div key={anchor.id} className="color-anchor-card">
          <div className="color-anchor-header">
            <input
              type="text"
              className="color-anchor-label-input"
              value={anchor.label}
              onChange={(e) => updateAnchor(anchor.id, { label: e.target.value })}
              placeholder="例: ゲスト衣装、ソリスト"
              maxLength={80}
            />
            <button
              type="button"
              className="color-anchor-remove"
              onClick={() => removeAnchor(anchor.id)}
            >
              削除
            </button>
          </div>

          <div className="color-anchor-mode">
            <label>
              <input
                type="radio"
                name={`anchor-mode-${anchor.id}`}
                checked={anchor.mode === 'avoid'}
                onChange={() => updateAnchor(anchor.id, { mode: 'avoid' })}
              />
              {COLOR_COORDINATION_MODE_LABELS.avoid}
            </label>
            <label>
              <input
                type="radio"
                name={`anchor-mode-${anchor.id}`}
                checked={anchor.mode === 'match'}
                onChange={() => updateAnchor(anchor.id, { mode: 'match' })}
              />
              {COLOR_COORDINATION_MODE_LABELS.match}
            </label>
          </div>

          <div className="color-anchor-photo-row">
            <label className="color-anchor-photo-label">
              参考写真（任意）
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleImageUpload(anchor.id, e.target.files?.[0])}
              />
            </label>
            {anchor.image && (
              <div className="color-anchor-photo-preview">
                <img src={anchor.image} alt={anchor.label || '基準衣装'} />
                <button
                  type="button"
                  className="color-anchor-eyedropper-btn"
                  onClick={() => setEyedropper({ anchorId: anchor.id, target: 'primary' })}
                >
                  写真から色を拾う
                </button>
              </div>
            )}
          </div>

          <div className="color-anchor-colors">
            <span className="color-anchor-colors-label">基準色</span>
            <div className="theme-color-picker-grid">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={`${anchor.id}-${color}`}
                  type="button"
                  onClick={() => toggleColor(anchor.id, color)}
                  className={`color-button ${anchor.colors.includes(color) ? 'selected' : ''}`}
                  style={{ backgroundColor: THEME_COLOR_REF_HEX[color] }}
                  title={color}
                />
              ))}
            </div>
            {anchor.colors.length > 0 && (
              <p className="color-anchor-selected">選択: {anchor.colors.join(', ')}</p>
            )}
          </div>
        </div>
      ))}

      <button
        type="button"
        className="color-anchor-add"
        onClick={() => onChange([...anchors, createEmptyColorAnchor()])}
      >
        基準衣装を追加
      </button>

      {activeAnchor?.image && eyedropper && (
        <ImageColorEyedropper
          imageUrl={activeAnchor.image}
          activeTarget={eyedropper.target}
          onPick={(_target, color) => {
            const current = activeAnchor.colors
            if (!current.includes(color)) {
              updateAnchor(activeAnchor.id, { colors: [...current, color] })
            }
            setEyedropper(null)
          }}
          onCancel={() => setEyedropper(null)}
        />
      )}
    </div>
  )
}
