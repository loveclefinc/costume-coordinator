import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { enrichCostumeColors, normalizePattern } from '../utils/theme-colors'
import {
  createServerCostume,
  fetchEventPublic,
  joinServerEvent,
  uploadServerPhoto,
  EventApiError,
} from '../event-server/client'
import { isEventServerEnabled, absoluteAppUrl } from '../event-server/config'
import { getEventSession, setEventSession } from '../event-server/session'
import type { EventPublicInfo } from '../../shared/event-api-types'
import {
  DEFAULT_UPLOAD_LIMITS,
  formatBytes,
  type UploadLimits,
} from '../../shared/upload-limits'
import './EventParticipate.css'

function validatePhotoFiles(files: File[], limits: UploadLimits): string | null {
  if (files.length > limits.maxPhotosPerCostume) {
    return `写真は最大 ${limits.maxPhotosPerCostume} 枚までです`
  }
  for (const f of files) {
    if (!f.type.startsWith('image/')) {
      return '画像ファイルのみ選択できます'
    }
    if (f.size > limits.maxPhotoBytes) {
      return `「${f.name}」は ${formatBytes(f.size)} です。1枚あたり ${formatBytes(limits.maxPhotoBytes)} まで`
    }
  }
  const total = files.reduce((s, f) => s + f.size, 0)
  if (total > limits.maxPhotoBytes * limits.maxPhotosPerCostume) {
    return `選択した写真の合計が大きすぎます`
  }
  return null
}

export default function EventParticipate() {
  const { id: eventId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const inviteFromUrl = searchParams.get('t') ?? ''

  const [eventInfo, setEventInfo] = useState<EventPublicInfo | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [costumeName, setCostumeName] = useState('')
  const [colors, setColors] = useState<string[]>([])
  const [tone, setTone] = useState('neutral')
  const [pattern, setPattern] = useState('plain')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadedCount, setUploadedCount] = useState(0)

  const session = eventId ? getEventSession(eventId) : undefined
  const inviteToken = inviteFromUrl || session?.inviteToken || ''
  const participantToken = session?.participantToken
  const limits = eventInfo?.uploadLimits ?? DEFAULT_UPLOAD_LIMITS

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
        setDisplayName(session.displayName)
        setJoined(!!session.participantToken)
      }
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'イベントの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [eventId, inviteToken, session?.displayName, session?.participantToken])

  useEffect(() => {
    if (!isEventServerEnabled()) {
      setError('このサイトはオンライン提出 API が未設定です（VITE_EVENT_API_URL）')
      setLoading(false)
      return
    }
    void loadPublic()
  }, [loadPublic])

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
      alert(`${res.displayName} さんとして参加しました。衣装と写真を登録してください。`)
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '参加に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitCostume = async () => {
    if (!eventId || !participantToken || !costumeName.trim()) return
    if (photoFiles.length === 0) {
      setError('写真を1枚以上選んでください')
      return
    }
    const fileErr = validatePhotoFiles(photoFiles, limits)
    if (fileErr) {
      setError(fileErr)
      return
    }
    setBusy(true)
    setError('')
    try {
      const enriched = enrichCostumeColors(colors.length ? colors : ['#888888'])
      const { costumeId } = await createServerCostume(eventId, participantToken, {
        name: costumeName.trim(),
        colors: enriched,
        tone,
        pattern: normalizePattern(pattern),
        season: [],
      })

      let uploaded = 0
      for (const file of photoFiles.slice(0, limits.maxPhotosPerCostume)) {
        await uploadServerPhoto(
          eventId,
          costumeId,
          participantToken,
          file,
          file.type || 'image/jpeg',
        )
        uploaded++
      }
      setUploadedCount((c) => c + uploaded)
      setCostumeName('')
      setColors([])
      setPhotoFiles([])
      alert(`衣装「${costumeName}」を ${uploaded} 枚の写真付きで提出しました。`)
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
            <li>1枚あたり: 最大 {formatBytes(limits.maxPhotoBytes)}（JPEG/PNG 等）</li>
            <li>1衣装あたり: 最大 {limits.maxPhotosPerCostume} 枚</li>
            <li>お一人様: 衣装最大 {limits.maxCostumesPerParticipant} 件</li>
            <li>イベント全体: 最大 {formatBytes(limits.maxEventStorageBytes)}</li>
          </ul>
        </div>
      )}

      {error && <p className="participate-error">{error}</p>}

      {!joined ? (
        <section className="participate-section">
          <h3>1. 参加者名</h3>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="表示名（例: 太郎）"
            className="participate-input"
          />
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
            <strong>{session?.displayName ?? displayName}</strong> として登録済みです。衣装と写真を登録してください。
          </p>
          <h3>
            2. 衣装を提出（写真必須・最大{limits.maxPhotosPerCostume}枚・各
            {formatBytes(limits.maxPhotoBytes)}まで）
          </h3>
          <label className="participate-label">
            衣装名
            <input
              type="text"
              className="participate-input"
              value={costumeName}
              onChange={(e) => setCostumeName(e.target.value)}
            />
          </label>
          <label className="participate-label">
            メインカラー（HEX）
            <input
              type="color"
              onChange={(e) => setColors([e.target.value])}
            />
          </label>
          <label className="participate-label">
            トーン
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="pastel">パステル</option>
              <option value="vivid">ビビッド</option>
              <option value="dark">ダーク</option>
              <option value="neutral">ニュートラル</option>
            </select>
          </label>
          <label className="participate-label">
            柄
            <select value={pattern} onChange={(e) => setPattern(e.target.value)}>
              <option value="plain">無地</option>
              <option value="floral">花柄</option>
              <option value="stripe">ストライプ</option>
              <option value="dot">ドット</option>
            </select>
          </label>
          <label className="participate-label">
            写真（{photoFiles.length}/{limits.maxPhotosPerCostume}）
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/*"
              multiple
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, limits.maxPhotosPerCostume)
                const err = validatePhotoFiles(files, limits)
                setError(err ?? '')
                setPhotoFiles(err ? [] : files)
              }}
            />
          </label>
          <button
            type="button"
            className="participate-btn primary"
            disabled={busy}
            onClick={() => void handleSubmitCostume()}
          >
            この衣装を提出
          </button>
          {uploadedCount > 0 && (
            <p className="participate-success">これまでに {uploadedCount} 枚アップロード済み</p>
          )}
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
