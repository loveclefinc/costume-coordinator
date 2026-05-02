import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Navigation from './components/Navigation'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import Login from './pages/Login'
import Home from './pages/Home'
import Costumes from './pages/Costumes'
import AddCostume from './pages/AddCostume'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Settings from './pages/Settings'
import About from './pages/About'
import PrivacyPolicy from './pages/PrivacyPolicy'
import OAuthCallback from './pages/OAuthCallback'
import './App.css'

function App() {
  const [isDark, setIsDark] = useState(false)
  const { user, loading } = useAuth()

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
    }
  }, [])

  if (loading) {
    return (
      <div className={isDark ? 'dark' : 'light'}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <PWAInstallPrompt />
      {user ? (
        <>
          <Navigation />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/costumes" element={<Costumes />} />
              <Route path="/costumes/add" element={<AddCostume />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/auth/dropbox" element={<OAuthCallback />} />
              <Route path="/auth/google-drive" element={<OAuthCallback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </div>
  )
}

export default App
