import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { backupService, BackupProvider, BackupConfig } from '../services/backupService'
import './Settings.css'

export default function Settings() {
  const { user, logout } = useAuth()
  const [backupConfig, setBackupConfig] = useState<BackupConfig | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<BackupProvider | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const config = backupService.getConfig()
    setBackupConfig(config)
    if (config) {
      setSelectedProvider(config.provider)
    }
  }, [])

  const handleDropboxAuth = () => {
    setLoading(true)
    const authURL = backupService.getDropboxAuthURL()
    window.location.href = authURL
  }

  const handleGoogleDriveAuth = () => {
    setLoading(true)
    const authURL = backupService.getGoogleDriveAuthURL()
    window.location.href = authURL
  }

  const handleDisconnect = () => {
    backupService.clearConfig()
    setBackupConfig(null)
    setSelectedProvider(null)
    setMessage({ type: 'success', text: 'バックアップサービスを切断しました' })
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>⚙️ 設定</h1>

        {message && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Account Section */}
        <section className="settings-section">
          <h2>アカウント</h2>
          <div className="settings-item">
            <label>メールアドレス</label>
            <p className="settings-value">{user?.email}</p>
          </div>
          <button onClick={handleLogout} className="settings-button danger">
            ログアウト
          </button>
        </section>

        {/* Backup Section */}
        <section className="settings-section">
          <h2>バックアップ設定</h2>
          <p className="settings-description">
            イベントと衣装データを Dropbox または Google Drive にバックアップします。
            複数デバイス間でのデータ復元が可能になります。
          </p>

          {backupConfig ? (
            <div className="backup-connected">
              <div className="backup-status">
                <span className="status-badge">✓ 接続済み</span>
                <span className="provider-name">
                  {backupConfig.provider === 'dropbox' ? 'Dropbox' : 'Google Drive'}
                </span>
              </div>
              <button onClick={handleDisconnect} className="settings-button secondary">
                切断
              </button>
            </div>
          ) : (
            <div className="backup-options">
              <div className="backup-option">
                <div className="option-header">
                  <h3>Dropbox</h3>
                  <p>クラウドストレージサービス</p>
                </div>
                <button
                  onClick={handleDropboxAuth}
                  disabled={loading}
                  className="settings-button primary"
                >
                  {loading ? '接続中...' : 'Dropbox に接続'}
                </button>
              </div>

              <div className="backup-option">
                <div className="option-header">
                  <h3>Google Drive</h3>
                  <p>Google のクラウドストレージ</p>
                </div>
                <button
                  onClick={handleGoogleDriveAuth}
                  disabled={loading}
                  className="settings-button primary"
                >
                  {loading ? '接続中...' : 'Google Drive に接続'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Data Section */}
        <section className="settings-section">
          <h2>データ</h2>
          <div className="settings-item">
            <label>ローカルストレージ</label>
            <p className="settings-description">
              アプリのデータはブラウザのローカルストレージに保存されています。
              バックアップを設定することで、複数デバイス間でのデータ同期が可能になります。
            </p>
          </div>
        </section>

        {/* About Section */}
        <section className="settings-section">
          <h2>について</h2>
          <div className="settings-item">
            <label>バージョン</label>
            <p className="settings-value">1.0.0</p>
          </div>
          <div className="settings-item">
            <label>プライバシーポリシー</label>
            <p className="settings-description">
              このアプリはあなたのデータを安全に保護します。
              詳細は<a href="#" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>をご覧ください。
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
