import AsyncStorage from "@react-native-async-storage/async-storage";

interface CostumeUsageRecord {
  costumeId: string;
  costumeName: string;
  eventId: string;
  eventName: string;
  participantName: string;
  usageDate: string;
  timestamp: string;
}

interface CostumeStatistics {
  costumeId: string;
  costumeName: string;
  totalUsageCount: number;
  lastUsedDate: string;
  usageHistory: CostumeUsageRecord[];
  averageUsagePerMonth: number;
}

interface CostumeStats {
  [costumeId: string]: CostumeStatistics;
}

const COSTUME_HISTORY_KEY = "costume_usage_history";

/**
 * Record costume usage when event is completed
 */
export const recordCostumeUsage = async (
  costumeId: string,
  costumeName: string,
  eventId: string,
  eventName: string,
  participantName: string
): Promise<void> => {
  try {
    const record: CostumeUsageRecord = {
      costumeId,
      costumeName,
      eventId,
      eventName,
      participantName,
      usageDate: new Date().toLocaleDateString("ja-JP"),
      timestamp: new Date().toISOString(),
    };

    // Load existing history
    const historyJson = await AsyncStorage.getItem(COSTUME_HISTORY_KEY);
    const history: CostumeUsageRecord[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new record
    history.push(record);

    // Save updated history
    await AsyncStorage.setItem(COSTUME_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to record costume usage:", error);
    throw error;
  }
};

/**
 * Get usage history for a specific costume
 */
export const getCostumeUsageHistory = async (
  costumeId: string
): Promise<CostumeUsageRecord[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(COSTUME_HISTORY_KEY);
    if (!historyJson) {
      return [];
    }

    const history: CostumeUsageRecord[] = JSON.parse(historyJson);
    return history.filter((record) => record.costumeId === costumeId);
  } catch (error) {
    console.error("Failed to get costume usage history:", error);
    return [];
  }
};

/**
 * Calculate costume statistics
 */
export const calculateCostumeStatistics = async (
  costumeId: string,
  costumeName: string
): Promise<CostumeStatistics> => {
  try {
    const history = await getCostumeUsageHistory(costumeId);

    const totalUsageCount = history.length;
    const lastUsedDate =
      history.length > 0
        ? history[history.length - 1].usageDate
        : "未使用";

    // Calculate average usage per month
    let averageUsagePerMonth = 0;
    if (history.length > 0) {
      const firstUsageDate = new Date(history[0].timestamp);
      const lastUsageDate = new Date(history[history.length - 1].timestamp);
      const monthsDiff =
        (lastUsageDate.getFullYear() - firstUsageDate.getFullYear()) * 12 +
        (lastUsageDate.getMonth() - firstUsageDate.getMonth()) +
        1;
      averageUsagePerMonth = Math.round((totalUsageCount / monthsDiff) * 100) / 100;
    }

    return {
      costumeId,
      costumeName,
      totalUsageCount,
      lastUsedDate,
      usageHistory: history,
      averageUsagePerMonth,
    };
  } catch (error) {
    console.error("Failed to calculate costume statistics:", error);
    return {
      costumeId,
      costumeName,
      totalUsageCount: 0,
      lastUsedDate: "未使用",
      usageHistory: [],
      averageUsagePerMonth: 0,
    };
  }
};

/**
 * Get all costume statistics
 */
export const getAllCostumeStatistics = async (
  costumes: Array<{ id: string; name: string }>
): Promise<CostumeStats> => {
  try {
    const stats: CostumeStats = {};

    for (const costume of costumes) {
      stats[costume.id] = await calculateCostumeStatistics(costume.id, costume.name);
    }

    return stats;
  } catch (error) {
    console.error("Failed to get all costume statistics:", error);
    return {};
  }
};

/**
 * Get most used costumes
 */
export const getMostUsedCostumes = async (
  costumes: Array<{ id: string; name: string }>,
  limit: number = 10
): Promise<CostumeStatistics[]> => {
  try {
    const stats = await getAllCostumeStatistics(costumes);
    const statsArray = Object.values(stats);

    // Sort by usage count descending
    return statsArray
      .sort((a, b) => b.totalUsageCount - a.totalUsageCount)
      .slice(0, limit);
  } catch (error) {
    console.error("Failed to get most used costumes:", error);
    return [];
  }
};

/**
 * Get usage trend for a costume
 */
export const getCostumeTrend = async (costumeId: string): Promise<number[]> => {
  try {
    const history = await getCostumeUsageHistory(costumeId);

    // Group by month
    const monthlyUsage: { [key: string]: number } = {};

    for (const record of history) {
      const date = new Date(record.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthlyUsage[monthKey] = (monthlyUsage[monthKey] || 0) + 1;
    }

    // Get last 12 months
    const now = new Date();
    const trend: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      trend.push(monthlyUsage[monthKey] || 0);
    }

    return trend;
  } catch (error) {
    console.error("Failed to get costume trend:", error);
    return [];
  }
};

/**
 * Clear all usage history
 */
export const clearUsageHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COSTUME_HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear usage history:", error);
    throw error;
  }
};

/**
 * Export usage history as JSON
 */
export const exportUsageHistory = async (): Promise<string> => {
  try {
    const historyJson = await AsyncStorage.getItem(COSTUME_HISTORY_KEY);
    return historyJson || "[]";
  } catch (error) {
    console.error("Failed to export usage history:", error);
    throw error;
  }
};

/**
 * Get usage summary for dashboard
 */
export interface UsageSummary {
  totalCostumes: number;
  totalUsages: number;
  averageUsagePerCostume: number;
  mostUsedCostume: CostumeStatistics | null;
  leastUsedCostume: CostumeStatistics | null;
  unusedCostumes: number;
}

export const getUsageSummary = async (
  costumes: Array<{ id: string; name: string }>
): Promise<UsageSummary> => {
  try {
    const stats = await getAllCostumeStatistics(costumes);
    const statsArray = Object.values(stats);

    const totalCostumes = costumes.length;
    const totalUsages = statsArray.reduce((sum, s) => sum + s.totalUsageCount, 0);
    const averageUsagePerCostume =
      totalCostumes > 0 ? Math.round((totalUsages / totalCostumes) * 100) / 100 : 0;

    const sortedByUsage = [...statsArray].sort((a, b) => b.totalUsageCount - a.totalUsageCount);
    const mostUsedCostume = sortedByUsage.length > 0 ? sortedByUsage[0] : null;
    const leastUsedCostume =
      sortedByUsage.length > 0 ? sortedByUsage[sortedByUsage.length - 1] : null;
    const unusedCostumes = statsArray.filter((s) => s.totalUsageCount === 0).length;

    return {
      totalCostumes,
      totalUsages,
      averageUsagePerCostume,
      mostUsedCostume,
      leastUsedCostume,
      unusedCostumes,
    };
  } catch (error) {
    console.error("Failed to get usage summary:", error);
    return {
      totalCostumes: 0,
      totalUsages: 0,
      averageUsagePerCostume: 0,
      mostUsedCostume: null,
      leastUsedCostume: null,
      unusedCostumes: 0,
    };
  }
};
