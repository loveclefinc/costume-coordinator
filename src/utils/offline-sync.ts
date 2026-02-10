import AsyncStorage from "@react-native-async-storage/async-storage";

interface SyncQueueItem {
  id: string;
  type: "event" | "costume" | "participant" | "preference";
  action: "create" | "update" | "delete";
  data: any;
  timestamp: string;
  retryCount: number;
}

interface OfflineCache {
  events: any[];
  costumes: any[];
  participants: any[];
  lastSyncTime: string;
}

interface SyncStatus {
  isOnline: boolean;
  pendingItems: number;
  lastSyncTime: string;
  syncInProgress: boolean;
}

const SYNC_QUEUE_KEY = "sync_queue";
const OFFLINE_CACHE_KEY = "offline_cache";
const SYNC_STATUS_KEY = "sync_status";
const MAX_RETRY_COUNT = 3;

/**
 * Initialize offline sync system
 */
export const initializeOfflineSync = async (): Promise<void> => {
  try {
    // Initialize sync queue if not exists
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!queueJson) {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
    }

    // Initialize offline cache if not exists
    const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    if (!cacheJson) {
      const emptyCache: OfflineCache = {
        events: [],
        costumes: [],
        participants: [],
        lastSyncTime: new Date().toISOString(),
      };
      await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(emptyCache));
    }

    // Initialize sync status
    const statusJson = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (!statusJson) {
      const status: SyncStatus = {
        isOnline: true,
        pendingItems: 0,
        lastSyncTime: new Date().toISOString(),
        syncInProgress: false,
      };
      await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
    }
  } catch (error) {
    console.error("Failed to initialize offline sync:", error);
    throw error;
  }
};

/**
 * Add item to sync queue
 */
export const addToSyncQueue = async (
  type: "event" | "costume" | "participant" | "preference",
  action: "create" | "update" | "delete",
  data: any
): Promise<void> => {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncQueueItem[] = queueJson ? JSON.parse(queueJson) : [];

    const item: SyncQueueItem = {
      id: `${type}_${Date.now()}`,
      type,
      action,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(item);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

    // Update sync status
    await updateSyncStatus({ pendingItems: queue.length });
  } catch (error) {
    console.error("Failed to add to sync queue:", error);
    throw error;
  }
};

/**
 * Get sync queue
 */
export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  try {
    const queueJson = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    return queueJson ? JSON.parse(queueJson) : [];
  } catch (error) {
    console.error("Failed to get sync queue:", error);
    return [];
  }
};

/**
 * Process sync queue
 */
export const processSyncQueue = async (): Promise<void> => {
  try {
    await updateSyncStatus({ syncInProgress: true });

    const queue = await getSyncQueue();
    const failedItems: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        // Simulate API call
        await simulateApiCall(item);
        console.log(`Synced item: ${item.id}`);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);

        if (item.retryCount < MAX_RETRY_COUNT) {
          item.retryCount++;
          failedItems.push(item);
        }
      }
    }

    // Update queue with failed items
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedItems));

    // Update sync status
    await updateSyncStatus({
      pendingItems: failedItems.length,
      lastSyncTime: new Date().toISOString(),
      syncInProgress: false,
    });
  } catch (error) {
    console.error("Failed to process sync queue:", error);
    await updateSyncStatus({ syncInProgress: false });
    throw error;
  }
};

/**
 * Simulate API call for sync
 */
async function simulateApiCall(item: SyncQueueItem): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate 90% success rate
      if (Math.random() < 0.9) {
        resolve();
      } else {
        reject(new Error("Simulated API error"));
      }
    }, 100);
  });
}

/**
 * Cache data for offline use
 */
export const cacheDataForOffline = async (
  type: "events" | "costumes" | "participants",
  data: any[]
): Promise<void> => {
  try {
    const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    const cache: OfflineCache = cacheJson ? JSON.parse(cacheJson) : getEmptyCache();

    cache[type] = data;
    cache.lastSyncTime = new Date().toISOString();

    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to cache data for offline:", error);
    throw error;
  }
};

/**
 * Get cached data
 */
export const getCachedData = async (
  type: "events" | "costumes" | "participants"
): Promise<any[]> => {
  try {
    const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    if (!cacheJson) {
      return [];
    }

    const cache: OfflineCache = JSON.parse(cacheJson);
    return cache[type] || [];
  } catch (error) {
    console.error("Failed to get cached data:", error);
    return [];
  }
};

/**
 * Get offline cache
 */
export const getOfflineCache = async (): Promise<OfflineCache> => {
  try {
    const cacheJson = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    return cacheJson ? JSON.parse(cacheJson) : getEmptyCache();
  } catch (error) {
    console.error("Failed to get offline cache:", error);
    return getEmptyCache();
  }
};

/**
 * Get empty cache object
 */
function getEmptyCache(): OfflineCache {
  return {
    events: [],
    costumes: [],
    participants: [],
    lastSyncTime: new Date().toISOString(),
  };
}

/**
 * Update sync status
 */
export const updateSyncStatus = async (
  updates: Partial<SyncStatus>
): Promise<void> => {
  try {
    const statusJson = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    const status: SyncStatus = statusJson ? JSON.parse(statusJson) : getDefaultSyncStatus();

    const updatedStatus = { ...status, ...updates };
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(updatedStatus));
  } catch (error) {
    console.error("Failed to update sync status:", error);
    throw error;
  }
};

/**
 * Get sync status
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  try {
    const statusJson = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    return statusJson ? JSON.parse(statusJson) : getDefaultSyncStatus();
  } catch (error) {
    console.error("Failed to get sync status:", error);
    return getDefaultSyncStatus();
  }
};

/**
 * Get default sync status
 */
function getDefaultSyncStatus(): SyncStatus {
  return {
    isOnline: true,
    pendingItems: 0,
    lastSyncTime: new Date().toISOString(),
    syncInProgress: false,
  };
}

/**
 * Clear sync queue
 */
export const clearSyncQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
    await updateSyncStatus({ pendingItems: 0 });
  } catch (error) {
    console.error("Failed to clear sync queue:", error);
    throw error;
  }
};

/**
 * Clear offline cache
 */
export const clearOfflineCache = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(getEmptyCache()));
  } catch (error) {
    console.error("Failed to clear offline cache:", error);
    throw error;
  }
};

/**
 * Get sync statistics
 */
export interface SyncStats {
  totalQueued: number;
  eventQueued: number;
  costumeQueued: number;
  participantQueued: number;
  preferenceQueued: number;
  cacheSize: number;
  lastSyncTime: string;
}

export const getSyncStats = async (): Promise<SyncStats> => {
  try {
    const queue = await getSyncQueue();
    const cache = await getOfflineCache();

    const eventQueued = queue.filter((item) => item.type === "event").length;
    const costumeQueued = queue.filter((item) => item.type === "costume").length;
    const participantQueued = queue.filter((item) => item.type === "participant").length;
    const preferenceQueued = queue.filter((item) => item.type === "preference").length;

    const cacheSize =
      cache.events.length + cache.costumes.length + cache.participants.length;

    return {
      totalQueued: queue.length,
      eventQueued,
      costumeQueued,
      participantQueued,
      preferenceQueued,
      cacheSize,
      lastSyncTime: cache.lastSyncTime,
    };
  } catch (error) {
    console.error("Failed to get sync statistics:", error);
    return {
      totalQueued: 0,
      eventQueued: 0,
      costumeQueued: 0,
      participantQueued: 0,
      preferenceQueued: 0,
      cacheSize: 0,
      lastSyncTime: new Date().toISOString(),
    };
  }
};
