import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppUi } from '../contexts/AppUiContext'
import UsageGuideTip from '../components/UsageGuideTip'
import { useEvents } from '../hooks/useEvents'
import { ConcertLink } from '../components/ConcertLink'
import { EventThemePreferences, storage } from '../utils/storage'
import { checkEventApiHealth, createServerEvent, deleteServerEvent, EventApiError } from '../event-server/client'
import {
  getEventApiBaseUrl,
  isEventServerEnabled,
  isMisconfiguredEventApiUrl,
  absoluteAppUrl,
} from '../event-server/config'
import { setEventSession, getEventSession, clearEventSession, isParticipantOnlySession, hasEventAdminAccess, isParticipantDeviceEvent } from '../event-server/session'
import { cancelLocalParticipation } from '../utils/cancel-participation'
import type { RetentionDays } from '../../shared/event-api-types'
import { DEFAULT_UPLOAD_LIMITS, formatBytes } from '../../shared/upload-limits'
import { getDisplayName } from '../utils/user-profile'
import {
  COLOR_UNIFICATION_HINTS,
  COLOR_UNIFICATION_LABELS,
  migrateColorUnificationPolicy,
  normalizeThemeColorPolicy,
} from '../utils/theme-color-policy'
import ColorCoordinationAnchorsEditor from '../components/ColorCoordinationAnchorsEditor'
import { DRESS_SILHOUETTE_OPTIONS, SILHOUETTE_LABELS } from '../utils/silhouette'
import {
  SUIT_BREASTING_LABELS,
  SUIT_BREASTING_OPTIONS,
  SUIT_STYLE_LABELS,
  SUIT_STYLE_OPTIONS,
} from '../utils/suit-attributes'
import stageLayoutDiagram from '../generated/stage-layout-diagram.png'
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
  silhouettes1stChoice: [],
  silhouettes2ndChoice: [],
  silhouettes3rdChoice: [],
  suitStyles1stChoice: [],
  suitStyles2ndChoice: [],
  suitStyles3rdChoice: [],
  suitBreasting1stChoice: [],
  suitBreasting2ndChoice: [],
  suitBreasting3rdChoice: [],
  stageArrangementMode: 'participant_order',
  avoidSimilarColors: false,
  colorCoordinationAnchors: [],
}

