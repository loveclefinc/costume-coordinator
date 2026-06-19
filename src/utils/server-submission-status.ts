import type { ServerParticipant } from '../../shared/event-api-types'

export function hasStartedSubmission(participant: ServerParticipant): boolean {
  return participant.costumeCount > 0
}

export function hasCompletedSubmission(participant: ServerParticipant): boolean {
  if (!hasStartedSubmission(participant)) return false
  if (participant.photoCount != null) {
    return participant.photoCount >= participant.costumeCount
  }
  return participant.submittedAt != null
}

export function activeServerParticipants(participants: ServerParticipant[]): ServerParticipant[] {
  return participants.filter(hasStartedSubmission)
}

export function pendingServerParticipants(participants: ServerParticipant[]): ServerParticipant[] {
  return activeServerParticipants(participants).filter((participant) => !hasCompletedSubmission(participant))
}

export function areActiveSubmissionsComplete(participants: ServerParticipant[]): boolean {
  const active = activeServerParticipants(participants)
  return active.length > 0 && active.every(hasCompletedSubmission)
}
