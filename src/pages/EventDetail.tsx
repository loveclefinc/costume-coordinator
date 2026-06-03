import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import { optimizeCostumeAssignments, calculateHarmonyScore } from '../utils/optimizer'
import { recordCostumeUsage } from '../utils/usage-tracker'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import { shareEvent, exportEventAsCSV, exportEventAsJSON, generateEventQRCode, shareEventWithQR } from '../utils/share-export'
import './EventDetail.css'

// Tone labels for display
const TONE_LABELS: Record<string, string> = {
  'pastel': 'パステル',
  'vivid': 'ビビッド',
  'dark': 'ダーク',
  'neutral': 'ニュートラル'
}

const translateTones = (tones: string[]): string => {
  return tones.map(tone => TONE_LABELS[tone] || tone).join(', ')
}

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
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

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
        themePreferences: event.themePreferences,
      })

      setOptimizationResults(results.assignments)
      setHarmonyScore(results.harmonyScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize')
    }
  }

  const handleConfirmAssignments = async () => {
    if (!event || optimizationResults.length === 0) return

    setIsSaving(true)
    try {
      const costumesMap: { [key: string]: string } = {}
      optimizationResults.forEach(result => {
        costumesMap[result.participantName] = result.costume.id
      })

      const updatedEvent = {
        ...event,
        costumes: costumesMap,
        confirmed: true,
      }

      await updateEvent(event.id, updatedEvent)

      for (const result of optimizationResults) {
        await recordCostumeUsage(result.costume.id, event.id)
      }

      setIsConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm assignments')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShareEvent = async () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? costumes.find(c => c.id === event.costumes[name])?.name : undefined,
        })),
        costumes: [],
      }
      await shareEvent(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share event')
    }
  }

  const handleExportCSV = () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? costumes.find(c => c.id === event.costumes[name])?.name : undefined,
        })),
        costumes: optimizationResults.map(r => ({
          participantId: r.participantId,
          participantName: r.participantName,
          costumeId: r.costume.id,
          costumeName: r.costume.name,
          colors: r.costume.colors,
        })),
      }
      exportEventAsCSV(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    }
  }

  const handleExportJSON = () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? costumes.find(c => c.id === event.costumes[name])?.name : undefined,
        })),
        costumes: optimizationResults.map(r => ({
          participantId: r.participantId,
          participantName: r.participantName,
          costumeId: r.costume.id,
          costumeName: r.costume.name,
          colors: r.costume.colors,
        })),
      }
      exportEventAsJSON(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export JSON')
    }
  }

  const handleGenerateQR = async () => {
    if (!event) return
    try {
      const url = await generateEventQRCode(event.id, event.name)
      setQrCodeUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code')
    }
  }

  const handleShareWithQR = async () => {
    if (!event || !qrCodeUrl) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? costumes.find(c => c.id === event.costumes[name])?.name : undefined,
        })),
        costumes: [],
      }
      await shareEventWithQR(eventData, qrCodeUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share with QR')
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
        
        <div className="event-actions">
          <button onClick={handleShareEvent} className="action-button share-button" title="イベント情報を共有">
            📤 共有
          </button>
          <button onClick={handleExportCSV} className="action-button export-button" title="CSV形式でエクスポート">
            📊 CSV
          </button>
          <button onClick={handleExportJSON} className="action-button export-button" title="JSON形式でエクスポート">
            📋 JSON
          </button>
          <button onClick={handleGenerateQR} className="action-button qr-button" title="QRコードを生成">
            🔲 QR
          </button>
        </div>
        
        {qrCodeUrl && (
          <div className="qr-code-section">
            <h3>イベント参加用QRコード</h3>
            <img src={qrCodeUrl} alt="Event QR Code" className="qr-code-image" />
            <button onClick={handleShareWithQR} className="action-button share-button">
              🔲📤 QRコードを共有
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="event-detail-content">
        {/* Theme Preferences Section */}
        {event.themePreferences && (
          <section className="section theme-preferences-section">
            <h2>🎨 イベントテーマ設定</h2>
            <div className="theme-preferences-display">
              {event.themePreferences.colors1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>色の好み</h4>
                  <div className="preference-items">
                    {event.themePreferences.colors1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors1stChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {event.themePreferences.colors2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors2ndChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {event.themePreferences.colors3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors3rdChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {event.themePreferences.tones1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>トーンの選択</h4>
                  <div className="preference-items">
                    {event.themePreferences.tones1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones1stChoice)}</span>
                      </div>
                    )}
                    {event.themePreferences.tones2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones2ndChoice)}</span>
                      </div>
                    )}
                    {event.themePreferences.tones3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones3rdChoice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {event.themePreferences.patterns1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>柄の選択</h4>
                  <div className="preference-items">
                    {event.themePreferences.patterns1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns1stChoice.join(', ')}</span>
                      </div>
                    )}
                    {event.themePreferences.patterns2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns2ndChoice.join(', ')}</span>
                      </div>
                    )}
                    {event.themePreferences.patterns3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns3rdChoice.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(event.themePreferences.avoidSimilarColors || event.themePreferences.recentUsageExcludeDays > 0) && (
                <div className="preference-display">
                  <h4>追加設定</h4>
                  <div className="preference-items">
                    {event.themePreferences.avoidSimilarColors && (
                      <div className="preference-item">
                        <span className="setting-tag">✓ 似た色を避ける</span>
                      </div>
                    )}
                    {event.themePreferences.recentUsageExcludeDays > 0 && (
                      <div className="preference-item">
                        <span className="setting-tag">直近{event.themePreferences.recentUsageExcludeDays}日間除外</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

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

                {!isConfirmed && (
                  <div className="confirmation-actions">
                    <button
                      onClick={handleConfirmAssignments}
                      disabled={isSaving}
                      className="confirm-button"
                    >
                      {isSaving ? '保存中...' : 'この組み合わせを確定'}
                    </button>
                    <button onClick={handleExportCSV} className="action-button export-button">
                      📊 結果をCSVで出力
                    </button>
                  </div>
                )}

                {isConfirmed && (
                  <div className="confirmation-message">
                    <p>✅ 組み合わせが確定されました。使用履歴に記録されました。</p>
                    <button
                      onClick={() => {
                        setIsConfirmed(false)
                        setOptimizationResults([])
                        navigate('/events')
                      }}
                      className="back-to-events-button"
                    >
                      イベント一覧に戻る
                    </button>
                  </div>
                )}

                {!isConfirmed && (
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
                            {normalizeCostumeColors(result.costume.colors).map((color) => (
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
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
