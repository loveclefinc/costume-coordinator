import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignup) {
        await signup(email, password)
      } else {
        await login(email, password)
      }
      navigate('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '操作に失敗しました'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>👗 衣装コーディネーター</h1>
          <p>{isSignup ? 'アカウント作成' : 'ログイン'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="login-button">
            {loading ? '処理中...' : isSignup ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>

        <div className="login-toggle">
          <p>
            {isSignup ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setError(null)
              }}
              className="toggle-button"
              disabled={loading}
            >
              {isSignup ? 'ログイン' : '新規作成'}
            </button>
          </p>
        </div>

        <div className="login-info">
          <p>
            ℹ️ クラウドアカウントでログインすると、複数デバイス間でデータが自動同期されます。
          </p>
        </div>
      </div>

      {/* System Description */}
      <div className="login-description">
        <h2>✨ 衣装コーディネーターについて</h2>
        <p className="description-intro">
          グループイベントの衣装選択を最適化するシステムです。複数人が参加するイベントで、全体の統一感を保ちながら、各自の手持ち衣装から最適な組み合わせを自動提案します。
        </p>
        
        <div className="features-grid">
          <div className="feature-card">
            <h3>🎨 テーマベースの提案</h3>
            <p>イベントのテーマ（色味、トーン、柄）に基づいて、最適な衣装の組み合わせを自動提案します。</p>
          </div>
          <div className="feature-card">
            <h3>👥 参加者管理</h3>
            <p>QR コードスキャンで簡単に参加者を追加。複数のイベント参加者を効率的に管理できます。</p>
          </div>
          <div className="feature-card">
            <h3>📸 画像認識</h3>
            <p>衣装の写真から色・柄を自動認識。手動入力の手間を削減します。</p>
          </div>
          <div className="feature-card">
            <h3>📅 使用履歴管理</h3>
            <p>衣装の使用履歴を記録し、同じ衣装の重複使用を自動で回避します。</p>
          </div>
          <div className="feature-card">
            <h3>☁️ クラウド同期</h3>
            <p>複数デバイス間でデータを自動同期。どのデバイスからでもアクセスできます。</p>
          </div>
          <div className="feature-card">
            <h3>📄 バックアップ</h3>
            <p>Dropbox や Google Drive へのバックアップに対応。大切なデータを安全に保存できます。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
