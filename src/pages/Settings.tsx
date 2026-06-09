import { useNavigate } from 'react-router-dom'
import { useCloudSync } from '../hooks/useCloudSync'
import { resetOnboarding } from '../utils/onboarding'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()
  const {
    status,
    message,
    connectGoogle,
    connectDropbox,
    syncNow,
    logout,
  } = useCloudSync()
  const disconnect = logout

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
            Google Drive または Dropbox と同期します。OAuth 2.0 で安全に接続します。データは{' '}
            <code>CostumeCoordinator/data.json</code> に保存されます。
          </p>
          <p className="settings-description cloud-sync-image-note">
            衣装追加画面の「クラウドからインポート」で使う画像は、同期データとは別に各クラウドの
            <code>CostumeCoordinator</code> フォルダへ置いてください。Dropbox の場合は
            <strong>「アプリ」→「CostumeCoordinator」</strong>
            です（Dropbox 全体の写真は選べません）。
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
                ログアウト（接続解除）
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

        {status.connected && (
          <section className="settings-section">
            <h2>アカウント</h2>
            <div className="settings-item">
              <label>クラウドアカウント</label>
              <p className="settings-value">
                {status.provider === 'dropbox' ? 'Dropbox' : 'Google Drive'}
                {status.accountLabel ? ` — ${status.accountLabel}` : ''}
              </p>
            </div>
            <button
              onClick={() => void logout()}
              className="settings-button danger"
            >
              ログアウト
            </button>
            <p className="settings-description">
              ログアウトするとクラウド連携と保存済みトークンが解除されます。端末内のデータは削除されません。
            </p>
          </section>
        )}

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
          <h2>ガイド</h2>
          <button
            type="button"
            className="settings-button secondary"
            style={{ width: '100%' }}
            onClick={() => {
              resetOnboarding()
              navigate('/welcome')
            }}
          >
            はじめてのガイドを再度表示
          </button>
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
            <label>利用規約</label>
            <button
              onClick={() => navigate('/terms-of-service')}
              className="settings-link-button"
            >
              利用規約を表示
            </button>
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
