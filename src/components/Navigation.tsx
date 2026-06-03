import { Link, useLocation } from 'react-router-dom'
import './Navigation.css'

export default function Navigation() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

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
        </ul>
      </div>
    </nav>
  )
}
