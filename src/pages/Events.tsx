import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import UsageGuideTip from '../components/UsageGuideTip'
import { useEvents } from '../hooks/useEvents'
import { ConcertLink } from '../components/ConcertLink'
import { EventThemePreferences, storage } from '../utils/storage'
import { checkEventApiHealth, createServerEvent, EventApiError } from '../event-server/client'
import {
  getEventApiBaseUrl,
  isEventServerEnabled,
  isMisconfiguredEventApiUrl,
  absoluteAppUrl,
} from '../event-server/config'
import { setEventSession } from '../event-server/session'
import type { RetentionDays } from '../../shared/event-api-types'
import { DEFAULT_UPLOAD_LIMITS, formatBytes } from '../../shared/upload-limits'
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
const PATTERN_LABELS: Record<string, string> = {
  plain: '無地',
  floral: '花柄',
  stripe: 'ストライプ',
  dot: 'ドット',
  check: 'チェック',
  geometric: '幾何学',
  animal: 'アニマル',
}

type PreferencePriority = '1st' | '2nd' | '3rd'

function priorityFromStep(step: 1 | 2 | 3): PreferencePriority {
  return step === 1 ? '1st' : step === 2 ? '2nd' : '3rd'
}

const EMPTY_THEME_PREFS: EventThemePreferences = {
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
}

