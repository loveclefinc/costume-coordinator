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

export interface CostumeComponentPayload {
  sourceCostumeId: string
  name: string
  type?: string
  /**
   * 構成元の更新版。写真だけを差し替えた場合でも、同じ提出元IDの
   * R2写真スロットを安全に更新するために使う。旧クライアントは省略する。
   */
  revision?: number
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
  /** 完成した装いを構成する衣装。未指定の旧データは単品衣装として扱う。 */
  components?: CostumeComponentPayload[]
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
  /** 構成品スロットを含めた必要写真数。旧Workerは省略する。 */
  expectedPhotoCount?: number
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

export interface PublishEventResultsRequest {
  assignments: Array<{
    participantName: string
    costumeId: string
    /** 決定的最適化エンジンが返した、公開用に整形済みの選定理由 */
    reasons?: string[]
  }>
}

export interface PublishedEventAssignment {
  participantName: string
  costume: ServerCostume
  /** Older published results may omit this field. */
  reasons?: string[]
}

export interface PublishedEventResults {
  updatedAt: number | null
  assignments: PublishedEventAssignment[]
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
  /** 端末内の衣装ID。同名衣装の識別と再送に使う。 */
  sourceCostumeId?: string
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
  components?: CostumeComponentPayload[]
  preferences?: string[]
}

export interface CreateCostumeResponse {
  costumeId: string
  /** 同じ端末衣装IDの属性変更により、既存写真スロットをリセットした。旧Workerは省略する。 */
  photosReset?: boolean
}

export interface UploadPhotoResponse {
  photoId: string
  viewUrl: string
}

export interface ParticipantSubmissionCostume {
  id: string
  sourceCostumeId?: string
  name: string
  photoCount: number
  /** Older Worker responses may omit this field;その場合は1枚として扱う。 */
  expectedPhotoCount?: number
  /** 完成した装いの構成品と、各写真スロットの提出状態。配列順が componentIndex。 */
  components?: Array<CostumeComponentPayload & { photoUploaded: boolean }>
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

/**
 * 現在も端末側で有効な自動提案コーデだけを残す。
 * Worker は参加者本人の `favorite-outfit:auto-` 行以外を変更しない。
 */
export interface PruneParticipantAutoOutfitsRequest {
  activeSourceCostumeIds: string[]
}

export interface PruneParticipantAutoOutfitsResponse {
  deletedCostumeCount: number
  deletedPhotoCount: number
}

export interface ApiErrorBody {
  error: string
}
