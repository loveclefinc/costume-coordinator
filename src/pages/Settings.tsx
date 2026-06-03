import { useNavigate } from 'react-router-dom'
import { useCloudSync } from '../hooks/useCloudSync'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()
  const {
    status,
    message,
    connectGoogle,
    connectDropbox,
    syncNow,
    disconnect,
  } = useCloudSync()

  const formatDate = (iso: string | null) => {
    if (!iso) return '未同期'
    return new Date(iso).toLocaleString('ja-JP')
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>⚙️ 設定</h1>

        {message && (
          <div className={`settings-message ${message.type}`}>{message.text}</div>
        )}

        {!status.online && (
          <div className="settings-message error">オフラインです。同期は接続復帰後に行えます。</div>
        )}

        <section className="settings-section">
          <h2>クラウド同期</h2>
          <p className="settings-description">
            Google Drive または Dropbox と同期します。OAuth 2.0 PKCE を使用し、Client
            Secret は不要です。データは <code>CostumeCoordinator/data.json</code> に保存されます。
          </p>

          {status.connected ? (
            <div className="backup-connected">
              <div className="backup-status">
                <span className="status-badge">
                  {status.syncing ? '同期中...' : '✓ 接続済み'}
                </span>
                <span className="provider-name">
                  {status.provider === 'dropbox' ? 'Dropbox' : 'Google Drive'}
                  {status.accountLabel ? ` — ${status.accountLabel}` : ''}
                </span>
              </div>
              <div className="settings-item">
                <label>最終同期</label>
                <p className="settings-value">{formatDate(status.lastSyncAt)}</p>
              </div>
              {status.lastError && (
                <div className="settings-message error">{status.lastError}</div>
              )}
              {status.pendingConflicts > 0 && (
                <div className="settings-message error">
                  直近の同期で競合が {status.pendingConflicts} 件ありました（新しい更新を採用済み）
                </div>
              )}
              <button
                onClick={() => void syncNow()}
                disabled={status.syncing || !status.online}
                className="settings-button primary"
              >
                今すぐ同期
              </button>
              <button onClick={() => void disconnect()} className="settings-button secondary">
                接続解除
              </button>
            </div>
          ) : (
            <div className="backup-options">
              <div className="backup-option">
                <div className="option-header">
                  <h3>Google Drive</h3>
                  <p>専用フォルダに JSON で保存（PKCE）</p>
                </div>
                <button
                  onClick={() => void connectGoogle()}
                  disabled={!status.online}
                  className="settings-button primary"
                >
                  Google Drive に接続
                </button>
              </div>
              <div className="backup-option">
                <div className="option-header">
                  <h3>Dropbox</h3>
                  <p>App folder に JSON で保存（PKCE）</p>
                </div>
                <button
                  onClick={() => void connectDropbox()}
                  disabled={!status.online}
                  className="settings-button primary"
                >
                  Dropbox に接続
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="settings-section">
          <h2>データ</h2>
          <div className="settings-item">
            <label>ローカル保存</label>
            <p className="settings-description">
              衣装・イベントデータはブラウザの IndexedDB に保存されます。クラウド接続時は
              5 分ごとに自動同期し、オフライン時はローカルで編集を続けられます。
            </p>
          </div>
        </section>

        <section className="settings-section">
          <h2>このアプリについて</h2>
          <button
            onClick={() => navigate('/about')}
            className="settings-button secondary"
            style={{ width: '100%', marginBottom: '12px' }}
          >
            このアプリについて
          </button>
          <div className="settings-item">
            <label>バージョン</label>
            <p className="settings-value">1.1.0</p>
          </div>
          <div className="settings-item">
            <label>プライバシーポリシー</label>
            <button
              onClick={() => navigate('/privacy-policy')}
              className="settings-link-button"
            >
              プライバシーポリシーを表示
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
