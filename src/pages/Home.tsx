import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import { useEvents } from '../hooks/useEvents'
import './Home.css'

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const { getEvent, updateEvent } = useEvents()
  const [addingParticipant, setAddingParticipant] = useState(false)
  // Check if user is authenticated by checking localStorage
  const isAuthenticated = !!localStorage.getItem('user_id')

  const handleParticipantAdded = async (eventId: string, participantName: string) => {
    try {
      setAddingParticipant(true)
      const event = await getEvent(eventId)
      if (event) {
        // Check if participant already exists
        if (!event.participants.includes(participantName)) {
          const updatedEvent = {
            ...event,
            participants: [...event.participants, participantName],
          }
          await updateEvent(eventId, updatedEvent)
          alert(`${participantName}さんがイベントに参加しました！`)
        } else {
          alert(`${participantName}さんはすでに参加しています。`)
        }
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
        <button
          onClick={() => setShowQRScanner(true)}
          className="cta-button qr-button"
          title="イベント参加用QRコードをスキャン"
        >
          🔲 QRコードをスキャン
        </button>
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

      <div className="info-section">
        <h2>📖 使い方</h2>
        <ol>
          <li><strong>衣装を登録</strong> - 手持ち衣装の写真と色・柄情報を登録します</li>
          <li><strong>イベントを作成</strong> - イベント名、日付、テーマ（色味の統一方針、トーン、柄）を設定します</li>
          <li><strong>参加者を招待</strong> - QR コードをスキャンするか、参加者名を直接追加します</li>
          <li><strong>最適な組み合わせを生成</strong> - イベントテーマに合わせた衣装の組み合わせが自動生成されます</li>
          <li><strong>提案を共有</strong> - 参加者に衣装提案を共有して、イベントを成功させます</li>
        </ol>
      </div>

      {!isAuthenticated && (
        <div className="benefits-section">
          <h2>✨ 主な機能</h2>
          <div className="benefits-grid">
          <div className="benefit-item">
            <h3>🎨 テーマベースの提案</h3>
            <p>イベントのテーマ（色味、トーン、柄）に基づいて、最適な衣装の組み合わせを自動提案します。</p>
          </div>
          <div className="benefit-item">
            <h3>👥 参加者管理</h3>
            <p>QR コードスキャンで粗粘に参加者を追加。複数のイベント参加者を効率的に管理できます。</p>
          </div>
          <div className="benefit-item">
            <h3>📸 画像認識</h3>
            <p>衣装の写真から色・柄を自動認識。手動入力の手間を削減します。</p>
          </div>
          <div className="benefit-item">
            <h3>📅 使用履歴管理</h3>
            <p>衣装の使用履歴を記録し、同じ衣装の重複使用を自動で回避します。</p>
          </div>
          <div className="benefit-item">
            <h3>☁️ クラウド同期</h3>
            <p>複数デバイス間でデータを自動同期。どのデバイスからでもアクセスできます。</p>
          </div>
          <div className="benefit-item">
            <h3>📄 バックアップ</h3>
            <p>Dropbox や Google Drive へのバックアップに対応。大切なデータを安全に保存できます。</p>
          </div>
        </div>
        </div>
      )}
    </div>
  )
}
