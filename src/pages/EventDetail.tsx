import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useCostumes } from '../hooks/useCostumes'
import { storage, type Costume } from '../utils/storage'
import { normalizeCostume, normalizeCostumeList } from '../utils/costume-normalize'
import {
  findCostumeById,
  hasInvalidImportedCostumeAssignments,
  resolveEventCostumeCatalog,
} from '../utils/costume-scope'
import {
  runSystemOptimization,
  type SystemOptimizationAlternative,
} from '../utils/system-optimizer'
import { recordCostumeUsage } from '../utils/usage-tracker'
import { normalizeCostumeColors } from '../utils/costume-normalize'
import { shareEvent, exportEventAsCSV, exportEventAsJSON, generateEventQRCode, shareEventWithQR } from '../utils/share-export'
import {
  exportClientCostumeReportPdf,
  type ClientReportAssignment,
} from '../utils/client-costume-report'
import CollaborationFileImport from '../components/CollaborationFileImport'
import {
  createEventInviteBundle,
  createParticipantSubmissionBundle,
  downloadCollaborationBundle,
  importParticipantSubmission,
  type CollaborationBundle,
} from '../utils/collaboration-bundle'
import {
  deleteServerEvent,
  extendServerEventRetention,
  fetchAdminSnapshot,
  fetchPublishedEventResults,
  publishEventResults,
  registerHostOnServer,
  EventApiError,
} from '../event-server/client'
import {
  getEventSession,
  setEventSession,
  clearEventSession,
  hasEventAdminAccess,
  isParticipantOnlySession,
} from '../event-server/session'
import {
  canExtendServerRetention,
  formatServerExpiryLabel,
} from '../utils/server-expiry-display'
import { importAdminSnapshotToLocal } from '../event-server/import-from-server'
import { mergeEventImportedCostumes } from '../utils/event-imported-costumes'
import { isEventServerEnabled, absoluteAppUrl } from '../event-server/config'
import { cancelLocalParticipation } from '../utils/cancel-participation'
import { pruneRemovedParticipantEvents } from '../utils/prune-participant-events'
import InviteUrlModal, { type InviteUrlModalLocationState } from '../components/InviteUrlModal'
import {
  COLOR_UNIFICATION_HINTS,
  COLOR_UNIFICATION_LABELS,
  migrateColorUnificationPolicy,
  normalizeThemeColorPolicy,
} from '../utils/theme-color-policy'
import { STAGE_ARRANGEMENT_LABELS } from '../utils/event-theme-ui'
import type { ServerParticipant, StageArrangementMode } from '../../shared/event-api-types'
import UsageGuideTip from '../components/UsageGuideTip'
import ColorCoordinationAnchorsEditor from '../components/ColorCoordinationAnchorsEditor'
import { useAppUi } from '../contexts/AppUiContext'
import { getDisplayName } from '../utils/user-profile'
import {
  DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
  getRecentUsageExcludeDays,
} from '../utils/app-settings'
import { arrangeAssignmentsForStage } from '../utils/assignment-display-order'
import {
  activeServerParticipants,
  areActiveSubmissionsComplete,
  hasCompletedSubmission,
  pendingServerParticipants,
} from '../utils/server-submission-status'
import { SILHOUETTE_LABELS } from '../utils/silhouette'
import { SUIT_BREASTING_LABELS, SUIT_STYLE_LABELS } from '../utils/suit-attributes'
import {
  findStageBreakToAdd,
  moveStageBreak,
  normalizeStageBreaks,
  orderStageAssignments,
  splitStageRows,
} from '../utils/stage-layout'
import './EventDetail.css'

interface StageProposalCandidate {
  id: string
  label: string
  assignments: any[]
  harmonyScore: number
  selected: boolean
  canEdit: boolean
}

// Tone labels for display
const TONE_LABELS: Record<string, string> = {
  'pastel': 'パステル',
  'vivid': 'ビビッド',
  'dark': 'ダーク',
  'neutral': 'ニュートラル'
}

const translateTones = (tones: string[]): string => {
  return tones.map(tone => TONE_LABELS[tone] || tone).join(', ')
}

const translateSilhouettes = (silhouettes: string[]): string => {
  return silhouettes.map((value) => SILHOUETTE_LABELS[value as keyof typeof SILHOUETTE_LABELS] || value).join(', ')
}

const translateSuitStyles = (styles: string[]): string => {
  return styles.map((value) => SUIT_STYLE_LABELS[value as keyof typeof SUIT_STYLE_LABELS] || value).join(', ')
}

const translateSuitBreasting = (values: string[]): string => {
  return values.map((value) => SUIT_BREASTING_LABELS[value as keyof typeof SUIT_BREASTING_LABELS] || value).join(', ')
}

