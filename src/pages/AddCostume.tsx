import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCostumes } from '../hooks/useCostumes'
import './AddCostume.css'

const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF',
  '#000000', '#FFD700', '#C0C0C0', '#4B0082'
]

const TONES = ['warm', 'cool', 'neutral']
const PATTERNS = ['solid', 'striped', 'floral', 'geometric', 'other']
const SEASONS = ['spring', 'summer', 'autumn', 'winter']

export default function AddCostume() {
  const navigate = useNavigate()
  const { addCostume, error: storageError } = useCostumes()

  const [formData, setFormData] = useState({
    name: '',
    image: '',
    colors: [] as string[],
    tone: 'neutral',
    pattern: 'solid',
    season: [] as string[],
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData(prev => ({
          ...prev,
          image: event.target?.result as string
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const toggleColor = (color: string) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }))
  }

  const toggleSeason = (season: string) => {
    setFormData(prev => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter(s => s !== season)
        : [...prev.season, season]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('衣装名を入力してください')
      return
    }

    if (formData.colors.length === 0) {
      setError('少なくとも1つの色を選択してください')
      return
    }

    if (formData.season.length === 0) {
      setError('少なくとも1つの季節を選択してください')
      return
    }

    setLoading(true)
    try {
      await addCostume({
        name: formData.name,
        image: formData.image,
        colors: formData.colors,
        tone: formData.tone,
        pattern: formData.pattern,
        season: formData.season,
      })
      navigate('/costumes')
    } catch (err) {
      setError(err instanceof Error ? err.message : '衣装の追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-costume-page">
      <div className="form-container">
        <h1>👗 新しい衣装を追加</h1>

        {(error || storageError) && (
          <div className="error-message">
            {error || storageError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="costume-form">
          {/* Name */}
          <div className="form-group">
            <label htmlFor="name">衣装名 *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例: 赤いドレス"
              required
            />
          </div>

          {/* Image */}
          <div className="form-group">
            <label htmlFor="image">写真</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
            />
            {formData.image && (
              <div className="image-preview">
                <img src={formData.image} alt="Preview" />
              </div>
            )}
          </div>

          {/* Colors */}
          <div className="form-group">
            <label>色 * (複数選択可)</label>
            <div className="color-palette">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`color-button ${formData.colors.includes(color) ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => toggleColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="selected-colors">
              {formData.colors.map(color => (
                <span key={color} className="color-chip" style={{ backgroundColor: color }}>
                  {color}
                </span>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="form-group">
            <label htmlFor="tone">トーン</label>
            <select
              id="tone"
              value={formData.tone}
              onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
            >
              {TONES.map(tone => (
                <option key={tone} value={tone}>
                  {tone === 'warm' ? '暖色' : tone === 'cool' ? '寒色' : 'ニュートラル'}
                </option>
              ))}
            </select>
          </div>

          {/* Pattern */}
          <div className="form-group">
            <label htmlFor="pattern">柄</label>
            <select
              id="pattern"
              value={formData.pattern}
              onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
            >
              {PATTERNS.map(pattern => (
                <option key={pattern} value={pattern}>
                  {pattern === 'solid' ? '無地' : pattern === 'striped' ? 'ストライプ' : pattern === 'floral' ? '花柄' : pattern === 'geometric' ? '幾何学模様' : 'その他'}
                </option>
              ))}
            </select>
          </div>

          {/* Seasons */}
          <div className="form-group">
            <label>季節 * (複数選択可)</label>
            <div className="season-buttons">
              {SEASONS.map(season => (
                <button
                  key={season}
                  type="button"
                  className={`season-button ${formData.season.includes(season) ? 'selected' : ''}`}
                  onClick={() => toggleSeason(season)}
                >
                  {season === 'spring' ? '春' : season === 'summer' ? '夏' : season === 'autumn' ? '秋' : '冬'}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '追加中...' : '衣装を追加'}
            </button>
            <button
              type="button"
              className="cancel-button"
              onClick={() => navigate('/costumes')}
              disabled={loading}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
