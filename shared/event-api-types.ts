/** Cloudflare Event API — shared types (Worker + PWA) */

import type { UploadLimits } from './upload-limits'

export type RetentionDays = 7 | 14

export interface EventThemePreferencesPayload {
  colorUnification: 'unified' | 'varied'
  colors1stChoice: string[]
  colors2ndChoice: string[]
  colors3rdChoice: string[]
  tones1stChoice: string[]
  tones2ndChoice: string[]
  tones3rdChoice: string[]
  patterns1stChoice: string[]
  patterns2ndChoice: string[]
  patterns3rdChoice: string[]
  avoidSimilarColors: boolean
  recentUsageExcludeDays: number
}

export interface CreateEventRequest {
  name: string
  date: string
  description?: string
  retentionDays: RetentionDays
  themePreferences?: EventThemePreferencesPayload
}

export interface CreateEventResponse {
  eventId: string
  adminToken: string
  inviteToken: string
  expiresAt: number
  invitePath: string
  participatePath: string
}

export interface ServerPhoto {
  id: string
  costumeId: string
  contentType: string
  sortOrder: number
  viewUrl: string
}

export interface ServerCostume {
  id: string
  participantId: string
  participantName: string
  name: string
  colors: string[]
  tone: string
  pattern: string
  season: string[]
  type?: string
  preferences: string[]
  photos: ServerPhoto[]
  createdAt: number
  updatedAt: number
}

export interface ServerParticipant {
  id: string
  displayName: string
  submittedAt: number | null
  costumeCount: number
}

export interface EventPublicInfo {
  id: string
  name: string
  date: string
  description: string
  expiresAt: number
  themePreferences?: EventThemePreferencesPayload
  uploadLimits: UploadLimits
}

export interface EventAdminSnapshot {
  event: EventPublicInfo
  participants: ServerParticipant[]
  costumes: ServerCostume[]
}

export interface ExtendRetentionRequest {
  days?: 7
}

export interface ExtendRetentionResponse {
  expiresAt: number
}

export interface JoinEventRequest {
  displayName: string
}

export interface JoinEventResponse {
  participantId: string
  participantToken: string
  displayName: string
}

export interface CreateCostumeRequest {
  name: string
  colors: string[]
  tone: string
  pattern: string
  season?: string[]
  type?: string
  preferences?: string[]
}

export interface CreateCostumeResponse {
  costumeId: string
}

export interface UploadPhotoResponse {
  photoId: string
  viewUrl: string
}

export interface ApiErrorBody {
  error: string
}
