import type {
  CostumeComponentPayload,
  CreateCostumeRequest,
  ParticipantSubmissionCostume,
} from '../../shared/event-api-types'
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
import type { Costume } from './storage'

type SubmitDeps = {
  fetchStatus: typeof fetchParticipantSubmissionStatus
  createCostume: typeof createServerCostume
  uploadPhoto: typeof uploadServerPhoto
  dataUrlToBlob: typeof dataUrlToBlob
}

function findServerCostume(
  costumes: Awaited<ReturnType<typeof fetchParticipantSubmissionStatus>>['costumes'],
  sourceCostumeId: string,
  name: string,
  usedCostumeIds: Set<string>,
  exactSourceOnly = false,
) {
  const exact = costumes.find(
    (costume) =>
      costume.sourceCostumeId === sourceCostumeId && !usedCostumeIds.has(costume.id),
  )
  if (exact || exactSourceOnly) return exact
  return costumes.find((costume) => costume.name === name && !usedCostumeIds.has(costume.id))
}

type CompleteOutfitSubmission = {
  components: CostumeComponentPayload[]
  images: string[]
}

function completeOutfitSubmission(costume: Costume): CompleteOutfitSubmission | null {
  const ids = costume.componentCostumeIds ?? []
  if (ids.length < 2) return null

  const names = costume.componentCostumeNames ?? []
  if (names.length !== ids.length) {
    throw new EventApiError(
      `「${costume.name}」の構成品情報が揃っていません。お気に入りコーデを保存し直してください。`,
      400,
    )
  }

  const images = [costume.image, ...(costume.wearingPhotos ?? [])].slice(0, ids.length)
  if (images.length !== ids.length || images.some((image) => !image)) {
    throw new EventApiError(
      `「${costume.name}」を構成するすべての衣装・小物に写真を登録してください。`,
      400,
    )
  }
  const revision = Number.isSafeInteger(costume.updatedAt) && costume.updatedAt >= 0
    ? costume.updatedAt
    : 0

  return {
    components: ids.map((sourceCostumeId, index) => ({
      sourceCostumeId,
      name: names[index],
      ...(index === 0 && costume.type ? { type: costume.type } : {}),
      // 仮想候補の updatedAt は全構成品の最新更新時刻。各スロットへ
      // 同じ版を送ることで、写真だけの差し替えもWorkerのメタデータ差分になる。
      revision,
    })),
    images,
  }
}

