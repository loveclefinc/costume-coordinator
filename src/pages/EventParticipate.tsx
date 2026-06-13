import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { enrichCostumeColors, normalizePattern } from '../utils/theme-colors'
import {
  autoPickCostumesForEventTheme,
  type CostumeThemeMatch,
} from '../utils/costume-theme-match'
import { dataUrlToBlob } from '../utils/image-blob'
import EventCostumeMatcher from '../components/EventCostumeMatcher'
import {
  createServerCostume,
  fetchEventPublic,
  joinServerEvent,
  uploadServerPhoto,
  EventApiError,
} from '../event-server/client'
import { isEventServerEnabled, absoluteAppUrl } from '../event-server/config'
import {
  clearEventParticipantSession,
  getEventSession,
  setEventSession,
} from '../event-server/session'
import type { EventPublicInfo } from '../../shared/event-api-types'
import {
  DEFAULT_UPLOAD_LIMITS,
  formatBytes,
} from '../../shared/upload-limits'
import { useAppUi } from '../contexts/AppUiContext'
import { getDisplayName } from '../utils/user-profile'
import { getRecentUsageExcludeDays } from '../utils/app-settings'
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import { ensureLocalParticipantEvent } from '../utils/ensure-local-participant-event'
import { recordSingleCostumeUsage } from '../utils/usage-tracker'
import './EventParticipate.css'

type SubmitPhase = 'idle' | 'picking' | 'submitting' | 'done' | 'error'

async function submitPickedCostumes(
  eventId: string,
  participantToken: string,
  picked: CostumeThemeMatch[],
  limits: typeof DEFAULT_UPLOAD_LIMITS,
): Promise<number> {
  const preferenceOrder = picked.map((entry) => entry.costume.id)
  let submitted = 0

  for (const [index, match] of picked.entries()) {
    const costume = match.costume
    if (!costume.image) {
      throw new EventApiError(
        `「${costume.name}」に写真がありません。衣装管理から画像を登録してください。`,
        400,
      )
    }

    const enriched = enrichCostumeColors(costume.colors)
    const { costumeId } = await createServerCostume(eventId, participantToken, {
      name: costume.name.trim(),
      colors: enriched,
      tone: costume.tone,
      pattern: normalizePattern(costume.pattern),
      season: costume.season ?? [],
      type: costume.type,
      ...(costume.type === 'dress' && costume.silhouette ? { silhouette: costume.silhouette } : {}),
      ...(costume.type === 'suit' && costume.suitStyle ? { suitStyle: costume.suitStyle } : {}),
      ...(costume.type === 'suit' && costume.suitStyle === 'standard' && costume.suitBreasting ? { suitBreasting: costume.suitBreasting } : {}),
      ...(costume.type === 'suit' && costume.suitStyle === 'tuxedo' && costume.suitLapel ? { suitLapel: costume.suitLapel } : {}),
      preferences: index === 0 ? preferenceOrder : [],
    })

    const { blob, contentType } = await dataUrlToBlob(costume.image)
    if (blob.size > limits.maxPhotoBytes) {
      throw new EventApiError(
        `「${costume.name}」の写真が大きすぎます（${formatBytes(blob.size)}）。${formatBytes(limits.maxPhotoBytes)} 以下にしてください。`,
        400,
      )
    }

    await uploadServerPhoto(eventId, costumeId, participantToken, blob, contentType)
    submitted++
  }

  return submitted
}

