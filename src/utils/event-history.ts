import AsyncStorage from "@react-native-async-storage/async-storage";

interface EventHistoryRecord {
  eventId: string;
  eventName: string;
  eventDate: string;
  participantCount: number;
  costumeUsageCount: number;
  totalDuration: number; // in minutes
  createdAt: string;
  completedAt: string;
  notes?: string;
}

interface EventHistoryStats {
  totalEvents: number;
  totalParticipants: number;
  averageParticipantsPerEvent: number;
  totalCostumeUsages: number;
  lastEventDate: string;
  mostFrequentMonth: string;
}

const EVENT_HISTORY_KEY = "event_history";

/**
 * Record event completion
 */
export const recordEventCompletion = async (
  eventId: string,
  eventName: string,
  eventDate: string,
  participantCount: number,
  costumeUsageCount: number,
  totalDuration: number = 0,
  notes?: string
): Promise<void> => {
  try {
    const record: EventHistoryRecord = {
      eventId,
      eventName,
      eventDate,
      participantCount,
      costumeUsageCount,
      totalDuration,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      notes,
    };

    // Load existing history
    const historyJson = await AsyncStorage.getItem(EVENT_HISTORY_KEY);
    const history: EventHistoryRecord[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new record
    history.push(record);

    // Save updated history
    await AsyncStorage.setItem(EVENT_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to record event completion:", error);
    throw error;
  }
};

/**
 * Get all event history
 */
export const getEventHistory = async (): Promise<EventHistoryRecord[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(EVENT_HISTORY_KEY);
    if (!historyJson) {
      return [];
    }

    const history: EventHistoryRecord[] = JSON.parse(historyJson);
    // Sort by completedAt descending (most recent first)
    return history.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch (error) {
    console.error("Failed to get event history:", error);
    return [];
  }
};

/**
 * Get event history for a specific date range
 */
export const getEventHistoryByDateRange = async (
  startDate: Date,
  endDate: Date
): Promise<EventHistoryRecord[]> => {
  try {
    const history = await getEventHistory();

    return history.filter((record) => {
      const recordDate = new Date(record.completedAt);
      return recordDate >= startDate && recordDate <= endDate;
    });
  } catch (error) {
    console.error("Failed to get event history by date range:", error);
    return [];
  }
};

/**
 * Calculate event history statistics
 */
export const calculateEventHistoryStats = async (): Promise<EventHistoryStats> => {
  try {
    const history = await getEventHistory();

    if (history.length === 0) {
      return {
        totalEvents: 0,
        totalParticipants: 0,
        averageParticipantsPerEvent: 0,
        totalCostumeUsages: 0,
        lastEventDate: "なし",
        mostFrequentMonth: "なし",
      };
    }

    const totalEvents = history.length;
    const totalParticipants = history.reduce((sum, e) => sum + e.participantCount, 0);
    const averageParticipantsPerEvent = Math.round((totalParticipants / totalEvents) * 100) / 100;
    const totalCostumeUsages = history.reduce((sum, e) => sum + e.costumeUsageCount, 0);
    const lastEventDate = history[0].completedAt;

    // Calculate most frequent month
    const monthCounts: { [key: string]: number } = {};
    for (const record of history) {
      const date = new Date(record.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
    }

    const mostFrequentMonth = Object.keys(monthCounts).reduce((a, b) =>
      monthCounts[a] > monthCounts[b] ? a : b
    );

    return {
      totalEvents,
      totalParticipants,
      averageParticipantsPerEvent,
      totalCostumeUsages,
      lastEventDate: new Date(lastEventDate).toLocaleDateString("ja-JP"),
      mostFrequentMonth,
    };
  } catch (error) {
    console.error("Failed to calculate event history statistics:", error);
    return {
      totalEvents: 0,
      totalParticipants: 0,
      averageParticipantsPerEvent: 0,
      totalCostumeUsages: 0,
      lastEventDate: "なし",
      mostFrequentMonth: "なし",
    };
  }
};

/**
 * Search event history
 */
export const searchEventHistory = async (query: string): Promise<EventHistoryRecord[]> => {
  try {
    const history = await getEventHistory();

    return history.filter((record) =>
      record.eventName.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error("Failed to search event history:", error);
    return [];
  }
};

/**
 * Filter event history by participant count
 */
export const filterEventsByParticipantCount = async (
  minCount: number,
  maxCount: number
): Promise<EventHistoryRecord[]> => {
  try {
    const history = await getEventHistory();

    return history.filter(
      (record) => record.participantCount >= minCount && record.participantCount <= maxCount
    );
  } catch (error) {
    console.error("Failed to filter events by participant count:", error);
    return [];
  }
};

/**
 * Get event history grouped by month
 */
export const getEventHistoryGroupedByMonth = async (): Promise<{
  [key: string]: EventHistoryRecord[];
}> => {
  try {
    const history = await getEventHistory();
    const grouped: { [key: string]: EventHistoryRecord[] } = {};

    for (const record of history) {
      const date = new Date(record.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(record);
    }

    return grouped;
  } catch (error) {
    console.error("Failed to get event history grouped by month:", error);
    return {};
  }
};

/**
 * Export event history as JSON
 */
export const exportEventHistory = async (): Promise<string> => {
  try {
    const history = await getEventHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error("Failed to export event history:", error);
    throw error;
  }
};

/**
 * Clear event history
 */
export const clearEventHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(EVENT_HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear event history:", error);
    throw error;
  }
};

/**
 * Get event statistics for dashboard
 */
export interface EventDashboardStats {
  upcomingEvents: number;
  completedEvents: number;
  totalParticipants: number;
  averageEventSize: number;
  busyMonth: string;
}

export const getEventDashboardStats = async (): Promise<EventDashboardStats> => {
  try {
    const stats = await calculateEventHistoryStats();

    return {
      upcomingEvents: 0, // Would be calculated from upcoming events
      completedEvents: stats.totalEvents,
      totalParticipants: stats.totalParticipants,
      averageEventSize: stats.averageParticipantsPerEvent,
      busyMonth: stats.mostFrequentMonth,
    };
  } catch (error) {
    console.error("Failed to get event dashboard statistics:", error);
    return {
      upcomingEvents: 0,
      completedEvents: 0,
      totalParticipants: 0,
      averageEventSize: 0,
      busyMonth: "なし",
    };
  }
};

/**
 * Get event trend (events per month for last 12 months)
 */
export const getEventTrend = async (): Promise<number[]> => {
  try {
    const history = await getEventHistory();

    // Group by month
    const monthlyEvents: { [key: string]: number } = {};

    for (const record of history) {
      const date = new Date(record.completedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthlyEvents[monthKey] = (monthlyEvents[monthKey] || 0) + 1;
    }

    // Get last 12 months
    const now = new Date();
    const trend: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      trend.push(monthlyEvents[monthKey] || 0);
    }

    return trend;
  } catch (error) {
    console.error("Failed to get event trend:", error);
    return [];
  }
};
