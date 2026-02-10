import AsyncStorage from "@react-native-async-storage/async-storage";

interface CostumePreference {
  costumeId: string;
  participantId: string;
  score: number; // 0-100
  lastUsedDate: string;
  usageCount: number;
}

interface RecommendationScore {
  costumeId: string;
  costumeName: string;
  score: number; // 0-100
  reasons: string[];
}

interface SeasonalTrend {
  season: string;
  preferredCostumes: string[];
  usageFrequency: number;
}

const PREFERENCE_KEY = "costume_preferences";
const SEASONAL_KEY = "seasonal_trends";

/**
 * Record costume preference for a participant
 */
export const recordCostumePreference = async (
  costumeId: string,
  participantId: string,
  score: number = 50
): Promise<void> => {
  try {
    const preferencesJson = await AsyncStorage.getItem(PREFERENCE_KEY);
    const preferences: CostumePreference[] = preferencesJson ? JSON.parse(preferencesJson) : [];

    // Check if preference already exists
    const existingIndex = preferences.findIndex(
      (p) => p.costumeId === costumeId && p.participantId === participantId
    );

    if (existingIndex >= 0) {
      // Update existing preference
      preferences[existingIndex].score = Math.min(100, preferences[existingIndex].score + 5);
      preferences[existingIndex].usageCount++;
      preferences[existingIndex].lastUsedDate = new Date().toISOString();
    } else {
      // Add new preference
      preferences.push({
        costumeId,
        participantId,
        score,
        lastUsedDate: new Date().toISOString(),
        usageCount: 1,
      });
    }

    await AsyncStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to record costume preference:", error);
    throw error;
  }
};

/**
 * Get participant preferences
 */
export const getParticipantPreferences = async (
  participantId: string
): Promise<CostumePreference[]> => {
  try {
    const preferencesJson = await AsyncStorage.getItem(PREFERENCE_KEY);
    if (!preferencesJson) {
      return [];
    }

    const preferences: CostumePreference[] = JSON.parse(preferencesJson);
    return preferences.filter((p) => p.participantId === participantId);
  } catch (error) {
    console.error("Failed to get participant preferences:", error);
    return [];
  }
};

/**
 * Calculate advanced recommendation score
 */
