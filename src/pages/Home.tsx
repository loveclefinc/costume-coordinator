import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import { useEvents } from '../hooks/useEvents'
import './Home.css'

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const { getEvent, updateEvent } = useEvents()
  const [addingParticipant, setAddingParticipant] = useState(false)

  const handleParticipantAdded = async (eventId: string, participantName: string) => {
    try {
      setAddingParticipant(true)
      const event = await getEvent(eventId)
      if (event) {
        if (!event.participants.includes(participantName)) {
          await updateEvent(eventId, {
            participants: [...event.participants, participantName],
          })
          alert(`${participantName}さんを参加者に追加しました（この端末のみ）。`)
        } else {
          alert(`${participantName}さんはすでに参加しています。`)
        }
      } else {
        alert(
          'この端末にイベントがありません。代表者から送られた「参加用ファイル」を「イベントに参加」から読み込んでください。',
        )
      }
      setShowQRScanner(false)
    } catch (err) {
      alert('参加者の追加に失敗しました。')
      console.error(err)
    } finally {
      setAddingParticipant(false)
    }
  }

  return (
    <div className="home-page">
      <div className="hero">
        <h1>👗 衣装コーディネーター</h1>
        <p>グループイベントの衣装選択を最適化</p>
        <div className="hero-description">
          <p>複数人が参加するイベントで、全体の統一感を保ちながら、各自の手持ち衣装から最適な組み合わせを自動提案します。色味の統一、トーン、柄などのテーマ設定で、理想的なコーディネートを実現します。</p>
        </div>
      </div>

      <div className="features">
        <div className="feature-card no-hover">
          <div className="feature-icon">🎨</div>
          <h3>イベントテーマに合わせた提案</h3>
          <p>色味を統一するか、パステル系で揃えるかなど、イベントのテーマに合わせた衣装を自動提案</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">👗</div>
          <h3>手持ち衣装から最適な組み合わせ</h3>
          <p>参加者の手持ち衣装の中から、イベントテーマに最も合った組み合わせを提案</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">📅</div>
          <h3>使用履歴管理</h3>
          <p>直近の使用履歴を記録し、同じ衣装の重複使用を回避</p>
        </div>

        <div className="feature-card no-hover">
          <div className="feature-icon">👥</div>
          <h3>イベント管理</h3>
          <p>複数のイベントを管理し、参加者と衣装情報を共有</p>
        </div>
      </div>

      <div className="cta-section">
        <Link to="/costumes" className="cta-button primary">
          衣装を追加する
        </Link>
        <Link to="/events" className="cta-button secondary">
          イベントを作成する
        </Link>
        <Link to="/join" className="cta-button qr-button">
          📥 イベントに参加（ファイル）
        </Link>
        <a
          href="https://concert-jp.com"
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
        <h2>👥 複数人で使うとき（推奨: オンライン提出）</h2>
        <ol>
          <li>代表者: イベント作成で<strong>「オンライン提出」</strong>をオン → 招待 URL を参加者へ送る</li>
          <li>参加者: URL を開く → 名前登録 → <strong>衣装写真をサーバーにアップロード</strong>（イベント日まで / 最大14日保持）</li>
          <li>代表者: イベント詳細 → <strong>サーバーから取り込む</strong> → 最適化</li>
        </ol>
        <p className="collab-alt">
          <Link to="/guide">オンライン提出の使い方ガイド（全文）</Link>
          {' · '}
          API 未設定時は <Link to="/join">JSON ファイル</Link> でのやり取り（オフライン）になります。
        </p>
      </section>

      <div className="info-section">
        <h2>📖 使い方（代表者・1台で完結する場合）</h2>
        <ol>
          <li><strong>衣装を登録</strong> - 写真と色・柄を登録（全員分を代行可）</li>
          <li><strong>イベントを作成</strong> - テーマを設定</li>
          <li><strong>参加者名を追加</strong> - 手入力で登録</li>
          <li><strong>最適化</strong> - テーマに合わせた組み合わせを生成</li>
        </ol>
      </div>


    </div>
  )
}
