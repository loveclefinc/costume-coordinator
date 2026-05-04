/**
 * Push Notification Service
 * Handles sending notifications to event creators and participants when proposals are completed
 */

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  data?: Record<string, any>
}

export interface PushNotificationOptions {
  eventId: string
  eventName: string
  participantName: string
  proposalCount: number
  timestamp: number
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

/**
 * Send notification to user
 */
export function sendNotification(payload: NotificationPayload): void {
  if (!('Notification' in window)) {
    console.log('Notifications not supported')
    return
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '👗',
        badge: payload.badge,
        tag: payload.tag || 'costume-coordinator',
        requireInteraction: payload.requireInteraction || false,
        data: payload.data || {}
      })
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }
}

/**
 * Notify event creator that proposals are ready
 */
export async function notifyProposalReady(options: PushNotificationOptions): Promise<void> {
  const hasPermission = await requestNotificationPermission()
  
  if (!hasPermission) {
    console.log('Notification permission not granted')
    return
  }

  const payload: NotificationPayload = {
    title: '✨ 衣装提案が完成しました',
    body: `イベント「${options.eventName}」の衣装提案が${options.proposalCount}件完成しました。確認して参加者に通知してください。`,
    icon: '👗',
    tag: `proposal-${options.eventId}`,
    requireInteraction: true,
    data: {
      eventId: options.eventId,
      type: 'proposal_ready',
      timestamp: options.timestamp
    }
  }

  sendNotification(payload)
}

/**
 * Notify participant of their assigned costume
 */
export async function notifyParticipantAssignment(options: PushNotificationOptions): Promise<void> {
  const hasPermission = await requestNotificationPermission()
  
  if (!hasPermission) {
    console.log('Notification permission not granted')
    return
  }

  const payload: NotificationPayload = {
    title: '👗 あなたの衣装が決まりました',
    body: `イベント「${options.eventName}」であなたの衣装が決定されました。詳細を確認してください。`,
    icon: '👗',
    tag: `assignment-${options.eventId}`,
    requireInteraction: false,
    data: {
      eventId: options.eventId,
      participantName: options.participantName,
      type: 'costume_assigned',
      timestamp: options.timestamp
    }
  }

  sendNotification(payload)
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Get notification permission status
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission
  }
  return 'denied'
}
