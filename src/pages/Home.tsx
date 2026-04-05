import { useState } from 'react'
import { Link } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import './Home.css'

export default function Home() {
  const [showQRScanner, setShowQRScanner] = useState(false)

  return (
    <div className="home-page">
      <div className="hero">
        <h1>👗 衣装コーディネーター</h1>
        <p>グループイベントの衣装選択を最適化</p>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>イベントテーマに合わせた提案</h3>
          <p>色味を統一するか、パステル系で揃えるかなど、イベントのテーマに合わせた衣装を自動提案</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">👗</div>
          <h3>手持ち衣装から最適な組み合わせ</h3>
          <p>参加者の手持ち衣装の中から、イベントテーマに最も合った組み合わせを提案</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>使用履歴管理</h3>
          <p>直近の使用履歴を記録し、同じ衣装の重複使用を回避</p>
        </div>

        <div className="feature-card">
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
      </div>

      {showQRScanner && (
        <QRScanner onClose={() => setShowQRScanner(false)} />
      )}

      <div className="info-section">
        <h2>使い方</h2>
        <ol>
          <li>衣装を登録（写真と色・柄情報）</li>
          <li>イベントを作成し、テーマ（色味の統一方針、トーン、柄）を設定</li>
          <li>参加者を招待</li>
          <li>イベントテーマに合わせた最適な衣装の組み合わせを自動生成</li>
          <li>参加者に衣装提案を共有</li>
        </ol>
      </div>
    </div>
  )
}
