const base = (process.env.EVENT_API_TEST_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')

async function request(path, options = {}) {
  return fetch(`${base}${path}`, options)
}

async function jsonRequest(path, options = {}) {
  const response = await request(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const body = await response.json().catch(() => ({}))
  return { response, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function expectRejected(status, label) {
  assert([401, 403, 404].includes(status), `${label}: expected rejection, got ${status}`)
}

async function createEvent(suffix) {
  const { response, body } = await jsonRequest('/api/events', {
    method: 'POST',
    body: JSON.stringify({
      name: `isolation-${suffix}`,
      date: '2026-06-30',
      retentionDays: 7,
      hostDisplayName: `host-${suffix}`,
    }),
  })
  assert(response.status === 201, `create event ${suffix}: ${response.status}`)
  return body
}

async function createCostume(event, suffix) {
  const { response, body } = await jsonRequest(`/api/events/${event.eventId}/costumes`, {
    method: 'POST',
    headers: { 'X-Participant-Token': event.hostParticipant.participantToken },
    body: JSON.stringify({
      sourceCostumeId: `local-${suffix}`,
      name: `private-costume-${suffix}`,
      colors: ['blue'],
      tone: 'neutral',
      pattern: 'plain',
    }),
  })
  assert(response.status === 201, `create costume ${suffix}: ${response.status}`)
  return body.costumeId
}

async function joinEvent(event, displayName) {
  const { response, body } = await jsonRequest(
    `/api/events/${event.eventId}/join?invite=${encodeURIComponent(event.inviteToken)}`,
    {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    },
  )
  assert(response.status === 201, `join event: ${response.status}`)
  return body
}

async function deleteEvent(event) {
  await request(`/api/events/${event.eventId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': event.adminToken },
  })
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
const eventA = await createEvent(`${suffix}-a`)
const eventB = await createEvent(`${suffix}-b`)

try {
  const costumeA = await createCostume(eventA, 'a')
  const costumeB = await createCostume(eventB, 'b')
  const eventBMember = await joinEvent(eventB, `member-${suffix}-b`)

  const photoUpload = await request(`/api/events/${eventB.eventId}/costumes/${costumeB}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      'X-Participant-Token': eventB.hostParticipant.participantToken,
    },
    body: new Uint8Array([137, 80, 78, 71]),
  })
  assert(photoUpload.status === 201, `upload event B photo: ${photoUpload.status}`)
  const { photoId } = await photoUpload.json()

  const snapshotA = await jsonRequest(`/api/events/${eventA.eventId}/snapshot`, {
    headers: { 'X-Admin-Token': eventA.adminToken },
  })
  assert(snapshotA.response.status === 200, 'event A snapshot must be readable by admin A')
  assert(snapshotA.body.costumes.every((costume) => costume.participantId === eventA.hostParticipant.participantId), 'snapshot A contains another event participant')
  assert(snapshotA.body.costumes.every((costume) => costume.name !== 'private-costume-b'), 'snapshot A contains event B costume')

  const snapshotBWithAdminA = await request(`/api/events/${eventB.eventId}/snapshot`, {
    headers: { 'X-Admin-Token': eventA.adminToken },
  })
  expectRejected(snapshotBWithAdminA.status, 'admin A -> snapshot B')

  const snapshotB = await jsonRequest(`/api/events/${eventB.eventId}/snapshot`, {
    headers: { 'X-Admin-Token': eventB.adminToken },
  })
  assert(snapshotB.response.status === 200, 'event B snapshot must be readable by admin B')
  const adminPhotoUrl = snapshotB.body.costumes
    .flatMap((costume) => costume.photos)
    .find((photo) => photo.id === photoId)?.viewUrl
  assert(adminPhotoUrl, 'admin B snapshot did not include its photo URL')
  assert(!adminPhotoUrl.includes(eventB.adminToken), 'photo URL leaked the event admin token')
  assert(!adminPhotoUrl.includes(eventB.inviteToken), 'photo URL leaked the event invite token')
  const mediaBWithPhotoKey = await fetch(adminPhotoUrl)
  assert(mediaBWithPhotoKey.status === 200, `photo-specific media key failed: ${mediaBWithPhotoKey.status}`)

  const statusBWithParticipantA = await request(`/api/events/${eventB.eventId}/participant/status`, {
    headers: { 'X-Participant-Token': eventA.hostParticipant.participantToken },
  })
  expectRejected(statusBWithParticipantA.status, 'participant A -> status B')

  const uploadBWithParticipantA = await request(`/api/events/${eventB.eventId}/costumes/${costumeB}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'image/png',
      'X-Participant-Token': eventA.hostParticipant.participantToken,
    },
    body: new Uint8Array([137, 80, 78, 71]),
  })
  expectRejected(uploadBWithParticipantA.status, 'participant A -> upload B')

  const publicBWithInviteA = await request(`/api/events/${eventB.eventId}?invite=${encodeURIComponent(eventA.inviteToken)}`)
  expectRejected(publicBWithInviteA.status, 'invite A -> event B')

  const mediaBWithInviteA = await request(`/api/media/${photoId}?invite=${encodeURIComponent(eventA.inviteToken)}`)
  expectRejected(mediaBWithInviteA.status, 'invite A -> media B')

  const mediaBWithParticipantA = await request(`/api/media/${photoId}?participant=${encodeURIComponent(eventA.hostParticipant.participantToken)}`)
  expectRejected(mediaBWithParticipantA.status, 'participant A -> media B')

  const mediaBWithOwner = await request(`/api/media/${photoId}?participant=${encodeURIComponent(eventB.hostParticipant.participantToken)}`)
  assert(mediaBWithOwner.status === 200, `photo owner B cannot read own photo: ${mediaBWithOwner.status}`)

  const mediaBWithEventMember = await request(`/api/media/${photoId}?participant=${encodeURIComponent(eventBMember.participantToken)}`)
  assert(mediaBWithEventMember.status === 200, `event B member cannot read event B photo: ${mediaBWithEventMember.status}`)

  const deleteBWithAdminA = await request(`/api/events/${eventB.eventId}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': eventA.adminToken },
  })
  expectRejected(deleteBWithAdminA.status, 'admin A -> delete B')

  assert(costumeA !== costumeB, 'costume ids collided across events')
  console.log('Event isolation verification passed')
} finally {
  await Promise.allSettled([deleteEvent(eventA), deleteEvent(eventB)])
}
