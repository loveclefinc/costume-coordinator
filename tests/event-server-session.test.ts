import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getEventSession,
  hasEventAdminAccess,
  hasEventParticipantAccess,
  isParticipantOnlySession,
  setEventSession,
  clearEventSession,
} from '../src/event-server/session'

function mockLocalStorage() {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
  vi.stubGlobal('localStorage', localStorageMock)
}

describe('event server session access', () => {
  beforeEach(() => {
    mockLocalStorage()
    clearEventSession('evt_test')
  })

  it('detects host session with admin token', () => {
    setEventSession('evt_test', {
      adminToken: 'admin-secret',
      inviteToken: 'invite',
      participantToken: 'participant',
    })
    expect(hasEventAdminAccess('evt_test')).toBe(true)
    expect(isParticipantOnlySession('evt_test')).toBe(false)
  })

  it('detects participant-only session without admin token', () => {
    setEventSession('evt_test', {
      inviteToken: 'invite',
      participantToken: 'participant',
      displayName: '太郎',
    })
    expect(hasEventParticipantAccess('evt_test')).toBe(true)
    expect(hasEventAdminAccess('evt_test')).toBe(false)
    expect(isParticipantOnlySession('evt_test')).toBe(true)
  })

  it('returns false when session is missing', () => {
    expect(getEventSession('evt_missing')).toBeUndefined()
    expect(hasEventAdminAccess('evt_missing')).toBe(false)
    expect(hasEventParticipantAccess('evt_missing')).toBe(false)
    expect(isParticipantOnlySession('evt_missing')).toBe(false)
  })
})
