/**
 * @deprecated Use src/cloud/sync/sync-service.ts (PKCE, IndexedDB tokens) instead.
 */
import { Event, Costume } from '../utils/storage'

export type BackupProvider = 'dropbox' | 'google-drive'

export interface BackupConfig {
  provider: BackupProvider
  accessToken?: string
  refreshToken?: string
}

/**
 * Backup service for Dropbox and Google Drive
 */

export class BackupService {
  private config: BackupConfig | null = null

  setConfig(config: BackupConfig): void {
    this.config = config
    localStorage.setItem('backup_config', JSON.stringify(config))
  }

  getConfig(): BackupConfig | null {
    if (this.config) return this.config

    const stored = localStorage.getItem('backup_config')
    if (stored) {
      this.config = JSON.parse(stored)
      return this.config
    }
    return null
  }

  clearConfig(): void {
    this.config = null
    localStorage.removeItem('backup_config')
  }

  /**
   * Backup data to Dropbox
   */
  async backupToDropbox(events: Event[], costumes: Costume[]): Promise<void> {
    if (!this.config || this.config.provider !== 'dropbox') {
      throw new Error('Dropbox not configured')
    }

    const data = {
      events,
      costumes,
      backupDate: new Date().toISOString(),
    }

    const filename = `costume-coordinator-backup-${new Date().toISOString().split('T')[0]}.json`

    try {
      const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({
            path: `/Apps/Costume Coordinator/${filename}`,
            mode: 'add',
            autorename: true,
          }),
          'Content-Type': 'application/octet-stream',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Dropbox upload failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Dropbox backup error:', error)
      throw error
    }
  }

  /**
   * Backup data to Google Drive
   */
  async backupToGoogleDrive(events: Event[], costumes: Costume[]): Promise<void> {
    if (!this.config || this.config.provider !== 'google-drive') {
      throw new Error('Google Drive not configured')
    }

    const data = {
      events,
      costumes,
      backupDate: new Date().toISOString(),
    }

    const filename = `costume-coordinator-backup-${new Date().toISOString().split('T')[0]}.json`

    try {
      const metadata = {
        name: filename,
        mimeType: 'application/json',
      }

      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }))

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: form,
      })

      if (!response.ok) {
        throw new Error(`Google Drive upload failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Google Drive backup error:', error)
      throw error
    }
  }

  /**
   * Backup to configured provider
   */
  async backup(events: Event[], costumes: Costume[]): Promise<void> {
    if (!this.config) {
      throw new Error('No backup provider configured')
    }

    if (this.config.provider === 'dropbox') {
      await this.backupToDropbox(events, costumes)
    } else if (this.config.provider === 'google-drive') {
      await this.backupToGoogleDrive(events, costumes)
    }
  }

  /**
   * Get Dropbox authorization URL
   */
  getDropboxAuthURL(): string {
    const clientId = process.env.REACT_APP_DROPBOX_CLIENT_ID || ''
    const redirectUri = `${window.location.origin}/costume-coordinator/auth/dropbox`
    return `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}`
  }

  /**
   * Get Google Drive authorization URL
   */
  getGoogleDriveAuthURL(): string {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || ''
    const redirectUri = `${window.location.origin}/costume-coordinator/auth/google-drive`
    const scope = 'https://www.googleapis.com/auth/drive.file'
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
  }
}

export const backupService = new BackupService()