export default function Events() {
  const navigate = useNavigate()
  const { toast, confirm, prompt } = useAppUi()
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

  useEffect(() => {
    if (!showForm) return
    const savedName = getDisplayName()
    if (!savedName) return
    setFormData((prev) => (prev.hostName ? prev : { ...prev, hostName: savedName }))
  }, [showForm])

  const clearPreferenceRank = (priority: PreferencePriority) => {
    setThemePrefs(prev => {
      if (priority === '1st') {
        return {
          ...prev,
          colors1stChoice: [],
          tones1stChoice: [],
          patterns1stChoice: [],
          silhouettes1stChoice: [],
          suitStyles1stChoice: [],
          suitBreasting1stChoice: [],
        }
      }
      if (priority === '2nd') {
        return {
          ...prev,
          colors2ndChoice: [],
          tones2ndChoice: [],
          patterns2ndChoice: [],
          silhouettes2ndChoice: [],
          suitStyles2ndChoice: [],
          suitBreasting2ndChoice: [],
        }
      }
      return {
        ...prev,
        colors3rdChoice: [],
        tones3rdChoice: [],
        patterns3rdChoice: [],
        silhouettes3rdChoice: [],
        suitStyles3rdChoice: [],
        suitBreasting3rdChoice: [],
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

  const toggleSilhouette = (silhouette: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `silhouettes${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(silhouette)
      ? current.filter((value) => value !== silhouette)
      : [...current, silhouette]
    setThemePrefs(prev => ({
      ...prev,
      [key]: updated,
    }))
  }

  const toggleSuitStyle = (style: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `suitStyles${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(style)
      ? current.filter((value) => value !== style)
      : [...current, style]
    setThemePrefs(prev => ({ ...prev, [key]: updated }))
  }

  const toggleSuitBreasting = (breasting: string, priority: '1st' | '2nd' | '3rd') => {
    const key = `suitBreasting${priority}Choice` as keyof EventThemePreferences
    const current = themePrefs[key] as string[]
    const updated = current.includes(breasting)
      ? current.filter((value) => value !== breasting)
      : [...current, breasting]
    setThemePrefs(prev => ({ ...prev, [key]: updated }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.date) return
    const hostName = formData.hostName.trim()
    if (!hostName) {
      toast('代表者名を入力してください（参加者の1人目として登録されます）', 'error')
      return
    }

    setCreating(true)
    try {
      const normalizedTheme = normalizeThemeColorPolicy(themePrefs)
      const eventPayload = {
        name: formData.name,
        date: formData.date,
        description: formData.description,
        participants: [hostName],
        costumes: {} as Record<string, string>,
        themePreferences: normalizedTheme,
      }

      if (serverEnabled && useOnlineSubmit) {
        let server
        try {
          server = await createServerEvent({
            name: formData.name,
            date: formData.date,
            description: formData.description,
            retentionDays,
            themePreferences: normalizedTheme,
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
      toast(msg, 'error')
      console.error('create event failed:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleCancelParticipation = async (id: string) => {
    const ev = events.find((e) => e.id === id)
    const ok = await confirm({
      title: '参加の取り消し',
      message: `「${ev?.name ?? 'このイベント'}」への参加をこの端末から解除します。一覧から消えますが、招待URLから再度参加できます。`,
      confirmLabel: '参加を取り消す',
    })
    if (!ok) return

    try {
      await cancelLocalParticipation(id)
      toast('参加を取り消しました', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : '参加の取り消しに失敗しました', 'error')
    }
  }

  const handleDelete = async (id: string) => {
    const ev = events.find((e) => e.id === id)
    const onServer = Boolean(ev?.hostedOnServer && serverEnabled)
    const ok = await confirm({
      title: 'イベントの削除',
      message: onServer
        ? 'この端末のイベントと、サーバー上の写真・参加者データも削除します。取り消せません。'
        : 'この端末からイベントを削除します。取り消せません。',
      confirmLabel: '削除する',
      danger: true,
    })
    if (!ok) return

    try {
      if (onServer) {
        let adminToken: string | undefined = getEventSession(id)?.adminToken
        if (!adminToken) {
          const entered = await prompt({
            title: '管理者トークン',
            message: 'サーバー削除には管理者トークンが必要です',
            label: '管理者トークン',
          })
          if (!entered?.trim()) return
          adminToken = entered.trim()
        }
        try {
          await deleteServerEvent(id, adminToken)
        } catch (e) {
          if (!(e instanceof EventApiError)) throw e
          toast(`サーバー削除: ${e.message}（ローカルのみ削除を続行）`, 'error')
        }
      }
      await deleteEvent(id)
      clearEventSession(id)
      toast('イベントを削除しました', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : '削除に失敗しました', 'error')
      console.error('Failed to delete event:', err)
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
  const activeColorPolicy = migrateColorUnificationPolicy(
    themePrefs.colorUnification,
    themePrefs.avoidSimilarColors,
  )

  const getRankChoices = (priority: PreferencePriority) => {
    switch (priority) {
      case '1st':
        return {
          colors: themePrefs.colors1stChoice,
          tones: themePrefs.tones1stChoice,
          patterns: themePrefs.patterns1stChoice,
          silhouettes: themePrefs.silhouettes1stChoice,
          suitStyles: themePrefs.suitStyles1stChoice,
          suitBreasting: themePrefs.suitBreasting1stChoice,
        }
      case '2nd':
        return {
          colors: themePrefs.colors2ndChoice,
          tones: themePrefs.tones2ndChoice,
          patterns: themePrefs.patterns2ndChoice,
          silhouettes: themePrefs.silhouettes2ndChoice,
          suitStyles: themePrefs.suitStyles2ndChoice,
          suitBreasting: themePrefs.suitBreasting2ndChoice,
        }
      case '3rd':
        return {
          colors: themePrefs.colors3rdChoice,
          tones: themePrefs.tones3rdChoice,
          patterns: themePrefs.patterns3rdChoice,
          silhouettes: themePrefs.silhouettes3rdChoice,
          suitStyles: themePrefs.suitStyles3rdChoice,
          suitBreasting: themePrefs.suitBreasting3rdChoice,
        }
    }
  }

  const renderRankPreferencePickers = (priority: PreferencePriority, rankLabel: string) => {
    const { colors, tones, patterns, silhouettes, suitStyles, suitBreasting } = getRankChoices(priority)

    return (
      <>
        <p className="preference-wizard-lead">
          {rankLabel}として、色・トーン・柄・ドレス/スーツの詳細をまとめて選びます（第1希望 → 第2希望 → 第3希望の順です）。
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

        <div className="preference-group">
          <label>シルエット（ドレス）</label>
          <div className="option-grid">
            {DRESS_SILHOUETTE_OPTIONS.map((silhouette) => (
              <button
                key={`silhouette-${priority}-${silhouette}`}
                type="button"
                onClick={() => toggleSilhouette(silhouette, priority)}
                className={`option-button ${silhouettes.includes(silhouette) ? 'selected' : ''}`}
              >
                {SILHOUETTE_LABELS[silhouette]}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-group">
          <label>スーツ形式</label>
          <div className="option-grid">
            {SUIT_STYLE_OPTIONS.map((style) => (
              <button
                key={`suit-style-${priority}-${style}`}
                type="button"
                onClick={() => toggleSuitStyle(style, priority)}
                className={`option-button ${suitStyles.includes(style) ? 'selected' : ''}`}
              >
                {SUIT_STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        </div>

        <div className="preference-group">
          <label>スーツの前釦（シングル / ダブル）</label>
          <div className="option-grid">
            {SUIT_BREASTING_OPTIONS.map((breasting) => (
              <button
                key={`suit-breasting-${priority}-${breasting}`}
                type="button"
                onClick={() => toggleSuitBreasting(breasting, priority)}
                className={`option-button ${suitBreasting.includes(breasting) ? 'selected' : ''}`}
              >
                {SUIT_BREASTING_LABELS[breasting]}
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
          const { colors, tones, patterns, silhouettes, suitStyles, suitBreasting } = getRankChoices(priority)
          if (
            colors.length === 0 &&
            tones.length === 0 &&
            patterns.length === 0 &&
            silhouettes.length === 0 &&
            suitStyles.length === 0 &&
            suitBreasting.length === 0
          ) {
            return null
          }
          const prefixParts = [colors.length > 0, tones.length > 0, patterns.length > 0]
          return (
            <div key={priority} className="preference-summary-row">
              <strong>{label}</strong>
              <span>
                {colors.length > 0 && `色: ${colors.join(', ')}`}
                {tones.length > 0 && `${prefixParts[0] ? ' / ' : ''}トーン: ${tones.map(t => TONE_LABELS[t] ?? t).join(', ')}`}
                {patterns.length > 0 && `${(prefixParts[0] || prefixParts[1]) ? ' / ' : ''}柄: ${patterns.map(p => PATTERN_LABELS[p] ?? p).join(', ')}`}
                {silhouettes.length > 0 && `${(prefixParts[0] || prefixParts[1] || prefixParts[2]) ? ' / ' : ''}シルエット: ${silhouettes.map(s => SILHOUETTE_LABELS[s as keyof typeof SILHOUETTE_LABELS] ?? s).join(', ')}`}
                {suitStyles.length > 0 && `${(colors.length + tones.length + patterns.length + silhouettes.length) > 0 ? ' / ' : ''}スーツ形式: ${suitStyles.map(s => SUIT_STYLE_LABELS[s as keyof typeof SUIT_STYLE_LABELS] ?? s).join(', ')}`}
                {suitBreasting.length > 0 && `${(colors.length + tones.length + patterns.length + silhouettes.length + suitStyles.length) > 0 ? ' / ' : ''}前釦: ${suitBreasting.map(p => SUIT_BREASTING_LABELS[p as keyof typeof SUIT_BREASTING_LABELS] ?? p).join(', ')}`}
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
            <div className="name-input-row">
              <input
                id="hostName"
                type="text"
                value={formData.hostName}
                onChange={(e) => setFormData(prev => ({ ...prev, hostName: e.target.value }))}
                placeholder="例: 山田太郎（参加者の1人目として登録）"
                maxLength={100}
                required
              />
              {getDisplayName() && (
                <button
                  type="button"
                  className="name-fill-button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, hostName: getDisplayName() }))
                  }
                  disabled={formData.hostName === getDisplayName()}
                >
                  設定の名前
                </button>
              )}
            </div>
            <p className="form-hint">
              主催者を参加者リストの1人目に含めます。設定の表示名とは別名でも登録できます。
            </p>
          </div>

          <div className="theme-settings-section">
            <h3 className="theme-settings-heading">テーマ設定</h3>
              {/* Color Unification Strategy */}
              <div className="theme-subsection">
                <h4>色味の統一方針</h4>
                <p className="form-hint theme-unification-hint">
                  全員分をまとめて計算します。先着順で決まることはありません。
                </p>
                <div className="preference-group color-policy-option">
                  <label>
                    <input
                      type="radio"
                      name="colorUnification"
                      value="unified"
                      checked={activeColorPolicy === 'unified'}
                      onChange={() => setThemePrefs((prev) => normalizeThemeColorPolicy({
                        ...prev,
                        colorUnification: 'unified',
                      }))}
                    />
                    {COLOR_UNIFICATION_LABELS.unified}
                  </label>
                  <p className="form-hint color-policy-hint">{COLOR_UNIFICATION_HINTS.unified}</p>
                </div>
                <div className="preference-group color-policy-option">
                  <label>
                    <input
                      type="radio"
                      name="colorUnification"
                      value="varied"
                      checked={activeColorPolicy === 'varied'}
                      onChange={() => setThemePrefs((prev) => normalizeThemeColorPolicy({
                        ...prev,
                        colorUnification: 'varied',
                      }))}
                    />
                    {COLOR_UNIFICATION_LABELS.varied}
                  </label>
                  <p className="form-hint color-policy-hint">{COLOR_UNIFICATION_HINTS.varied}</p>
                </div>
                <div className="preference-group color-policy-option">
                  <label>
                    <input
                      type="radio"
                      name="colorUnification"
                      value="varied_distinct"
                      checked={activeColorPolicy === 'varied_distinct'}
                      onChange={() => setThemePrefs((prev) => normalizeThemeColorPolicy({
                        ...prev,
                        colorUnification: 'varied_distinct',
                      }))}
                    />
                    {COLOR_UNIFICATION_LABELS.varied_distinct}
                  </label>
                  <p className="form-hint color-policy-hint">{COLOR_UNIFICATION_HINTS.varied_distinct}</p>
                </div>
              </div>

              <div className="theme-subsection">
                <h4>ステージ上の見え方</h4>
                <p className="form-hint theme-unification-hint">
                  衣装決定後、客席から見た下手（左）から上手（右）の配置として確認できます。必要に応じて、色の流れや隣同士の見え方に規則性が出るように整えます。
                </p>
                <div className="stage-arrangement-diagram" aria-label="ステージ配置の見方">
                  <div className="stage-diagram-frame">
                    <img src={stageLayoutDiagram} alt="" aria-hidden="true" />
                    <span className="stage-label stage-label--audience">客席</span>
                    <span className="stage-label stage-label--left">下手（左）</span>
                    <span className="stage-label stage-label--right">上手（右）</span>
                    <span className="stage-label stage-label--back-row">2列目</span>
                    <span className="stage-label stage-label--front-row">1列目</span>
                    <span className="stage-label stage-label--divider">区切り</span>
                  </div>
                  <p className="form-hint">
                    衣装決定後のイベント詳細で、1列目と2列目の間に入れる区切り位置を調整できます。
                  </p>
                </div>
                <div className="preference-group color-policy-option">
                  <label>
                    <input
                      type="checkbox"
                      name="stageArrangementMode"
                      checked={(themePrefs.stageArrangementMode ?? 'participant_order') === 'balanced'}
                      onChange={(e) => setThemePrefs((prev) => ({
                        ...prev,
                        stageArrangementMode: e.target.checked ? 'balanced' : 'participant_order',
                      }))}
                    />
                    ステージの見え方を整える
                  </label>
                  <p className="form-hint color-policy-hint">
                    オンにすると、衣装決定後に色の流れや隣同士の見え方が不自然になりにくい配置へ整えます。最終的な並びと2列目の区切りはイベント詳細で確認・調整できます。
                  </p>
                </div>
              </div>

              <div className="theme-subsection">
                <h4>基準衣装の色（ゲスト・ソリスト等）</h4>
                <ColorCoordinationAnchorsEditor
                  anchors={themePrefs.colorCoordinationAnchors ?? []}
                  onChange={(colorCoordinationAnchors) =>
                    setThemePrefs((prev) => ({ ...prev, colorCoordinationAnchors }))
                  }
                />
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

          </div>

          {serverEnabled && (
            <UsageGuideTip title="ℹ️ オンライン提出の流れ（タップで開く）">
              <ol>
                <li>代表者名でサーバーに登録 → 作成後に写真提出</li>
                <li>招待 URL を参加者へ送る</li>
                <li>全員提出後、イベント詳細で取り込むとシステムが自動で組み合わせを決定</li>
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
                {isParticipantDeviceEvent(event.id) ? (
                  <button
                    onClick={() => void handleCancelParticipation(event.id)}
                    className="action-button secondary"
                  >
                    {isParticipantOnlySession(event.id) ? '参加を取り消す' : 'この端末から削除'}
                  </button>
                ) : hasEventAdminAccess(event.id) || !isParticipantDeviceEvent(event.id) ? (
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="action-button delete"
                  >
                    削除
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
