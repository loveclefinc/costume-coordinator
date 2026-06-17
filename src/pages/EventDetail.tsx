import { useState, useEffect, useCallback } from 'react'
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useCostumes } from '../hooks/useCostumes'
import { storage, type Costume } from '../utils/storage'
import { normalizeCostumeList } from '../utils/costume-normalize'
import { findCostumeById, resolveEventCostumeCatalog } from '../utils/costume-scope'
import {
  runSystemOptimization,
  type SystemOptimizationAlternative,
} from '../utils/system-optimizer'
import { recordCostumeUsage, recordSingleCostumeUsage } from '../utils/usage-tracker'
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
import type { StageArrangementMode } from '../../shared/event-api-types'
import UsageGuideTip from '../components/UsageGuideTip'
import ColorCoordinationAnchorsEditor from '../components/ColorCoordinationAnchorsEditor'
import { useAppUi } from '../contexts/AppUiContext'
import { getDisplayName } from '../utils/user-profile'
import {
  DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
  getRecentUsageExcludeDays,
} from '../utils/app-settings'
import { arrangeAssignmentsForStage } from '../utils/assignment-display-order'
import { SILHOUETTE_LABELS } from '../utils/silhouette'
import { SUIT_BREASTING_LABELS, SUIT_STYLE_LABELS } from '../utils/suit-attributes'
import './EventDetail.css'

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

