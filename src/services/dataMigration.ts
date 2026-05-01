import { FirebaseSync } from './firebaseSync'
import { Event, Costume, loadEvents, loadCostumes } from '../utils/storage'

/**
 * Data migration service
 * Migrates data from local storage to Firebase
 */

export class DataMigration {
  private firebaseSync: FirebaseSync

  constructor(userId: string) {
    this.firebaseSync = new FirebaseSync(userId)
  }

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      const cloudEvents = await this.firebaseSync.getAllEvents()
      // If cloud is empty but local has data, migration is needed
      return cloudEvents.length === 0
    } catch (error) {
      console.error('Error checking migration status:', error)
      return false
    }
  }

  /**
   * Migrate all local data to Firebase
   */
  async migrateAllData(): Promise<{ eventCount: number; costumeCount: number }> {
    try {
      // Load local data
      const localEvents = loadEvents()
      const localCostumes = loadCostumes()

      // Merge with cloud data
      const { events: mergedEvents, costumes: mergedCostumes } = await this.firebaseSync.mergeData(
        localEvents,
        localCostumes
      )

      // Save merged data to Firebase
      await this.firebaseSync.syncAllData(mergedEvents, mergedCostumes)

      // Mark migration as complete
      localStorage.setItem('data_migration_complete', 'true')
      localStorage.setItem('data_migration_date', new Date().toISOString())

      return {
        eventCount: mergedEvents.length,
        costumeCount: mergedCostumes.length,
      }
    } catch (error) {
      console.error('Data migration error:', error)
      throw error
    }
  }

  /**
   * Check if migration is already complete
   */
  isMigrationComplete(): boolean {
    return localStorage.getItem('data_migration_complete') === 'true'
  }

  /**
   * Get migration date
   */
  getMigrationDate(): Date | null {
    const date = localStorage.getItem('data_migration_date')
    return date ? new Date(date) : null
  }

  /**
   * Reset migration status (for testing)
   */
  resetMigration(): void {
    localStorage.removeItem('data_migration_complete')
    localStorage.removeItem('data_migration_date')
  }
}
