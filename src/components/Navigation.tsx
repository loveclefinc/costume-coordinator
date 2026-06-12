import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useCloudSync } from '../hooks/useCloudSync'
import { useAppUi } from '../contexts/AppUiContext'
import { APP_DISPLAY_NAME, APP_DISPLAY_NAME_JA } from '../constants/app-brand'
import AppIcon from './AppIcon'
import './Navigation.css'

type NavigationProps = {
  /** 初回・オンボーディング前はロゴのみ表示 */
  logoOnly?: boolean
}

export default function Navigation({ logoOnly = false }: NavigationProps) {
  const location = useLocation()
  const { status, logout } = useCloudSync()
  const { confirm } = useAppUi()
  const [menuOpen, setMenuOpen] = useState(false)
  const isActive = (path: string) => location.pathname === path

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'ログアウト',
      message:
        'クラウド（Google Drive / Dropbox）からログアウトします。ローカルの衣装・イベントデータはこの端末に残ります。',
      confirmLabel: 'ログアウト',
    })
    if (!ok) return
    await logout()
  }

  return (
    <nav className="navigation" aria-label="メインナビゲーション">
      <div className="nav-container">
        <Link
          to="/"
          className="nav-logo"
          onClick={() => setMenuOpen(false)}
          title={APP_DISPLAY_NAME}
        >
          <AppIcon size="sm" className="nav-logo-mark" />
          <span className="nav-logo-text">
            <span className="nav-logo-primary">{APP_DISPLAY_NAME_JA}</span>
            <span className="nav-logo-secondary">{APP_DISPLAY_NAME}</span>
          </span>
        </Link>

        {!logoOnly && (
          <button
            type="button"
            className={`nav-toggle${menuOpen ? ' nav-toggle--open' : ''}`}
            aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={menuOpen}
            aria-controls="nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="nav-toggle-bar" aria-hidden="true" />
            <span className="nav-toggle-bar" aria-hidden="true" />
            <span className="nav-toggle-bar" aria-hidden="true" />
          </button>
        )}

        {!logoOnly && menuOpen && (
          <button
            type="button"
            className="nav-backdrop"
            aria-label="メニューを閉じる"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {!logoOnly && (
        <ul
          id="nav-menu"
          className={`nav-menu${menuOpen ? ' nav-menu--open' : ''}`}
        >
          <li>
            <Link
              to="/"
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              ホーム
            </Link>
          </li>
          <li>
            <Link
              to="/costumes"
              className={`nav-link ${isActive('/costumes') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              衣装
            </Link>
          </li>
          <li>
            <Link
              to="/events"
              className={`nav-link ${isActive('/events') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              イベント
            </Link>
          </li>
          <li>
            <Link
              to="/guide"
              className={`nav-link ${isActive('/guide') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              使い方
            </Link>
          </li>
          <li>
            <Link
              to="/settings"
              className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
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
        )}
      </div>
    </nav>
  )
}