const splitStageRows = <T,>(items: T[], breakIndex?: number): T[][] => {
  if (!breakIndex || breakIndex <= 0 || breakIndex >= items.length) return [items]
  return [items.slice(0, breakIndex), items.slice(breakIndex)]
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
  const [manualUsageParticipant, setManualUsageParticipant] = useState('')
  const [manualUsageCostumeId, setManualUsageCostumeId] = useState('')
  const [eventUsageHistory, setEventUsageHistory] = useState<Awaited<ReturnType<typeof storage.getAllUsageHistory>>>([])
  const [savingColorAnchors, setSavingColorAnchors] = useState(false)
  const [recordingUsage, setRecordingUsage] = useState(false)
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
    if (!id) return
    let cancelled = false
    void storage.init().then(async () => {
      const all = await storage.getAllUsageHistory()
      if (!cancelled) {
        setEventUsageHistory(all.filter((entry) => entry.eventId === id))
      }
    })
    return () => {
      cancelled = true
    }
  }, [id, isConfirmed])

  useEffect(() => {
    if (event?.participants?.length && !manualUsageParticipant) {
      setManualUsageParticipant(event.participants[0])
    }
  }, [event?.participants, manualUsageParticipant])

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

  const handleStageRowBreak = async (breakIndex: number) => {
    if (!event) return
    const nextBreak = event.stageRowBreakIndex === breakIndex ? undefined : breakIndex
    try {
      const updated = await updateEvent(event.id, { stageRowBreakIndex: nextBreak })
      setEvent(updated)
      toast(nextBreak ? '2列目の開始位置を保存しました' : '2列目の区切りを解除しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステージ配置の保存に失敗しました')
    }
  }

  const handleRecordManualUsage = async () => {
    if (!event || !manualUsageParticipant.trim() || !manualUsageCostumeId) return
    setRecordingUsage(true)
    setError('')
    try {
      await storage.init()
      await recordSingleCostumeUsage(
        event.id,
        manualUsageParticipant.trim(),
        manualUsageCostumeId,
      )
      const all = await storage.getAllUsageHistory()
      setEventUsageHistory(all.filter((entry) => entry.eventId === event.id))
      const costumeName = findCostume(manualUsageCostumeId)?.name ?? '衣装'
      toast(`${manualUsageParticipant} さんの「${costumeName}」を使用履歴に記録しました`, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '使用履歴の記録に失敗しました')
    } finally {
      setRecordingUsage(false)
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
    options?: { autoPersist?: boolean },
  ) => {
    if (!eventSnapshot) return null

    await storage.init()
    const recentUsageExcludeDays = getRecentUsageExcludeDays()
    const usageHistory = await storage.getRecentUsageHistory(
      recentUsageExcludeDays > 0 ? recentUsageExcludeDays : DEFAULT_RECENT_USAGE_EXCLUDE_DAYS,
    )
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
    })

    setOptimizationResults(outcome.selected)
    setAlternativeProposals(outcome.alternatives)
    setHarmonyScore(outcome.harmonyScore)
    setAwaitingAllSubmissions(false)

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

      const submittedCount = snapshot.participants.filter((p) => p.submittedAt != null).length
      const totalCount = snapshot.participants.length
      const allSubmitted = totalCount > 0 && submittedCount === totalCount

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
  const stageImageCandidates = [
    {
      id: 'selected',
      label: '候補 1（採用案）',
      harmonyScore,
      assignments: displayedOptimizationResults,
      selected: true,
    },
    ...displayedAlternativeProposals.map((proposal, index) => ({
      id: proposal.id,
      label: `候補 ${index + 2}`,
      harmonyScore: proposal.harmonyScore,
      assignments: proposal.assignments,
      selected: false,
    })),
  ].slice(0, 3)
  const stageRowBreakIndex =
    typeof event.stageRowBreakIndex === 'number' &&
    event.stageRowBreakIndex > 0 &&
    event.stageRowBreakIndex < displayedOptimizationResults.length
      ? event.stageRowBreakIndex
      : undefined

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
          <p>
            PDFを書き出さなくても、この画面で参加者ごとの衣装を確認できます。
            ステージ配置: {STAGE_ARRANGEMENT_LABELS[stageArrangementMode]}
          </p>
          <div className="confirmed-assignments-grid">
            {displayAssignments.map((assignment) => (
              <article key={assignment.participantName} className="confirmed-assignment-card">
                {assignment.costumeImage ? (
                  <img src={assignment.costumeImage} alt={assignment.costumeName} />
                ) : (
                  <div className="confirmed-assignment-placeholder">写真なし</div>
                )}
                <div>
                  <strong>{assignment.participantName}</strong>
                  <span>{assignment.costumeName}</span>
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
              候補衣装の提出は完了しています。全員の提出が揃うと代表者が取り込み、組み合わせが決定されます。
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
        </section>
      )}

      {showHostHub && (
        <section className="section server-primary-card" aria-labelledby="server-primary-heading">
          <h2 id="server-primary-heading">代表者の操作</h2>
          <p className="server-primary-lead">
            参加者に招待 URL を送り、全員提出後に取り込むとシステムが組み合わせを自動決定します。
          </p>
          <UsageGuideTip title="ℹ️ 代表者・参加者の手順">
            <ol>
              <li>招待 URL をコピーして参加者へ送付</li>
              <li>代表者は「写真提出」または下のボタンから衣装写真をアップロード</li>
              <li>全員提出後「サーバーから提出を取り込む」→ システムが自動で最適な組み合わせを決定（参考案も表示）</li>
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
                {serverPulling ? '取り込み中…' : 'サーバーから提出を取り込む'}
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
            オンライン提出では、参加者は招待 URL から自分で登録します。ここでは現在このイベントに入っている参加者を確認できます。
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

        {/* Manual usage history */}
        <section className="section">
          <h2>📅 使用履歴の手動登録</h2>
          <p className="participant-name-hint">
            組み合わせ自動決定を使わないイベントや、実際に着用した衣装を後から記録する場合に使います。
            候補衣装として提出されただけでは使用済み扱いにしません。正式に組み合わせが決まった時点、またはここで手動記録した時点で使用履歴に入り、設定の「直近使用除外日数」以内は次回候補から除外されます。
          </p>
          <div className="manual-usage-form">
            <label>
              参加者
              <select
                value={manualUsageParticipant}
                onChange={(e) => setManualUsageParticipant(e.target.value)}
              >
                {(event.participants.length > 0 ? event.participants : [getDisplayName() || '自分'])
                  .filter(Boolean)
                  .map((name: string) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              着用した衣装
              <select
                value={manualUsageCostumeId}
                onChange={(e) => setManualUsageCostumeId(e.target.value)}
              >
                <option value="">選択してください</option>
                {personalCostumes.map((costume) => (
                  <option key={costume.id} value={costume.id}>
                    {costume.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="action-button"
              disabled={recordingUsage || !manualUsageCostumeId || !manualUsageParticipant.trim()}
              onClick={() => void handleRecordManualUsage()}
            >
              {recordingUsage ? '記録中…' : '使用履歴に記録'}
            </button>
          </div>
          {eventUsageHistory.length > 0 && (
            <ul className="manual-usage-list">
              {eventUsageHistory
                .slice()
                .sort((a, b) => b.usedAt - a.usedAt)
                .map((entry) => {
                  const costumeName =
                    findCostume(entry.costumeId)?.name ?? entry.costumeId
                  return (
                    <li key={entry.id}>
                      {new Date(entry.usedAt).toLocaleString('ja-JP')} — {entry.participantName}: {costumeName}
                    </li>
                  )
                })}
            </ul>
          )}
        </section>

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
              <p className="server-awaiting-submissions">
                まだ提出待ちの参加者がいます。全員提出後に取り込むと、システムが自動で組み合わせを決定します。
              </p>
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

                {stageImageCandidates.length > 1 && (
                  <div className="stage-image-candidates-panel">
                    <h3>イベント全体の着用イメージ候補</h3>
                    <p>
                      1人ずつの予備ではなく、全員分を組み合わせた全体案です。
                      候補 1 は現在の採用案、候補 2・3 は色味や配置の調整用です。
                      表示は客席から見て下手（左）から上手（右）の順です。
                    </p>
                    <div className="stage-image-candidates-list">
                      {stageImageCandidates.map((candidate) => (
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
                          <div className="stage-image-axis">
                            <span>下手（左）</span>
                            <span>上手（右）</span>
                          </div>
                          {(() => {
                            const [frontRow, backRow = []] = splitStageRows(candidate.assignments, stageRowBreakIndex)
                            const renderAssignment = (row: any, absoluteIndex: number, canPlaceBreak: boolean) => (
                              <div key={`${candidate.id}-${row.participantId}`} className="stage-image-assignment-with-break">
                                <div className="stage-image-assignment">
                                  {row.costume.image && (
                                    <img src={row.costume.image} alt={row.costume.name} />
                                  )}
                                  <div>
                                    <strong>{row.participantName}</strong>
                                    <span>{row.costume.name}</span>
                                  </div>
                                </div>
                                {canPlaceBreak && (
                                  <button
                                    type="button"
                                    className={[
                                      'stage-break-button',
                                      stageRowBreakIndex === absoluteIndex + 1 ? 'stage-break-button--active' : '',
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => void handleStageRowBreak(absoluteIndex + 1)}
                                  >
                                    区切り
                                  </button>
                                )}
                              </div>
                            )

                            return (
                              <>
                                {backRow.length > 0 && (
                                  <div className="stage-image-row-wrap stage-image-row-wrap--back">
                                    <span className="stage-row-label">2列目</span>
                                    <div className="stage-image-assignment-grid">
                                      {backRow.map((row, index) => renderAssignment(row, (stageRowBreakIndex ?? 0) + index, false))}
                                    </div>
                                  </div>
                                )}
                                {backRow.length > 0 && (
                                  <div className="stage-row-divider">
                                    <span>区切り</span>
                                  </div>
                                )}
                                <div className="stage-image-row-wrap stage-image-row-wrap--front">
                                  <span className="stage-row-label">1列目</span>
                                  <div className="stage-image-assignment-grid">
                                    {frontRow.map((row, index) => renderAssignment(
                                      row,
                                      index,
                                      candidate.selected && index < candidate.assignments.length - 1,
                                    ))}
                                  </div>
                                </div>
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
