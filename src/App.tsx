import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import Onboarding from './pages/Onboarding'
import { isOnboardingComplete } from './utils/onboarding'
import './App.css'

function AppShell() {
  const location = useLocation()
  const onboardingDone = isOnboardingComplete()
  const isOAuthCallback = location.pathname.includes('/oauth/')
  const isWelcome = location.pathname === '/welcome'

  const showMainNav = onboardingDone && !isOAuthCallback && !isWelcome

  if (!onboardingDone && !isOAuthCallback && !isWelcome) {
    return <Navigate to="/welcome" replace />
  }

  return (
    <>
      {showMainNav && <Navigation />}
      <PWAInstallPrompt />
      <main className={showMainNav ? 'main-content' : 'main-content main-content-full'}>
        <Routes>
          <Route path="/welcome" element={<Onboarding />} />
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
          <Route path="/login" element={<Navigate to="/welcome" replace />} />
          <Route path="/auth/*" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
    }
  }, [])

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <AppShell />
    </div>
  )
}

export default App
