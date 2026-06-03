/**
 * OAuth 2.0 PKCE helpers (RFC 7636)
 */

const VERIFIER_LENGTH = 64

function randomString(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('').slice(0, length)
}

export interface PkcePair {
  codeVerifier: string
  codeChallenge: string
}

export async function generatePkcePair(): Promise<PkcePair> {
  const codeVerifier = randomString(VERIFIER_LENGTH)
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  )
  const codeChallenge = base64UrlEncode(new Uint8Array(digest))
  return { codeVerifier, codeChallenge }
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) {
    binary += String.fromCharCode(b)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateOAuthState(): string {
  return randomString(32)
}

const PKCE_VERIFIER_KEY = 'oauth_pkce_verifier'
const PKCE_STATE_KEY = 'oauth_pkce_state'
const PKCE_PROVIDER_KEY = 'oauth_pkce_provider'

export function storePkceSession(
  provider: string,
  codeVerifier: string,
  state: string,
): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(PKCE_STATE_KEY, state)
  sessionStorage.setItem(PKCE_PROVIDER_KEY, provider)
}

export function consumePkceSession(expectedProvider: string): {
  codeVerifier: string
  state: string
} | null {
  const provider = sessionStorage.getItem(PKCE_PROVIDER_KEY)
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  const state = sessionStorage.getItem(PKCE_STATE_KEY)
  clearPkceSession()
  if (!provider || !codeVerifier || !state || provider !== expectedProvider) {
    return null
  }
  return { codeVerifier, state }
}

export function clearPkceSession(): void {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_STATE_KEY)
  sessionStorage.removeItem(PKCE_PROVIDER_KEY)
}
