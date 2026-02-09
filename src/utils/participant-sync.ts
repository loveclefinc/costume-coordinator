import AsyncStorage from "@react-native-async-storage/async-storage";

interface ParticipantInfo {
  id: string;
  name: string;
  instrument: string;
  photoUri?: string;
  selectedCostumeId?: string;
  selectedCostumeName?: string;
  selectedCostumeImage?: string;
  createdAt: string;
}

interface EventData {
  id: string;
  name: string;
  eventDate: string;
  participants: ParticipantInfo[];
  createdAt: string;
}

/**
 * Parse event data from AirDrop received JSON string
 */
export const parseEventDataFromAirDrop = (jsonString: string): EventData | null => {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate required fields
    if (!data.id || !data.name || !data.eventDate) {
      console.error("Invalid event data: missing required fields");
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      eventDate: data.eventDate,
      participants: data.participants || [],
      createdAt: data.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to parse event data:", error);
    return null;
  }
};

/**
 * Merge received participants with existing participants
 * Avoids duplicates by checking participant ID and name
 */
export const mergeParticipants = (
  existingParticipants: ParticipantInfo[],
  receivedParticipants: ParticipantInfo[]
): ParticipantInfo[] => {
  const merged = [...existingParticipants];
  
  for (const receivedParticipant of receivedParticipants) {
    // Check if participant already exists
    const existingIndex = merged.findIndex(
      (p) => p.id === receivedParticipant.id || p.name === receivedParticipant.name
    );
    
    if (existingIndex >= 0) {
      // Update existing participant with received data
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...receivedParticipant,
        // Keep the original createdAt if it exists
        createdAt: merged[existingIndex].createdAt || receivedParticipant.createdAt,
      };
    } else {
      // Add new participant
      merged.push(receivedParticipant);
    }
  }
  
  return merged;
};

/**
 * Save synced participants to AsyncStorage
 */
export const saveParticipantsToStorage = async (
  eventId: string,
  participants: ParticipantInfo[]
): Promise<void> => {
  try {
    const key = `event_participants_${eventId}`;
    await AsyncStorage.setItem(key, JSON.stringify(participants));
  } catch (error) {
    console.error("Failed to save participants to storage:", error);
    throw error;
  }
};

/**
 * Load participants from AsyncStorage
 */
export const loadParticipantsFromStorage = async (
  eventId: string
): Promise<ParticipantInfo[]> => {
  try {
    const key = `event_participants_${eventId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) {
      return [];
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load participants from storage:", error);
    return [];
  }
};

/**
 * Sync event participants from AirDrop received data
 */
export const syncParticipantsFromAirDrop = async (
  eventId: string,
  receivedEventData: EventData
): Promise<ParticipantInfo[]> => {
  try {
    // Load existing participants
    const existingParticipants = await loadParticipantsFromStorage(eventId);
    
    // Merge with received participants
    const mergedParticipants = mergeParticipants(
      existingParticipants,
      receivedEventData.participants
    );
    
    // Save merged participants
    await saveParticipantsToStorage(eventId, mergedParticipants);
    
    return mergedParticipants;
  } catch (error) {
    console.error("Failed to sync participants from AirDrop:", error);
    throw error;
  }
};

/**
 * Get sync status summary
 */
export const getSyncStatusSummary = (
  existingCount: number,
  receivedCount: number,
  mergedCount: number
): string => {
  const newCount = mergedCount - existingCount;
  const updatedCount = Math.min(existingCount, receivedCount);
  
  return `同期完了: ${newCount}人追加, ${updatedCount}人更新, 合計${mergedCount}人`;
};

/**
 * Validate participant data before sync
 */
export const validateParticipantData = (
  participant: ParticipantInfo
): boolean => {
  // Check required fields
  if (!participant.id || !participant.name || !participant.instrument) {
    return false;
  }
  
  // Check name length
  if (participant.name.length === 0 || participant.name.length > 100) {
    return false;
  }
  
  // Check instrument length
  if (participant.instrument.length === 0 || participant.instrument.length > 100) {
    return false;
  }
  
  return true;
};

/**
 * Filter out invalid participants
 */
export const filterValidParticipants = (
  participants: ParticipantInfo[]
): ParticipantInfo[] => {
  return participants.filter(validateParticipantData);
};

/**
 * Create participant sync report
 */
export interface SyncReport {
  totalReceived: number;
  validParticipants: number;
  invalidParticipants: number;
  newParticipants: number;
  updatedParticipants: number;
  totalParticipants: number;
  timestamp: string;
}

export const createSyncReport = (
  receivedParticipants: ParticipantInfo[],
  validParticipants: ParticipantInfo[],
  existingParticipants: ParticipantInfo[],
  mergedParticipants: ParticipantInfo[]
): SyncReport => {
  const invalidCount = receivedParticipants.length - validParticipants.length;
  const newCount = mergedParticipants.length - existingParticipants.length;
  const updatedCount = Math.min(existingParticipants.length, validParticipants.length);
  
  return {
    totalReceived: receivedParticipants.length,
    validParticipants: validParticipants.length,
    invalidParticipants: invalidCount,
    newParticipants: newCount,
    updatedParticipants: updatedCount,
    totalParticipants: mergedParticipants.length,
    timestamp: new Date().toISOString(),
  };
};
