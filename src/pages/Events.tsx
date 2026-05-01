import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { ConcertLink } from '../components/ConcertLink'
import { EventThemePreferences } from '../utils/storage'
import './Events.css'

// Color options for theme preferences
const COLOR_OPTIONS = [
  'red', 'pink', 'purple', 'blue', 'cyan', 'green',
  'yellow', 'orange', 'brown', 'gray', 'white', 'black'
]

// Tone options
const TONE_OPTIONS = ['pastel', 'vivid', 'dark', 'neutral']
const TONE_LABELS: Record<string, string> = {
  'pastel': 'パステル',
  'vivid': 'ビビッド',
  'dark': 'ダーク',
  'neutral': 'ニュートラル'
}

// Pattern options
const PATTERN_OPTIONS = ['plain', 'floral', 'stripe', 'dot', 'check', 'geometric', 'animal']

export default function Events() {
  const { events, loading, error, addEvent, deleteEvent } = useEvents()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
  })

  // Theme preferences state
  const [themePrefs, setThemePrefs] = useState<EventThemePreferences>({
    colorUnification: 'unified',
    colors1stChoice: [],
    colors2ndChoice: [],
    colors3rdChoice: [],
    tones1stChoice: [],
    tones2ndChoice: [],
    tones3rdChoice: [],
    patterns1stChoice: [],
    patterns2ndChoice: [],
    patterns3rdChoice: [],
    avoidSimilarColors: false,
    recentUsageExcludeDays: 30,
  })

  const [showThemeSettings, setShowThemeSettings] = useState(false)

  // Toggle color selection
  const toggleColor = (color: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `colors${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(color)
      ? current.filter(c => c !== color)
      : [...current, color]
    setThemePrefs(prev => ({
      ...prev,
      [key]: updated,
    }))
  }

  // Toggle tone selection
  const toggleTone = (tone: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `tones${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(tone)
      ? current.filter(t => t !== tone)
      : [...current, tone]
    setThemePrefs(prev => ({
      ...prev,
      [key]: updated,
    }))
  }

  // Toggle pattern selection
  const togglePattern = (pattern: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `patterns${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(pattern)
      ? current.filter(p => p !== pattern)
      : [...current, pattern]
    setThemePrefs(prev => ({
      ...prev,
      [key]: updated,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.date) return

    try {
      await addEvent({
        name: formData.name,
        date: formData.date,
        description: formData.description,
        participants: [],
        costumes: {},
        themePreferences: themePrefs,
      })
      setFormData({ name: '', date: '', description: '' })
      setThemePrefs({
        colors1stChoice: [],
        colors2ndChoice: [],
        colors3rdChoice: [],
        tones1stChoice: [],
        tones2ndChoice: [],
        tones3rdChoice: [],
        patterns1stChoice: [],
        patterns2ndChoice: [],
        patterns3rdChoice: [],
        avoidSimilarColors: false,
        recentUsageExcludeDays: 30,
      })
      setShowForm(false)
      setShowThemeSettings(false)
    } catch (err) {
      console.error('Failed to add event:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('このイベントを削除しますか？')) {
      try {
        await deleteEvent(id)
      } catch (err) {
        console.error('Failed to delete event:', err)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>📅 イベント管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="create-button"
        >
          {showForm ? '× キャンセル' : '+ 新しいイベント'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          エラー: {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="name">イベント名 *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例: 2024年春コンサート"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">日付 *</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">説明</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="イベントの詳細を入力"
              rows={3}
            />
          </div>

          {/* Theme Settings Toggle */}
          <div className="form-group">
            <button
              type="button"
              onClick={() => setShowThemeSettings(!showThemeSettings)}
              className="theme-settings-toggle"
            >
              {showThemeSettings ? '▼ テーマ設定を非表示' : '▶ テーマ設定を表示'}
            </button>
          </div>

          {/* Theme Settings Section */}
          {showThemeSettings && (
            <div className="theme-settings-section">
              {/* Color Unification Strategy */}
              <div className="theme-subsection">
                <h4>色味の統一方針</h4>
                <div className="preference-group">
                  <label>
                    <input
                      type="radio"
                      name="colorUnification"
                      value="unified"
                      checked={themePrefs.colorUnification === 'unified'}
                      onChange={() => setThemePrefs(prev => ({ ...prev, colorUnification: 'unified' }))}
                    />
                    色を統一する（同じ色系で揃える）
                  </label>
                </div>
                <div className="preference-group">
                  <label>
                    <input
                      type="radio"
                      name="colorUnification"
                      value="varied"
                      checked={themePrefs.colorUnification === 'varied'}
                      onChange={() => setThemePrefs(prev => ({ ...prev, colorUnification: 'varied' }))}
                    />
                    色をバラける（異なる色を組み合わせる）
                  </label>
                </div>
              </div>

              {/* Color Preferences */}
              <div className="theme-subsection">
                <h4>色の好み</h4>
                
                <div className="preference-group">
                  <label>第1希望</label>
                  <div className="color-grid">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={`color-1st-${color}`}
                        type="button"
                        onClick={() => toggleColor(color, '1st')}
                        className={`color-button ${themePrefs.colors1stChoice.includes(color) ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第2希望</label>
                  <div className="color-grid">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={`color-2nd-${color}`}
                        type="button"
                        onClick={() => toggleColor(color, '2nd')}
                        className={`color-button ${themePrefs.colors2ndChoice.includes(color) ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第3希望</label>
                  <div className="color-grid">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={`color-3rd-${color}`}
                        type="button"
                        onClick={() => toggleColor(color, '3rd')}
                        className={`color-button ${themePrefs.colors3rdChoice.includes(color) ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tone Preferences */}
              <div className="theme-subsection">
                <h4>トーンの選択</h4>
                
                <div className="preference-group">
                  <label>第1希望</label>
                  <div className="option-grid">
                    {TONE_OPTIONS.map(tone => (
                      <button
                        key={`tone-1st-${tone}`}
                        type="button"
                        onClick={() => toggleTone(tone, '1st')}
                        className={`option-button ${themePrefs.tones1stChoice.includes(tone) ? 'selected' : ''}`}
                      >
                        {TONE_LABELS[tone]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第2希望</label>
                  <div className="option-grid">
                    {TONE_OPTIONS.map(tone => (
                      <button
                        key={`tone-2nd-${tone}`}
                        type="button"
                        onClick={() => toggleTone(tone, '2nd')}
                        className={`option-button ${themePrefs.tones2ndChoice.includes(tone) ? 'selected' : ''}`}
                      >
                        {TONE_LABELS[tone]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第3希望</label>
                  <div className="option-grid">
                    {TONE_OPTIONS.map(tone => (
                      <button
                        key={`tone-3rd-${tone}`}
                        type="button"
                        onClick={() => toggleTone(tone, '3rd')}
                        className={`option-button ${themePrefs.tones3rdChoice.includes(tone) ? 'selected' : ''}`}
                      >
                        {TONE_LABELS[tone]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pattern Preferences */}
              <div className="theme-subsection">
                <h4>柄の選択</h4>
                
                <div className="preference-group">
                  <label>第1希望</label>
                  <div className="option-grid">
                    {PATTERN_OPTIONS.map(pattern => (
                      <button
                        key={`pattern-1st-${pattern}`}
                        type="button"
                        onClick={() => togglePattern(pattern, '1st')}
                        className={`option-button ${themePrefs.patterns1stChoice.includes(pattern) ? 'selected' : ''}`}
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第2希望</label>
                  <div className="option-grid">
                    {PATTERN_OPTIONS.map(pattern => (
                      <button
                        key={`pattern-2nd-${pattern}`}
                        type="button"
                        onClick={() => togglePattern(pattern, '2nd')}
                        className={`option-button ${themePrefs.patterns2ndChoice.includes(pattern) ? 'selected' : ''}`}
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="preference-group">
                  <label>第3希望</label>
                  <div className="option-grid">
                    {PATTERN_OPTIONS.map(pattern => (
                      <button
                        key={`pattern-3rd-${pattern}`}
                        type="button"
                        onClick={() => togglePattern(pattern, '3rd')}
                        className={`option-button ${themePrefs.patterns3rdChoice.includes(pattern) ? 'selected' : ''}`}
                      >
                        {pattern}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="theme-subsection">
                <h4>追加設定</h4>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={themePrefs.avoidSimilarColors}
                      onChange={(e) => setThemePrefs(prev => ({
                        ...prev,
                        avoidSimilarColors: e.target.checked,
                      }))}
                    />
                    似た色を避ける
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="recentUsageExcludeDays">
                    直近使用除外日数:
                    <input
                      id="recentUsageExcludeDays"
                      type="number"
                      min="0"
                      max="365"
                      value={themePrefs.recentUsageExcludeDays}
                      onChange={(e) => setThemePrefs(prev => ({
                        ...prev,
                        recentUsageExcludeDays: parseInt(e.target.value) || 0,
                      }))}
                    />
                    日
                  </label>
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="submit-button">
            イベントを作成
          </button>
        </form>
      )}

      {sortedEvents.length === 0 ? (
        <div className="empty-state">
          <p>イベントがまだ作成されていません</p>
          <button
            onClick={() => setShowForm(true)}
            className="cta-button"
          >
            最初のイベントを作成する
          </button>
          <div className="concert-section">
            <p>コンサート情報を確認:</p>
            <ConcertLink variant="button" size="medium" />
          </div>
        </div>
      ) : (
        <div className="events-list">
          {sortedEvents.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-header">
                <div>
                  <h3>{event.name}</h3>
                  <p className="event-date">
                    📅 {new Date(event.date).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </div>

              {event.description && (
                <p className="event-description">{event.description}</p>
              )}

              {event.themePreferences && (
                <div className="event-theme-summary">
                  <p className="theme-label">テーマ設定:</p>
                  <div className="theme-info">
                    {event.themePreferences.colors1stChoice.length > 0 && (
                      <span>色: {event.themePreferences.colors1stChoice.join(', ')}</span>
                    )}
                    {event.themePreferences.tones1stChoice.length > 0 && (
                      <span>トーン: {event.themePreferences.tones1stChoice.join(', ')}</span>
                    )}
                    {event.themePreferences.patterns1stChoice.length > 0 && (
                      <span>柄: {event.themePreferences.patterns1stChoice.join(', ')}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="event-stats">
                <span>参加者: {event.participants.length}</span>
                <span>衣装割当: {Object.keys(event.costumes).length}</span>
              </div>

              <div className="event-actions">
                <Link to={`/events/${event.id}`} className="action-button view">
                  詳細を見る
                </Link>
                <button
                  onClick={() => handleDelete(event.id)}
                  className="action-button delete"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
