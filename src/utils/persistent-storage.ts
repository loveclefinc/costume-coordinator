/**
 * Persistent Storage Utility
 * Ensures data survives browser cache clearing using multiple strategies
 */

const BACKUP_KEY = 'costume_coordinator_backup';
const BACKUP_TIMESTAMP_KEY = 'costume_coordinator_backup_timestamp';
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupData {
  costumes: any[];
  events: any[];
  participants: any[];
  usageHistory: any[];
  timestamp: number;
}

/**
 * Request persistent storage permission
 * This tells the browser to keep data even if storage quota is exceeded
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    console.warn('Persistent Storage API not supported');
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    console.log('Persistent storage granted:', isPersisted);
    return isPersisted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if persistent storage is available
 */
export async function isPersistentStorageAvailable(): Promise<boolean> {
  if (!navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Failed to check persistent storage:', error);
    return false;
  }
}

/**
 * Create backup of all data
 */
export async function createBackup(): Promise<void> {
  try {
    // Get all data from IndexedDB
    const db = await openDatabase();
    
    const costumes = await getAllFromStore(db, 'costumes');
    const events = await getAllFromStore(db, 'events');
    const participants = await getAllFromStore(db, 'participants');
    const usageHistory = await getAllFromStore(db, 'usageHistory');

    const backup: BackupData = {
      costumes,
      events,
      participants,
      usageHistory,
      timestamp: Date.now(),
    };

    // Store in localStorage as JSON (limited to ~5MB)
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, Date.now().toString());

    console.log('Backup created successfully');
  } catch (error) {
    console.error('Failed to create backup:', error);
  }
}

/**
 * Restore data from backup
 */
export async function restoreFromBackup(): Promise<boolean> {
  try {
    const backupStr = localStorage.getItem(BACKUP_KEY);
    if (!backupStr) {
      console.log('No backup found');
      return false;
    }

    const backup: BackupData = JSON.parse(backupStr);
    const db = await openDatabase();

    // Restore each store
    if (backup.costumes?.length > 0) {
      await restoreStore(db, 'costumes', backup.costumes);
    }
    if (backup.events?.length > 0) {
      await restoreStore(db, 'events', backup.events);
    }
    if (backup.participants?.length > 0) {
      await restoreStore(db, 'participants', backup.participants);
    }
    if (backup.usageHistory?.length > 0) {
      await restoreStore(db, 'usageHistory', backup.usageHistory);
    }

    console.log('Data restored from backup');
    return true;
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    return false;
  }
}

/**
 * Get last backup timestamp
 */
export function getLastBackupTime(): number | null {
  const timestamp = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  return timestamp ? parseInt(timestamp) : null;
}

/**
 * Check if backup is needed (older than interval)
 */
export function isBackupNeeded(): boolean {
  const lastBackup = getLastBackupTime();
  if (!lastBackup) return true;
  return Date.now() - lastBackup > BACKUP_INTERVAL;
}

/**
 * Auto backup if needed
 */
export async function autoBackupIfNeeded(): Promise<void> {
  if (isBackupNeeded()) {
    await createBackup();
  }
}

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CostumeCoordinator', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create stores if they don't exist
      if (!db.objectStoreNames.contains('costumes')) {
        db.createObjectStore('costumes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('participants')) {
        db.createObjectStore('participants', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('usageHistory')) {
        db.createObjectStore('usageHistory', { keyPath: 'id' });
      }
    };
  });
}

/**
 * Get all items from a store
 */
function getAllFromStore(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Restore items to a store
 */
function restoreStore(db: IDBDatabase, storeName: string, items: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    // Clear existing data
    store.clear();

    // Add restored items
    items.forEach((item) => {
      store.add(item);
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Export backup as JSON file
 */
export async function exportBackupAsFile(): Promise<void> {
  try {
    const backupStr = localStorage.getItem(BACKUP_KEY);
    if (!backupStr) {
      console.warn('No backup to export');
      return;
    }

    const backup: BackupData = JSON.parse(backupStr);
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `costume-coordinator-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('Backup exported successfully');
  } catch (error) {
    console.error('Failed to export backup:', error);
  }
}

/**
 * Import backup from JSON file
 */
export async function importBackupFromFile(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const backup: BackupData = JSON.parse(text);

    // Validate backup structure
    if (!backup.costumes || !backup.events) {
      console.error('Invalid backup file format');
      return false;
    }

    // Store in localStorage
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, Date.now().toString());

    // Restore to IndexedDB
    return await restoreFromBackup();
  } catch (error) {
    console.error('Failed to import backup:', error);
    return false;
  }
}

/**
 * Clear all data (for debugging/reset)
 */
export async function clearAllData(): Promise<void> {
  try {
    const db = await openDatabase();

    // Clear all stores
    ['costumes', 'events', 'participants', 'usageHistory'].forEach((storeName) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
    });

    // Clear localStorage backup
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(BACKUP_TIMESTAMP_KEY);

    console.log('All data cleared');
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}
