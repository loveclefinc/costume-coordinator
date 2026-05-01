import { backupService, BackupConfig } from './backupService'
import { storage } from '../utils/storage'

/**
 * Automatic backup scheduler
 * Schedules periodic backups to Dropbox or Google Drive
 */

export class BackupScheduler {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  /**
   * Start automatic backup scheduler
   * @param intervalMinutes - Backup interval in minutes (default: 60 = 1 hour)
   */
  start(intervalMinutes: number = 60): void {
    if (this.isRunning) {
      console.warn('Backup scheduler is already running')
      return
    }

    this.isRunning = true
    const intervalMs = intervalMinutes * 60 * 1000

    // Run first backup immediately
    this.performBackup()

    // Schedule periodic backups
    this.intervalId = setInterval(() => {
      this.performBackup()
    }, intervalMs)

    console.log(`Backup scheduler started (interval: ${intervalMinutes} minutes)`)
  }

  /**
   * Stop automatic backup scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Backup scheduler stopped')
  }

  /**
   * Check if scheduler is running
   */
  getStatus(): boolean {
    return this.isRunning
  }

  /**
   * Perform backup
   */
  private async performBackup(): Promise<void> {
    try {
      const config = backupService.getConfig()
      if (!config) {
        console.log('No backup provider configured')
        return
      }

      const events = await storage.getAllEvents()
      const costumes = await storage.getAllCostumes()

      await backupService.backup(events, costumes)

      // Save last backup time
      localStorage.setItem('last_backup_time', new Date().toISOString())
      localStorage.setItem('last_backup_status', 'success')

      console.log(`Backup completed at ${new Date().toISOString()}`)
    } catch (error) {
      console.error('Backup failed:', error)
      localStorage.setItem('last_backup_status', 'failed')
      localStorage.setItem('last_backup_error', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Get last backup time
   */
  getLastBackupTime(): Date | null {
    const time = localStorage.getItem('last_backup_time')
    return time ? new Date(time) : null
  }

  /**
   * Get last backup status
   */
  getLastBackupStatus(): 'success' | 'failed' | null {
    const status = localStorage.getItem('last_backup_status')
    return (status as 'success' | 'failed') || null
  }

  /**
   * Get last backup error
   */
  getLastBackupError(): string | null {
    return localStorage.getItem('last_backup_error')
  }

  /**
   * Clear backup history
   */
  clearBackupHistory(): void {
    localStorage.removeItem('last_backup_time')
    localStorage.removeItem('last_backup_status')
    localStorage.removeItem('last_backup_error')
  }
}

// Singleton instance
export const backupScheduler = new BackupScheduler()