export default function Events() {
  const navigate = useNavigate()
  const { events, loading, error, addEvent, deleteEvent } = useEvents()
  const [showForm, setShowForm] = useState(false)
  const serverEnabled = isEventServerEnabled()
  const [useOnlineSubmit, setUseOnlineSubmit] = useState(serverEnabled)
  const [retentionDays, setRetentionDays] = useState<RetentionDays>(14)
  const [creating, setCreating] = useState(false)
  const [apiReachable, setApiReachable] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    /** 主催者＝参加者の1人目 */
    hostName: '',
  })

  // Theme preferences state
  const [themePrefs, setThemePrefs] = useState<EventThemePreferences>({ ...EMPTY_THEME_PREFS })

  /** 1→2→3 の順で希望を決める（色・トーン・柄を交互に出さない） */
  const [preferenceRankStep, setPreferenceRankStep] = useState<1 | 2 | 3>(1)
  const [preferenceWizardDone, setPreferenceWizardDone] = useState(false)

  useEffect(() => {
    if (!serverEnabled) {
      setApiReachable(null)
      return
    }
    void checkEventApiHealth().then(setApiReachable)
  }, [serverEnabled])

  const clearPreferenceRank = (priority: PreferencePriority) => {
    setThemePrefs(prev => {
      if (priority === '1st') {
        return {
          ...prev,
          colors1stChoice: [],
          tones1stChoice: [],
          patterns1stChoice: [],
        }
      }
      if (priority === '2nd') {
        return {
          ...prev,
          colors2ndChoice: [],
          tones2ndChoice: [],
          patterns2ndChoice: [],
        }
      }
      return {
        ...prev,
        colors3rdChoice: [],
        tones3rdChoice: [],
        patterns3rdChoice: [],
      }
    })
  }

  const resetPreferenceWizard = () => {
    setPreferenceRankStep(1)
    setPreferenceWizardDone(false)
  }

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
    const hostName = formData.hostName.trim()
    if (!hostName) {
      alert('代表者名を入力してください（参加者の1人目として登録されます）')
      return
    }

    setCreating(true)
    try {
      const eventPayload = {
        name: formData.name,
        date: formData.date,
        description: formData.description,
        participants: [hostName],
        costumes: {} as Record<string, string>,
        themePreferences: themePrefs,
      }

      if (serverEnabled && useOnlineSubmit) {
        let server
        try {
          server = await createServerEvent({
            name: formData.name,
            date: formData.date,
            description: formData.description,
            retentionDays,
            themePreferences: themePrefs,
            hostDisplayName: hostName,
          })
        } catch (e) {
          const msg =
            e instanceof EventApiError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'サーバーへのイベント作成に失敗しました'
          throw new Error(msg)
        }

        setEventSession(server.eventId, {
          adminToken: server.adminToken,
          inviteToken: server.inviteToken,
          expiresAt: server.expiresAt,
          ...(server.hostParticipant
            ? {
                participantToken: server.hostParticipant.participantToken,
                participantId: server.hostParticipant.participantId,
                displayName: server.hostParticipant.displayName,
              }
            : {}),
        })

        await storage.init()
        try {
          await addEvent(
            {
              ...eventPayload,
              hostedOnServer: true,
              serverExpiresAt: server.expiresAt,
            },
            { id: server.eventId },
          )
        } catch (localErr) {
          const inviteUrl = absoluteAppUrl(
            `/join?e=${encodeURIComponent(server.eventId)}&t=${encodeURIComponent(server.inviteToken)}`,
          )
          const localMsg =
            localErr instanceof Error ? localErr.message : 'ローカル保存エラー'
          throw new Error(
            `サーバーには作成済みですが、この端末への保存に失敗しました（${localMsg}）。\nイベントID: ${server.eventId}\n招待URL: ${inviteUrl}`,
          )
        }

        const inviteUrl = absoluteAppUrl(
          `/join?e=${encodeURIComponent(server.eventId)}&t=${encodeURIComponent(server.inviteToken)}`,
        )
        const hostParticipateUrl = absoluteAppUrl(
          `/events/${encodeURIComponent(server.eventId)}/participate?t=${encodeURIComponent(server.inviteToken)}`,
        )

        navigate(`/events/${server.eventId}`, {
          state: {
            showInviteModal: true,
            inviteUrl,
            adminToken: server.adminToken,
            hostParticipateUrl,
          },
        })
      } else {
        await storage.init()
        await addEvent(eventPayload)
      }

      setFormData({ name: '', date: '', description: '', hostName: '' })
      setThemePrefs({ ...EMPTY_THEME_PREFS })
      resetPreferenceWizard()
      setShowForm(false)
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'イベントの作成に失敗しました'
      alert(msg)
      console.error('create event failed:', err)
    } finally {
      setCreating(false)
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

  const currentPriority = priorityFromStep(preferenceRankStep)

  const getRankChoices = (priority: PreferencePriority) => {
    switch (priority) {
      case '1st':
        return {
          colors: themePrefs.colors1stChoice,
          tones: themePrefs.tones1stChoice,
          patterns: themePrefs.patterns1stChoice,
        }
      case '2nd':
        return {
          colors: themePrefs.colors2ndChoice,
          tones: themePrefs.tones2ndChoice,
          patterns: themePrefs.patterns2ndChoice,
        }
      case '3rd':
        return {
          colors: themePrefs.colors3rdChoice,
          tones: themePrefs.tones3rdChoice,
          patterns: themePrefs.patterns3rdChoice,
        }
    }
  }

  const renderRankPreferencePickers = (priority: PreferencePriority, rankLabel: string) => {
    const { colors, tones, patterns } = getRankChoices(priority)

    return (
      <>
        <p className="preference-wizard-lead">
          {rankLabel}として、色・トーン・柄をまとめて選びます（第1希望 → 第2希望 → 第3希望の順です）。
        </p>

        <div className="preference-group">
          <label>色</label>
          <div className="theme-color-picker-grid">
            {COLOR_OPTIONS.map(color => (
              <button
                key={`color-${priority}-${color}`}
                type="button"
                onClick={() => toggleColor(color, priority)}
                className={`color-button ${colors.includes(color) ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="preference-group">
          <label>トーン</label>
          <div className="option-grid">
            {TONE_OPTIONS.map(tone => (
              <button
                key={`tone-${priority}-${tone}`}
                type="button"
                onClick={() => toggleTone(tone, priority)}
                className={`option-button ${tones.includes(tone) ? 'selected' : ''}`}
              >
                {TONE_LABELS[tone]}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-group">
          <label>柄</label>
          <div className="option-grid">
            {PATTERN_OPTIONS.map(pattern => (
              <button
                key={`pattern-${priority}-${pattern}`}
                type="button"
                onClick={() => togglePattern(pattern, priority)}
                className={`option-button ${patterns.includes(pattern) ? 'selected' : ''}`}
              >
                {PATTERN_LABELS[pattern] ?? pattern}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  const renderPreferenceSummary = () => {
    const ranks: { label: string; priority: PreferencePriority }[] = [
      { label: '第1希望', priority: '1st' },
      { label: '第2希望', priority: '2nd' },
      { label: '第3希望', priority: '3rd' },
    ]

    return (
      <div className="preference-summary">
        {ranks.map(({ label, priority }) => {
          const { colors, tones, patterns } = getRankChoices(priority)
          if (colors.length === 0 && tones.length === 0 && patterns.length === 0) return null
          return (
            <div key={priority} className="preference-summary-row">
              <strong>{label}</strong>
              <span>
                {colors.length > 0 && `色: ${colors.join(', ')}`}
                {tones.length > 0 && `${colors.length > 0 ? ' / ' : ''}トーン: ${tones.map(t => TONE_LABELS[t] ?? t).join(', ')}`}
                {patterns.length > 0 && `${colors.length > 0 || tones.length > 0 ? ' / ' : ''}柄: ${patterns.map(p => PATTERN_LABELS[p] ?? p).join(', ')}`}
              </span>
            </div>
          )
        })}
        <button
          type="button"
          className="preference-wizard-edit"
          onClick={() => {
            setPreferenceWizardDone(false)
            setPreferenceRankStep(1)
          }}
        >
          希望の設定をやり直す
        </button>
      </div>
    )
  }

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

      {serverEnabled && apiReachable === false && (
        <div className="error-message api-config-warning">
          オンライン提出 API に接続できません。
          {isMisconfiguredEventApiUrl() ? (
            <>
              {' '}
              GitHub の <code>VITE_EVENT_API_URL</code> が
              <code>https://○○.workers.dev</code> だけになっている可能性があります。
              正しくは <code>{getEventApiBaseUrl()}/api/health</code> が開ける URL（Worker 名付き）です。
            </>
          ) : (
            <> 使用中の API: <code>{getEventApiBaseUrl()}</code></>
          )}
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

          <div className="form-group">
            <label htmlFor="hostName">代表者名 *</label>
            <input
              id="hostName"
              type="text"
              value={formData.hostName}
              onChange={(e) => setFormData(prev => ({ ...prev, hostName: e.target.value }))}
              placeholder="例: 山田太郎（参加者の1人目として登録）"
              required
            />
            <p className="form-hint">主催者を参加者リストの1人目に含めます</p>
          </div>

          <div className="theme-settings-section">
            <h3 className="theme-settings-heading">テーマ設定</h3>
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

              {/* 希望順ウィザード: 第1希望（色・トーン・柄）→ 第2希望 → 第3希望 */}
              <div className="theme-subsection preference-wizard">
                <h4>テーマの希望順</h4>

                <div className="preference-wizard-steps" aria-label="設定の進捗">
                  {([1, 2, 3] as const).map(step => (
                    <span
                      key={step}
                      className={[
                        'preference-wizard-step',
                        preferenceWizardDone || preferenceRankStep > step ? 'done' : '',
                        !preferenceWizardDone && preferenceRankStep === step ? 'active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      第{step}希望
                    </span>
                  ))}
                </div>

                {preferenceWizardDone ? (
                  renderPreferenceSummary()
                ) : (
                  <>
                    <h4 className="preference-wizard-heading">
                      {preferenceRankStep === 1 && '第1希望を設定'}
                      {preferenceRankStep === 2 && '第2希望を設定（任意）'}
                      {preferenceRankStep === 3 && '第3希望を設定（任意）'}
                    </h4>

                    {renderRankPreferencePickers(
                      currentPriority,
                      preferenceRankStep === 1
                        ? '第1希望'
                        : preferenceRankStep === 2
                          ? '第2希望'
                          : '第3希望',
                    )}

                    <div className="preference-wizard-actions">
                      {preferenceRankStep > 1 && (
                        <button
                          type="button"
                          className="preference-wizard-btn secondary"
                          onClick={() => setPreferenceRankStep((preferenceRankStep - 1) as 1 | 2 | 3)}
                        >
                          戻る
                        </button>
                      )}

                      {preferenceRankStep === 1 && (
                        <button
                          type="button"
                          className="preference-wizard-btn primary"
                          onClick={() => setPreferenceRankStep(2)}
                        >
                          第1希望の選択を完了
                        </button>
                      )}

                      {preferenceRankStep === 2 && (
                        <>
                          <button
                            type="button"
                            className="preference-wizard-btn primary"
                            onClick={() => setPreferenceRankStep(3)}
                          >
                            第2希望の選択を完了
                          </button>
                          <button
                            type="button"
                            className="preference-wizard-btn secondary"
                            onClick={() => {
                              clearPreferenceRank('2nd')
                              setPreferenceRankStep(3)
                            }}
                          >
                            第2希望は設定しない
                          </button>
                        </>
                      )}

                      {preferenceRankStep === 3 && (
                        <>
                          <button
                            type="button"
                            className="preference-wizard-btn primary"
                            onClick={() => setPreferenceWizardDone(true)}
                          >
                            第3希望の選択を完了
                          </button>
                          <button
                            type="button"
                            className="preference-wizard-btn secondary"
                            onClick={() => {
                              clearPreferenceRank('3rd')
                              setPreferenceWizardDone(true)
                            }}
                          >
                            第3希望は設定しない
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
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

          {serverEnabled && (
            <UsageGuideTip title="ℹ️ オンライン提出の流れ（タップで開く）">
              <ol>
                <li>代表者名でサーバーに登録 → 作成後に写真提出</li>
                <li>招待 URL を参加者へ送る</li>
                <li>提出後、イベント詳細から取り込み・最適化</li>
              </ol>
              <p>
                <Link to="/guide">使い方ガイド（全文）</Link>
              </p>
            </UsageGuideTip>
          )}

          {serverEnabled && (
            <div className="form-group online-submit-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useOnlineSubmit}
                  onChange={(e) => setUseOnlineSubmit(e.target.checked)}
                />
                オンライン提出（写真をサーバーに保存・参加者は URL から提出）
              </label>
              {useOnlineSubmit && (
                <>
                  <label className="retention-label">
                    データ保持:
                    <select
                      value={retentionDays}
                      onChange={(e) => setRetentionDays(Number(e.target.value) as RetentionDays)}
                    >
                      <option value={7}>7日（または開催日まで）</option>
                      <option value={14}>14日（または開催日まで）</option>
                    </select>
                  </label>
                  <p className="online-upload-limits">
                    写真: 各{formatBytes(DEFAULT_UPLOAD_LIMITS.maxPhotoBytes)}まで・
                    1衣装{DEFAULT_UPLOAD_LIMITS.maxPhotosPerCostume}枚・
                    お一人{DEFAULT_UPLOAD_LIMITS.maxCostumesPerParticipant}衣装まで・
                    イベント合計{formatBytes(DEFAULT_UPLOAD_LIMITS.maxEventStorageBytes)}まで
                    （期限後にサーバーから自動削除）
                  </p>
                </>
              )}
            </div>
          )}

          {!serverEnabled && (
            <p className="online-submit-hint">
              オンライン提出 API 未設定時は端末内のみ保存されます（VITE_EVENT_API_URL）。
            </p>
          )}

          <button type="submit" className="submit-button" disabled={creating}>
            {creating ? '作成中…' : 'イベントを作成'}
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
                {event.hostedOnServer && <span className="event-hosted-badge">☁️ オンライン</span>}
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
