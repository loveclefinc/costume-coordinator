function withInviteToken(path: string, inviteToken?: string): string {
  const token = inviteToken?.trim()
  return token ? `${path}?t=${encodeURIComponent(token)}` : path
}

export function buildParticipantCostumeAddPath(
  eventId: string,
  inviteToken?: string,
): string {
  const path = `/events/${encodeURIComponent(eventId)}/participate/costumes/add`
  return withInviteToken(path, inviteToken)
}

export function buildParticipantReturnPath(
  eventId: string,
  inviteToken?: string,
): string {
  const path = `/events/${encodeURIComponent(eventId)}/participate`
  return withInviteToken(path, inviteToken)
}
