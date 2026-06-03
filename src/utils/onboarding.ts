const ONBOARDING_KEY = 'costume_coordinator_onboarding_v1'
export const ONBOARDING_OAUTH_FLAG = 'onboarding_oauth_pending'

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
