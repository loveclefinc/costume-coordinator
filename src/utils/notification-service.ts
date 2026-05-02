import { Event, Costume } from './storage'
import { OptimizationProposal, OptimizationResult } from './optimizer-multi'

export interface ParticipantNotification {
  id: string
  participantId: string
  participantName: string
  eventId: string
  eventName: string
  costumeId: string
  costume: Costume
  status: 'pending' | 'notified' | 'acknowledged'
  createdAt: number
  notifiedAt?: number
  acknowledgedAt?: number
  message: string
}

export interface NotificationPreferences {
  enableEmail: boolean
  enableInApp: boolean
  enablePush: boolean
}

/**
 * Create notifications for all participants when a proposal is selected
 */
export function createParticipantNotifications(
  event: Event,
  proposal: OptimizationProposal,
  participants: Array<{ id: string; name: string }>
): ParticipantNotification[] {
  const notifications: ParticipantNotification[] = []

  for (const assignment of proposal.assignments) {
    const participant = participants.find(p => p.id === assignment.participantId)
    if (!participant) continue

    const notification: ParticipantNotification = {
      id: `notif-${assignment.participantId}-${event.id}-${Date.now()}`,
      participantId: assignment.participantId,
      participantName: assignment.participantName,
      eventId: event.id,
      eventName: event.name,
      costumeId: assignment.costumeId,
      costume: assignment.costume,
      status: 'pending',
      createdAt: Date.now(),
      message: `イベント「${event.name}」の衣装が決定しました。\n\n推奨衣装: ${assignment.costume.name}\n\n詳細を確認してください。`,
    }

    notifications.push(notification)
  }

  return notifications
}

/**
 * Store notifications in local storage
 */
export async function storeNotifications(notifications: ParticipantNotification[]): Promise<void> {
  try {
    const existingNotifications = await getStoredNotifications()
    const allNotifications = [...existingNotifications, ...notifications]
    localStorage.setItem('participant_notifications', JSON.stringify(allNotifications))
  } catch (err) {
    console.error('Failed to store notifications:', err)
  }
}

/**
 * Get all stored notifications
 */
export async function getStoredNotifications(): Promise<ParticipantNotification[]> {
  try {
    const data = localStorage.getItem('participant_notifications')
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error('Failed to get stored notifications:', err)
    return []
  }
}

/**
 * Get notifications for a specific participant
 */
export async function getParticipantNotifications(participantId: string): Promise<ParticipantNotification[]> {
  try {
    const allNotifications = await getStoredNotifications()
    return allNotifications.filter(n => n.participantId === participantId)
  } catch (err) {
    console.error('Failed to get participant notifications:', err)
    return []
  }
}

/**
 * Mark notification as notified
 */
export async function markNotificationAsNotified(notificationId: string): Promise<void> {
  try {
    const notifications = await getStoredNotifications()
    const updated = notifications.map(n =>
      n.id === notificationId
        ? { ...n, status: 'notified' as const, notifiedAt: Date.now() }
        : n
    )
    localStorage.setItem('participant_notifications', JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to mark notification as notified:', err)
  }
}

/**
 * Mark notification as acknowledged
 */
export async function markNotificationAsAcknowledged(notificationId: string): Promise<void> {
  try {
    const notifications = await getStoredNotifications()
    const updated = notifications.map(n =>
      n.id === notificationId
        ? { ...n, status: 'acknowledged' as const, acknowledgedAt: Date.now() }
        : n
    )
    localStorage.setItem('participant_notifications', JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to mark notification as acknowledged:', err)
  }
}

/**
 * Send email notification (simulated - in production, call backend API)
 */
export async function sendEmailNotification(
  notification: ParticipantNotification,
  participantEmail: string
): Promise<boolean> {
  try {
    // In production, this would call a backend API to send actual emails
    console.log(`[Email] Sending notification to ${participantEmail}:`, notification.message)

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 500))

    await markNotificationAsNotified(notification.id)
    return true
  } catch (err) {
    console.error('Failed to send email notification:', err)
    return false
  }
}

/**
 * Send push notification (requires PWA push service)
 */
export async function sendPushNotification(notification: ParticipantNotification): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported')
      return false
    }

    const registration = await navigator.serviceWorker.ready

    if (!registration.pushManager) {
      console.warn('Push manager not available')
      return false
    }

    // Check if user has subscribed
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      console.warn('User not subscribed to push notifications')
      return false
    }

    // In production, send to backend to deliver push notification
    console.log('[Push] Sending push notification:', notification.message)

    await markNotificationAsNotified(notification.id)
    return true
  } catch (err) {
    console.error('Failed to send push notification:', err)
    return false
  }
}

/**
 * Send in-app notification
 */
export async function sendInAppNotification(notification: ParticipantNotification): Promise<boolean> {
  try {
    // In-app notifications are handled by storing in local storage
    // and displaying in the UI
    console.log('[In-App] Notification:', notification.message)

    await markNotificationAsNotified(notification.id)
    return true
  } catch (err) {
    console.error('Failed to send in-app notification:', err)
    return false
  }
}

/**
 * Send notifications based on preferences
 */
export async function sendNotifications(
  notifications: ParticipantNotification[],
  preferences: NotificationPreferences,
  participantEmails: Map<string, string>
): Promise<void> {
  for (const notification of notifications) {
    if (preferences.enableInApp) {
      await sendInAppNotification(notification)
    }

    if (preferences.enableEmail) {
      const email = participantEmails.get(notification.participantId)
      if (email) {
        await sendEmailNotification(notification, email)
      }
    }

    if (preferences.enablePush) {
      await sendPushNotification(notification)
    }
  }
}

/**
 * Generate notification summary for event creator
 */
export function generateNotificationSummary(notifications: ParticipantNotification[]): string {
  const total = notifications.length
  const notified = notifications.filter(n => n.status === 'notified').length
  const acknowledged = notifications.filter(n => n.status === 'acknowledged').length

  return `
通知サマリー
━━━━━━━━━━━━━━━━━━━━━━━━
総参加者数: ${total}
通知済み: ${notified}
確認済み: ${acknowledged}
未通知: ${total - notified}

参加者別:
${notifications
  .map(
    n => `
• ${n.participantName}
  衣装: ${n.costume.name}
  ステータス: ${getStatusLabel(n.status)}
`
  )
  .join('')}
  `
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '未通知',
    notified: '通知済み',
    acknowledged: '確認済み',
  }
  return labels[status] || status
}
