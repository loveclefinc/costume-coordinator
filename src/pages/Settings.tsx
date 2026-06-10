import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCloudSync } from '../hooks/useCloudSync'
import { resetOnboarding } from '../utils/onboarding'
import { getDisplayName, setDisplayName } from '../utils/user-profile'
import { useAppUi } from '../contexts/AppUiContext'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()
  const { toast } = useAppUi()
  const [displayName, setDisplayNameState] = useState(getDisplayName)
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
          <h2>プロフィール</h2>
          <p className="settings-description">
            イベント作成・参加時の名前の初期値です。イベントごとに別名で登録・参加することもできます。
          </p>
          <div className="settings-item">
            <label htmlFor="displayName">表示名</label>
            <input
              id="displayName"
              type="text"
              className="settings-input"
              value={displayName}
              onChange={(e) => setDisplayNameState(e.target.value)}
              onBlur={() => {
                const trimmed = displayName.trim()
                const previous = getDisplayName()
                setDisplayName(trimmed)
                if (trimmed && trimmed !== previous) {
                  toast('表示名を保存しました', 'success')
                }
              }}
              placeholder="例: 山田太郎"
              maxLength={100}
              autoComplete="name"
            />
          </div>
        </section>

        <section className="settings-section">
          <h2>クラウド同期</h2>
          <p className="settings-description">
            Google Drive または Dropbox と接続すると、この端末の衣装・イベントデータが約 5 分ごとに
            自動同期されます（オフライン時は端末内だけで編集できます）。
          </p>

          <div className="cloud-sync-guide">
            <h3 className="cloud-sync-guide-title">クラウド上のフォルダは 1 つだけ</h3>
            <p className="settings-description">
              同期も画像の取り込みも、どちらも同じ <code>CostumeCoordinator</code>{' '}
              フォルダを使います。フォルダが違うわけではありません。
            </p>
            <ul className="cloud-sync-guide-list">
              <li>
                <strong><code>data.json</code></strong>
                … アプリが自動で読み書きする同期用ファイル（衣装・イベントなど）
              </li>
              <li>
                <strong>画像ファイル（jpg など）</strong>
                … あなたが手動で置く。衣装追加の「クラウドからインポート」で選べます
              </li>
            </ul>
            <div className="cloud-sync-guide-paths">
              <p className="settings-description">
                <strong>Google Drive</strong>
                <br />
                マイドライブ直下の <code>CostumeCoordinator</code>
                （初回同期で自動作成）
              </p>
              <p className="settings-description">
                <strong>Dropbox</strong>
                <br />
                「アプリ」→ <code>CostumeCoordinator</code>
                <br />
                <span className="cloud-sync-guide-note">
                  Dropbox 全体の写真は表示されません
                </span>
              </p>
            </div>
          </div>

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
