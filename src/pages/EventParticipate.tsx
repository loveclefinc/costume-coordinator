import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { autoPickCostumesForParticipation } from '../utils/participate-costume-pick'
import type { CostumeThemeMatch } from '../utils/costume-theme-match'
import { dataUrlToBlob } from '../utils/image-blob'
import EventCostumeMatcher from '../components/EventCostumeMatcher'
import {
  createServerCostume,
  fetchEventPublic,
  fetchPublishedEventResults,
  fetchParticipantSubmissionStatus,
  joinServerEvent,
  uploadServerPhoto,
  EventApiError,
} from '../event-server/client'
import {
  clearEventParticipantSession,
  getEventSession,
  setEventSession,
} from '../event-server/session'
import type { EventPublicInfo } from '../../shared/event-api-types'
import {
  DEFAULT_UPLOAD_LIMITS,
} from '../../shared/upload-limits'
import { useAppUi } from '../contexts/AppUiContext'
import { getDisplayName } from '../utils/user-profile'
import { getRecentUsageExcludeDays } from '../utils/app-settings'
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import { ensureLocalParticipantEvent } from '../utils/ensure-local-participant-event'
import { cancelLocalParticipation } from '../utils/cancel-participation'
import {
  resolveSubmitPhaseAfterStatusCheck,
  shouldStartAutoSubmit,
  type ParticipateSubmitPhase,
} from '../utils/participate-auto-submit'
import { submitPickedCostumesIdempotent } from '../utils/submit-participant-costumes'
import { isEventServerEnabled, absoluteAppUrl } from '../event-server/config'
import { buildParticipantCostumeAddPath } from '../utils/participant-costume-route'
import './EventParticipate.css'

type SubmitPhase = ParticipateSubmitPhase

