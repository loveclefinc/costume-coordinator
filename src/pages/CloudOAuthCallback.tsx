import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { consumePkceSession } from '../cloud/oauth/pkce'
import type { CloudProvider } from '../cloud/types'
import { completeOAuthCallback } from '../hooks/useCloudSync'
import {
  completeOnboarding,
  isOnboardingOAuthPending,
} from '../utils/onboarding'
import './OAuthCallback.css'

interface Props {
  provider: CloudProvider
}

export default function CloudOAuthCallback({ provider }: Props) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const error = searchParams.get('error')
      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      const code = searchParams.get('code')
      const state = searchParams.get('state')
      if (!code) {
        throw new Error('認可コードがありません')
      }

      const session = consumePkceSession(provider)
      if (!session || session.state !== state) {
        throw new Error('OAuth セッションが無効です。もう一度接続してください。')
      }

      await completeOAuthCallback(provider, code, session.codeVerifier)

      const fromOnboarding = isOnboardingOAuthPending()
      if (fromOnboarding) {
        completeOnboarding()
      }

      setStatus('success')
      setMessage(
        `${provider === 'dropbox' ? 'Dropbox' : 'Google Drive'} に接続し、初回同期を完了しました。`,
      )
      setTimeout(() => navigate(fromOnboarding ? '/' : '/settings'), 2000)
    } catch (err) {
      console.error('OAuth callback error:', err)
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'OAuth 処理に失敗しました')
      const fromOnboarding = isOnboardingOAuthPending()
      setTimeout(() => navigate(fromOnboarding ? '/welcome' : '/settings'), 3000)
    }
  }

  const label = provider === 'dropbox' ? 'Dropbox' : 'Google Drive'

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-container">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <p>{label} に接続中...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>接続成功</h2>
            <p>{message}</p>
            <p className="redirect-message">設定ページに移動します...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h2>接続失敗</h2>
            <p>{message}</p>
            <p className="redirect-message">設定ページに移動します...</p>
          </>
        )}
      </div>
    </div>
  )
}
