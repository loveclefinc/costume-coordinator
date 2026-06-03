import { useEffect, useState } from 'react'
import { getParticipantNotifications, markNotificationAsAcknowledged } from '../utils/notification-service'
import { ParticipantNotification } from '../utils/notification-service'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import '../styles/ParticipantNotificationCenter.css'

interface ParticipantNotificationCenterProps {
  participantId: string
  participantName: string
}

export default function ParticipantNotificationCenter({
  participantId,
  participantName,
}: ParticipantNotificationCenterProps) {
  const [notifications, setNotifications] = useState<ParticipantNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadNotifications()
    // Poll for new notifications every 10 seconds
    const interval = setInterval(loadNotifications, 10000)
    return () => clearInterval(interval)
  }, [participantId])

  const loadNotifications = async () => {
    try {
      const data = await getParticipantNotifications(participantId)
      setNotifications(data)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (notificationId: string) => {
    try {
      await markNotificationAsAcknowledged(notificationId)
      await loadNotifications()
    } catch (err) {
      console.error('Failed to acknowledge notification:', err)
    }
  }

  const pendingNotifications = notifications.filter(n => n.status === 'pending')
  const notifiedNotifications = notifications.filter(n => n.status === 'notified')
  const acknowledgedNotifications = notifications.filter(n => n.status === 'acknowledged')

  if (loading) {
    return (
      <div className="notification-center">
        <div className="notification-loading">
          <div className="spinner"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="notification-center">
        <div className="notification-empty">
          <p>📭 通知はありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h3>📬 衣装通知センター</h3>
        <span className="notification-badge">{notifications.length}</span>
      </div>

      {/* Pending Notifications */}
      {pendingNotifications.length > 0 && (
        <div className="notification-section">
          <h4 className="section-title">新しい通知 ({pendingNotifications.length})</h4>
          <div className="notification-list">
            {pendingNotifications.map(notif => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                isExpanded={expandedId === notif.id}
                onToggle={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
                onAcknowledge={() => handleAcknowledge(notif.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notified Notifications */}
      {notifiedNotifications.length > 0 && (
        <div className="notification-section">
          <h4 className="section-title">通知済み ({notifiedNotifications.length})</h4>
          <div className="notification-list">
            {notifiedNotifications.map(notif => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                isExpanded={expandedId === notif.id}
                onToggle={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
                onAcknowledge={() => handleAcknowledge(notif.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Acknowledged Notifications */}
      {acknowledgedNotifications.length > 0 && (
        <div className="notification-section">
          <h4 className="section-title">確認済み ({acknowledgedNotifications.length})</h4>
          <div className="notification-list">
            {acknowledgedNotifications.map(notif => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                isExpanded={expandedId === notif.id}
                onToggle={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
                onAcknowledge={() => {}}
                isAcknowledged
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface NotificationCardProps {
  notification: ParticipantNotification
  isExpanded: boolean
  onToggle: () => void
  onAcknowledge: () => void
  isAcknowledged?: boolean
}

function NotificationCard({
  notification,
  isExpanded,
  onToggle,
  onAcknowledge,
  isAcknowledged = false,
}: NotificationCardProps) {
  const statusColor = {
    pending: '#FF9500',
    notified: '#007AFF',
    acknowledged: '#34C759',
  }

  return (
    <div
      className={`notification-card ${notification.status}`}
      onClick={onToggle}
      style={{ borderLeftColor: statusColor[notification.status] }}
    >
      <div className="notification-card-header">
        <div className="notification-info">
          <div className="event-name">{notification.eventName}</div>
          <div className="notification-time">
            {new Date(notification.createdAt).toLocaleDateString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
        <div className="notification-status">
          <span className={`status-badge ${notification.status}`}>
            {getStatusLabel(notification.status)}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="notification-card-content">
          <div className="costume-preview">
            {notification.costume.image && (
              <img
                src={notification.costume.image}
                alt={notification.costume.name}
                className="costume-image"
              />
            )}
            <div className="costume-details">
              <div className="costume-name">{notification.costume.name}</div>
              <div className="costume-meta">
                <span className="meta-item">{notification.costume.tone}</span>
                <span className="meta-item">{notification.costume.pattern}</span>
              </div>
              <div className="costume-colors">
                {normalizeCostumeColors(notification.costume.colors).map((color, idx) => (
                  <div
                    key={idx}
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="notification-message">{notification.message}</div>

          {!isAcknowledged && notification.status !== 'acknowledged' && (
            <button className="acknowledge-button" onClick={e => {
              e.stopPropagation()
              onAcknowledge()
            }}>
              確認しました
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '未通知',
    notified: '通知済み',
    acknowledged: '確認済み',
  }
  return labels[status] || status
}
