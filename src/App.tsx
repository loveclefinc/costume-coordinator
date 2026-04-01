import { Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Costumes from './pages/Costumes'
import Events from './pages/Events'
import EventDetail from './pages/EventDetail'
import AddCostume from './pages/AddCostume'
import './App.css'

function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true)
    }
  }, [])

  return (
    <div className={isDark ? 'dark' : 'light'}>
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/costumes" element={<Costumes />} />
          <Route path="/costumes/add" element={<AddCostume />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
