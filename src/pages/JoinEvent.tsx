import { useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import CollaborationFileImport from '../components/CollaborationFileImport'
import { importEventInvite, type CollaborationBundle } from '../utils/collaboration-bundle'
import { storage } from '../utils/storage'
import { isEventServerEnabled } from '../event-server/config'
import { setEventSession } from '../event-server/session'
import { useAppUi } from '../contexts/AppUiContext'
import './JoinEvent.css'

export default function JoinEvent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('e')
  const inviteToken = searchParams.get('t')
  const onlineEnabled = isEventServerEnabled()
  const { toast } = useAppUi()

  useEffect(() => {
    if (eventId && inviteToken && onlineEnabled) {
      setEventSession(eventId, { inviteToken })
      navigate(`/events/${eventId}/participate?t=${encodeURIComponent(inviteToken)}`, {
        replace: true,
      })
    }
  }, [eventId, inviteToken, navigate, onlineEnabled])

  const handleBundle = async (bundle: CollaborationBundle) => {
    await storage.init()

    if (bundle.type !== 'event-invite') {
      throw new Error('このファイルは参加用（イベント招待）ではありません。提出用ファイルの場合は代表者に送ってください。')
    }

    const result = await importEventInvite(bundle, {
      getEvent: (id) => storage.getEvent(id),
      addEvent: (event) => storage.addEvent(event),
      updateEvent: (event) => storage.updateEvent(event),
    })

    const msg = result.created
      ? 'イベントを取り込みました。'
      : 'イベント情報を更新しました。'
    toast(msg, 'success')
    navigate(`/events/${result.eventId}`)
  }

  if (eventId && inviteToken && onlineEnabled) {
    return (
      <div className="join-event-page">
        <p>オンライン提出ページへ移動しています…</p>
      </div>
    )
  }

  if (onlineEnabled) {
    return (
      <div className="join-event-page">
        <h1>イベントに参加</h1>
        <p className="join-event-lead">
          代表者から送られた<strong>招待 URL</strong>をブラウザで開いてください。URL から名前登録と写真提出ができます。
        </p>
        <p className="join-event-lead">
          このページ単体では参加できません。リンク全体（<code>?e=</code> と <code>?t=</code> 付き）が必要です。
        </p>
        <p className="join-event-alt">
          <Link to="/guide">使い方ガイド</Link>
          {' · '}
          <Link to="/">ホーム</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="join-event-page">
      <h1>イベントに参加（オフライン）</h1>
      <p className="join-event-lead">
        オンライン提出 API が未設定のため、参加用 JSON ファイルでイベントをこの端末に取り込みます。
      </p>
      <CollaborationFileImport
        acceptLabel="参加用ファイルを読み込む"
        hint="ファイル名の例: event-invite-○○.json"
        onBundleLoaded={handleBundle}
      />
      <button type="button" className="join-event-back" onClick={() => navigate('/')}>
        ホームに戻る
      </button>
      <p className="join-event-alt">
        <Link to="/events">イベント一覧</Link>
      </p>
    </div>
  )
}