export const calculateAdvancedRecommendationScore = async (
  costumeId: string,
  costumeName: string,
  participantId: string,
  eventType: string = "concert",
  season: string = "spring"
): Promise<RecommendationScore> => {
  try {
    const preferences = await getParticipantPreferences(participantId);
    const preference = preferences.find((p) => p.costumeId === costumeId);

    let score = 50; // Base score
    const reasons: string[] = [];

    // Factor 1: Personal preference history (40%)
    if (preference) {
      const preferenceScore = preference.score;
      score += (preferenceScore - 50) * 0.4;
      reasons.push(`個人の好み: ${preferenceScore}点`);
    }

    // Factor 2: Recency (20%)
    if (preference) {
      const lastUsedDate = new Date(preference.lastUsedDate);
      const daysSinceUsed = Math.floor(
        (new Date().getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceUsed < 30) {
        score += 10;
        reasons.push("最近使用されました");
      } else if (daysSinceUsed > 365) {
        score -= 10;
        reasons.push("長期間使用されていません");
      }
    }

    // Factor 3: Seasonal appropriateness (20%)
    const seasonalScore = getSeasonalScore(costumeName, season);
    score += seasonalScore * 0.2;
    if (seasonalScore > 0) {
      reasons.push(`季節に適しています (${season})`);
    }

    // Factor 4: Event type compatibility (20%)
    const eventScore = getEventTypeScore(costumeName, eventType);
    score += eventScore * 0.2;
    if (eventScore > 0) {
      reasons.push(`イベントタイプに適しています (${eventType})`);
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      costumeId,
      costumeName,
      score: Math.round(score),
      reasons,
    };
  } catch (error) {
    console.error("Failed to calculate advanced recommendation score:", error);
    return {
      costumeId,
      costumeName,
      score: 50,
      reasons: ["計算エラー"],
    };
  }
};

/**
 * Get seasonal score for a costume
 */
function getSeasonalScore(costumeName: string, season: string): number {
  const name = costumeName.toLowerCase();

  const seasonalRules: { [key: string]: { [key: string]: number } } = {
    spring: {
      light: 20,
      pastel: 15,
      flower: 15,
      cherry: 20,
    },
    summer: {
      light: 20,
      cool: 20,
      white: 15,
      bright: 15,
    },
    fall: {
      warm: 20,
      brown: 15,
      gold: 15,
      deep: 15,
    },
    winter: {
      dark: 20,
      warm: 15,
      red: 15,
      gold: 15,
    },
  };

  let score = 0;
  const seasonRules = seasonalRules[season] || {};

  for (const [keyword, points] of Object.entries(seasonRules)) {
    if (name.includes(keyword)) {
      score += points;
    }
  }

  return Math.min(20, score); // Cap at 20
}

/**
 * Get event type score for a costume
 */
function getEventTypeScore(costumeName: string, eventType: string): number {
  const name = costumeName.toLowerCase();

  const eventRulesMap: { [key: string]: { [key: string]: number } } = {
    concert: {
      formal: 20,
      elegant: 15,
      dress: 15,
    },
    casual: {
      casual: 20,
      comfortable: 15,
      light: 15,
    },
    formal: {
      formal: 20,
      elegant: 15,
      tuxedo: 20,
    },
    festival: {
      colorful: 20,
      bright: 15,
      fun: 15,
    },
  };

  let score = 0;
  const eventRules = eventRulesMap[eventType] || {};

  for (const [keyword, points] of Object.entries(eventRules)) {
    if (name.includes(keyword)) {
      score += points;
    }
  }

  return Math.min(20, score); // Cap at 20
}

/**
 * Get top recommendations for a participant
 */
export const getTopRecommendations = async (
  costumes: Array<{ id: string; name: string }>,
  participantId: string,
  eventType: string = "concert",
  season: string = "spring",
  limit: number = 5
): Promise<RecommendationScore[]> => {
  try {
    const recommendations: RecommendationScore[] = [];

    for (const costume of costumes) {
      const score = await calculateAdvancedRecommendationScore(
        costume.id,
        costume.name,
        participantId,
        eventType,
        season
      );
      recommendations.push(score);
    }

    // Sort by score descending
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    console.error("Failed to get top recommendations:", error);
    return [];
  }
};

/**
 * Calculate costume compatibility score (for matching with other costumes)
 */
export const calculateCompatibilityScore = async (
  costumeId1: string,
  costumeId2: string,
  costumeName1: string,
  costumeName2: string
): Promise<number> => {
  try {
    // Simple color and style matching
    const colorMatch = calculateColorMatch(costumeName1, costumeName2);
    const styleMatch = calculateStyleMatch(costumeName1, costumeName2);

    return Math.round((colorMatch + styleMatch) / 2);
  } catch (error) {
    console.error("Failed to calculate compatibility score:", error);
    return 50;
  }
};

/**
 * Calculate color match between two costumes
 */
function calculateColorMatch(name1: string, name2: string): number {
  const colors1 = extractColors(name1);
  const colors2 = extractColors(name2);

  const commonColors = colors1.filter((c) => colors2.includes(c));
  return commonColors.length > 0 ? 75 : 50;
}

/**
 * Calculate style match between two costumes
 */
function calculateStyleMatch(name1: string, name2: string): number {
  const styles1 = extractStyles(name1);
  const styles2 = extractStyles(name2);

  const commonStyles = styles1.filter((s) => styles2.includes(s));
  return commonStyles.length > 0 ? 75 : 50;
}

/**
 * Extract colors from costume name
 */
function extractColors(name: string): string[] {
  const colors = [
    "red",
    "blue",
    "green",
    "yellow",
    "white",
    "black",
    "pink",
    "purple",
    "orange",
    "brown",
  ];
  const found: string[] = [];

  for (const color of colors) {
    if (name.toLowerCase().includes(color)) {
      found.push(color);
    }
  }

  return found;
}

/**
 * Extract styles from costume name
 */
function extractStyles(name: string): string[] {
  const styles = ["formal", "casual", "elegant", "sporty", "vintage", "modern"];
  const found: string[] = [];

  for (const style of styles) {
    if (name.toLowerCase().includes(style)) {
      found.push(style);
    }
  }

  return found;
}

/**
 * Record seasonal trend
 */
export const recordSeasonalTrend = async (
  season: string,
  costumeIds: string[]
): Promise<void> => {
  try {
    const trendsJson = await AsyncStorage.getItem(SEASONAL_KEY);
    const trends: SeasonalTrend[] = trendsJson ? JSON.parse(trendsJson) : [];

    const existingIndex = trends.findIndex((t) => t.season === season);

    if (existingIndex >= 0) {
      trends[existingIndex].preferredCostumes = costumeIds;
      trends[existingIndex].usageFrequency++;
    } else {
      trends.push({
        season,
        preferredCostumes: costumeIds,
        usageFrequency: 1,
      });
    }

    await AsyncStorage.setItem(SEASONAL_KEY, JSON.stringify(trends));
  } catch (error) {
    console.error("Failed to record seasonal trend:", error);
    throw error;
  }
};

/**
 * Get seasonal trends
 */
export const getSeasonalTrends = async (): Promise<SeasonalTrend[]> => {
  try {
    const trendsJson = await AsyncStorage.getItem(SEASONAL_KEY);
    if (!trendsJson) {
      return [];
    }

    return JSON.parse(trendsJson);
  } catch (error) {
    console.error("Failed to get seasonal trends:", error);
    return [];
  }
};
