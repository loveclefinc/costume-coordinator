import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCostumes } from '../hooks/useCostumes'
import { useCloudSync } from '../hooks/useCloudSync'
import CostumeImageCloudPicker from '../components/CostumeImageCloudPicker'
import { getCloudImageFolderHelp } from '../cloud/import/cloud-import-help'
import { analyzeImage, compressImage, fileToDataUrl, classifyColorCategory, classifyTone } from '../utils/image-analysis'
import { enrichCostumeColors, normalizePattern, hexToThemeColorName } from '../utils/theme-colors'

const COLOR_CATEGORY_LABELS: Record<string, string> = {
  warm: '暖色',
  cool: '寒色',
  neutral: 'ニュートラル',
}

const TONE_LABELS: Record<string, string> = {
  pastel: 'パステル',
  vivid: '鮮やか',
  dark: '濃い',
  neutral: '落ち着いた',
}
import './AddCostume.css'

const PATTERN_OPTIONS = [
  { value: 'solid', label: '無地' },
  { value: 'floral', label: '花柄' },
  { value: 'stripe', label: 'ストライプ' },
  { value: 'dot', label: 'ドット' },
  { value: 'check', label: 'チェック' },
  { value: 'geometric', label: '幾何学模様' },
  { value: 'animal', label: 'アニマル柄' },
  { value: 'other', label: 'その他' },
]

const COSTUME_TYPE_OPTIONS = [
  { value: 'dress', label: 'ドレス' },
  { value: 'suit', label: 'スーツ' },
  { value: 'shirt', label: 'ワイシャツ' },
  { value: 'necktie', label: 'ネクタイ' },
  { value: 'bowtie', label: '蝶ネクタイ' },
  { value: 'accessory', label: '小物・アクセサリー' },
  { value: 'other', label: 'その他' },
]

