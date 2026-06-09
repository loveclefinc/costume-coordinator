import { useEffect, useState } from 'react'
import '../styles/PWAInstallPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_STORAGE_KEY = 'pwa-install-prompt-dismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function isStandaloneApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [standalone, setStandalone] = useState(isStandaloneApp)

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)
    setStandalone(isStandaloneApp())

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      if (readDismissed()) return
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('PWA installed successfully')
      }

      setDeferredPrompt(null)
      setShowPrompt(false)
    } catch (err) {
      console.error('Failed to install PWA:', err)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setShowPrompt(false)
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  if (dismissed || standalone) {
    return null
  }

  // Show iOS installation instructions
  if (isIOS) {
    return (
      <div className="pwa-install-prompt ios-prompt">
        <button
          type="button"
          className="pwa-close-button"
          aria-label="閉じる"
          onClick={handleDismiss}
        >
          ✕
        </button>
        <div className="pwa-install-content">
          <div className="pwa-install-icon">📱</div>
          <h3>ホーム画面に追加</h3>
          <p>
            Safari の共有ボタンから「ホーム画面に追加」を選択して、アプリをホーム画面に追加できます。
          </p>
          <div className="pwa-install-steps">
            <ol>
              <li>Safari の共有ボタン（↑）をタップ</li>
              <li>「ホーム画面に追加」を選択</li>
              <li>「追加」をタップ</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // Show Android/Desktop installation prompt
  if (showPrompt && deferredPrompt) {
    return (
      <div className="pwa-install-prompt android-prompt">
        <button
          type="button"
          className="pwa-close-button"
          aria-label="閉じる"
          onClick={handleDismiss}
        >
          ✕
        </button>
        <div className="pwa-install-content">
          <div className="pwa-install-icon">📱</div>
          <h3>アプリをインストール</h3>
          <p>衣装コーディネーターをホーム画面に追加して、いつでもアクセスできます。</p>
          <div className="pwa-install-buttons">
            <button onClick={handleInstall} className="pwa-install-button primary">
              インストール
            </button>
            <button onClick={handleDismiss} className="pwa-install-button secondary">
              後で
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
