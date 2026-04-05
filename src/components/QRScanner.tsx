import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import '../styles/QRScanner.css'

interface QRScannerProps {
  onClose?: () => void
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(true)
  const [error, setError] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!scanning) return

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          scanQRCode()
        }
      } catch (err) {
        setError('カメラへのアクセスが許可されていません')
        setScanning(false)
      }
    }

    startScanning()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [scanning])

  const scanQRCode = () => {
    const canvas = canvasRef.current
    const video = videoRef.current

    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)

          if (code) {
            handleQRCodeDetected(code.data)
            return
          }
        } catch (err) {
          // Continue scanning
        }
      }

      if (scanning) {
        requestAnimationFrame(scan)
      }
    }

    scan()
  }

  const handleQRCodeDetected = (code: string) => {
    setScanning(false)

    // Extract event ID from QR code data
    try {
      // QR code contains JSON with eventId
      const data = JSON.parse(decodeURIComponent(code))
      if (data.eventId) {
        navigate(`/events/${data.eventId}`)
      } else {
        setError('有効なイベントQRコードではありません')
      }
    } catch (err) {
      // Try direct URL parsing
      const eventIdMatch = code.match(/\/events\/([a-zA-Z0-9-]+)/)
      if (eventIdMatch) {
        navigate(`/events/${eventIdMatch[1]}`)
      } else {
        setError('QRコードの読み込みに失敗しました')
      }
    }
  }

  return (
    <div className="qr-scanner-overlay">
      <div className="qr-scanner-container">
        <div className="qr-scanner-header">
          <h2>QRコードをスキャン</h2>
          <button
            onClick={() => {
              setScanning(false)
              onClose?.()
            }}
            className="close-button"
          >
            ✕
          </button>
        </div>

        {error && <div className="qr-scanner-error">{error}</div>}

        <div className="qr-scanner-video-container">
          <video
            ref={videoRef}
            className="qr-scanner-video"
            playsInline
            muted
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="qr-scanner-overlay-frame" />
        </div>

        <p className="qr-scanner-hint">
          イベント参加用のQRコードをカメラに向けてください
        </p>

        <button
          onClick={() => {
            setScanning(false)
            onClose?.()
          }}
          className="qr-scanner-cancel-button"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
