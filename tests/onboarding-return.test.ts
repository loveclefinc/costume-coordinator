import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ONBOARDING_OAUTH_FLAG,
  ONBOARDING_RETURN_KEY,
  completeOnboarding,
  consumeOnboardingReturnPath,
  markOnboardingOAuthPending,
  rememberOnboardingReturnPath,
  sanitizeOnboardingReturnPath,
} from '../src/utils/onboarding'

const localStore = new Map<string, string>()
const sessionStore = new Map<string, string>()

describe('onboarding invite return path', () => {
  beforeEach(() => {
    localStore.clear()
    sessionStore.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        localStore.set(key, value)
      },
      removeItem: (key: string) => {
        localStore.delete(key)
      },
      clear: () => localStore.clear(),
    })
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        sessionStore.set(key, value)
      },
      removeItem: (key: string) => {
        sessionStore.delete(key)
      },
      clear: () => sessionStore.clear(),
    })
  })

  it('returns home when welcome is opened without an invite', () => {
    expect(consumeOnboardingReturnPath()).toBe('/')
  })

  it('restores the invite join URL after onboarding', () => {
    rememberOnboardingReturnPath('/join?e=evt_abc&t=tok_123')
    expect(consumeOnboardingReturnPath()).toBe('/join?e=evt_abc&t=tok_123')
  })

  it('keeps e and t query values', () => {
    rememberOnboardingReturnPath('/join?t=invite-token&e=event-id&utm=drop')
    expect(consumeOnboardingReturnPath()).toBe('/join?e=event-id&t=invite-token')
  })

  it('rejects external and protocol-relative return targets', () => {
    expect(sanitizeOnboardingReturnPath('https://evil.example/join?e=a&t=b')).toBeNull()
    expect(sanitizeOnboardingReturnPath('//evil.example')).toBeNull()
    expect(sanitizeOnboardingReturnPath('//evil.example/join?e=a&t=b')).toBeNull()
    expect(sanitizeOnboardingReturnPath('/\\evil.example')).toBeNull()
    expect(sanitizeOnboardingReturnPath('/events/evt_abc/participate?t=tok')).toBeNull()
    expect(sanitizeOnboardingReturnPath('/join')).toBeNull()
    rememberOnboardingReturnPath('https://evil.example/phish')
    expect(consumeOnboardingReturnPath()).toBe('/')
  })

  it('keeps the return path when OAuth onboarding starts', () => {
    rememberOnboardingReturnPath('/join?e=evt_abc&t=tok_123')
    markOnboardingOAuthPending()
    expect(sessionStore.get(ONBOARDING_OAUTH_FLAG)).toBe('1')
    expect(sessionStore.get(ONBOARDING_RETURN_KEY)).toBe('/join?e=evt_abc&t=tok_123')
  })

  it('clears return information after a successful finish', () => {
    rememberOnboardingReturnPath('/join?e=evt_abc&t=tok_123')
    completeOnboarding()
    const next = consumeOnboardingReturnPath()
    expect(next).toBe('/join?e=evt_abc&t=tok_123')
    expect(sessionStore.get(ONBOARDING_RETURN_KEY)).toBeUndefined()
    expect(sessionStore.get(ONBOARDING_OAUTH_FLAG)).toBeUndefined()
    expect(consumeOnboardingReturnPath()).toBe('/')
  })
})
