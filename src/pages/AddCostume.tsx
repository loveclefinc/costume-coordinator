import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCostumes } from '../hooks/useCostumes'
import { analyzeImage, compressImage, fileToDataUrl, classifyColorCategory, classifyTone } from '../utils/image-analysis'
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError('')

      // Convert to data URL
      const dataUrl = await fileToDataUrl(file)
      setImageUri(dataUrl)

      // Create thumbnail
      const compressedBlob = await compressImage(file, 300, 300)
      const thumbnailUrl = URL.createObjectURL(compressedBlob)
      setThumbnailUri(thumbnailUrl)

      // Analyze image
      setAnalyzing(true)
      const analysis = await analyzeImage(dataUrl)
      setPrimaryColor(analysis.primaryColor)
      if (analysis.secondaryColor) {
        setSecondaryColor(analysis.secondaryColor)
      }
      setColorCategory(analysis.colorCategory)
      setTone(analysis.tone)
      setAnalyzing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
      setLoading(false)
    } finally {
      setLoading(false)
    }
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

      const colors = [primaryColor, secondaryColor].filter(Boolean)
      await addCostume({
        name: name.trim(),
        image: imageUri,
        colors,
        tone,
        pattern,
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
          <button className="cloud-import-button" disabled={loading}>
            ☁️ クラウドからインポート
          </button>
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
      <section className="section">
        <h2>🎨 色</h2>
        <div className="color-grid">
          <div className="color-item">
            <label>主色</label>
            <div className="color-input-group">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => {
                  setPrimaryColor(e.target.value)
                  setColorCategory(classifyColorCategory(e.target.value))
                  setTone(classifyTone(e.target.value))
                }}
                disabled={loading}
              />
              <span className="color-value">{primaryColor}</span>
            </div>
          </div>

          <div className="color-item">
            <label>副色</label>
            <div className="color-input-group">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                disabled={loading}
              />
              <span className="color-value">{secondaryColor || 'なし'}</span>
            </div>
          </div>

          <div className="color-item">
            <label>色カテゴリ</label>
            <select
              value={colorCategory}
              onChange={(e) => setColorCategory(e.target.value as any)}
              disabled={loading}
            >
              <option value="warm">暖色</option>
              <option value="cool">寒色</option>
              <option value="neutral">ニュートラル</option>
            </select>
          </div>

          <div className="color-item">
            <label>トーン</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as any)}
              disabled={loading}
            >
              <option value="pastel">パステル</option>
              <option value="vivid">鮮やか</option>
              <option value="dark">濃い</option>
              <option value="neutral">落ち着いた</option>
            </select>
          </div>
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