const resolveStageArrangementMode = (themePreferences: any): StageArrangementMode => {
  if (themePreferences?.stageArrangementMode) return themePreferences.stageArrangementMode
  return themePreferences?.assignmentDisplayOrder && themePreferences.assignmentDisplayOrder !== 'participant_order'
    ? 'balanced'
    : 'participant_order'
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast, confirm, prompt } = useAppUi()
  const { getEvent, updateEvent } = useEvents()
  const { costumes: personalCostumes, reloadCostumes } = useCostumes()
  const [eventCostumes, setEventCostumes] = useState<Costume[]>([])

  const reloadEventCostumes = useCallback(async () => {
    if (!id) return
    await storage.init()
    const scoped = await storage.getEventImportedCostumes(id)
    setEventCostumes(normalizeCostumeList(scoped))
  }, [id])

  const costumesForEvent = resolveEventCostumeCatalog(personalCostumes, eventCostumes)
  const findCostume = useCallback(
    (costumeId: string) => findCostumeById(costumeId, personalCostumes, eventCostumes),
    [personalCostumes, eventCostumes],
  )

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [optimizationResults, setOptimizationResults] = useState<any[]>([])
  const [alternativeProposals, setAlternativeProposals] = useState<SystemOptimizationAlternative[]>([])
  const [harmonyScore, setHarmonyScore] = useState(0)
  const [awaitingAllSubmissions, setAwaitingAllSubmissions] = useState(false)
  const [newParticipant, setNewParticipant] = useState(() => getDisplayName())
  const [participantPreferences, setParticipantPreferences] = useState<{ [key: string]: string[] }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [serverPulling, setServerPulling] = useState(false)
  const [serverParticipants, setServerParticipants] = useState<ServerParticipant[]>([])
  const [extendingRetention, setExtendingRetention] = useState(false)
  const [registeringHost, setRegisteringHost] = useState(false)
  const [deletingServer, setDeletingServer] = useState(false)
  const [retentionMessage, setRetentionMessage] = useState('')
  const [inviteModal, setInviteModal] = useState<{
    url: string
    variant: 'created' | 'share'
    adminToken?: string
    hostParticipateUrl?: string
  } | null>(null)
  const [savingColorAnchors, setSavingColorAnchors] = useState(false)
  const [stageReproposalCandidates, setStageReproposalCandidates] = useState<StageProposalCandidate[] | null>(null)
  const [activeStageCandidateId, setActiveStageCandidateId] = useState('')
  const [isStageReproposing, setIsStageReproposing] = useState(false)
  const publishedResultFingerprintRef = useRef('')
  const serverApiEnabled = isEventServerEnabled()

  useEffect(() => {
    const navState = location.state as InviteUrlModalLocationState | null
    if (navState?.showInviteModal && navState.inviteUrl) {
      setInviteModal({
        url: navState.inviteUrl,
        variant: 'created',
        adminToken: navState.adminToken,
        hostParticipateUrl: navState.hostParticipateUrl,
      })
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const loadEvent = async () => {
      try {
        if (!id) throw new Error('Event ID not found')
        await pruneRemovedParticipantEvents()
        let eventData = await getEvent(id)
        if (!eventData) throw new Error('Event not found')
        if (eventData.participants.length === 0) {
          eventData = await updateEvent(id, { participants: ['代表者'] })
        }
        if (eventData.hostedOnServer && hasInvalidImportedCostumeAssignments(eventData)) {
          eventData = await updateEvent(id, { costumes: {}, confirmed: false })
        }
        setEvent(eventData)
        setParticipantPreferences(eventData.participantPreferences ?? {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }

    loadEvent()
  }, [id, getEvent, updateEvent])

  useEffect(() => {
    void reloadEventCostumes()
  }, [reloadEventCostumes])

  useEffect(() => {
    if (!event?.id || !event.hostedOnServer || !isParticipantOnlySession(event.id)) return
    const participantToken = getEventSession(event.id)?.participantToken
    if (!participantToken) return
    let cancelled = false

    const loadPublishedResults = async () => {
      try {
        const published = await fetchPublishedEventResults(event.id, participantToken)
        if (cancelled) return

        if (published.assignments.length === 0) {
          if (Object.keys(event.costumes ?? {}).length > 0 || event.confirmed) {
            const reset = await updateEvent(event.id, { costumes: {}, confirmed: false })
            if (!cancelled) setEvent(reset)
          }
          return
        }

        const incomingCostumes = published.assignments.map(({ participantName, costume }) => {
          const primaryPhoto = [...costume.photos].sort((a, b) => a.sortOrder - b.sortOrder)[0]
          return normalizeCostume({
            id: costume.id,
            name: costume.name,
            image: primaryPhoto?.viewUrl ?? '',
            colors: costume.colors,
            tone: costume.tone,
            pattern: costume.pattern,
            season: costume.season,
            type: costume.type,
            silhouette: costume.silhouette,
            suitStyle: costume.suitStyle,
            suitBreasting: costume.suitBreasting,
            suitLapel: costume.suitLapel,
            sourceEventId: event.id,
            sourceParticipantName: participantName,
            createdAt: costume.createdAt,
            updatedAt: costume.updatedAt,
          })
        })
        const costumes = Object.fromEntries(
          published.assignments.map(({ participantName, costume }) => [participantName, costume.id]),
        )
        const participants = Array.from(new Set([
          ...event.participants,
          ...published.assignments.map((assignment) => assignment.participantName),
        ]))
        const importedCostumes = mergeEventImportedCostumes(event.importedCostumes, incomingCostumes)
        const updated = await updateEvent(event.id, {
          participants,
          costumes,
          importedCostumes,
          confirmed: true,
        })
        if (!cancelled) {
          setEvent(updated)
          setEventCostumes(normalizeCostumeList(importedCostumes))
          setIsConfirmed(true)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof EventApiError ? loadError.message : '決定衣装の読み込みに失敗しました')
        }
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadPublishedResults()
    }
    void loadPublishedResults()
    window.addEventListener('focus', loadPublishedResults)
    window.addEventListener('pageshow', loadPublishedResults)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadPublishedResults)
      window.removeEventListener('pageshow', loadPublishedResults)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [event?.id, event?.hostedOnServer, updateEvent])

  useEffect(() => {
    if (!event?.id || !event.hostedOnServer || !hasEventAdminAccess(event.id)) return
    const assignments = Object.entries(event.costumes ?? {}) as Array<[string, string]>
    if (assignments.length === 0) return
    const fingerprint = JSON.stringify([...assignments].sort(([a], [b]) => a.localeCompare(b)))
    if (publishedResultFingerprintRef.current === fingerprint) return
    const adminToken = getEventSession(event.id)?.adminToken
    if (!adminToken) return

    publishedResultFingerprintRef.current = fingerprint
    void publishEventResults(event.id, adminToken, {
      assignments: assignments.map(([participantName, costumeId]) => ({ participantName, costumeId })),
    }).catch((publishError) => {
      publishedResultFingerprintRef.current = ''
      setError(publishError instanceof EventApiError ? publishError.message : '決定結果の公開に失敗しました')
    })
  }, [event?.id, event?.hostedOnServer, event?.costumes])

  const handleAddParticipant = async () => {
    if (!newParticipant.trim() || !event) return

    try {
      const updatedEvent = {
        ...event,
        participants: [...event.participants, newParticipant],
      }
      await updateEvent(event.id, updatedEvent)
      setEvent(updatedEvent)
      setNewParticipant('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant')
    }
  }

  const handleRemoveParticipant = async (participant: string) => {
    if (!event) return

    try {
      const updatedEvent = {
        ...event,
        participants: event.participants.filter((p: string) => p !== participant),
      }
      await updateEvent(event.id, updatedEvent)
      setEvent(updatedEvent)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participant')
    }
  }

  const handleSaveColorAnchors = async (anchors: NonNullable<typeof event.themePreferences>['colorCoordinationAnchors']) => {
    if (!event?.themePreferences) return
    setSavingColorAnchors(true)
    setError('')
    try {
      const themePreferences = normalizeThemeColorPolicy({
        ...event.themePreferences,
        colorCoordinationAnchors: anchors ?? [],
      })
      const updated = await updateEvent(event.id, { themePreferences })
      setEvent(updated)
      toast('基準衣装の色設定を保存しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '基準色の保存に失敗しました')
    } finally {
      setSavingColorAnchors(false)
    }
  }

  const handleStageRowBreak = async (breakIndex: number, itemCount: number) => {
    if (!event) return
    const currentBreaks = normalizeStageBreaks(itemCount, event.stageRowBreakIndices, event.stageRowBreakIndex)
    const nextBreaks = currentBreaks.includes(breakIndex)
      ? currentBreaks.filter((index) => index !== breakIndex)
      : [...currentBreaks, breakIndex].sort((a, b) => a - b)
    try {
      const updated = await updateEvent(event.id, {
        stageRowBreakIndices: nextBreaks,
        stageRowBreakIndex: undefined,
      })
      setEvent(updated)
      setStageReproposalCandidates(null)
      toast(nextBreaks.includes(breakIndex) ? '区切りを追加しました' : '区切りを削除しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステージ配置の保存に失敗しました')
    }
  }

  const handleAddStageRowBreak = async (itemCount: number) => {
    if (!event) return
    const currentBreaks = normalizeStageBreaks(itemCount, event.stageRowBreakIndices, event.stageRowBreakIndex)
    const breakIndex = findStageBreakToAdd(currentBreaks, itemCount)
    if (breakIndex === null) return
    await handleStageRowBreak(breakIndex, itemCount)
  }

  const handleMoveStageRowBreak = async (
    breakIndex: number,
    direction: -1 | 1,
    itemCount: number,
  ) => {
    if (!event) return
    const currentBreaks = normalizeStageBreaks(itemCount, event.stageRowBreakIndices, event.stageRowBreakIndex)
    const nextBreaks = moveStageBreak(currentBreaks, breakIndex, direction, itemCount)
    if (nextBreaks.every((index, position) => index === currentBreaks[position])) return
    try {
      const updated = await updateEvent(event.id, {
        stageRowBreakIndices: nextBreaks,
        stageRowBreakIndex: undefined,
      })
      setEvent(updated)
      setStageReproposalCandidates(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '区切り位置の保存に失敗しました')
    }
  }

  const handleMoveStageParticipant = async (participantId: string, direction: -1 | 1, assignments: any[]) => {
    if (!event) return
    const ordered = orderStageAssignments(assignments, event.stageParticipantOrder)
    const currentIndex = ordered.findIndex((row) => row.participantId === participantId)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= ordered.length) return
    const next = [...ordered]
    ;[next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]]
    try {
      const updated = await updateEvent(event.id, { stageParticipantOrder: next.map((row) => row.participantId) })
      setEvent(updated)
      setStageReproposalCandidates(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステージ配置の保存に失敗しました')
    }
  }

  const reloadEventAndCostumes = async () => {
    if (!id) return
    const eventData = await getEvent(id)
    if (eventData) {
      setEvent(eventData)
      setParticipantPreferences(eventData.participantPreferences ?? {})
    }
    setOptimizationResults([])
    setHarmonyScore(0)
  }

  const handleExportEventInvite = () => {
    if (!event) return
    downloadCollaborationBundle(
      createEventInviteBundle(
        event,
        '参加者へ送付してください。取り込み後に衣装登録→提出用ファイルを返送します。',
      ),
      `event-invite-${event.id}.json`,
    )
  }

  const handleImportParticipantBundle = async (bundle: CollaborationBundle) => {
    if (bundle.type !== 'participant-submission') {
      throw new Error('提出用ファイル（participant-submission）を選んでください')
    }
    await storage.init()
    const result = await importParticipantSubmission(bundle, {
      getEvent: (eid) => storage.getEvent(eid),
      updateEvent: (ev) => storage.updateEvent(ev),
    })
    toast(
      `${result.participantName} さんのデータを取り込みました（衣装 新規${result.costumesAdded} / 更新${result.costumesUpdated}）`,
      'success',
    )
    await reloadEventCostumes()
    await reloadEventAndCostumes()
  }

  const handleExportParticipantSubmission = async () => {
    if (!event) return
    const name =
      newParticipant.trim() ||
      (await prompt({
        title: '参加者名',
        message: '提出用ファイルに含める参加者名を入力してください',
        defaultValue: getDisplayName() || event.participants[0] || '',
      }))
    if (!name) return
    downloadCollaborationBundle(
      createParticipantSubmissionBundle({
        event,
        participantName: name,
        costumes: personalCostumes,
        preferences: participantPreferences[name] ?? [],
      }),
      `submission-${name}-${event.id}.json`,
    )
  }

  const persistOptimizationResults = async (
    assignments: typeof optimizationResults,
    eventSnapshot: typeof event,
  ) => {
    if (!eventSnapshot || assignments.length === 0) return

    const costumesMap: { [key: string]: string } = {}
    assignments.forEach((result) => {
      costumesMap[result.participantName] = result.costume.id
    })

    if (eventSnapshot.hostedOnServer) {
      const adminToken = getEventSession(eventSnapshot.id)?.adminToken
      if (!adminToken) {
        throw new Error('決定結果を公開する管理者トークンがありません')
      }
      await publishEventResults(eventSnapshot.id, adminToken, {
        assignments: assignments.map((result) => ({
          participantName: result.participantName,
          costumeId: result.costume.id,
        })),
      })
      publishedResultFingerprintRef.current = JSON.stringify(
        Object.entries(costumesMap).sort(([a], [b]) => a.localeCompare(b)),
      )
    }

    const updatedEvent = {
      ...eventSnapshot,
      costumes: costumesMap,
      confirmed: true,
    }

    await updateEvent(eventSnapshot.id, updatedEvent)

    await recordCostumeUsage(eventSnapshot.id, costumesMap)

    setEvent(updatedEvent)
    setIsConfirmed(true)
  }

  const runSystemOptimizationForEvent = async (
    eventSnapshot: typeof event,
    prefs: { [key: string]: string[] },
    costumeList: Costume[],
    options?: { autoPersist?: boolean; stageAware?: boolean; applyOutcome?: boolean },
  ) => {
    if (!eventSnapshot) return null

    await storage.init()
    const recentUsageExcludeDays = getRecentUsageExcludeDays()
    const usageHistory = (await storage.getRecentUsageHistory(
      recentUsageExcludeDays > 0 ? recentUsageExcludeDays : DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
    )).filter((entry) => entry.eventId !== eventSnapshot.id)
    const participants = eventSnapshot.participants.map((p: string) => ({
      id: p,
      name: p,
      preferences: prefs[p] || [],
    }))

    const outcome = runSystemOptimization({
      participants,
      costumes: costumeList,
      usageHistory,
      themePreferences: eventSnapshot.themePreferences,
      recentUsageExcludeDays,
      stageParticipantOrder: options?.stageAware ? eventSnapshot.stageParticipantOrder : undefined,
      stageRowBreakIndices: options?.stageAware
        ? normalizeStageBreaks(
            eventSnapshot.participants.length,
            eventSnapshot.stageRowBreakIndices,
            eventSnapshot.stageRowBreakIndex,
          )
        : undefined,
    })

    if (options?.applyOutcome !== false) {
      setOptimizationResults(outcome.selected)
      setAlternativeProposals(outcome.alternatives)
      setHarmonyScore(outcome.harmonyScore)
      setAwaitingAllSubmissions(false)
    }

    if (options?.autoPersist && outcome.selected.length > 0) {
      setIsSaving(true)
      try {
        await persistOptimizationResults(outcome.selected, eventSnapshot)
      } finally {
        setIsSaving(false)
      }
    }

    return outcome
  }

  const handleOptimize = async () => {
    if (!event) return

    try {
      setError('')
      const outcome = await runSystemOptimizationForEvent(
        event,
        participantPreferences,
        costumesForEvent,
        { autoPersist: true },
      )
      if (!outcome || outcome.selected.length === 0) {
        setError('組み合わせを生成できませんでした（衣装または参加者が不足しています）')
        return
      }
      toast('システムが最適な組み合わせを決定しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '組み合わせの自動決定に失敗しました')
    }
  }

  const handleStageReproposal = async () => {
    if (!event || optimizationResults.length === 0) return
    setIsStageReproposing(true)
    setError('')
    try {
      const effectiveStageOrder = event.stageParticipantOrder?.length
        ? event.stageParticipantOrder
        : arrangeAssignmentsForStage(
            optimizationResults.map((result) => ({
              ...result,
              colors: normalizeCostumeColors(result.costume.colors),
            })),
            resolveStageArrangementMode(event.themePreferences),
          ).map((result) => result.participantId)
      const eventWithStageLayout = { ...event, stageParticipantOrder: effectiveStageOrder }
      const outcome = await runSystemOptimizationForEvent(
        eventWithStageLayout,
        participantPreferences,
        costumesForEvent,
        { stageAware: true, applyOutcome: false },
      )
      if (!outcome || outcome.selected.length === 0) {
        setError('この配置に合う衣装案を生成できませんでした')
        return
      }

      const generated: StageProposalCandidate[] = [
        {
          id: 'stage-new-1',
          label: '候補 1（システム推奨）',
          assignments: outcome.selected,
          harmonyScore: outcome.harmonyScore,
          selected: true,
          canEdit: true,
        },
        ...outcome.alternatives.map((proposal, index) => ({
          id: `stage-new-${index + 2}`,
          label: `候補 ${index + 2}`,
          assignments: proposal.assignments,
          harmonyScore: proposal.harmonyScore,
          selected: false,
          canEdit: false,
        })),
      ].slice(0, 3)

      await persistOptimizationResults(outcome.selected, event)
      setOptimizationResults(outcome.selected)
      setAlternativeProposals(outcome.alternatives)
      setHarmonyScore(outcome.harmonyScore)
      setStageReproposalCandidates(generated)
      setActiveStageCandidateId(generated[0]?.id ?? '')
      toast('この配置に合わせ、システムが候補1を決定しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '衣装の再提案に失敗しました')
    } finally {
      setIsStageReproposing(false)
    }
  }

  const handleAdoptStageProposal = async (candidate: StageProposalCandidate) => {
    if (!event || candidate.selected) return
    setIsSaving(true)
    setError('')
    try {
      await persistOptimizationResults(candidate.assignments, event)
      setOptimizationResults(candidate.assignments)
      setHarmonyScore(candidate.harmonyScore)
      const switchedCandidates = stageImageCandidates.map((proposal) => ({
        ...proposal,
        selected: proposal.id === candidate.id,
        canEdit: proposal.id === candidate.id,
      }))
      setAlternativeProposals(switchedCandidates
        .filter((proposal) => proposal.id !== candidate.id)
        .map((proposal, index) => ({
          id: proposal.id,
          label: `参考案 ${index + 1}`,
          assignments: proposal.assignments,
          harmonyScore: proposal.harmonyScore,
        })))
      setStageReproposalCandidates(switchedCandidates)
      setActiveStageCandidateId(candidate.id)
      toast(`${candidate.label}へ変更しました`, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '候補の変更に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShareEvent = async () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? findCostume(event.costumes[name])?.name : undefined,
        })),
        costumes: [],
      }
      await shareEvent(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share event')
    }
  }

  const handleExportCSV = () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? findCostume(event.costumes[name])?.name : undefined,
        })),
        costumes: optimizationResults.map(r => ({
          participantId: r.participantId,
          participantName: r.participantName,
          costumeId: r.costume.id,
          costumeName: r.costume.name,
          colors: r.costume.colors,
        })),
      }
      exportEventAsCSV(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV')
    }
  }

  const handleExportJSON = () => {
    if (!event) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? findCostume(event.costumes[name])?.name : undefined,
        })),
        costumes: optimizationResults.map(r => ({
          participantId: r.participantId,
          participantName: r.participantName,
          costumeId: r.costume.id,
          costumeName: r.costume.name,
          colors: r.costume.colors,
        })),
      }
      exportEventAsJSON(eventData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export JSON')
    }
  }

  const buildClientReportAssignments = (): ClientReportAssignment[] => {
    if (!event) return []

    if (optimizationResults.length > 0) {
      return optimizationResults.map((result) => ({
        participantName: result.participantName,
        costumeName: result.costume.name,
        costumeImage: result.costume.image,
        colors: normalizeCostumeColors(result.costume.colors),
        tone: result.costume.tone,
        pattern: result.costume.pattern,
      }))
    }

    return event.participants
      .map((name: string) => {
        const costumeId = event.costumes?.[name]
        if (!costumeId) return null
        const costume = findCostume(costumeId)
        if (!costume) return null
        return {
          participantName: name,
          costumeName: costume.name,
          costumeImage: costume.image,
          colors: normalizeCostumeColors(costume.colors),
          tone: costume.tone,
          pattern: costume.pattern,
        }
      })
      .filter((assignment): assignment is ClientReportAssignment => assignment !== null)
  }

  const handleExportClientPdf = async () => {
    if (!event) return
    setIsExportingPdf(true)
    try {
      const assignments = arrangeAssignmentsForStage(
        buildClientReportAssignments(),
        resolveStageArrangementMode(event.themePreferences),
      )
      await exportClientCostumeReportPdf(
        {
          name: event.name,
          eventDate: event.date,
          description: event.description,
        },
        assignments,
      )
      toast('クライアント提出用PDFをダウンロードしました', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDFの作成に失敗しました'
      setError(message)
      toast(message, 'error')
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleCancelParticipation = async () => {
    if (!event) return
    const ok = await confirm({
      title: '参加の取り消し',
      message:
        'この端末での参加を解除し、一覧から消します。招待URLから再度参加できます。',
      confirmLabel: '参加を取り消す',
    })
    if (!ok) return

    await cancelLocalParticipation(event.id)
    toast('参加を取り消しました', 'success')
    navigate('/events')
  }

  const handleGenerateQR = async () => {
    if (!event) return
    try {
      const sess = getEventSession(event.id)
      const shareUrl = sess?.inviteToken
        ? absoluteAppUrl(`/join?e=${encodeURIComponent(event.id)}&t=${encodeURIComponent(sess.inviteToken)}`)
        : undefined
      const url = await generateEventQRCode(event.id, event.name, shareUrl)
      setQrCodeUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code')
    }
  }

  const buildInviteUrl = (): string | null => {
    if (!event) return null
    const invite = getEventSession(event.id)?.inviteToken
    if (!invite) return null
    return absoluteAppUrl(`/join?e=${encodeURIComponent(event.id)}&t=${encodeURIComponent(invite)}`)
  }

  const handleCopyInviteLink = () => {
    const url = buildInviteUrl()
    if (!url) {
      toast(
        '招待トークンがこの端末にありません。イベント作成時に表示された URL を再利用するか、新しいオンラインイベントを作成してください。',
        'error',
      )
      return
    }
    const token = getEventSession(event.id)?.inviteToken
    const hostParticipateUrl = token
      ? absoluteAppUrl(
          `/events/${encodeURIComponent(event.id)}/participate?t=${encodeURIComponent(token)}`,
        )
      : undefined
    setInviteModal({ url, variant: 'share', hostParticipateUrl })
  }

  const resolveAdminToken = async (): Promise<string | null> => {
    if (!event) return null
    let adminToken = getEventSession(event.id)?.adminToken
    if (!adminToken) {
      const entered = await prompt({
        title: '管理者トークン',
        message: '作成時にコピーした管理者トークンを貼り付けてください',
        label: '管理者トークン',
      })
      if (!entered?.trim()) return null
      adminToken = entered.trim()
      setEventSession(event.id, { adminToken })
    }
    return adminToken
  }

  const handleRegisterHostOnServer = async () => {
    if (!event?.hostedOnServer || !serverApiEnabled) return
    const hostName = event.participants[0]?.trim()
    if (!hostName) {
      toast('代表者名がローカル参加者にありません', 'error')
      return
    }
    const adminToken = await resolveAdminToken()
    if (!adminToken) return

    setRegisteringHost(true)
    setError('')
    try {
      const res = await registerHostOnServer(event.id, adminToken, { displayName: hostName })
      const invite = getEventSession(event.id)?.inviteToken
      setEventSession(event.id, {
        adminToken,
        inviteToken: invite,
        participantToken: res.participantToken,
        participantId: res.participantId,
        displayName: res.displayName,
      })
      toast(
        res.reissued
          ? '代表者のサーバー登録を更新しました（写真提出が可能です）'
          : '代表者をサーバーに登録しました',
        'success',
      )
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '代表者のサーバー登録に失敗しました')
    } finally {
      setRegisteringHost(false)
    }
  }

  const handleDeleteServerData = async () => {
    if (!event?.hostedOnServer || !serverApiEnabled) return
    const ok = await confirm({
      title: 'サーバーデータの削除',
      message:
        'サーバー上の写真・参加者データをすべて削除します。ローカルのイベントは残ります。この操作は取り消せません。',
      confirmLabel: '削除する',
      danger: true,
    })
    if (!ok) return

    const adminToken = await resolveAdminToken()
    if (!adminToken) return

    setDeletingServer(true)
    setError('')
    try {
      await deleteServerEvent(event.id, adminToken)
      const updated = await updateEvent(event.id, { hostedOnServer: false, serverExpiresAt: undefined })
      setEvent(updated)
      clearEventSession(event.id)
      toast('サーバー上のイベントデータを削除しました', 'success')
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'サーバーデータの削除に失敗しました')
    } finally {
      setDeletingServer(false)
    }
  }

  const handleExtendRetention = async () => {
    if (!event?.serverExpiresAt || !serverApiEnabled) return
    const adminToken = await resolveAdminToken()
    if (!adminToken) return

    setExtendingRetention(true)
    setRetentionMessage('')
    setError('')
    try {
      const res = await extendServerEventRetention(event.id, adminToken, 7)
      const updated = await updateEvent(event.id, { serverExpiresAt: res.expiresAt })
      setEvent(updated)
      setEventSession(event.id, { expiresAt: res.expiresAt })
      setRetentionMessage('保存期限を7日延長しました')
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : '期限の延長に失敗しました')
    } finally {
      setExtendingRetention(false)
    }
  }

  const handlePullFromServer = async () => {
    if (!event) return
    const adminToken = await resolveAdminToken()
    if (!adminToken) return

    setServerPulling(true)
    setError('')
    try {
      const snapshot = await fetchAdminSnapshot(event.id, adminToken)
      setServerParticipants(snapshot.participants)
      const result = await importAdminSnapshotToLocal(snapshot, event.id)
      await reloadEventCostumes()
      await storage.init()
      const freshEvent = await getEvent(event.id)
      const freshCostumes = normalizeCostumeList(
        result.importedCostumes.length > 0
          ? result.importedCostumes
          : await storage.getEventImportedCostumes(event.id),
      )
      const freshPrefs = freshEvent?.participantPreferences ?? {}
      if (freshEvent) {
        setEvent(freshEvent)
        setParticipantPreferences(freshPrefs)
      }

      const activeParticipants = activeServerParticipants(snapshot.participants)
      const submittedCount = activeParticipants.filter(hasCompletedSubmission).length
      const totalCount = activeParticipants.length
      const allSubmitted = areActiveSubmissionsComplete(snapshot.participants)

      toast(
        `サーバーから取り込みました。参加者 +${result.participantsAdded} / 衣装 新規 ${result.costumesAdded}・更新 ${result.costumesUpdated} / 提出 ${submittedCount}/${totalCount} 名`,
        'success',
      )

      if (allSubmitted && freshEvent) {
        const outcome = await runSystemOptimizationForEvent(
          freshEvent,
          freshPrefs,
          freshCostumes,
          { autoPersist: true },
        )
        if (outcome && outcome.selected.length > 0) {
          toast(
            `全員提出済みのため、システムが組み合わせを自動決定しました（調和スコア ${(outcome.harmonyScore * 100).toFixed(1)}%）`,
            'success',
          )
        }
      } else {
        if (freshEvent && (Object.keys(freshEvent.costumes ?? {}).length > 0 || freshEvent.confirmed)) {
          const resetEvent = await updateEvent(freshEvent.id, {
            costumes: {},
            confirmed: false,
          })
          setEvent(resetEvent)
        }
        setAwaitingAllSubmissions(true)
        setOptimizationResults([])
        setAlternativeProposals([])
        setHarmonyScore(0)
        setIsConfirmed(false)
      }
    } catch (e) {
      setError(e instanceof EventApiError ? e.message : 'サーバーからの取り込みに失敗しました')
    } finally {
      setServerPulling(false)
    }
  }

  const handleShareWithQR = async () => {
    if (!event || !qrCodeUrl) return
    try {
      const eventData = {
        id: event.id,
        name: event.name,
        eventDate: event.date,
        participants: event.participants.map((name: string) => ({
          id: name,
          name,
          selectedCostumeName: event.costumes[name] ? findCostume(event.costumes[name])?.name : undefined,
        })),
        costumes: [],
      }
      await shareEventWithQR(eventData, qrCodeUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share with QR')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>イベントが見つかりません</p>
        <button onClick={() => navigate('/events')} className="back-button">
          イベント一覧に戻る
        </button>
      </div>
    )
  }

  const eventSession = getEventSession(event.id)
  const isEventHost = hasEventAdminAccess(event.id)
  const isParticipantOnly = isParticipantOnlySession(event.id)
  const showHostHub = Boolean(event.hostedOnServer || serverApiEnabled) && !isParticipantOnly
  const showParticipantHub = Boolean(event.hostedOnServer && serverApiEnabled && isParticipantOnly)
  const canExtend = canExtendServerRetention(event.serverExpiresAt, event.createdAt)
  const participateUrl =
    eventSession?.inviteToken
      ? `/events/${event.id}/participate?t=${encodeURIComponent(eventSession.inviteToken)}`
      : null
  const stageArrangementMode = resolveStageArrangementMode(event.themePreferences)
  const displayAssignments = arrangeAssignmentsForStage(
    buildClientReportAssignments(),
    stageArrangementMode,
  )
  const displayedOptimizationResults = arrangeAssignmentsForStage(
    optimizationResults.map((result) => ({
      ...result,
      colors: normalizeCostumeColors(result.costume.colors),
    })),
    stageArrangementMode,
  )
  const displayedAlternativeProposals = alternativeProposals.map((proposal) => ({
    ...proposal,
    assignments: arrangeAssignmentsForStage(
      proposal.assignments.map((result) => ({
        ...result,
        colors: normalizeCostumeColors(result.costume.colors),
      })),
      stageArrangementMode,
    ),
  }))
  const defaultStageImageCandidates: StageProposalCandidate[] = [
    {
      id: 'selected',
      label: '候補 1（システム推奨）',
      harmonyScore,
      assignments: displayedOptimizationResults,
      selected: true,
      canEdit: true,
    },
    ...displayedAlternativeProposals.map((proposal, index) => ({
      id: proposal.id,
      label: `候補 ${index + 2}`,
      harmonyScore: proposal.harmonyScore,
      assignments: proposal.assignments,
      selected: false,
      canEdit: false,
    })),
  ].slice(0, 3)
  const stageImageCandidates = (stageReproposalCandidates ?? defaultStageImageCandidates).map((candidate) => ({
    ...candidate,
    assignments: arrangeAssignmentsForStage(
      candidate.assignments.map((result) => ({
        ...result,
        colors: normalizeCostumeColors(result.costume.colors),
      })),
      stageArrangementMode,
    ),
  }))
  const activeStageCandidate = stageImageCandidates.find(
    (candidate) => candidate.id === activeStageCandidateId,
  ) ?? stageImageCandidates.find((candidate) => candidate.selected) ?? stageImageCandidates[0]
  const stageRowBreakIndices = normalizeStageBreaks(
    displayedOptimizationResults.length,
    event.stageRowBreakIndices,
    event.stageRowBreakIndex,
  )

  return (
    <div className="event-detail-page">
      <button onClick={() => navigate('/events')} className="back-button">
        ← 戻る
      </button>

      <header className="event-detail-hero">
        <div className="event-detail-hero-text">
          <h1>{event.name}</h1>
          <p className="event-date">📅 {new Date(event.date).toLocaleDateString('ja-JP')}</p>
          {event.description && <p className="event-description">{event.description}</p>}
        </div>
        {event.hostedOnServer && (
          <span className="event-hosted-pill">☁️ オンライン提出</span>
        )}
      </header>

      {displayAssignments.length > 0 && (
        <section className="section confirmed-assignments-panel confirmed-assignments-panel--primary">
          <h2>👗 決定済みの衣装</h2>
          <div className="confirmed-assignments-grid">
            {displayAssignments.map((assignment) => (
              <article
                key={assignment.participantName}
                className={`confirmed-assignment-card ${assignment.participantName === eventSession?.displayName ? 'confirmed-assignment-card--self' : ''}`}
                aria-current={assignment.participantName === eventSession?.displayName ? 'true' : undefined}
              >
                {assignment.costumeImage ? (
                  <img src={assignment.costumeImage} alt={assignment.costumeName} />
                ) : (
                  <div className="confirmed-assignment-placeholder">写真なし</div>
                )}
                <div className="confirmed-assignment-text">
                  <div className="confirmed-assignment-name">
                    <strong>{assignment.participantName}</strong>
                    {assignment.participantName === eventSession?.displayName && (
                      <span className="confirmed-self-badge">自分</span>
                    )}
                  </div>
                  <span className="confirmed-costume-name">{assignment.costumeName}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {showParticipantHub && participateUrl && (
        <section className="section participant-primary-card" aria-labelledby="participant-primary-heading">
          <h2 id="participant-primary-heading">オンライン提出</h2>
          <p className="server-primary-lead">
            {eventSession?.displayName ? (
              <>
                <strong>{eventSession.displayName}</strong> さんとして参加登録済みです。
              </>
            ) : (
              '参加者としてオンライン提出できます。'
            )}
          </p>
          {eventSession?.costumesSubmitted ? (
            <p className="participant-submitted-note">
              {displayAssignments.length > 0
                ? '組み合わせが決定しました。'
                : '候補衣装の提出は完了しています。代表者の確認待ちです。'}
            </p>
          ) : (
            <p className="participant-submitted-note">
              登録済みの衣装から候補を自動選出して提出してください。
            </p>
          )}
          <div className="server-action-stack">
            <Link to={participateUrl} className="server-action-btn primary">
              <span className="server-action-step">→</span>
              <span className="server-action-text">
                {eventSession?.costumesSubmitted ? '提出内容を確認' : 'オンライン提出を続ける'}
              </span>
            </Link>
            <button
              type="button"
              className="server-action-btn secondary"
              onClick={() => void handleCancelParticipation()}
            >
              参加を取り消す
            </button>
          </div>

          {serverParticipants.length > 0 && (
            <div className="server-participant-status" aria-label="オンライン提出状況">
              <h3>提出状況</h3>
              <ul>
                {serverParticipants.map((participant) => {
                  const submitted = hasCompletedSubmission(participant)
                  const started = participant.costumeCount > 0
                  return (
                    <li key={participant.id}>
                      <span>{participant.displayName}</span>
                      <strong className={submitted ? 'is-complete' : started ? 'is-pending' : 'is-idle'}>
                        {submitted
                          ? `提出済み（衣装${participant.costumeCount}件）`
                          : started
                            ? `写真未提出（衣装${participant.costumeCount}件）`
                            : '未開始（結果待ちの対象外）'}
                      </strong>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {showHostHub && (
        <section className="section server-primary-card" aria-labelledby="server-primary-heading">
          <h2 id="server-primary-heading">代表者の操作</h2>
          <p className="server-primary-lead">
            参加者に招待 URL を送り、提出が揃ったら下のボタンで組み合わせを決定します。
          </p>
          <UsageGuideTip title="ℹ️ 代表者・参加者の手順">
            <ol>
              <li>招待 URL をコピーして参加者へ送付</li>
              <li>代表者は「写真提出」または下のボタンから衣装写真をアップロード</li>
              <li>全員提出後「提出状況を確認して組み合わせを決定」を押す</li>
            </ol>
            <p>
              <Link to="/guide">使い方ガイド（全文）</Link>
            </p>
          </UsageGuideTip>

          {event.serverExpiresAt && (
            <div className="server-expiry-row">
              <div className="server-expiry-info">
                <span className="server-expiry-label">サーバー保存期限</span>
                <span className="server-expiry-value">
                  {formatServerExpiryLabel(event.serverExpiresAt)}
                </span>
              </div>
              {event.hostedOnServer && serverApiEnabled && (
                <button
                  type="button"
                  className="server-extend-btn"
                  disabled={extendingRetention || !canExtend}
                  title={
                    canExtend
                      ? '保存期限を7日延長（作成から最大14日）'
                      : '作成から最大14日のため、これ以上延長できません'
                  }
                  onClick={() => void handleExtendRetention()}
                >
                  {extendingRetention ? '延長中…' : '+7日延長'}
                </button>
              )}
            </div>
          )}
          {retentionMessage && <p className="server-retention-ok">{retentionMessage}</p>}

          <div className="server-action-stack">
            <button type="button" className="server-action-btn" onClick={handleCopyInviteLink}>
              <span className="server-action-step">1</span>
              <span className="server-action-text">招待 URL をコピー</span>
            </button>
            {event.hostedOnServer &&
              serverApiEnabled &&
              isEventHost &&
              !eventSession?.participantToken && (
                <button
                  type="button"
                  className="server-action-btn host-register-btn"
                  disabled={registeringHost}
                  onClick={() => void handleRegisterHostOnServer()}
                >
                  <span className="server-action-step">★</span>
                  <span className="server-action-text">
                    {registeringHost ? '登録中…' : '代表者をサーバーに登録'}
                  </span>
                </button>
              )}
            {isEventHost && eventSession?.participantToken && participateUrl && (
              <Link to={participateUrl} className="server-action-btn host-photo-link">
                <span className="server-action-step">★</span>
                <span className="server-action-text">代表者として写真を提出</span>
              </Link>
            )}
            <button
              type="button"
              className="server-action-btn primary"
              disabled={serverPulling || !serverApiEnabled}
              onClick={() => void handlePullFromServer()}
            >
              <span className="server-action-step">2</span>
              <span className="server-action-text">
                {serverPulling ? '確認中…' : '提出状況を確認して組み合わせを決定'}
              </span>
            </button>
          </div>

          {!serverApiEnabled && (
            <p className="collab-note">API 未設定のためオンライン機能は使えません。</p>
          )}

          {event.hostedOnServer && serverApiEnabled && (
            <button
              type="button"
              className="server-delete-btn"
              disabled={deletingServer}
              onClick={() => void handleDeleteServerData()}
            >
              {deletingServer ? '削除中…' : 'サーバー上のデータのみ削除'}
            </button>
          )}
        </section>
      )}

      {!isParticipantOnly && (
      <details className="event-advanced-panel">
        <summary>
          補助ツール（必要なときだけ）
        </summary>
        <div className="event-advanced-body">
          <p className="advanced-tool-note">
            通常は「招待 URL をコピー」と「サーバーから提出を取り込む」だけで進められます。
            共有メニュー、QR、CSV/JSON/PDF は外部連絡や控えが必要な場合に使います。
          </p>
          <div className="event-toolbar">
            <button type="button" onClick={handleShareEvent} className="action-button share-button">
              📤 共有メニュー
            </button>
            <button type="button" onClick={handleExportCSV} className="action-button export-button">
              📊 CSVを書き出し
            </button>
            <button type="button" onClick={handleExportJSON} className="action-button export-button">
              📋 JSONを書き出し
            </button>
            <button
              type="button"
              onClick={() => void handleExportClientPdf()}
              disabled={isExportingPdf || buildClientReportAssignments().length === 0}
              className="action-button export-button client-pdf-button"
            >
              {isExportingPdf ? 'PDF作成中…' : '📎 PDFを書き出し'}
            </button>
            <button type="button" onClick={handleGenerateQR} className="action-button qr-button">
              🔲 QRコードを表示
            </button>
          </div>

          {qrCodeUrl && (
            <div className="qr-code-section compact">
              <img src={qrCodeUrl} alt="招待用 QR コード" className="qr-code-image" />
              <button type="button" onClick={handleShareWithQR} className="action-button share-button">
                QR を共有
              </button>
            </div>
          )}

          {!serverApiEnabled && (
            <section className="collaboration-section offline-tools">
              <h3>オフライン用 JSON</h3>
              <p className="collab-note">
                API 未設定時のみ。本番ではオンライン提出を利用してください。
              </p>
              <button type="button" className="action-button" onClick={handleExportEventInvite}>
                参加用ファイルを書き出す
              </button>
              <CollaborationFileImport
                acceptLabel="提出ファイルを取り込む"
                hint="participant-submission の JSON"
                onBundleLoaded={handleImportParticipantBundle}
              />
              <button
                type="button"
                className="action-button"
                onClick={() => void handleExportParticipantSubmission()}
              >
                提出用ファイルを書き出す
              </button>
            </section>
          )}
        </div>
      </details>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="close-error">×</button>
        </div>
      )}

      <div className="event-detail-content">
        {event.themePreferences && (
          <section className="section theme-preferences-section">
            <h2>🎨 イベントテーマ設定</h2>
            <div className="theme-preferences-display">
              <div className="preference-display">
                <h4>色味の統一方針</h4>
                <p className="theme-unification-summary">
                  {COLOR_UNIFICATION_LABELS[migrateColorUnificationPolicy(
                    event.themePreferences.colorUnification,
                    event.themePreferences.avoidSimilarColors,
                  )]}
                </p>
                <p className="theme-unification-hint">
                  {COLOR_UNIFICATION_HINTS[migrateColorUnificationPolicy(
                    event.themePreferences.colorUnification,
                    event.themePreferences.avoidSimilarColors,
                  )]}
                </p>
              </div>
              {event.themePreferences.colors1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>色の好み</h4>
                  <div className="preference-items">
                    {event.themePreferences.colors1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors1stChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {event.themePreferences.colors2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors2ndChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {event.themePreferences.colors3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <div className="color-display">
                          {event.themePreferences.colors3rdChoice.map(color => (
                            <span key={color} className="color-tag" style={{ backgroundColor: color }}>{color}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {event.themePreferences.tones1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>トーンの選択</h4>
                  <div className="preference-items">
                    {event.themePreferences.tones1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones1stChoice)}</span>
                      </div>
                    )}
                    {event.themePreferences.tones2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones2ndChoice)}</span>
                      </div>
                    )}
                    {event.themePreferences.tones3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="tone-tags">{translateTones(event.themePreferences.tones3rdChoice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {event.themePreferences.patterns1stChoice.length > 0 && (
                <div className="preference-display">
                  <h4>柄の選択</h4>
                  <div className="preference-items">
                    {event.themePreferences.patterns1stChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns1stChoice.join(', ')}</span>
                      </div>
                    )}
                    {event.themePreferences.patterns2ndChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns2ndChoice.join(', ')}</span>
                      </div>
                    )}
                    {event.themePreferences.patterns3rdChoice.length > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="pattern-tags">{event.themePreferences.patterns3rdChoice.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(event.themePreferences.silhouettes1stChoice?.length ?? 0) > 0 && (
                <div className="preference-display">
                  <h4>シルエット（ドレス）</h4>
                  <div className="preference-items">
                    {(event.themePreferences.silhouettes1stChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="pattern-tags">{translateSilhouettes(event.themePreferences.silhouettes1stChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.silhouettes2ndChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="pattern-tags">{translateSilhouettes(event.themePreferences.silhouettes2ndChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.silhouettes3rdChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="pattern-tags">{translateSilhouettes(event.themePreferences.silhouettes3rdChoice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {((event.themePreferences.suitStyles1stChoice?.length ?? 0) > 0 ||
                (event.themePreferences.suitStyles2ndChoice?.length ?? 0) > 0 ||
                (event.themePreferences.suitStyles3rdChoice?.length ?? 0) > 0) && (
                <div className="preference-display">
                  <h4>スーツ形式</h4>
                  <div className="preference-items">
                    {(event.themePreferences.suitStyles1stChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="pattern-tags">{translateSuitStyles(event.themePreferences.suitStyles1stChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.suitStyles2ndChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="pattern-tags">{translateSuitStyles(event.themePreferences.suitStyles2ndChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.suitStyles3rdChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="pattern-tags">{translateSuitStyles(event.themePreferences.suitStyles3rdChoice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {((event.themePreferences.suitBreasting1stChoice?.length ?? 0) > 0 ||
                (event.themePreferences.suitBreasting2ndChoice?.length ?? 0) > 0 ||
                (event.themePreferences.suitBreasting3rdChoice?.length ?? 0) > 0) && (
                <div className="preference-display">
                  <h4>前釦（スーツ）</h4>
                  <div className="preference-items">
                    {(event.themePreferences.suitBreasting1stChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第1希望:</span>
                        <span className="pattern-tags">{translateSuitBreasting(event.themePreferences.suitBreasting1stChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.suitBreasting2ndChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第2希望:</span>
                        <span className="pattern-tags">{translateSuitBreasting(event.themePreferences.suitBreasting2ndChoice)}</span>
                      </div>
                    )}
                    {(event.themePreferences.suitBreasting3rdChoice?.length ?? 0) > 0 && (
                      <div className="preference-item">
                        <span className="preference-rank">第3希望:</span>
                        <span className="pattern-tags">{translateSuitBreasting(event.themePreferences.suitBreasting3rdChoice)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Participants Section */}
        {!isParticipantOnly && (
        <section className="section">
          <h2>👥 参加者一覧</h2>
          <p className="participant-name-hint">
            オンライン提出では、参加者は招待 URL から自分で登録します。
            上の「サーバーから提出を取り込む」を押すと、参加者一覧も最新の状態に更新されます。
          </p>
          <details className="manual-participant-panel">
            <summary>手入力で参加者名を調整（オフライン・修正用）</summary>
            <p className="participant-name-hint">
              代表者がこのイベントの参加者一覧を補正するときだけ使います。招待 URL で参加する本人の表示名は、参加者側のオンライン提出画面で選択・変更します。
            </p>
            <div className="participant-input">
              <input
                type="text"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                placeholder={getDisplayName() ? `例: ${getDisplayName()} 以外の名前` : '参加者名を入力'}
                maxLength={100}
                onKeyPress={(e) => e.key === 'Enter' && handleAddParticipant()}
              />
              {getDisplayName() && (
                <button
                  type="button"
                  className="name-fill-button"
                  onClick={() => setNewParticipant(getDisplayName())}
                  disabled={newParticipant === getDisplayName()}
                >
                  設定の名前
                </button>
              )}
              <button onClick={handleAddParticipant} className="add-button">
                追加
              </button>
            </div>
          </details>

          <div className="participants-list">
            {event.participants.length === 0 ? (
              <p className="empty-text">参加者がまだ追加されていません</p>
            ) : (
              event.participants.map((participant: string) => (
                <div key={participant} className="participant-card">
                  <div className="participant-info">
                    <h3>{participant}</h3>
                    {event.costumes[participant] && (
                      <p className="assigned-costume">
                        割当: {findCostume(event.costumes[participant])?.name || 'Unknown'}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveParticipant(participant)}
                    className="remove-button"
                  >
                    削除
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
        )}

        {/* Color coordination anchors */}
        {!isParticipantOnly && event.themePreferences && (
          <section className="section">
            <h2>🎯 基準衣装の色（ゲスト・ソリスト等）</h2>
            <p className="participant-name-hint">
              すでに衣装が決まっている出演者の色を基準に、他の参加者の候補選出・組み合わせに反映します。
            </p>
            <ColorCoordinationAnchorsEditor
              anchors={event.themePreferences.colorCoordinationAnchors ?? []}
              onChange={(colorCoordinationAnchors) => {
                setEvent({
                  ...event,
                  themePreferences: {
                    ...event.themePreferences,
                    colorCoordinationAnchors,
                  },
                })
              }}
            />
            <button
              type="button"
              className="action-button"
              disabled={savingColorAnchors}
              onClick={() =>
                void handleSaveColorAnchors(event.themePreferences?.colorCoordinationAnchors)
              }
            >
              {savingColorAnchors ? '保存中…' : '基準色設定を保存'}
            </button>
          </section>
        )}

        {/* System optimization */}
        {!isParticipantOnly && event.participants.length > 0 && costumesForEvent.length > 0 && (
          <section className="section">
            <div className="optimization-header">
              <h2>⚡ システムによる組み合わせ</h2>
              <button onClick={() => void handleOptimize()} className="optimize-button">
                組み合わせを再計算
              </button>
            </div>

            {awaitingAllSubmissions && (
              <div className="server-awaiting-submissions">
                {pendingServerParticipants(serverParticipants).length > 0 ? (
                  <p>
                    写真提出待ち: {' '}
                    <strong>
                      {pendingServerParticipants(serverParticipants)
                        .map((participant) => participant.displayName)
                        .join('、')}
                    </strong>
                  </p>
                ) : (
                  <p>提出状況を最新にするには「サーバーから提出を取り込む」を押してください。</p>
                )}
              </div>
            )}

            {optimizationResults.length > 0 && (
              <>
                <div className="harmony-score">
                  <p>
                    採用案の調和スコア: <strong>{(harmonyScore * 100).toFixed(1)}%</strong>
                    {isConfirmed && <span className="system-decided-badge">システム決定済み</span>}
                  </p>
                </div>

                <p className="system-optimization-lead">
                  テーマ・使用履歴・色味方針から、全員分をまとめて計算し、最適な1着ずつの組み合わせを自動選定しました（先着順ではありません）。
                  調整しやすいように、イベント全体の着用イメージを第3候補まで表示します。
                  ステージ配置: {STAGE_ARRANGEMENT_LABELS[stageArrangementMode]}
                </p>

                <div className="confirmation-actions">
                  <button onClick={handleExportCSV} className="action-button export-button">
                    📊 結果をCSVで出力
                  </button>
                  <button
                    onClick={() => void handleExportClientPdf()}
                    disabled={isExportingPdf}
                    className="action-button export-button client-pdf-button"
                  >
                    {isExportingPdf ? 'PDF作成中…' : '📎 クライアント提出用PDF'}
                  </button>
                </div>

                {isConfirmed && (
                  <div className="confirmation-message">
                    <p>✅ システムが組み合わせを決定し、使用履歴に記録しました。</p>
                  </div>
                )}

                <div className="optimization-results">
                  {displayedOptimizationResults.map((result) => (
                    <div key={result.participantId} className="result-card result-card--selected">
                      <div className="result-header">
                        <h4>{result.participantName}</h4>
                        <span className="score">{(result.score * 100).toFixed(0)}点</span>
                      </div>

                      <div className="result-costume">
                        {result.costume.image && (
                          <img src={result.costume.image} alt={result.costume.name} />
                        )}
                        <div className="costume-details">
                          <h5>{result.costume.name}</h5>
                          <div className="colors">
                            {normalizeCostumeColors(result.costume.colors).map((color) => (
                              <span
                                key={color}
                                className="color-dot"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                          <p className="tone">{result.costume.tone}</p>
                        </div>
                      </div>

                      <div className="reasons">
                        {result.reason.map((r, i) => (
                          <p key={i}>• {r}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {stageImageCandidates.length > 0 && (
                  <div className="stage-image-candidates-panel">
                    <div className="stage-image-candidates-heading">
                      <h3>イベント全体の着用イメージ候補</h3>
                      <button
                        type="button"
                        className="optimize-button stage-reproposal-button"
                        onClick={() => void handleStageReproposal()}
                        disabled={isStageReproposing || isSaving}
                      >
                        {isStageReproposing ? '再提案中…' : 'この配置で衣装を再提案'}
                      </button>
                    </div>
                    {stageImageCandidates.length > 1 && (
                      <div className="stage-candidate-tabs" role="tablist" aria-label="着用イメージ候補">
                        {stageImageCandidates.map((candidate, index) => (
                          <button
                            key={candidate.id}
                            type="button"
                            role="tab"
                            aria-selected={candidate.id === activeStageCandidate?.id}
                            className={candidate.id === activeStageCandidate?.id ? 'active' : ''}
                            onClick={() => setActiveStageCandidateId(candidate.id)}
                          >
                            候補 {index + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="stage-image-candidates-list">
                      {activeStageCandidate && [activeStageCandidate].map((candidate) => (
                        <article
                          key={candidate.id}
                          className={[
                            'stage-image-candidate-card',
                            candidate.selected ? 'stage-image-candidate-card--selected' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          <h4>
                            {candidate.label}
                            <span>調和 {(candidate.harmonyScore * 100).toFixed(1)}%</span>
                          </h4>
                          {!candidate.selected && (
                            <button
                              type="button"
                              className="stage-adopt-button"
                              onClick={() => void handleAdoptStageProposal(candidate)}
                              disabled={isSaving}
                            >
                              この候補へ変更
                            </button>
                          )}
                          <div className="stage-image-axis">
                            <span>下手（左）</span>
                            <span>上手（右）</span>
                          </div>
                          {(() => {
                            const orderedAssignments = orderStageAssignments(candidate.assignments, event.stageParticipantOrder)
                            const rows = splitStageRows(orderedAssignments, stageRowBreakIndices)
                            const rowStarts = rows.map((_, rowIndex) => rows
                              .slice(0, rowIndex)
                              .reduce((total, row) => total + row.length, 0))
                            const renderAssignment = (row: any, absoluteIndex: number) => (
                              <div key={`${candidate.id}-${row.participantId}`} className="stage-image-assignment-with-break">
                                <div className="stage-image-assignment">
                                  {row.costume.image && (
                                    <img src={row.costume.image} alt={row.costume.name} />
                                  )}
                                  <div>
                                    <strong>{row.participantName}</strong>
                                    <span>{row.costume.name}</span>
                                  </div>
                                  {candidate.canEdit && (
                                    <div className="stage-order-controls" aria-label={`${row.participantName}の並び順`}>
                                      <button
                                        type="button"
                                        onClick={() => void handleMoveStageParticipant(row.participantId, -1, candidate.assignments)}
                                        disabled={absoluteIndex === 0}
                                        title="下手（左）へ移動"
                                        aria-label={`${row.participantName}を下手（左）へ移動`}
                                      >←</button>
                                      <button
                                        type="button"
                                        onClick={() => void handleMoveStageParticipant(row.participantId, 1, candidate.assignments)}
                                        disabled={absoluteIndex === orderedAssignments.length - 1}
                                        title="上手（右）へ移動"
                                        aria-label={`${row.participantName}を上手（右）へ移動`}
                                      >→</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )

                            return (
                              <>
                                {rows.map((row, rowIndex) => {
                                  const startIndex = rowStarts[rowIndex]
                                  return (
                                    <div key={`${candidate.id}-row-${rowIndex}`} className="stage-image-row-group">
                                      <div className="stage-image-row-wrap">
                                        <span className="stage-row-label">{rowIndex + 1}列目</span>
                                        <div className="stage-image-assignment-grid">
                                          {row.map((assignment, index) => renderAssignment(assignment, startIndex + index))}
                                        </div>
                                      </div>
                                      {rowIndex > 0 && (
                                        <div className="stage-row-divider">
                                          <span className="stage-row-divider-line" aria-hidden="true" />
                                          {candidate.canEdit ? (
                                            <div className="stage-row-divider-controls" aria-label={`${rowIndex}列目と${rowIndex + 1}列目の区切り`}>
                                              <button
                                                type="button"
                                                onClick={() => void handleMoveStageRowBreak(startIndex, 1, orderedAssignments.length)}
                                                disabled={startIndex >= orderedAssignments.length - 1 || stageRowBreakIndices.includes(startIndex + 1)}
                                                title="区切り線を上へ移動"
                                                aria-label="区切り線を上へ移動"
                                              >↑</button>
                                              <span>列の区切り</span>
                                              <button
                                                type="button"
                                                onClick={() => void handleMoveStageRowBreak(startIndex, -1, orderedAssignments.length)}
                                                disabled={startIndex <= 1 || stageRowBreakIndices.includes(startIndex - 1)}
                                                title="区切り線を下へ移動"
                                                aria-label="区切り線を下へ移動"
                                              >↓</button>
                                              <button
                                                type="button"
                                                className="stage-row-divider-remove"
                                                onClick={() => void handleStageRowBreak(startIndex, orderedAssignments.length)}
                                                title="区切り線を削除"
                                                aria-label="区切り線を削除"
                                              >×</button>
                                            </div>
                                          ) : (
                                            <span className="stage-row-divider-label">列の区切り</span>
                                          )}
                                          <span className="stage-row-divider-line" aria-hidden="true" />
                                        </div>
                                      )}
                                    </div>
                                  )
                                }).reverse()}
                                {candidate.canEdit && findStageBreakToAdd(stageRowBreakIndices, orderedAssignments.length) !== null && (
                                  <button
                                    type="button"
                                    className="stage-add-divider-button"
                                    onClick={() => void handleAddStageRowBreak(orderedAssignments.length)}
                                  >
                                    ＋ 列の区切りを追加
                                  </button>
                                )}
                              </>
                            )
                          })()}
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {inviteModal && (
        <InviteUrlModal
          inviteUrl={inviteModal.url}
          eventName={event.name}
          eventId={event.id}
          adminToken={inviteModal.adminToken ?? getEventSession(event.id)?.adminToken}
          hostParticipateUrl={inviteModal.hostParticipateUrl}
          variant={inviteModal.variant}
          onClose={() => setInviteModal(null)}
        />
      )}
    </div>
  )
}