export default function AddCostume() {
  const navigate = useNavigate()
  const { addCostume } = useCostumes()
  const { status: cloudStatus } = useCloudSync()
  const cloudConnected = cloudStatus.connected

  const [showCloudPicker, setShowCloudPicker] = useState(false)
  const [name, setName] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null)
  const [wearingPhotos, setWearingPhotos] = useState<string[]>([])
  const [primaryColor, setPrimaryColor] = useState('#FF6B9D')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [colorCategory, setColorCategory] = useState<'warm' | 'cool' | 'neutral'>('neutral')
  const [tone, setTone] = useState<'pastel' | 'vivid' | 'dark' | 'neutral'>('neutral')
  const [pattern, setPattern] = useState('solid')
  const [costumeType, setCostumeType] = useState('dress')
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  const applyImageDataUrl = async (dataUrl: string, sourceName?: string) => {
    setLoading(true)
    setError('')
    try {
      setImageUri(dataUrl)

      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], sourceName ?? 'image.jpg', { type: blob.type || 'image/jpeg' })
      const compressedBlob = await compressImage(file, 300, 300)
      setThumbnailUri(URL.createObjectURL(compressedBlob))

      setAnalyzing(true)
      const analysis = await analyzeImage(dataUrl)
      setPrimaryColor(analysis.primaryColor)
      if (analysis.secondaryColor) {
        setSecondaryColor(analysis.secondaryColor)
      }
      setColorCategory(analysis.colorCategory)
      setTone(analysis.tone)
      setAnalyzing(false)

      if (sourceName && !name.trim()) {
        setName(sourceName.replace(/\.[^.]+$/, ''))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '画像の読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      await applyImageDataUrl(dataUrl, file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    }
  }

  const handleCloudImageSelect = async (dataUrl: string, fileName: string) => {
    await applyImageDataUrl(dataUrl, fileName)
  }

  const handleAddWearingPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const dataUrl = await fileToDataUrl(file)
      setWearingPhotos([...wearingPhotos, dataUrl])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add wearing photo')
    }
  }

  const handleRemoveWearingPhoto = (index: number) => {
    setWearingPhotos(wearingPhotos.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('衣装名を入力してください')
      return
    }

    if (!imageUri) {
      setError('衣装の画像をアップロードしてください')
      return
    }

    try {
      setLoading(true)
      setError('')

      const colors = enrichCostumeColors([primaryColor, secondaryColor].filter(Boolean))
      await addCostume({
        name: name.trim(),
        image: imageUri,
        colors,
        tone,
        pattern: normalizePattern(pattern),
        season: [],
        type: costumeType,
      })
      navigate('/costumes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save costume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-costume-page">
      <h1>👗 衣装を追加</h1>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      {/* Image Upload Section */}
      <section className="section">
        <h2>📸 衣装の画像</h2>
        <div className="image-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
            id="image-input"
          />
          <label htmlFor="image-input" className="upload-label">
            {imageUri ? '画像を変更' : '画像をアップロード'}
          </label>
        </div>
        <div className="cloud-import-section">
          <button
            type="button"
            className={`cloud-import-button${cloudConnected ? '' : ' cloud-import-button--off'}`}
            disabled={loading || !cloudConnected}
            aria-disabled={loading || !cloudConnected}
            title={
              cloudConnected
                ? 'クラウド上の画像から衣装写真を選ぶ'
                : 'クラウド同期未接続のため利用できません'
            }
            onClick={() => cloudConnected && setShowCloudPicker(true)}
          >
            ☁️ クラウドからインポート
          </button>
          {showCloudPicker && cloudStatus.provider && (
            <CostumeImageCloudPicker
              provider={cloudStatus.provider}
              onClose={() => setShowCloudPicker(false)}
              onSelect={(dataUrl, fileName) => void handleCloudImageSelect(dataUrl, fileName)}
            />
          )}
          {cloudConnected && cloudStatus.provider ? (
            <p className="cloud-import-hint">
              {getCloudImageFolderHelp(cloudStatus.provider)}
            </p>
          ) : (
            <p className="cloud-import-hint">
              クラウド同期に未接続のため利用できません。
              <Link to="/settings">設定</Link>
              から Google Drive または Dropbox を接続してください。
            </p>
          )}
        </div>

        {imageUri && (
          <div className="image-preview">
            <img src={imageUri} alt="Costume" />
            {analyzing && <p className="analyzing">色を分析中...</p>}
          </div>
        )}
      </section>

      {/* Basic Info */}
      <section className="section">
        <h2>📝 基本情報</h2>
        <div className="form-group">
          <label>衣装名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 赤いドレス"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>タグ</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例: フォーマル, 春, 赤系（カンマで区切る）"
            disabled={loading}
          />
        </div>
      </section>

      {/* Color Section */}
      <section className="section add-costume-color-section">
        <h2>🎨 色</h2>
        <div className="add-costume-swatch-row">
          <div className="form-group add-costume-swatch-field">
            <label htmlFor="primary-color-input">主色</label>
            <div className="add-costume-swatch-control">
              <input
                id="primary-color-input"
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value)
                  setColorCategory(classifyColorCategory(e.target.value))
                  setTone(classifyTone(e.target.value))
                }}
                disabled={loading}
              />
              <span className="add-costume-color-value">
                {primaryColor}
                {hexToThemeColorName(primaryColor) && (
                  <span className="add-costume-theme-name">
                    {' '}
                    → {hexToThemeColorName(primaryColor)}
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="form-group add-costume-swatch-field">
            <label htmlFor="secondary-color-input">副色</label>
            <div className="add-costume-swatch-control">
              <input
                id="secondary-color-input"
                type="color"
                value={secondaryColor || '#ffffff'}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={loading}
              />
              <span className="add-costume-color-value">
                {secondaryColor || 'なし'}
                {secondaryColor && hexToThemeColorName(secondaryColor) && (
                  <span className="add-costume-theme-name">
                    {' '}
                    → {hexToThemeColorName(secondaryColor)}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="color-category-select">色カテゴリ</label>
          <select
            id="color-category-select"
            value={colorCategory}
            onChange={(e) => setColorCategory(e.target.value as 'warm' | 'cool' | 'neutral')}
            disabled={loading}
          >
            <option value="warm">暖色</option>
            <option value="cool">寒色</option>
            <option value="neutral">ニュートラル</option>
          </select>
          <p className="add-costume-field-hint">
            現在: {COLOR_CATEGORY_LABELS[colorCategory] ?? colorCategory}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="tone-select">トーン</label>
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as 'pastel' | 'vivid' | 'dark' | 'neutral')}
            disabled={loading}
          >
            <option value="pastel">パステル</option>
            <option value="vivid">鮮やか</option>
            <option value="dark">濃い</option>
            <option value="neutral">落ち着いた</option>
          </select>
          <p className="add-costume-field-hint">現在: {TONE_LABELS[tone] ?? tone}</p>
        </div>
      </section>

      {/* Costume Type Section */}
      <section className="section">
        <h2>📑 衣装の種類</h2>
        <div className="form-group">
          <label>衣装の種類 *</label>
          <select
            value={costumeType}
            onChange={(e) => setCostumeType(e.target.value)}
            disabled={loading}
          >
            {COSTUME_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Pattern Section */}
      <section className="section">
        <h2>🧵 柄</h2>
        <div className="form-group">
          <label>柄の種類</label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            disabled={loading}
          >
            {PATTERN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Wearing Photos Section */}
      <section className="section">
        <h2>👗 着用写真</h2>
        <div className="wearing-photo-upload">
          <input
            type="file"
            accept="image/*"
            onChange={handleAddWearingPhoto}
            disabled={loading}
            id="wearing-photo-input"
          />
          <label htmlFor="wearing-photo-input" className="upload-label">
            着用写真を追加
          </label>
        </div>

        {wearingPhotos.length > 0 && (
          <div className="wearing-photos-gallery">
            <h3>着用写真 ({wearingPhotos.length})</h3>
            <div className="photos-grid">
              {wearingPhotos.map((photo, index) => (
                <div key={index} className="photo-item">
                  <img src={photo} alt={`Wearing photo ${index + 1}`} />
                  <button
                    onClick={() => handleRemoveWearingPhoto(index)}
                    className="remove-photo-btn"
                    disabled={loading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={handleSave}
          disabled={loading || !name.trim() || !imageUri}
          className="save-button"
        >
          {loading ? '保存中...' : '保存'}
        </button>
        <button
          onClick={() => navigate('/costumes')}
          disabled={loading}
          className="cancel-button"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