export default function EventParticipate() {
  const { id: eventId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const inviteFromUrl = searchParams.get('t') ?? ''

  const [eventInfo, setEventInfo] = useState<EventPublicInfo | null>(null)
  const [displayName, setDisplayNameInput] = useState(() => getDisplayName())
  const [editingName, setEditingName] = useState(() => !getDisplayName())
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [usageHistoryLoaded, setUsageHistoryLoaded] = useState(false)
  const [pickedMatches, setPickedMatches] = useState<CostumeThemeMatch[]>([])
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [resultsPublished, setResultsPublished] = useState(false)
  const autoSubmitStarted = useRef(false)
  const submitInFlightRef = useRef(false)

  const { costumes, loading: costumesLoading, reloadCostumes } = useCostumes()
  const { toast } = useAppUi()
  const session = eventId ? getEventSession(eventId) : undefined
  const inviteToken = inviteFromUrl || session?.inviteToken || ''
  const participantToken = session?.participantToken
  const limits = eventInfo?.uploadLimits ?? DEFAULT_UPLOAD_LIMITS
  const profileName = getDisplayName()
  const addCostumePath = eventId
    ? buildParticipantCostumeAddPath(eventId, inviteToken)
    : '/costumes/add'

  const [usageHistory, setUsageHistory] = useState<Awaited<ReturnType<typeof storage.getAllUsageHistory>>>([])

  const wardrobeReady = !costumesLoading && usageHistoryLoaded

  const fillProfileName = () => {
    if (profileName) setDisplayNameInput(profileName)
    setEditingName(false)
  }

  const loadPublic = useCallback(async () => {
    if (!eventId || !inviteToken) {
      setError('招待リンクが不正です（?t= トークンが必要です）')
      setLoading(false)
      return
    }

    const session = getEventSession(eventId)

    try {
      const info = await fetchEventPublic(eventId, inviteToken)
      setEventInfo(info)

      const token = session?.participantToken
      if (token) {
        try {
          const status = await fetchParticipantSubmissionStatus(eventId, token)
          setEventSession(eventId, {
            costumesSubmitted: status.submitted,
            displayName: status.displayName,
          })
          setDisplayNameInput((prev) => status.displayName || prev)
          setJoined(true)
          setSubmitPhase((phase) => resolveSubmitPhaseAfterStatusCheck(phase, status.submitted))
          await ensureLocalParticipantEvent(info, status.displayName)
          if (status.submitted) {
            autoSubmitStarted.current = true
          }
          const published = await fetchPublishedEventResults(eventId, token)
          setResultsPublished(published.assignments.length > 0)
        } catch (e) {
          if (e instanceof EventApiError && e.status === 404) {
            throw new EventApiError(
              'オンライン提出APIが古いため、提出状態を確認できません。管理者にAPIの更新を依頼してください。',
              503,
            )
          } else if (e instanceof EventApiError && (e.status === 401 || e.status === 403)) {
            clearEventParticipantSession(eventId)
            setJoined(false)
            setSubmitPhase('idle')
            autoSubmitStarted.current = false
            setDisplayNameInput((prev) => prev || getDisplayName())
          } else {
            throw e
          }
        }
      } else if (session?.displayName) {
        setDisplayNameInput(session.displayName)
        setEditingName(false)
      } else {
        setDisplayNameInput((prev) => prev || getDisplayName())
        setEditingName(!getDisplayName())
      }
    } catch (e) {
      if (eventId && e instanceof EventApiError && (e.status === 404 || e.status === 410)) {
        await cancelLocalParticipation(eventId)
        setEventInfo(null)
        setJoined(false)
        setError('このイベントは主催者により削除されました')
        return
      }
      setError(e instanceof EventApiError ? e.message : 'イベントの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [eventId, inviteToken])

  useEffect(() => {
    void reloadCostumes()
  }, [reloadCostumes])

  useEffect(() => {
    if (!isEventServerEnabled()) {
      setError('このサイトはオンライン提出 API が未設定です（VITE_EVENT_API_URL）')
      setLoading(false)
      return
    }
    void loadPublic()
    window.addEventListener('focus', loadPublic)
    window.addEventListener('pageshow', loadPublic)
    return () => {
      window.removeEventListener('focus', loadPublic)
      window.removeEventListener('pageshow', loadPublic)
    }
  }, [loadPublic])

  useEffect(() => {
    let cancelled = false
    void storage.init().then(async () => {
      const history = await storage.getAllUsageHistory()
      if (!cancelled) {
        setUsageHistory(history)
        setUsageHistoryLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!joined || !wardrobeReady) return
    if (submitPhase === 'submitting' || submitPhase === 'done') return

    if (costumes.length === 0) {
      setPickedMatches([])
      return
    }

    const recentUsageExcludeDays = getRecentUsageExcludeDays()
    const picked = autoPickCostumesForParticipation(
      costumes,
      eventInfo?.themePreferences,
      usageHistory,
      limits.maxCostumesPerParticipant,
      recentUsageExcludeDays,
    )
    setPickedMatches(picked)
  }, [
    joined,
    wardrobeReady,
    submitPhase,
    costumes,
    eventInfo?.themePreferences,
    usageHistory,
    limits.maxCostumesPerParticipant,
  ])

  const runSubmitPicked = useCallback(async () => {
    if (!eventId || !participantToken || !wardrobeReady) return
    if (submitInFlightRef.current) return
    if (pickedMatches.length === 0) {
      setSubmitPhase('error')
      setError(
        costumes.length === 0
          ? ''
          : 'テーマ条件または使用履歴の設定により、提出できる衣装・コーデ候補がありません。登録内容を見直すか、設定の使用履歴除外日数を確認してください。',
      )
      return
    }

    submitInFlightRef.current = true
    autoSubmitStarted.current = true
    setSubmitPhase('submitting')
    setError('')

    try {
      const count = await submitPickedCostumesIdempotent(
        eventId,
        participantToken,
        pickedMatches,
        limits,
        {
          fetchStatus: fetchParticipantSubmissionStatus,
          createCostume: createServerCostume,
          uploadPhoto: uploadServerPhoto,
          dataUrlToBlob,
        },
      )
      setEventSession(eventId, { costumesSubmitted: true })
      setSubmitPhase('done')
      const names = pickedMatches.map((entry) => entry.costume.name).join('、')
      toast(
        `候補 ${count} 件を提出しました（${names}）。全員提出後にシステムが組み合わせを自動決定します。`,
        'success',
      )
    } catch (e) {
      autoSubmitStarted.current = false
      setSubmitPhase('error')
      setError(e instanceof EventApiError ? e.message : '提出に失敗しました')
    } finally {
      submitInFlightRef.current = false
    }
  }, [
    eventId,
    participantToken,
    wardrobeReady,
    pickedMatches,
    costumes.length,
    limits,
    displayName,
    toast,
  ])

  useEffect(() => {
    if (
      !shouldStartAutoSubmit({
        joined,
        participantToken,
        wardrobeReady,
        submitPhase,
        autoSubmitStarted: autoSubmitStarted.current,
      })
    ) {
      return
    }
    if (pickedMatches.length === 0) return
    void runSubmitPicked()
  }, [
    joined,
    participantToken,
    wardrobeReady,
    submitPhase,
    pickedMatches.length,
    runSubmitPicked,
  ])

  const handleJoin = async () => {
    if (!eventId || !inviteToken || !displayName.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await joinServerEvent(eventId, inviteToken, {
        displayName: displayName.trim(),
      })
      setEventSession(eventId, {
        inviteToken,
        participantToken: res.participantToken,
        participantId: res.participantId,
        displayName: res.displayName,
        expiresAt: eventInfo?.expiresAt,
        costumesSubmitted: false,
      })
      if (eventInfo) {
        await ensureLocalParticipantEvent(eventInfo, res.displayName)
      }
      setJoined(true)
      autoSubmitStarted.current = false
      setSubmitPhase('idle')
      toast(`${res.displayName} さんとして参加しました。衣装を自動選出して提出します。`, 'success')
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '参加に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const handleChangeParticipationName = () => {
    if (!eventId) return
    clearEventParticipantSession(eventId)
    setJoined(false)
      setDisplayNameInput(getDisplayName())
      setEditingName(!getDisplayName())
    setPickedMatches([])
    setSubmitPhase('idle')
    autoSubmitStarted.current = false
    setError('')
    toast('別の名前で参加し直せます', 'info')
  }

  const handleRetrySubmit = () => {
    if (!eventId) return
    setEventSession(eventId, { costumesSubmitted: false })
    autoSubmitStarted.current = false
    setSubmitPhase('idle')
    setError('')
    void runSubmitPicked()
  }

  const matcherStatus = useMemo(() => {
    if (submitPhase === 'done') return 'done' as const
    if (submitPhase === 'submitting') return 'submitting' as const
    if (submitPhase === 'picking' || (!wardrobeReady && joined)) return 'picking' as const
    return 'idle' as const
  }, [submitPhase, wardrobeReady, joined])

  if (loading) {
    return (
      <div className="participate-page">
        <p>読み込み中…</p>
      </div>
    )
  }

  return (
    <div className="participate-page">
      <h1>オンライン提出</h1>
      {eventInfo && (
        <div className="participate-event-card">
          <h2>{eventInfo.name}</h2>
          <p>開催日: {eventInfo.date}</p>
          <p className="participate-expiry">
            データ保存期限: {new Date(eventInfo.expiresAt).toLocaleString('ja-JP')}
          </p>
        </div>
      )}

      {error && <p className="participate-error">{error}</p>}

      {!joined ? (
        <section className="participate-section">
          <h3>1. 参加者名</h3>
          <p className="participate-name-hint">
            参加後、登録済みの単品衣装とお気に入りコーデからテーマに合う候補を複数自動選出し、代表者へ提出します（最終結果は全員提出後にシステムが決定）。
          </p>
          {profileName && !editingName ? (
            <div className="participate-profile-choice">
              <p>
                設定の表示名 <strong>{profileName}</strong> で参加します。
              </p>
              <button
                type="button"
                className="participate-btn primary"
                disabled={busy}
                onClick={() => void handleJoin()}
              >
                この名前で参加して自動提出する
              </button>
              <button
                type="button"
                className="participate-btn secondary"
                onClick={() => setEditingName(true)}
              >
                別の名前で参加する
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="participant-display-name" className="participate-name-label">
                表示名
              </label>
              <div className="participate-name-row">
                <input
                  id="participant-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="表示名（例: 太郎）"
                  className="participate-input"
                  maxLength={100}
                />
                {profileName && (
                  <button
                    type="button"
                    className="participate-btn secondary"
                    onClick={fillProfileName}
                    disabled={displayName === profileName}
                  >
                    設定の名前
                  </button>
                )}
              </div>
              <button
                type="button"
                className="participate-btn primary"
                disabled={busy || !displayName.trim()}
                onClick={() => void handleJoin()}
              >
                参加して自動提出する
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="participate-section">
          <p className="participate-joined">
            <strong>{session?.displayName ?? displayName}</strong> として登録済みです。
          </p>
          <button
            type="button"
            className="participate-btn secondary participate-change-name"
            onClick={handleChangeParticipationName}
          >
            別の名前で参加し直す
          </button>

          <h3>2. 衣装・コーデの自動選出</h3>

          {(!wardrobeReady || pickedMatches.length > 0) && (
            <EventCostumeMatcher
              picked={pickedMatches}
              theme={eventInfo?.themePreferences}
              wardrobeCount={wardrobeReady ? costumes.length : undefined}
              costumesLoading={!wardrobeReady}
              status={matcherStatus}
            />
          )}

          {submitPhase === 'error' && pickedMatches.length === 0 && costumes.length > 0 && (
            <button
              type="button"
              className="participate-btn primary"
              onClick={handleRetrySubmit}
            >
              提出を再試行
            </button>
          )}

          {submitPhase === 'error' && pickedMatches.length > 0 && (
            <button
              type="button"
              className="participate-btn primary"
              onClick={handleRetrySubmit}
            >
              提出を再試行
            </button>
          )}

          {submitPhase === 'done' && (
            <div className="participate-success">
              <p>
                {resultsPublished
                  ? '組み合わせが決定しました。'
                  : '衣装・コーデ候補の提出は完了しています。代表者の確認待ちです。'}
              </p>
              {resultsPublished && eventId && (
                <Link to={`/events/${eventId}`} className="participate-btn primary">
                  決定結果を見る
                </Link>
              )}
            </div>
          )}

          {wardrobeReady && pickedMatches.length === 0 && (
            <div className="participate-add-costume">
              <p className="participate-name-hint">
                {costumes.length === 0
                  ? '衣装が未登録です。写真を選び、衣装情報を確認してから保存してください。'
                  : '提出できる候補がありません。別の衣装を写真から追加するか、登録済み衣装の内容を見直してください。'}
              </p>
              <Link to={addCostumePath} className="participate-btn primary">
                {costumes.length === 0 ? '写真から衣装を追加' : '別の衣装を写真から追加'}
              </Link>
            </div>
          )}
        </section>
      )}

      <p className="participate-footer">
        <Link to="/">ホーム</Link>
        {eventId && (
          <>
            {' · '}
            <Link to={`/events/${eventId}`}>イベント詳細</Link>
            {' · '}
            <Link to="/events">イベント一覧</Link>
          </>
        )}
      </p>
      {!inviteFromUrl && eventId && inviteToken && (
        <p className="participate-hint">
          招待リンク例: {absoluteAppUrl(`/join?e=${eventId}&t=${inviteToken}`)}
        </p>
      )}
    </div>
  )
}
