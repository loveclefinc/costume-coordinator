/** Cloudflare Event API — shared types (Worker + PWA) */

import type { UploadLimits } from './upload-limits'

export type RetentionDays = 7 | 14

export type ColorUnificationPolicy = 'unified' | 'varied' | 'varied_distinct'

export type ColorCoordinationMode = 'avoid' | 'match'

export type StageArrangementMode = 'participant_order' | 'balanced'

export interface ColorCoordinationAnchorPayload {
  id: string
  label: string
  colors: string[]
  mode: ColorCoordinationMode
  /** 参考写真（Base64 data URL、任意・ローカル保存向け） */
  image?: string
}

export interface EventThemePreferencesPayload {
  colorUnification: ColorUnificationPolicy
  colors1stChoice: string[]
  colors2ndChoice: string[]
  colors3rdChoice: string[]
  tones1stChoice: string[]
  tones2ndChoice: string[]
  tones3rdChoice: string[]
  patterns1stChoice: string[]
  patterns2ndChoice: string[]
  patterns3rdChoice: string[]
  silhouettes1stChoice: string[]
  silhouettes2ndChoice: string[]
  silhouettes3rdChoice: string[]
  suitStyles1stChoice: string[]
  suitStyles2ndChoice: string[]
  suitStyles3rdChoice: string[]
  suitBreasting1stChoice: string[]
  suitBreasting2ndChoice: string[]
  suitBreasting3rdChoice: string[]
  stageArrangementMode?: StageArrangementMode
  avoidSimilarColors: boolean
  colorCoordinationAnchors?: ColorCoordinationAnchorPayload[]
}

export interface CreateEventRequest {
  name: string
  date: string
  description?: string
  retentionDays: RetentionDays
  themePreferences?: EventThemePreferencesPayload
  /** 代表者名 — サーバー参加者として同時登録 */
  hostDisplayName?: string
}

export interface CreateEventResponse {
  eventId: string
  adminToken: string
  inviteToken: string
  expiresAt: number
  invitePath: string
  participatePath: string
  /** 代表者をサーバー参加者として登録した場合 */
  hostParticipant?: JoinEventResponse
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
  silhouette?: string
  suitStyle?: string
  suitBreasting?: string
  suitLapel?: string
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
  /** Older Worker responses may omit this field. */
  photoCount?: number
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

export interface RegisterHostRequest {
  displayName: string
}

export interface RegisterHostResponse extends JoinEventResponse {
  /** 同名参加者が既にいた場合はトークンを再発行 */
  reissued?: boolean
}

export interface CreateCostumeRequest {
  name: string
  colors: string[]
  tone: string
  pattern: string
  season?: string[]
  type?: string
  silhouette?: string
  suitStyle?: string
  suitBreasting?: string
  suitLapel?: string
  preferences?: string[]
}

export interface CreateCostumeResponse {
  costumeId: string
}

export interface UploadPhotoResponse {
  photoId: string
  viewUrl: string
}

export interface ParticipantSubmissionCostume {
  id: string
  name: string
  photoCount: number
}

export interface ParticipantSubmissionStatus {
  participantId: string
  displayName: string
  costumeCount: number
  photoCount: number
  costumes: ParticipantSubmissionCostume[]
  /** 写真付き衣装が1件以上ある */
  submitted: boolean
}

export interface ApiErrorBody {
  error: string
}
