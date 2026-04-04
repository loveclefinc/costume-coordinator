import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { ConcertLink } from '../components/ConcertLink'
import './Events.css'

export default function Events() {
  const { events, loading, error, addEvent, deleteEvent } = useEvents()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
  })

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
      })
      setFormData({ name: '', date: '', description: '' })
      setShowForm(false)
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
