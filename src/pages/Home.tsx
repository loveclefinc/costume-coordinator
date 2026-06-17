import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import { useEvents } from '../hooks/useEvents'
import { isEventServerEnabled } from '../event-server/config'
import { useAppUi } from '../contexts/AppUiContext'
import PublicLegalFooter from '../components/PublicLegalFooter'
import AppIcon from '../components/AppIcon'
import { APP_DISPLAY_NAME, APP_DISPLAY_NAME_JA } from '../constants/app-brand'
import './Home.css'

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const { getEvent, updateEvent } = useEvents()
  const [addingParticipant, setAddingParticipant] = useState(false)
  const onlineEnabled = isEventServerEnabled()
  const { toast } = useAppUi()

  const handleParticipantAdded = async (eventId: string, participantName: string) => {
    try {
      setAddingParticipant(true)
      const event = await getEvent(eventId)
      if (event) {
        if (!event.participants.includes(participantName)) {
          await updateEvent(eventId, {
            participants: [...event.participants, participantName],
          })
          toast(`${participantName}さんを参加者に追加しました（この端末のみ）。`, 'success')
        } else {
          toast(`${participantName}さんはすでに参加しています。`, 'info')
        }
      } else {
        toast(
          onlineEnabled
            ? 'この端末にイベントがありません。代表者から送られた招待 URL を開いてください。'
            : 'この端末にイベントがありません。代表者から送られた参加用ファイルを読み込んでください。',
          'error',
        )
      }
      setShowQRScanner(false)
    } catch (err) {
      toast('参加者の追加に失敗しました', 'error')
      console.error(err)
    } finally {
      setAddingParticipant(false)
    }
  }

  return (
    <div className="home-page">
      <div className="hero">
        <AppIcon size="lg" className="hero-app-icon" />
        <h1 className="hero-app-name">{APP_DISPLAY_NAME_JA}</h1>
        <p className="hero-app-name-en">{APP_DISPLAY_NAME}</p>
        <p className="hero-app-subtitle">グループイベントの衣装選択を最適化</p>
        <div className="hero-description">
          <p>
            複数人が参加するイベントで、各自の手持ち衣装の範囲内から、テーマに沿った組み合わせを自動提案します。
            色味を揃える・意図的にバラける、トーンや柄、ドレスのシルエット、スーツの形式（タキシード・燕尾など）、タキシードのラペル、一般スーツの前釦など、イベント方針に合わせてグループとしてまとまりのあるコーディネートを目指します。
          </p>
        </div>
      </div>

      <div className="features">
        <div className="feature-card no-hover">
          <div className="feature-icon">🎨</div>
          <h3>テーマに合う候補を自動選出</h3>
          <p>参加者ごとに、登録済み衣装の中から色・トーン・柄がイベントテーマに合う候補を自動で選びます（提出前の第1段階）</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">👗</div>
          <h3>グループ全体の組み合わせ決定</h3>
          <p>全員の候補を集め、色味方針や相互の調和を考慮して、参加者1人につき1着の組み合わせを自動決定します（第2段階）</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">📅</div>
          <h3>使用履歴管理</h3>
          <p>使用履歴を記録。設定の「直近使用除外日数」以内の衣装は、クリーニング中の想定で候補から除外します</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">👥</div>
          <h3>イベント管理</h3>
          <p>複数のイベントを管理。オンライン提出では参加者が候補衣装をサーバーへ提出し、全員提出後にシステムが組み合わせを自動決定します</p>
        </div>
      </div>

      <div className="cta-section">
        <Link to="/costumes" className="cta-button primary">
          衣装を追加する
        </Link>
        <Link to="/events" className="cta-button secondary">
          イベントを作成する
        </Link>
        {onlineEnabled ? (
          <Link to="/guide" className="cta-button qr-button">
            📖 オンライン提出の使い方
          </Link>
        ) : (
          <Link to="/join" className="cta-button qr-button">
            📥 イベントに参加（オフライン）
          </Link>
        )}
        <a
          href="https://concert-jp.info"
          target="_blank"
          rel="noopener noreferrer"
          className="cta-button concert-button"
          title="コンサート情報を確認"
        >
          🎤 コンサート告知
        </a>
      </div>

      {showQRScanner && (
        <QRScanner 
          onClose={() => setShowQRScanner(false)}
          onParticipantAdded={handleParticipantAdded}
        />
      )}

      <section className="info-section collaboration-home">
        <h2>👥 複数人で使うとき</h2>
        <ol>
          <li>代表者: イベント作成で<strong>「オンライン提出」</strong>をオン → 招待 URL を参加者へ送る</li>
          <li>参加者: URL を開く → 名前登録 → <strong>登録済み衣装からテーマに合うものを自動選出して提出</strong>（イベント日まで / 最大14日保持）</li>
          <li>代表者: 全員提出後、イベント詳細 → <strong>サーバーから提出を取り込む</strong> → システムが<strong>自動で</strong>組み合わせを決定</li>
        </ol>
        <p className="collab-alt">
          <Link to="/guide">使い方ガイド（全文）</Link>
          {!onlineEnabled && (
            <>
              {' · '}
              API 未設定時は <Link to="/join">オフライン JSON</Link> でのやり取りになります。
            </>
          )}
        </p>
      </section>

      <PublicLegalFooter />
    </div>
  )
}
