import type { CreateCostumeRequest } from '../../shared/event-api-types'
import type { UploadLimits } from '../../shared/upload-limits'
import { formatBytes } from '../../shared/upload-limits'
import { EventApiError } from '../event-server/client'
import type {
  createServerCostume,
  fetchParticipantSubmissionStatus,
  uploadServerPhoto,
} from '../event-server/client'
import { enrichCostumeColors, normalizePattern } from './theme-colors'
import type { CostumeThemeMatch } from './costume-theme-match'
import type { dataUrlToBlob } from './image-blob'

type SubmitDeps = {
  fetchStatus: typeof fetchParticipantSubmissionStatus
  createCostume: typeof createServerCostume
  uploadPhoto: typeof uploadServerPhoto
  dataUrlToBlob: typeof dataUrlToBlob
}

function findServerCostumeByName(
  costumes: Awaited<ReturnType<typeof fetchParticipantSubmissionStatus>>['costumes'],
  name: string,
) {
  return costumes.find((costume) => costume.name === name)
}

/** 既存のサーバー衣装を再利用し、再提出時に重複作成しない */
export async function submitPickedCostumesIdempotent(
  eventId: string,
  participantToken: string,
  picked: CostumeThemeMatch[],
  limits: UploadLimits,
  deps: SubmitDeps,
): Promise<number> {
  let status = await deps.fetchStatus(eventId, participantToken)
  let processed = 0
  const serverCostumes = status.costumes ?? []

  for (const match of picked) {
    const costume = match.costume
    if (!costume.image) {
      throw new EventApiError(
        `「${costume.name}」に写真がありません。衣装管理から画像を登録してください。`,
        400,
      )
    }

    const name = costume.name.trim()
    let serverCostume = findServerCostumeByName(serverCostumes, name)

    if (!serverCostume) {
      if (status.costumeCount >= limits.maxCostumesPerParticipant) {
        throw new EventApiError(
          `サーバー上の衣装が上限（${limits.maxCostumesPerParticipant}件）に達しています。未完成の提出がある場合は「提出を再試行」を押してください。`,
          400,
        )
      }

      const enriched = enrichCostumeColors(costume.colors)
      const body: CreateCostumeRequest = {
        name,
        colors: enriched,
        tone: costume.tone,
        pattern: normalizePattern(costume.pattern),
        season: costume.season ?? [],
        type: costume.type,
        preferences: [],
        ...(costume.type === 'dress' && costume.silhouette ? { silhouette: costume.silhouette } : {}),
        ...(costume.type === 'suit' && costume.suitStyle ? { suitStyle: costume.suitStyle } : {}),
        ...(costume.type === 'suit' && costume.suitStyle === 'standard' && costume.suitBreasting
          ? { suitBreasting: costume.suitBreasting }
          : {}),
        ...(costume.type === 'suit' && costume.suitStyle === 'tuxedo' && costume.suitLapel
          ? { suitLapel: costume.suitLapel }
          : {}),
      }

      const { costumeId } = await deps.createCostume(eventId, participantToken, body)
      serverCostume = { id: costumeId, name, photoCount: 0 }
      status = {
        ...status,
        costumeCount: status.costumeCount + 1,
        costumes: [...serverCostumes, serverCostume],
      }
      serverCostumes.push(serverCostume)
    }

    if (serverCostume.photoCount > 0) {
      processed++
      continue
    }

    const { blob, contentType } = await deps.dataUrlToBlob(costume.image)
    if (blob.size > limits.maxPhotoBytes) {
      throw new EventApiError(
        `「${costume.name}」の写真が大きすぎます（${formatBytes(blob.size)}）。${formatBytes(limits.maxPhotoBytes)} 以下にしてください。`,
        400,
      )
    }

    await deps.uploadPhoto(eventId, serverCostume.id, participantToken, blob, contentType)
    serverCostume.photoCount = 1
    status = {
      ...status,
      photoCount: status.photoCount + 1,
      costumes: serverCostumes.map((entry) =>
        entry.id === serverCostume!.id ? { ...entry, photoCount: 1 } : entry,
      ),
    }
    processed++
  }

  const finalStatus = await deps.fetchStatus(eventId, participantToken)
  if (!finalStatus.submitted) {
    throw new EventApiError(
      'サーバーへの写真アップロードが完了していません。通信環境を確認して再試行してください。',
      500,
    )
  }

  return processed
}
