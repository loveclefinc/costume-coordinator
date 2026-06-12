import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { enrichCostumeColors, normalizePattern } from '../utils/theme-colors'
import { rankCostumesForEventTheme } from '../utils/costume-theme-match'
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
import { useCostumes } from '../hooks/useCostumes'
import { storage } from '../utils/storage'
import './EventParticipate.css'

export default function EventParticipate() {
  const { id: eventId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const inviteFromUrl = searchParams.get('t') ?? ''

  const [eventInfo, setEventInfo] = useState<EventPublicInfo | null>(null)
  const [displayName, setDisplayNameInput] = useState(() => getDisplayName())
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [selectedCostumeId, setSelectedCostumeId] = useState<string | null>(null)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [usageHistoryLoaded, setUsageHistoryLoaded] = useState(false)

  const { costumes, loading: costumesLoading } = useCostumes()
  const { toast } = useAppUi()
  const session = eventId ? getEventSession(eventId) : undefined
  const inviteToken = inviteFromUrl || session?.inviteToken || ''
  const participantToken = session?.participantToken
  const limits = eventInfo?.uploadLimits ?? DEFAULT_UPLOAD_LIMITS
  const profileName = getDisplayName()

  const [usageHistory, setUsageHistory] = useState<Awaited<ReturnType<typeof storage.getAllUsageHistory>>>([])

  const rankedMatches = useMemo(
    () => rankCostumesForEventTheme(
      costumes,
      eventInfo?.themePreferences,
      usageHistory,
    ),
    [costumes, eventInfo?.themePreferences, usageHistory],
  )

  const selectedMatch = rankedMatches.find((m) => m.costume.id === selectedCostumeId) ?? null

  useEffect(() => {
    if (rankedMatches.length > 0 && !selectedCostumeId) {
      setSelectedCostumeId(rankedMatches[0].costume.id)
    }
  }, [rankedMatches, selectedCostumeId])

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
      if (session?.displayName) {
        setDisplayNameInput(session.displayName)
        setJoined(!!session.participantToken)
      } else if (!displayName && getDisplayName()) {
        setDisplayNameInput(getDisplayName())
      }
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'イベントの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [eventId, inviteToken, session?.displayName, session?.participantToken, displayName])

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
      })
      setJoined(true)
      toast(`${res.displayName} さんとして参加しました。テーマに合う衣装を選んで提出してください。`, 'success')
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
    setSubmittedCount(0)
    setSelectedCostumeId(rankedMatches[0]?.costume.id ?? null)
    setError('')
    toast('別の名前で参加し直せます', 'info')
  }

  const handleSubmitCostume = async () => {
    if (!eventId || !participantToken || !selectedMatch) return
    if (submittedCount >= limits.maxCostumesPerParticipant) {
      setError(`衣装はお一人様 ${limits.maxCostumesPerParticipant} 件までです`)
      return
    }

    const costume = selectedMatch.costume
    if (!costume.image) {
      setError('選択した衣装に写真がありません。衣装管理から画像を登録してください。')
      return
    }

    setBusy(true)
    setError('')
    try {
      const enriched = enrichCostumeColors(costume.colors)
      const { costumeId } = await createServerCostume(eventId, participantToken, {
        name: costume.name.trim(),
        colors: enriched,
        tone: costume.tone,
        pattern: normalizePattern(costume.pattern),
        season: costume.season ?? [],
        type: costume.type,
      })

      const { blob, contentType } = await dataUrlToBlob(costume.image)
      if (blob.size > limits.maxPhotoBytes) {
        throw new EventApiError(
          `衣装写真が大きすぎます（${formatBytes(blob.size)}）。${formatBytes(limits.maxPhotoBytes)} 以下に圧縮してください。`,
          400,
        )
      }

      await uploadServerPhoto(eventId, costumeId, participantToken, blob, contentType)
      setSubmittedCount((c) => c + 1)
      toast(`「${costume.name}」を提出しました（適合度 ${selectedMatch.scorePercent}%）`, 'success')
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '提出に失敗しました')
    } finally {
      setBusy(false)
    }
  }

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
          <ul className="participate-limits">
            <li>お一人様: 衣装最大 {limits.maxCostumesPerParticipant} 件</li>
            <li>1枚あたり: 最大 {formatBytes(limits.maxPhotoBytes)}</li>
          </ul>
        </div>
      )}

      {error && <p className="participate-error">{error}</p>}

      {!joined ? (
        <section className="participate-section">
          <h3>1. 参加者名</h3>
          <p className="participate-name-hint">
            このイベントでの表示名です。設定の表示名とは別名でも参加できます。
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
            参加する
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

          <h3>2. 登録衣装から提出する衣装を選ぶ</h3>
          <p className="participate-name-hint">
            この端末に登録した衣装の中から、イベントのテーマに合うものを自動で並べ替えています。
          </p>

          <EventCostumeMatcher
            matches={rankedMatches}
            theme={eventInfo?.themePreferences}
            selectedCostumeId={selectedCostumeId}
            onSelect={setSelectedCostumeId}
            disabled={busy}
            costumesLoading={costumesLoading || !usageHistoryLoaded}
          />

          <button
            type="button"
            className="participate-btn primary"
            disabled={busy || !selectedMatch || submittedCount >= limits.maxCostumesPerParticipant}
            onClick={() => void handleSubmitCostume()}
          >
            {selectedMatch
              ? `「${selectedMatch.costume.name}」を提出する`
              : '衣装を選択してください'}
          </button>

          {submittedCount > 0 && (
            <p className="participate-success">
              {submittedCount} 件提出済み（残り {Math.max(0, limits.maxCostumesPerParticipant - submittedCount)} 件）
            </p>
          )}

          <p className="participate-name-hint">
            衣装が未登録の場合は
            <Link to="/costumes/add"> 衣装を追加 </Link>
            してから戻ってください。
          </p>
        </section>
      )}

      <p className="participate-footer">
        <Link to="/">ホーム</Link>
        {eventId && (
          <>
            {' · '}
            <button type="button" className="participate-link-btn" onClick={() => navigate('/')}>
              閉じる
            </button>
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
