import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Navigation.css'

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          👗 Costume Coordinator
        </Link>
        
        <ul className="nav-menu">
          <li>
            <Link 
              to="/" 
              className={`nav-link ${isActive('/') ? 'active' : ''}`}
            >
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
            <div className="nav-user-menu">
              <span className="nav-user-email">{user?.email}</span>
              <button onClick={handleLogout} className="nav-logout-button">
                ログアウト
              </button>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  )
}
