import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { backupService } from '../services/backupService'
import { backupScheduler } from '../services/backupScheduler'
import './OAuthCallback.css'

export default function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const provider = searchParams.get('provider') as 'dropbox' | 'google-drive' | null

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      if (!provider) {
        throw new Error('Provider not specified')
      }

      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code) {
        throw new Error('No authorization code received')
      }

      // Exchange code for access token
      const response = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, code }),
      })

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`)
      }

      const { accessToken, refreshToken } = await response.json()

      // Save configuration
      backupService.setConfig({
        provider,
        accessToken,
        refreshToken,
      })

      // Start automatic backup scheduler
      backupScheduler.start(60) // Backup every hour

      setStatus('success')
      setMessage(`${provider === 'dropbox' ? 'Dropbox' : 'Google Drive'} に正常に接続されました。`)

      // Redirect to settings after 2 seconds
      setTimeout(() => {
        navigate('/settings')
      }, 2000)
    } catch (error) {
      console.error('OAuth callback error:', error)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'OAuth処理に失敗しました')

      // Redirect to settings after 3 seconds
      setTimeout(() => {
        navigate('/settings')
      }, 3000)
    }
  }

  return (
    <div className="oauth-callback-page">
      <div className="oauth-callback-container">
        {status === 'loading' && (
          <>
            <div className="spinner"></div>
            <p>処理中...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h2>接続成功</h2>
            <p>{message}</p>
            <p className="redirect-message">設定ページにリダイレクト中...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h2>接続失敗</h2>
            <p>{message}</p>
            <p className="redirect-message">設定ページにリダイレクト中...</p>
          </>
        )}
      </div>
    </div>
  )
}
