import type {
  CreateEventRequest,
  CreateEventResponse,
  CreateCostumeRequest,
  CreateCostumeResponse,
  EventAdminSnapshot,
  EventPublicInfo,
  JoinEventRequest,
  JoinEventResponse,
  UploadPhotoResponse,
} from '../../shared/event-api-types'
import { getEventApiBaseUrl } from './config'

export class EventApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'EventApiError'
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit & { adminToken?: string; participantToken?: string } = {},
): Promise<T> {
  const base = getEventApiBaseUrl()
  if (!base) throw new EventApiError('イベント API の URL が設定されていません', 0)

  const headers = new Headers(init.headers)
  if (init.participantToken) headers.set('X-Participant-Token', init.participantToken)
  if (init.adminToken) headers.set('X-Admin-Token', init.adminToken)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const err = (await res.json()) as { error?: string }
      if (err.error) msg = err.error
    } catch {
      /* ignore */
    }
    throw new EventApiError(msg, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function createServerEvent(body: CreateEventRequest): Promise<CreateEventResponse> {
  return apiFetch<CreateEventResponse>('/api/events', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function fetchEventPublic(eventId: string, inviteToken: string): Promise<EventPublicInfo> {
  return apiFetch<EventPublicInfo>(
    `/api/events/${encodeURIComponent(eventId)}?invite=${encodeURIComponent(inviteToken)}`,
  )
}

export async function fetchAdminSnapshot(
  eventId: string,
  adminToken: string,
): Promise<EventAdminSnapshot> {
  return apiFetch<EventAdminSnapshot>(
    `/api/events/${encodeURIComponent(eventId)}/snapshot?admin=${encodeURIComponent(adminToken)}`,
  )
}

export async function joinServerEvent(
  eventId: string,
  inviteToken: string,
  body: JoinEventRequest,
): Promise<JoinEventResponse> {
  return apiFetch<JoinEventResponse>(
    `/api/events/${encodeURIComponent(eventId)}/join?invite=${encodeURIComponent(inviteToken)}`,
    { method: 'POST', body: JSON.stringify(body) },
  )
}

export async function createServerCostume(
  eventId: string,
  participantToken: string,
  body: CreateCostumeRequest,
): Promise<CreateCostumeResponse> {
  return apiFetch<CreateCostumeResponse>(`/api/events/${encodeURIComponent(eventId)}/costumes`, {
    method: 'POST',
    participantToken,
    body: JSON.stringify(body),
  })
}

export async function uploadServerPhoto(
  eventId: string,
  costumeId: string,
  participantToken: string,
  file: Blob,
  contentType: string,
): Promise<UploadPhotoResponse> {
  return apiFetch<UploadPhotoResponse>(
    `/api/events/${encodeURIComponent(eventId)}/costumes/${encodeURIComponent(costumeId)}/photos`,
    {
      method: 'POST',
      participantToken,
      headers: { 'Content-Type': contentType },
      body: file,
    },
  )
}

export async function checkEventApiHealth(): Promise<boolean> {
  const base = getEventApiBaseUrl()
  if (!base) return false
  try {
    const res = await fetch(`${base}/api/health`)
    return res.ok
  } catch {
    return false
  }
}
