import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCloudSync } from '../hooks/useCloudSync'
import {
  completeOnboarding,
  markOnboardingOAuthPending,
} from '../utils/onboarding'
import PublicLegalFooter from '../components/PublicLegalFooter'
import { APP_DISPLAY_NAME } from '../constants/app-brand'
import './Login.css'
import './Onboarding.css'

const STEPS = [
  {
    title: `${APP_DISPLAY_NAME} へようこそ`,
    body: 'コンサートや舞台など、複数人での出演時に、衣装の色・柄・トーンのバランスを整えるお手伝いをします。',
    icon: '👗',
  },
  {
    title: 'できること',
    body: '衣装の登録、イベント管理、テーマに合わせた自動提案、使用履歴による重複回避などが利用できます。',
    icon: '✨',
    features: [
      { icon: '🎨', title: 'テーマベースの提案', text: '色味・トーン・柄の希望に沿った組み合わせ' },
      { icon: '👥', title: '参加者管理', text: 'QRコードで参加者を追加' },
      { icon: '📸', title: '画像から色を分析', text: '写真から色・柄を自動認識' },
      { icon: '📅', title: '使用履歴', text: '直近の着用を考慮して提案' },
    ],
  },
  {
    title: 'データの保存について',
    body: '衣装とイベントはまずこの端末に保存されます。クラウドに接続しない場合、パソコンとスマホの間ではデータは共有されません。',
    icon: '💾',
    highlight:
      'パソコン・スマホの両方で使う場合は、次のステップで Google Drive または Dropbox への接続をおすすめします。',
  },
  {
    title: 'クラウド同期（推奨）',
    body: 'Google Drive または Dropbox と連携すると、複数端末で同じデータを利用できます。接続は OAuth で安全に行い、Client Secret は不要です。',
    icon: '☁️',
    isCloudStep: true,
  },
] as const

export default function Onboarding() {
  const navigate = useNavigate()
  const { connectGoogle, connectDropbox } = useCloudSync()
  const [step, setStep] = useState(0)
  const [connecting, setConnecting] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const finishLocalOnly = () => {
    completeOnboarding()
    navigate('/', { replace: true })
  }

  const startCloudConnect = async (provider: 'google' | 'dropbox') => {
    setConnecting(true)
    markOnboardingOAuthPending()
    try {
      if (provider === 'google') {
        await connectGoogle()
      } else {
        await connectDropbox()
      }
    } catch {
      setConnecting(false)
      sessionStorage.removeItem('onboarding_oauth_pending')
    }
  }

  return (
    <div className="login-page onboarding-page">
      <div className="onboarding-walkthrough">
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <div className="login-container onboarding-card">
          <div className="login-header">
            <span className="onboarding-step-icon">{current.icon}</span>
            <h1>{current.title}</h1>
            <p>{current.body}</p>
          </div>

          {'features' in current && current.features && (
            <div className="onboarding-features">
              {current.features.map((f) => (
                <div key={f.title} className="onboarding-feature-item">
                  <span>{f.icon}</span>
                  <div>
                    <strong>{f.title}</strong>
                    <p>{f.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {'highlight' in current && current.highlight && (
            <p className="onboarding-highlight">{current.highlight}</p>
          )}

          {current.isCloudStep ? (
            <div className="onboarding-cloud-actions">
              <button
                type="button"
                className="login-button"
                disabled={connecting}
                onClick={() => void startCloudConnect('google')}
              >
                Google Drive に接続
              </button>
              <button
                type="button"
                className="login-button onboarding-btn-dropbox"
                disabled={connecting}
                onClick={() => void startCloudConnect('dropbox')}
              >
                Dropbox に接続
              </button>
              <button
                type="button"
                className="onboarding-skip"
                disabled={connecting}
                onClick={finishLocalOnly}
              >
                この端末だけで使う（クラウドなし）
              </button>
              <p className="onboarding-skip-note">
                あとから設定画面でクラウド同期できます。ただし他の端末とは連携されません。
              </p>
            </div>
          ) : (
            <div className="onboarding-nav">
              {step > 0 && (
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={() => setStep((s) => s - 1)}
                >
                  戻る
                </button>
              )}
              <button
                type="button"
                className="login-button onboarding-next"
                onClick={() => setStep((s) => s + 1)}
              >
                次へ
              </button>
            </div>
          )}
        </div>
      </div>
      <PublicLegalFooter />
    </div>
  )
}
