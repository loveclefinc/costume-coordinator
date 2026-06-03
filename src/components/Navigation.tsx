import { Link, useLocation } from 'react-router-dom'
import { useCloudSync } from '../hooks/useCloudSync'
import './Navigation.css'

export default function Navigation() {
  const location = useLocation()
  const { status, logout } = useCloudSync()
  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    if (
      !window.confirm(
        'クラウド（Google Drive / Dropbox）からログアウトします。ローカルの衣装・イベントデータはこの端末に残ります。',
      )
    ) {
      return
    }
    await logout()
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          👗 Costume Coordinator
        </Link>

        <ul className="nav-menu">
          <li>
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
              ホーム
            </Link>
          </li>
          <li>
            <Link
              to="/costumes"
              className={`nav-link ${isActive('/costumes') ? 'active' : ''}`}
            >
              衣装
            </Link>
          </li>
          <li>
            <Link
              to="/events"
              className={`nav-link ${isActive('/events') ? 'active' : ''}`}
            >
              イベント
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
            >
              設定
            </Link>
          </li>
          {status.connected && (
            <li className="nav-user-menu">
              <span className="nav-user-email" title={status.accountLabel ?? ''}>
                {status.accountLabel ??
                  (status.provider === 'dropbox' ? 'Dropbox' : 'Google Drive')}
              </span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="nav-logout-button"
              >
                ログアウト
              </button>
            </li>
          )}
        </ul>
      </div>
    </nav>
  )
}
