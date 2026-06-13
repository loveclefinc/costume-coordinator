export type ParticipateSubmitPhase = 'idle' | 'picking' | 'submitting' | 'done' | 'error'

/** 自動提出を開始してよいか（error 時の無限再試行を防ぐ） */
export function shouldStartAutoSubmit(params: {
  joined: boolean
  participantToken?: string
  wardrobeReady: boolean
  submitPhase: ParticipateSubmitPhase
  autoSubmitStarted: boolean
}): boolean {
  if (!params.joined || !params.participantToken || !params.wardrobeReady) return false
  if (params.submitPhase === 'done' || params.submitPhase === 'error') return false
  if (params.autoSubmitStarted) return false
  return true
}

/** loadPublic が進行中の提出フェーズを上書きしない */
export function resolveSubmitPhaseAfterStatusCheck(
  currentPhase: ParticipateSubmitPhase,
  serverSubmitted: boolean,
): ParticipateSubmitPhase {
  if (serverSubmitted) return 'done'
  if (currentPhase === 'picking' || currentPhase === 'submitting') return currentPhase
  return currentPhase === 'done' ? 'done' : currentPhase
}
