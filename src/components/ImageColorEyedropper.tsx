import { useCallback, useEffect, useRef, useState } from 'react'
import { sampleColorAtClientPoint } from '../utils/image-analysis'
import './ImageColorEyedropper.css'

export type EyedropperTarget = 'primary' | 'secondary'

interface ImageColorEyedropperProps {
  imageUrl: string
  activeTarget: EyedropperTarget | null
  onPick: (target: EyedropperTarget, color: string) => void
  onCancel: () => void
  disabled?: boolean
}

const TARGET_LABELS: Record<EyedropperTarget, string> = {
  primary: '主色',
  secondary: '副色',
}

export default function ImageColorEyedropper({
  imageUrl,
  activeTarget,
  onPick,
  onCancel,
  disabled = false,
}: ImageColorEyedropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [hoverColor, setHoverColor] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const isActive = activeTarget !== null && !disabled

  useEffect(() => {
    if (!isActive) {
      setHoverColor(null)
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onCancel])

  const previewAtPoint = useCallback(async (clientX: number, clientY: number) => {
    const img = imgRef.current
    if (!img || !isActive) return
    const color = await sampleColorAtClientPoint(imageUrl, img, clientX, clientY)
    setHoverColor(color)
  }, [imageUrl, isActive])

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || picking) return
    void previewAtPoint(e.clientX, e.clientY)
  }

  const handlePointerLeave = () => {
    if (!picking) setHoverColor(null)
  }

  const handlePointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isActive || !activeTarget || picking) return
    e.preventDefault()
    const img = imgRef.current
    if (!img) return

    setPicking(true)
    try {
      const color = await sampleColorAtClientPoint(imageUrl, img, e.clientX, e.clientY)
      if (color) {
        onPick(activeTarget, color)
      }
    } finally {
      setPicking(false)
      setHoverColor(null)
    }
  }

  return (
    <div
      className={`image-eyedropper${isActive ? ' image-eyedropper--active' : ''}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
    >
      <img ref={imgRef} src={imageUrl} alt="衣装プレビュー" draggable={false} />

      {isActive && (
        <div className="image-eyedropper-overlay" aria-hidden="true">
          <p className="image-eyedropper-hint">
            {TARGET_LABELS[activeTarget]}を取得: 画像をタップ／クリック（Escでキャンセル）
          </p>
          {hoverColor && (
            <div className="image-eyedropper-preview">
              <span
                className="image-eyedropper-swatch"
                style={{ backgroundColor: hoverColor }}
              />
              <span className="image-eyedropper-hex">{hoverColor}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
