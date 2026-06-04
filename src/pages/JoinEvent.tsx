import { useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import CollaborationFileImport from '../components/CollaborationFileImport'
import { importEventInvite, type CollaborationBundle } from '../utils/collaboration-bundle'
import { storage } from '../utils/storage'
import { isEventServerEnabled } from '../event-server/config'
import { setEventSession } from '../event-server/session'
import './JoinEvent.css'

export default function JoinEvent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('e')
  const inviteToken = searchParams.get('t')

  useEffect(() => {
    if (eventId && inviteToken && isEventServerEnabled()) {
      setEventSession(eventId, { inviteToken })
      navigate(`/events/${eventId}/participate?t=${encodeURIComponent(inviteToken)}`, {
        replace: true,
      })
    }
  }, [eventId, inviteToken, navigate])

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
      ? 'イベントを取り込みました（オフライン用）。オンライン提出の招待URLがある場合はそちらを開いてください。'
      : 'イベント情報を更新しました。'
    alert(msg)
    navigate(`/events/${result.eventId}`)
  }

  if (eventId && inviteToken && isEventServerEnabled()) {
    return (
      <div className="join-event-page">
        <p>オンライン提出ページへ移動しています…</p>
      </div>
    )
  }

  return (
    <div className="join-event-page">
      <h1>イベントに参加</h1>
      <p className="join-event-lead">
        <strong>オンライン提出:</strong> 代表者から送られた<strong>招待 URL</strong>を開くと、写真をサーバーに提出できます。
      </p>
      <p className="join-event-lead">
        <strong>オフライン（JSON）:</strong> 参加用 JSON を読み込むと、この端末にイベントがコピーされます（写真は手動登録）。
      </p>
      <CollaborationFileImport
        acceptLabel="参加用ファイルを読み込む（オフライン）"
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