export default function EventParticipate() {
  const { id: eventId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const inviteFromUrl = searchParams.get('t') ?? ''

  const [eventInfo, setEventInfo] = useState<EventPublicInfo | null>(null)
  const [displayName, setDisplayNameInput] = useState(() => getDisplayName())
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [usageHistoryLoaded, setUsageHistoryLoaded] = useState(false)
  const [pickedMatches, setPickedMatches] = useState<CostumeThemeMatch[]>([])
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const autoSubmitStarted = useRef(false)

  const { costumes, loading: costumesLoading } = useCostumes()
  const { toast } = useAppUi()
  const session = eventId ? getEventSession(eventId) : undefined
  const inviteToken = inviteFromUrl || session?.inviteToken || ''
  const participantToken = session?.participantToken
  const limits = eventInfo?.uploadLimits ?? DEFAULT_UPLOAD_LIMITS
  const profileName = getDisplayName()

  const [usageHistory, setUsageHistory] = useState<Awaited<ReturnType<typeof storage.getAllUsageHistory>>>([])

  const wardrobeReady = !costumesLoading && usageHistoryLoaded

  const fillProfileName = () => {
    if (profileName) setDisplayNameInput(profileName)
  }

  const loadPublic = useCallback(async () => {
    if (!eventId || !inviteToken) {
      setError('招待リンクが不正です（?t= トークンが必要です）')
      setLoading(false)
      return
    }
    try {
      const info = await fetchEventPublic(eventId, inviteToken)
      setEventInfo(info)
      await ensureLocalParticipantEvent(info, session?.displayName)
      if (session?.displayName) {
        setDisplayNameInput(session.displayName)
        setJoined(!!session.participantToken)
      } else if (!displayName && getDisplayName()) {
        setDisplayNameInput(getDisplayName())
      }
      if (session?.costumesSubmitted) {
        setSubmitPhase('done')
      }
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'イベントの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [eventId, inviteToken, session?.displayName, session?.participantToken, session?.costumesSubmitted, displayName])

  useEffect(() => {
    if (!isEventServerEnabled()) {
      setError('このサイトはオンライン提出 API が未設定です（VITE_EVENT_API_URL）')
      setLoading(false)
      return
    }
    void loadPublic()
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

  const runAutoPickAndSubmit = useCallback(async () => {
    if (!eventId || !participantToken || !wardrobeReady) return
    if (autoSubmitStarted.current || session?.costumesSubmitted) return

    autoSubmitStarted.current = true
    setSubmitPhase('picking')
    setError('')

    const recentUsageExcludeDays = getRecentUsageExcludeDays()
    const picked = autoPickCostumesForEventTheme(
      costumes,
      eventInfo?.themePreferences,
      usageHistory,
      limits.maxCostumesPerParticipant,
      undefined,
      recentUsageExcludeDays,
    )

    setPickedMatches(picked)

    if (picked.length === 0) {
      setSubmitPhase('error')
      autoSubmitStarted.current = false
      return
    }

    setSubmitPhase('submitting')
    try {
      const count = await submitPickedCostumes(eventId, participantToken, picked, limits)
      setEventSession(eventId, { costumesSubmitted: true })
      setSubmitPhase('done')
      const primary = picked[0]
      if (primary) {
        const participantName = session?.displayName ?? displayName
        try {
          await recordSingleCostumeUsage(
            eventId,
            participantName.trim(),
            primary.costume.id,
          )
        } catch {
          /* 使用履歴は任意 */
        }
      }
      const names = picked.map((entry) => entry.costume.name).join('、')
      toast(
        `候補 ${count} 件を提出しました（${names}）。全員提出後にシステムが組み合わせを自動決定します。`,
        'success',
      )
    } catch (e) {
      autoSubmitStarted.current = false
      setSubmitPhase('error')
      setError(e instanceof EventApiError ? e.message : '提出に失敗しました')
    }
  }, [
    eventId,
    participantToken,
    wardrobeReady,
    session?.costumesSubmitted,
    costumes,
    eventInfo?.themePreferences,
    usageHistory,
    limits,
    toast,
  ])

  useEffect(() => {
    if (!joined || !wardrobeReady) return
    if (pickedMatches.length > 0) return
    const recentUsageExcludeDays = getRecentUsageExcludeDays()
    const picked = autoPickCostumesForEventTheme(
      costumes,
      eventInfo?.themePreferences,
      usageHistory,
      limits.maxCostumesPerParticipant,
      undefined,
      recentUsageExcludeDays,
    )
    setPickedMatches(picked)
  }, [
    joined,
    wardrobeReady,
    pickedMatches.length,
    costumes,
    eventInfo?.themePreferences,
    usageHistory,
    limits.maxCostumesPerParticipant,
  ])

  useEffect(() => {
    if (!joined || !participantToken) return
    if (submitPhase === 'done' || session?.costumesSubmitted) return
    void runAutoPickAndSubmit()
  }, [joined, participantToken, submitPhase, session?.costumesSubmitted, runAutoPickAndSubmit])

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
    setPickedMatches([])
    setSubmitPhase('idle')
    autoSubmitStarted.current = false
    setError('')
    toast('別の名前で参加し直せます', 'info')
  }

  const handleRetrySubmit = () => {
    autoSubmitStarted.current = false
    setSubmitPhase('idle')
    setError('')
    void runAutoPickAndSubmit()
  }

  const matcherStatus = useMemo(() => {
    if (submitPhase === 'done') return 'done' as const
    if (submitPhase === 'submitting') return 'submitting' as const
    if (submitPhase === 'picking') return 'picking' as const
    return 'idle' as const
  }, [submitPhase])

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
            参加後、登録済みの衣装からテーマに合う候補を複数自動選出し、代表者へ提出します（組み合わせは全員提出後にシステムが決定）。
          </p>
          <div className="participate-name-row">
            <input
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

          <h3>2. 衣装の自動選出</h3>

          <EventCostumeMatcher
            picked={pickedMatches}
            theme={eventInfo?.themePreferences}
            costumesLoading={!wardrobeReady && submitPhase !== 'done'}
            status={matcherStatus}
          />

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
            <p className="participate-success">
              候補衣装の提出が完了しました。全員の提出が揃ったあと、システムが最適な組み合わせを自動で決定します。
            </p>
          )}

          {wardrobeReady && costumes.length === 0 && (
            <p className="participate-name-hint">
              衣装が未登録です。
              <Link to="/costumes/add"> 衣装を追加 </Link>
              してから「提出を再試行」してください。
            </p>
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
