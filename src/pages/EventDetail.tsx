import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import { optimizeCostumeAssignments, calculateHarmonyScore } from '../utils/optimizer'
import { recordCostumeUsage } from '../utils/usage-tracker'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import { shareEvent, exportEventAsCSV, exportEventAsJSON, generateEventQRCode, shareEventWithQR } from '../utils/share-export'
import CollaborationFileImport from '../components/CollaborationFileImport'
import {
  createEventInviteBundle,
  createParticipantSubmissionBundle,
  downloadCollaborationBundle,
  importParticipantSubmission,
  type CollaborationBundle,
} from '../utils/collaboration-bundle'
import {
  extendServerEventRetention,
  fetchAdminSnapshot,
  EventApiError,
} from '../event-server/client'
import {
  canExtendServerRetention,
  formatServerExpiryLabel,
} from '../utils/server-expiry-display'
import { importAdminSnapshotToLocal } from '../event-server/import-from-server'
import { getEventSession, setEventSession } from '../event-server/session'
import { isEventServerEnabled, absoluteAppUrl } from '../event-server/config'
import InviteUrlModal, { type InviteUrlModalLocationState } from '../components/InviteUrlModal'
import UsageGuideTip from '../components/UsageGuideTip'
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
  const location = useLocation()
  const { getEvent, updateEvent } = useEvents()
  const { costumes, reloadCostumes } = useCostumes()

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
  const [serverPulling, setServerPulling] = useState(false)
  const [extendingRetention, setExtendingRetention] = useState(false)
  const [retentionMessage, setRetentionMessage] = useState('')
  const [inviteModal, setInviteModal] = useState<{
    url: string
    variant: 'created' | 'share'
    adminToken?: string
    hostParticipateUrl?: string
  } | null>(null)
  const serverApiEnabled = isEventServerEnabled()

  useEffect(() => {
    const navState = location.state as InviteUrlModalLocationState | null
    if (navState?.showInviteModal && navState.inviteUrl) {
      setInviteModal({
        url: navState.inviteUrl,
        variant: 'created',
        adminToken: navState.adminToken,
        hostParticipateUrl: navState.hostParticipateUrl,
      })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const loadEvent = async () => {
      try {
        if (!id) throw new Error('Event ID not found')
        let eventData = await getEvent(id)
        if (!eventData) throw new Error('Event not found')
        if (eventData.participants.length === 0) {
          eventData = await updateEvent(id, { participants: ['代表者'] })
        }
        setEvent(eventData)
        setParticipantPreferences(eventData.participantPreferences ?? {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id, getEvent, updateEvent])

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

  const handleSetPreference = async (participant: string, costumeId: string, rank: number) => {
    if (!event) return
    const prefs = participantPreferences[participant] || []
    const newPrefs = [...prefs]
    if (newPrefs[rank] === costumeId) {
      newPrefs.splice(rank, 1)
    } else {
      newPrefs[rank] = costumeId
    }
    const filtered = newPrefs.filter(Boolean)
    const nextPrefs = { ...participantPreferences, [participant]: filtered }
    setParticipantPreferences(nextPrefs)
    try {
      const updated = await updateEvent(event.id, { participantPreferences: nextPrefs })
      setEvent(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : '希望の保存に失敗しました')
    }
  }

  const reloadEventAndCostumes = async () => {
    if (!id) return
    const eventData = await getEvent(id)
    if (eventData) {
      setEvent(eventData)
      setParticipantPreferences(eventData.participantPreferences ?? {})
    }
    setOptimizationResults([])
    setHarmonyScore(0)
  }

  const handleExportEventInvite = () => {
    if (!event) return
    downloadCollaborationBundle(
      createEventInviteBundle(
        event,
        '参加者へ送付してください。取り込み後に衣装登録→提出用ファイルを返送します。',
      ),
      `event-invite-${event.id}.json`,
    )
  }

  const handleImportParticipantBundle = async (bundle: CollaborationBundle) => {
    if (bundle.type !== 'participant-submission') {
      throw new Error('提出用ファイル（participant-submission）を選んでください')
    }
    await storage.init()
    const result = await importParticipantSubmission(bundle, {
      getEvent: (eid) => storage.getEvent(eid),
      updateEvent: (ev) => storage.updateEvent(ev),
      getCostume: (cid) => storage.getCostume(cid),
      addCostume: (c) => storage.addCostume(c),
      updateCostume: (c) => storage.updateCostume(c),
    })
    alert(
      `${result.participantName} さんのデータを取り込みました（衣装 新規${result.costumesAdded} / 更新${result.costumesUpdated}）`,
    )
    await reloadCostumes()
    await reloadEventAndCostumes()
  }

  const handleExportParticipantSubmission = () => {
    if (!event) return
    const name =
      newParticipant.trim() ||
      window.prompt('提出する参加者名を入力してください', event.participants[0] ?? '')?.trim()
    if (!name) return
    downloadCollaborationBundle(
      createParticipantSubmissionBundle({
        event,
        participantName: name,
        costumes,
        preferences: participantPreferences[name] ?? [],
      }),
      `submission-${name}-${event.id}.json`,
    )
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
      const sess = getEventSession(event.id)
      const shareUrl = sess?.inviteToken
        ? absoluteAppUrl(`/join?e=${encodeURIComponent(event.id)}&t=${encodeURIComponent(sess.inviteToken)}`)
        : undefined
      const url = await generateEventQRCode(event.id, event.name, shareUrl)
      setQrCodeUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code')
    }
  }

  const buildInviteUrl = (): string | null => {
    if (!event) return null
    const invite = getEventSession(event.id)?.inviteToken
    if (!invite) return null
    return absoluteAppUrl(`/join?e=${encodeURIComponent(event.id)}&t=${encodeURIComponent(invite)}`)
  }

  const handleCopyInviteLink = () => {
    const url = buildInviteUrl()
    if (!url) {
      alert(
        '招待トークンがこの端末にありません。イベント作成時に表示された URL を再利用するか、新しいオンラインイベントを作成してください。',
      )
      return
    }
    const token = getEventSession(event.id)?.inviteToken
    const hostParticipateUrl = token
      ? absoluteAppUrl(
          `/events/${encodeURIComponent(event.id)}/participate?t=${encodeURIComponent(token)}`,
        )
      : undefined
    setInviteModal({ url, variant: 'share', hostParticipateUrl })
  }

  const resolveAdminToken = (): string | null => {
    if (!event) return null
    let adminToken = getEventSession(event.id)?.adminToken
    if (!adminToken) {
      const entered = window.prompt('管理者トークンを貼り付けてください（作成時に保存されていない場合）')
      if (!entered?.trim()) return null
      adminToken = entered.trim()
      setEventSession(event.id, { adminToken })
    }
    return adminToken
  }

  const handleExtendRetention = async () => {
    if (!event?.serverExpiresAt || !serverApiEnabled) return
    const adminToken = resolveAdminToken()
    if (!adminToken) return

    setExtendingRetention(true)
    setRetentionMessage('')
    setError('')
    try {
      const res = await extendServerEventRetention(event.id, adminToken, 7)
      const updated = await updateEvent(event.id, { serverExpiresAt: res.expiresAt })
      setEvent(updated)
      setEventSession(event.id, { expiresAt: res.expiresAt })
      setRetentionMessage('保存期限を7日延長しました')
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '期限の延長に失敗しました')
    } finally {
      setExtendingRetention(false)
    }
  }

  const handlePullFromServer = async () => {
    if (!event) return
    const adminToken = resolveAdminToken()
    if (!adminToken) return

    setServerPulling(true)
    setError('')
    try {
      const snapshot = await fetchAdminSnapshot(event.id, adminToken)
      const result = await importAdminSnapshotToLocal(snapshot, event.id)
      await reloadCostumes()
      await reloadEventAndCostumes()
      alert(
        `サーバーから取り込みました。\n参加者 +${result.participantsAdded}\n衣装 新規 ${result.costumesAdded} / 更新 ${result.costumesUpdated}\n提出 ${snapshot.participants.filter((p) => p.costumeCount > 0).length}/${snapshot.participants.length} 名`,
      )
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'サーバーからの取り込みに失敗しました')
    } finally {
      setServerPulling(false)
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

  const showOnlineHub = Boolean(event.hostedOnServer || serverApiEnabled)
  const canExtend = canExtendServerRetention(event.serverExpiresAt, event.createdAt)

  return (
    <div className="event-detail-page">
      <button onClick={() => navigate('/events')} className="back-button">
        ← 戻る
      </button>

      <header className="event-detail-hero">
        <div className="event-detail-hero-text">
          <h1>{event.name}</h1>
          <p className="event-date">📅 {new Date(event.date).toLocaleDateString('ja-JP')}</p>
          {event.description && <p className="event-description">{event.description}</p>}
        </div>
        {event.hostedOnServer && (
          <span className="event-hosted-pill">☁️ オンライン提出</span>
        )}
      </header>

      {showOnlineHub && (
        <section className="section server-primary-card" aria-labelledby="server-primary-heading">
          <h2 id="server-primary-heading">代表者の操作</h2>
          <p className="server-primary-lead">
            参加者に招待 URL を送り、提出後にサーバーから取り込んで最適化します。
          </p>
          <UsageGuideTip title="ℹ️ 代表者・参加者の手順">
            <ol>
              <li>招待 URL をコピーして参加者へ送付</li>
              <li>代表者は「写真提出」または下のボタンから衣装写真をアップロード</li>
              <li>全員提出後「サーバーから提出を取り込む」→ 最適化</li>
            </ol>
            <p>
              <Link to="/guide">使い方ガイド（全文）</Link>
            </p>
          </UsageGuideTip>

          {event.serverExpiresAt && (
            <div className="server-expiry-row">
              <div className="server-expiry-info">
                <span className="server-expiry-label">サーバー保存期限</span>
                <span className="server-expiry-value">
                  {formatServerExpiryLabel(event.serverExpiresAt)}
                </span>
              </div>
              {event.hostedOnServer && serverApiEnabled && (
                <button
                  type="button"
                  className="server-extend-btn"
                  disabled={extendingRetention || !canExtend}
                  title={
                    canExtend
                      ? '保存期限を7日延長（作成から最大14日）'
                      : '作成から最大14日のため、これ以上延長できません'
                  }
                  onClick={() => void handleExtendRetention()}
                >
                  {extendingRetention ? '延長中…' : '+7日延長'}
                </button>
              )}
            </div>
          )}
          {retentionMessage && <p className="server-retention-ok">{retentionMessage}</p>}

          <div className="server-action-stack">
            <button type="button" className="server-action-btn" onClick={handleCopyInviteLink}>
              <span className="server-action-step">1</span>
              <span className="server-action-text">招待 URL をコピー</span>
            </button>
            {getEventSession(event.id)?.participantToken && (
              <Link
                to={`/events/${event.id}/participate?t=${encodeURIComponent(getEventSession(event.id)!.inviteToken!)}`}
                className="server-action-btn host-photo-link"
              >
                <span className="server-action-step">★</span>
                <span className="server-action-text">代表者として写真を提出</span>
              </Link>
            )}
            <button
              type="button"
              className="server-action-btn primary"
              disabled={serverPulling || !serverApiEnabled}
              onClick={() => void handlePullFromServer()}
            >
              <span className="server-action-step">2</span>
              <span className="server-action-text">
                {serverPulling ? '取り込み中…' : 'サーバーから提出を取り込む'}
              </span>
            </button>
          </div>

          {!serverApiEnabled && (
            <p className="collab-note">API 未設定のためオンライン機能は使えません。</p>
          )}
        </section>
      )}

      <details className="event-advanced-panel">
        <summary>その他のツール（書き出し・QR・オフライン）</summary>
        <div className="event-advanced-body">
          <div className="event-toolbar">
            <button type="button" onClick={handleShareEvent} className="action-button share-button">
              📤 共有
            </button>
            <button type="button" onClick={handleExportCSV} className="action-button export-button">
              📊 CSV
            </button>
            <button type="button" onClick={handleExportJSON} className="action-button export-button">
              📋 JSON
            </button>
            <button type="button" onClick={handleGenerateQR} className="action-button qr-button">
              🔲 QR
            </button>
          </div>

          {qrCodeUrl && (
            <div className="qr-code-section compact">
              <img src={qrCodeUrl} alt="招待用 QR コード" className="qr-code-image" />
              <button type="button" onClick={handleShareWithQR} className="action-button share-button">
                QR を共有
              </button>
            </div>
          )}

          <section className="collaboration-section offline-tools">
            <h3>オフライン用 JSON（予備）</h3>
            <p className="collab-note">サーバーが使えない場合のみ。写真込みは容量が大きくなります。</p>
            <button type="button" className="action-button" onClick={handleExportEventInvite}>
              参加用ファイルを書き出す
            </button>
            <CollaborationFileImport
              acceptLabel="提出ファイルを取り込む"
              hint="participant-submission の JSON"
              onBundleLoaded={handleImportParticipantBundle}
            />
            <button type="button" className="action-button" onClick={handleExportParticipantSubmission}>
              提出用ファイルを書き出す
            </button>
          </section>
        </div>
      </details>

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="event-detail-content">
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

      {inviteModal && (
        <InviteUrlModal
          inviteUrl={inviteModal.url}
          eventName={event.name}
          eventId={event.id}
          adminToken={inviteModal.adminToken ?? getEventSession(event.id)?.adminToken}
          hostParticipateUrl={inviteModal.hostParticipateUrl}
          variant={inviteModal.variant}
          onClose={() => setInviteModal(null)}
        />
      )}
    </div>
  )
}
