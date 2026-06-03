import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navigation from './components/Navigation'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import Home from './pages/Home'
import Costumes from './pages/Costumes'
import AddCostume from './pages/AddCostume'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import Settings from './pages/Settings'
import About from './pages/About'
import PrivacyPolicy from './pages/PrivacyPolicy'
import CloudOAuthCallback from './pages/CloudOAuthCallback'
import './App.css'

function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
    }
  }, [])

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <PWAInstallPrompt />
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
          <Route
            path="/oauth/google/callback"
            element={<CloudOAuthCallback provider="google-drive" />}
          />
          <Route
            path="/oauth/dropbox/callback"
            element={<CloudOAuthCallback provider="dropbox" />}
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/auth/*" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
