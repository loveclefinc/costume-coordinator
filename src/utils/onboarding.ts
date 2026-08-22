const ONBOARDING_KEY = 'costume_coordinator_onboarding_v1'
export const ONBOARDING_OAUTH_FLAG = 'onboarding_oauth_pending'
export const ONBOARDING_RETURN_KEY = 'onboarding_return_path'

const RETURN_ORIGIN = 'https://costume-coordinator.invalid'

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'done'
}

export function completeOnboarding(): void {
  localStorage.setItem(ONBOARDING_KEY, 'done')
  sessionStorage.removeItem(ONBOARDING_OAUTH_FLAG)
}

export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY)
}

export function markOnboardingOAuthPending(): void {
  sessionStorage.setItem(ONBOARDING_OAUTH_FLAG, '1')
}

export function isOnboardingOAuthPending(): boolean {
  return sessionStorage.getItem(ONBOARDING_OAUTH_FLAG) === '1'
}

/** Allowlisted invite path only: `/join?e=...&t=...`. */
export function sanitizeOnboardingReturnPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return null
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null
  if (trimmed.includes('://') || trimmed.includes('\\')) return null

  let parsed: URL
  try {
    parsed = new URL(trimmed, RETURN_ORIGIN)
  } catch {
    return null
  }

  if (parsed.origin !== RETURN_ORIGIN) return null
  if (parsed.username || parsed.password) return null
  if (parsed.pathname !== '/join') return null

  const eventId = parsed.searchParams.get('e')
  const inviteToken = parsed.searchParams.get('t')
  if (!eventId || !inviteToken) return null
  if (!isSafeQueryValue(eventId) || !isSafeQueryValue(inviteToken)) return null

  return `/join?e=${encodeURIComponent(eventId)}&t=${encodeURIComponent(inviteToken)}`
}

function isSafeQueryValue(value: string): boolean {
  if (!value || value.length > 200) return false
  if (/[\r\n]/.test(value)) return false
  if (value.includes('/') || value.includes('\\')) return false
  return true
}

export function rememberOnboardingReturnPath(pathWithSearch: string): void {
  const safe = sanitizeOnboardingReturnPath(pathWithSearch)
  if (!safe) return
  sessionStorage.setItem(ONBOARDING_RETURN_KEY, safe)
}

export function peekOnboardingReturnPath(): string | null {
  return sanitizeOnboardingReturnPath(sessionStorage.getItem(ONBOARDING_RETURN_KEY))
}

export function consumeOnboardingReturnPath(): string {
  const safe = peekOnboardingReturnPath()
  sessionStorage.removeItem(ONBOARDING_RETURN_KEY)
  return safe ?? '/'
}
