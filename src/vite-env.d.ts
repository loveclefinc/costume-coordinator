/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_DROPBOX_CLIENT_ID: string
  /** Google Search Console の HTML タグ確認用（任意） */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  /** Cloudflare Event API（例: https://costume-coordinator-events.xxx.workers.dev） */
  readonly VITE_EVENT_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface GoogleApiClient {
  load(name: string, callback: () => void): void
  client: {
    init(config: {
      apiKey: string
      discoveryDocs: string[]
    }): Promise<void>
    drive: {
      files: {
        list(params: Record<string, unknown>): Promise<{
          result: {
            files?: Array<Record<string, unknown>>
          }
        }>
      }
    }
  }
}

interface Window {
  gapi: GoogleApiClient
}
