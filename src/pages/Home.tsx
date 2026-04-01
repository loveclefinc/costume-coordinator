import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  return (
    <div className="home-page">
      <div className="hero">
        <h1>👗 衣装コーディネーター</h1>
        <p>グループイベントの衣装選択を最適化</p>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3>色・柄の競合回避</h3>
          <p>複数人の衣装の色や柄が重ならないように自動調整</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⭐</div>
          <h3>希望順位対応</h3>
          <p>各自の第1～5希望を考慮した最適な組み合わせを提案</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">📅</div>
          <h3>使用履歴管理</h3>
          <p>直近30日の使用履歴を記録し、重複使用を回避</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">👥</div>
          <h3>イベント管理</h3>
          <p>複数のイベントを管理し、参加者を招待</p>
        </div>
      </div>

      <div className="cta-section">
        <Link to="/costumes" className="cta-button primary">
          衣装を追加する
        </Link>
        <Link to="/events" className="cta-button secondary">
          イベントを作成する
        </Link>
      </div>

      <div className="info-section">
        <h2>使い方</h2>
        <ol>
          <li>衣装を登録（写真と色・柄情報）</li>
          <li>イベントを作成</li>
          <li>参加者を招待</li>
          <li>各自が衣装の希望順位を設定</li>
          <li>最適な組み合わせを自動生成</li>
        </ol>
      </div>
    </div>
  )
}