function costumeRequest(costume: Costume, name: string, components: CostumeComponentPayload[]): CreateCostumeRequest {
  const enriched = enrichCostumeColors(costume.colors)
  return {
    sourceCostumeId: costume.id,
    name,
    colors: enriched,
    tone: costume.tone,
    pattern: normalizePattern(costume.pattern),
    season: costume.season ?? [],
    type: costume.type,
    preferences: [],
    ...(components.length > 0 ? { components } : {}),
    ...(costume.type === 'dress' && costume.silhouette ? { silhouette: costume.silhouette } : {}),
    ...(costume.type === 'suit' && costume.suitStyle ? { suitStyle: costume.suitStyle } : {}),
    ...(costume.type === 'suit' && costume.suitStyle === 'standard' && costume.suitBreasting
      ? { suitBreasting: costume.suitBreasting }
      : {}),
    ...(costume.type === 'suit' && costume.suitStyle === 'tuxedo' && costume.suitLapel
      ? { suitLapel: costume.suitLapel }
      : {}),
  }
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
  const usedCostumeIds = new Set<string>()

  for (const match of picked) {
    const costume = match.costume
    const completeOutfit = completeOutfitSubmission(costume)
    if (!costume.image) {
      throw new EventApiError(
        `「${costume.name}」に写真がありません。衣装管理から画像を登録してください。`,
        400,
      )
    }

    if (completeOutfit) {
      if (typeof limits.maxOutfitComponents !== 'number') {
        throw new EventApiError(
          'このイベントのオンライン提出は、複数アイテムのコーデ提出にまだ対応していません。主催者がイベントAPIを更新すると提出できます。',
          400,
        )
      }
      const componentLimit = Math.min(limits.maxOutfitComponents, limits.maxPhotosPerCostume)
      if (completeOutfit.components.length > componentLimit) {
        throw new EventApiError(
          `「${costume.name}」の構成品が上限（${componentLimit}点）を超えています。`,
          400,
        )
      }
    }

    const name = costume.name.trim()
    let serverCostume = findServerCostume(
      serverCostumes,
      costume.id,
      name,
      usedCostumeIds,
      Boolean(completeOutfit),
    )
    const components = completeOutfit?.components ?? []
    // 完成コーデは構成品の色・柄なども含めて毎回upsertする。Workerが同一内容なら
    // 既存写真を維持し、属性・構成が変わった場合だけ本人の写真スロットをリセットする。
    const shouldUpsertServerMetadata = !serverCostume || Boolean(completeOutfit)

    if (shouldUpsertServerMetadata) {
      if (!serverCostume && status.costumeCount >= limits.maxCostumesPerParticipant) {
        throw new EventApiError(
          `サーバー上の衣装が上限（${limits.maxCostumesPerParticipant}件）に達しています。未完成の提出がある場合は「提出を再試行」を押してください。`,
          400,
        )
      }

      const body = costumeRequest(costume, name, components)
      const { costumeId, photosReset = false } = await deps.createCostume(
        eventId,
        participantToken,
        body,
      )
      const createdNew = !serverCostume
      const resetPhotoSlots = createdNew || photosReset
      const nextServerCostume: ParticipantSubmissionCostume = {
        id: costumeId,
        sourceCostumeId: costume.id,
        name,
        photoCount: resetPhotoSlots ? 0 : (serverCostume?.photoCount ?? 0),
        ...(components.length > 0
          ? {
              components: resetPhotoSlots
                ? components.map((component) => ({ ...component, photoUploaded: false }))
                : (serverCostume?.components ?? components.map((component) => ({
                    ...component,
                    photoUploaded: false,
                  }))),
            }
          : {}),
      }
      if (createdNew) {
        serverCostumes.push(nextServerCostume)
      } else {
        const index = serverCostumes.findIndex((entry) => entry.id === serverCostume!.id)
        serverCostumes[index] = nextServerCostume
      }
      serverCostume = nextServerCostume
      status = {
        ...status,
        costumeCount: status.costumeCount + (createdNew ? 1 : 0),
        costumes: [...serverCostumes],
      }
    }

    if (!serverCostume) {
      throw new EventApiError('提出先の衣装情報を確認できませんでした。もう一度お試しください。', 500)
    }
    usedCostumeIds.add(serverCostume.id)

    const images = completeOutfit?.images ?? [costume.image]
    for (let componentIndex = 0; componentIndex < images.length; componentIndex++) {
      const alreadyUploaded = completeOutfit
        ? Boolean(serverCostume.components?.[componentIndex]?.photoUploaded)
        : serverCostume.photoCount > 0
      if (alreadyUploaded) continue

      const { blob, contentType } = await deps.dataUrlToBlob(images[componentIndex])
      if (blob.size > limits.maxPhotoBytes) {
        const componentName = completeOutfit?.components[componentIndex]?.name ?? costume.name
        throw new EventApiError(
          `「${componentName}」の写真が大きすぎます（${formatBytes(blob.size)}）。${formatBytes(limits.maxPhotoBytes)} 以下にしてください。`,
          400,
        )
      }

      if (completeOutfit) {
        await deps.uploadPhoto(
          eventId,
          serverCostume.id,
          participantToken,
          blob,
          contentType,
          componentIndex,
        )
      } else {
        await deps.uploadPhoto(
          eventId,
          serverCostume.id,
          participantToken,
          blob,
          contentType,
        )
      }
      serverCostume.photoCount += 1
      if (completeOutfit && serverCostume.components?.[componentIndex]) {
        serverCostume.components[componentIndex] = {
          ...serverCostume.components[componentIndex],
          photoUploaded: true,
        }
      }
    }

    status = {
      ...status,
      photoCount: serverCostumes.reduce((sum, entry) => sum + entry.photoCount, 0),
      costumes: serverCostumes.map((entry) =>
        entry.id === serverCostume!.id ? { ...serverCostume! } : entry,
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
