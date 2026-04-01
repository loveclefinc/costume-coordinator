import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useEvents } from '../hooks/useEvents'
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import { optimizeCostumeAssignments, calculateHarmonyScore } from '../utils/optimizer'
import './EventDetail.css'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getEvent, updateEvent } = useEvents()
  const { costumes } = useCostumes()

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [optimizationResults, setOptimizationResults] = useState<any[]>([])
  const [harmonyScore, setHarmonyScore] = useState(0)
  const [newParticipant, setNewParticipant] = useState('')
  const [participantPreferences, setParticipantPreferences] = useState<{ [key: string]: string[] }>({})

  useEffect(() => {
    const loadEvent = async () => {
      try {
        if (!id) throw new Error('Event ID not found')
        const eventData = await getEvent(id)
        if (!eventData) throw new Error('Event not found')
        setEvent(eventData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id, getEvent])

  const handleAddParticipant = async () => {
    if (!newParticipant.trim() || !event) return

    try {
      const updatedEvent = {
        ...event,
        participants: [...event.participants, newParticipant],
      }
      await updateEvent(event.id, updatedEvent)
      setEvent(updatedEvent)
      setNewParticipant('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant')
    }
  }

  const handleRemoveParticipant = async (participant: string) => {
    if (!event) return

    try {
      const updatedEvent = {
        ...event,
        participants: event.participants.filter((p: string) => p !== participant),
      }
      await updateEvent(event.id, updatedEvent)
      setEvent(updatedEvent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participant')
    }
  }

  const handleSetPreference = (participant: string, costumeId: string, rank: number) => {
    const prefs = participantPreferences[participant] || []
    const newPrefs = [...prefs]
    if (newPrefs[rank] === costumeId) {
      newPrefs.splice(rank, 1)
    } else {
      newPrefs[rank] = costumeId
    }
    setParticipantPreferences(prev => ({
      ...prev,
      [participant]: newPrefs.filter(Boolean),
    }))
  }

  const handleOptimize = async () => {
    if (!event) return

    try {
      const usageHistory = await storage.getRecentUsageHistory(30)

      const participants = event.participants.map((p: string) => ({
        id: p,
        name: p,
        preferences: participantPreferences[p] || [],
      }))

      const results = optimizeCostumeAssignments({
        participants,
        costumes,
        usageHistory,
      })

      setOptimizationResults(results)
      setHarmonyScore(calculateHarmonyScore(results))

      // Save assignments
      const assignments: { [key: string]: string } = {}
      results.forEach(r => {
        assignments[r.participantId] = r.costumeId
      })

      const updatedEvent = {
        ...event,
        costumes: assignments,
      }
      await updateEvent(event.id, updatedEvent)
      setEvent(updatedEvent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>イベントが見つかりません</p>
        <button onClick={() => navigate('/events')} className="back-button">
          イベント一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="event-detail-page">
      <button onClick={() => navigate('/events')} className="back-button">
        ← 戻る
      </button>

      <div className="event-detail-header">
        <h1>{event.name}</h1>
        <p className="event-date">📅 {new Date(event.date).toLocaleDateString('ja-JP')}</p>
        {event.description && <p className="event-description">{event.description}</p>}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="event-detail-content">
        {/* Participants Section */}
        <section className="section">
          <h2>👥 参加者</h2>
          <div className="participant-input">
            <input
              type="text"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              placeholder="参加者名を入力"
              onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
            />
            <button onClick={handleAddParticipant} className="add-button">
              追加
            </button>
          </div>

          <div className="participants-list">
            {event.participants.length === 0 ? (
              <p className="empty-text">参加者がまだ追加されていません</p>
            ) : (
              event.participants.map((participant: string) => (
                <div key={participant} className="participant-card">
                  <div className="participant-info">
                    <h3>{participant}</h3>
                    {event.costumes[participant] && (
                      <p className="assigned-costume">
                        割当: {costumes.find(c => c.id === event.costumes[participant])?.name || 'Unknown'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(participant)}
                    className="remove-button"
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Preferences Section */}
        {event.participants.length > 0 && costumes.length > 0 && (
          <section className="section">
            <h2>🎨 衣装の希望順位</h2>
            <div className="preferences-grid">
              {event.participants.map((participant: string) => (
                <div key={participant} className="preference-card">
                  <h3>{participant}</h3>
                  <div className="preference-ranks">
                    {[0, 1, 2, 3, 4].map((rank) => (
                      <div key={rank} className="rank-group">
                        <label>第{rank + 1}希望</label>
                        <select
                          value={participantPreferences[participant]?.[rank] || ''}
                          onChange={(e) => handleSetPreference(participant, e.target.value, rank)}
                        >
                          <option value="">選択してください</option>
                          {costumes.map(costume => (
                            <option key={costume.id} value={costume.id}>
                              {costume.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Optimization Section */}
        {event.participants.length > 0 && costumes.length > 0 && (
          <section className="section">
            <div className="optimization-header">
              <h2>⚡ 最適化</h2>
              <button onClick={handleOptimize} className="optimize-button">
                最適な組み合わせを生成
              </button>
            </div>

            {optimizationResults.length > 0 && (
              <>
                <div className="harmony-score">
                  <p>調和スコア: <strong>{(harmonyScore * 100).toFixed(1)}%</strong></p>
                </div>

                <div className="optimization-results">
                  {optimizationResults.map((result) => (
                    <div key={result.participantId} className="result-card">
                      <div className="result-header">
                        <h4>{result.participantName}</h4>
                        <span className="score">{(result.score * 100).toFixed(0)}点</span>
                      </div>

                      <div className="result-costume">
                        {result.costume.image && (
                          <img src={result.costume.image} alt={result.costume.name} />
                        )}
                        <div className="costume-details">
                          <h5>{result.costume.name}</h5>
                          <div className="colors">
                            {result.costume.colors.map((color) => (
                              <span
                                key={color}
                                className="color-dot"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                          <p className="tone">{result.costume.tone}</p>
                        </div>
                      </div>

                      <div className="reasons">
                        {result.reason.map((r, i) => (
                          <p key={i}>• {r}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
