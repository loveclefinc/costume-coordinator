import type { CloudProvider, TokenPair } from '../types'
import { SyncError } from '../types'
import {
  generatePkcePair,
  generateOAuthState,
  storePkceSession,
} from './pkce'
import { APP_PUBLIC_ORIGIN, resolveAppPath } from '../../constants/app-brand'

export function getRedirectUri(provider: CloudProvider): string {
  const path =
    provider === 'google-drive'
      ? '/oauth/google/callback'
      : '/oauth/dropbox/callback'
  return `${window.location.origin}${resolveAppPath(path)}`
}

/** OAuth コンソールに登録する値（設定画面表示用） */
export function getOAuthSetupInfo() {
  const origin = typeof window !== 'undefined' ? window.location.origin : APP_PUBLIC_ORIGIN
  return {
    javascriptOrigin: origin,
    googleRedirectUri: `${origin}${resolveAppPath('/oauth/google/callback')}`,
    dropboxRedirectUri: `${origin}${resolveAppPath('/oauth/dropbox/callback')}`,
    googleClientConfigured: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
    dropboxClientConfigured: Boolean(import.meta.env.VITE_DROPBOX_CLIENT_ID),
  }
}

function getGoogleClientId(): string {
  const id = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!id) throw new SyncError('Google Client ID が未設定です', 'CONFIG_MISSING')
  return id
}

function getDropboxClientId(): string {
  const id = import.meta.env.VITE_DROPBOX_CLIENT_ID
  if (!id) throw new SyncError('Dropbox Client ID が未設定です', 'CONFIG_MISSING')
  return id
}

export async function startGoogleOAuth(): Promise<void> {
  const { codeVerifier, codeChallenge } = await generatePkcePair()
  const state = generateOAuthState()
  storePkceSession('google-drive', codeVerifier, state)

  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getRedirectUri('google-drive'),
    response_type: 'code',
    // drive.file のみ（同意画面に未追加のスコープがあると invalid になる）
    scope: 'https://www.googleapis.com/auth/drive.file',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function startDropboxOAuth(): Promise<void> {
  const { codeVerifier, codeChallenge } = await generatePkcePair()
  const state = generateOAuthState()
  storePkceSession('dropbox', codeVerifier, state)

  const params = new URLSearchParams({
    client_id: getDropboxClientId(),
    redirect_uri: getRedirectUri('dropbox'),
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline',
  })

  window.location.href = `https://www.dropbox.com/oauth2/authorize?${params}`
}

export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<TokenPair & { accountLabel: string }> {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri('google-drive'),
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw await tokenError(res, 'AUTH_EXPIRED')
  }

  const data = await res.json()
  const accountLabel = await fetchGoogleAccountLabel(data.access_token)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    accountLabel,
  }
}

export async function refreshGoogleToken(refreshToken: string): Promise<TokenPair> {
  const body = new URLSearchParams({
    client_id: getGoogleClientId(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw await tokenError(res, 'AUTH_EXPIRED')
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }
}

export async function exchangeDropboxCode(
  code: string,
  codeVerifier: string,
): Promise<TokenPair & { accountLabel: string }> {
  const body = new URLSearchParams({
    client_id: getDropboxClientId(),
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri('dropbox'),
  })

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw await tokenError(res, 'AUTH_EXPIRED')
  }

  const data = await res.json()
  const accountLabel = await fetchDropboxAccountLabel(data.access_token)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 14400) * 1000,
    accountLabel,
  }
}

export async function refreshDropboxToken(refreshToken: string): Promise<TokenPair> {
  const body = new URLSearchParams({
    client_id: getDropboxClientId(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    throw await tokenError(res, 'AUTH_EXPIRED')
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in ?? 14400) * 1000,
  }
}

async function fetchGoogleAccountLabel(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) {
      const u = await res.json()
      return u.email ?? 'Google Drive'
    }
  } catch {
    /* ignore */
  }
  return 'Google Drive'
}

async function fetchDropboxAccountLabel(accessToken: string): Promise<string> {
  try {
    const res = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: 'null',
    })
    if (res.ok) {
      const u = await res.json()
      return u.email ?? u.name?.display_name ?? 'Dropbox'
    }
  } catch {
    /* ignore */
  }
  return 'Dropbox'
}

async function tokenError(res: Response, code: 'AUTH_EXPIRED' | 'RATE_LIMITED'): Promise<SyncError> {
  if (res.status === 429) {
    return new SyncError('API 制限に達しました。しばらく待って再試行してください。', 'RATE_LIMITED')
  }
  let detail = res.statusText
  try {
    const j = await res.json()
    detail = j.error_description ?? j.error?.message ?? j.error ?? detail
  } catch {
    /* ignore */
  }
  return new SyncError(`認証に失敗しました: ${detail}`, code)
}

export function assertOnline(): void {
  if (!navigator.onLine) {
    throw new SyncError('オフラインです。ネットワーク接続を確認してください。', 'NETWORK_OFFLINE')
  }
}
