import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AI Image Recognition for Costume Analysis
 * Analyzes costume images to extract color, material, and features
 */

interface ImageAnalysisResult {
  imageId: string;
  imageUrl: string;
  colors: ColorInfo[];
  materials: MaterialInfo[];
  features: string[];
  confidence: number;
  analyzedAt: string;
}

interface ColorInfo {
  name: string;
  hex: string;
  percentage: number;
  confidence: number;
}

interface MaterialInfo {
  name: string;
  confidence: number;
  description: string;
}

interface RecognitionCache {
  imageId: string;
  result: ImageAnalysisResult;
  cachedAt: string;
}

const RECOGNITION_CACHE_KEY = "image_recognition_cache";
const RECOGNITION_HISTORY_KEY = "image_recognition_history";

/**
 * Analyze costume image
 */
export const analyzeCostumeImage = async (
  imageUrl: string,
  imageId: string
): Promise<ImageAnalysisResult> => {
  try {
    // Check cache first
    const cached = await getCachedAnalysis(imageId);
    if (cached) {
      console.log("Using cached image analysis for:", imageId);
      return cached;
    }

    console.log("Analyzing costume image:", imageUrl);

    // Simulate API call to Google Vision API or similar
    const result = await simulateImageAnalysis(imageUrl, imageId);

    // Cache the result
    await cacheAnalysisResult(result);

    // Add to history
    await addToRecognitionHistory(result);

    return result;
  } catch (error) {
    console.error("Failed to analyze costume image:", error);
    throw error;
  }
};

/**
 * Simulate image analysis (in real implementation, use Google Vision API)
 */
async function simulateImageAnalysis(
  imageUrl: string,
  imageId: string
): Promise<ImageAnalysisResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate color detection
      const colors: ColorInfo[] = [
        {
          name: "Red",
          hex: "#FF0000",
          percentage: 35,
          confidence: 0.95,
        },
        {
          name: "White",
          hex: "#FFFFFF",
          percentage: 30,
          confidence: 0.92,
        },
        {
          name: "Gold",
          hex: "#FFD700",
          percentage: 20,
          confidence: 0.88,
        },
        {
          name: "Black",
          hex: "#000000",
          percentage: 15,
          confidence: 0.90,
        },
      ];

      // Simulate material detection
      const materials: MaterialInfo[] = [
        {
          name: "Silk",
          confidence: 0.85,
          description: "Smooth, lustrous fabric",
        },
        {
          name: "Velvet",
          confidence: 0.72,
          description: "Soft, dense pile fabric",
        },
        {
          name: "Satin",
          confidence: 0.68,
          description: "Glossy, smooth finish",
        },
      ];

      // Simulate feature detection
      const features = [
        "formal",
        "elegant",
        "long_sleeves",
        "embroidered",
        "high_collar",
        "traditional",
      ];

      const result: ImageAnalysisResult = {
        imageId,
        imageUrl,
        colors,
        materials,
        features,
        confidence: 0.87,
        analyzedAt: new Date().toISOString(),
      };

      resolve(result);
    }, 500);
  });
}

/**
 * Get cached analysis result
 */
export const getCachedAnalysis = async (
  imageId: string
): Promise<ImageAnalysisResult | null> => {
  try {
    const cacheJson = await AsyncStorage.getItem(RECOGNITION_CACHE_KEY);
    if (!cacheJson) {
      return null;
    }

    const cache: RecognitionCache[] = JSON.parse(cacheJson);
    const cached = cache.find((c) => c.imageId === imageId);

    if (cached) {
      // Check if cache is still valid (24 hours)
      const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return cached.result;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to get cached analysis:", error);
    return null;
  }
};

/**
 * Cache analysis result
 */
export const cacheAnalysisResult = async (
  result: ImageAnalysisResult
): Promise<void> => {
  try {
    const cacheJson = await AsyncStorage.getItem(RECOGNITION_CACHE_KEY);
    const cache: RecognitionCache[] = cacheJson ? JSON.parse(cacheJson) : [];

    // Remove old cache for same image
    const filtered = cache.filter((c) => c.imageId !== result.imageId);

    // Add new cache
    filtered.push({
      imageId: result.imageId,
      result,
      cachedAt: new Date().toISOString(),
    });

    // Keep only last 100 cached results
    const limited = filtered.slice(-100);

    await AsyncStorage.setItem(RECOGNITION_CACHE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to cache analysis result:", error);
    throw error;
  }
};

/**
 * Add to recognition history
 */
export const addToRecognitionHistory = async (
  result: ImageAnalysisResult
): Promise<void> => {
  try {
    const historyJson = await AsyncStorage.getItem(RECOGNITION_HISTORY_KEY);
    const history: ImageAnalysisResult[] = historyJson ? JSON.parse(historyJson) : [];

    history.push(result);

    // Keep only last 50 items
    const limited = history.slice(-50);

    await AsyncStorage.setItem(RECOGNITION_HISTORY_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error("Failed to add to recognition history:", error);
    throw error;
  }
};

/**
 * Get recognition history
 */
export const getRecognitionHistory = async (): Promise<ImageAnalysisResult[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(RECOGNITION_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Failed to get recognition history:", error);
    return [];
  }
};

/**
 * Extract dominant colors from analysis
 */
export const getDominantColors = (result: ImageAnalysisResult): ColorInfo[] => {
  return result.colors.sort((a, b) => b.percentage - a.percentage).slice(0, 3);
};

/**
 * Extract primary material from analysis
 */
export const getPrimaryMaterial = (result: ImageAnalysisResult): MaterialInfo | null => {
  return result.materials.length > 0 ? result.materials[0] : null;
};

/**
 * Check if costume has specific feature
 */
export const hasCostumeFeature = (result: ImageAnalysisResult, feature: string): boolean => {
  return result.features.includes(feature.toLowerCase());
};

/**
 * Get costume style from features
 */
export const getCostumeStyle = (result: ImageAnalysisResult): string => {
  const features = result.features;

  if (features.includes("formal") || features.includes("elegant")) {
    return "formal";
  }
  if (features.includes("casual") || features.includes("comfortable")) {
    return "casual";
  }
  if (features.includes("traditional")) {
    return "traditional";
  }
  if (features.includes("modern")) {
    return "modern";
  }

  return "unknown";
};

/**
 * Compare two costume analyses
 */
export const compareCostumeAnalyses = (
  result1: ImageAnalysisResult,
  result2: ImageAnalysisResult
): number => {
  let similarity = 0;

  // Compare colors (40%)
  const commonColors = result1.colors.filter((c1) =>
    result2.colors.some((c2) => c1.name === c2.name)
  );
  similarity += (commonColors.length / Math.max(result1.colors.length, 1)) * 0.4;

  // Compare materials (30%)
  const commonMaterials = result1.materials.filter((m1) =>
    result2.materials.some((m2) => m1.name === m2.name)
  );
  similarity += (commonMaterials.length / Math.max(result1.materials.length, 1)) * 0.3;

  // Compare features (30%)
  const commonFeatures = result1.features.filter((f) => result2.features.includes(f));
  similarity += (commonFeatures.length / Math.max(result1.features.length, 1)) * 0.3;

  return Math.round(similarity * 100);
};

/**
 * Get color palette from analysis
 */
export const getColorPalette = (result: ImageAnalysisResult): string[] => {
  return result.colors.map((c) => c.hex);
};

/**
 * Clear recognition cache
 */
export const clearRecognitionCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECOGNITION_CACHE_KEY);
    console.log("Recognition cache cleared");
  } catch (error) {
    console.error("Failed to clear recognition cache:", error);
    throw error;
  }
};

/**
 * Clear recognition history
 */
export const clearRecognitionHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECOGNITION_HISTORY_KEY);
    console.log("Recognition history cleared");
  } catch (error) {
    console.error("Failed to clear recognition history:", error);
    throw error;
  }
};

/**
 * Get recognition statistics
 */
export interface RecognitionStats {
  totalAnalyzed: number;
  cacheSize: number;
  mostCommonColor: string | null;
  mostCommonMaterial: string | null;
  averageConfidence: number;
}

export const getRecognitionStats = async (): Promise<RecognitionStats> => {
  try {
    const history = await getRecognitionHistory();

    if (history.length === 0) {
      return {
        totalAnalyzed: 0,
        cacheSize: 0,
        mostCommonColor: null,
        mostCommonMaterial: null,
        averageConfidence: 0,
      };
    }

    // Count colors
    const colorCounts: { [key: string]: number } = {};
    history.forEach((result) => {
      result.colors.forEach((color) => {
        colorCounts[color.name] = (colorCounts[color.name] || 0) + 1;
      });
    });

    const mostCommonColor = Object.entries(colorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      null;

    // Count materials
    const materialCounts: { [key: string]: number } = {};
    history.forEach((result) => {
      result.materials.forEach((material) => {
        materialCounts[material.name] = (materialCounts[material.name] || 0) + 1;
      });
    });

    const mostCommonMaterial = Object.entries(materialCounts).sort(([, a], [, b]) => b - a)[0]
      ?.[0] || null;

    // Calculate average confidence
    const averageConfidence =
      history.reduce((sum, result) => sum + result.confidence, 0) / history.length;

    const cacheJson = await AsyncStorage.getItem(RECOGNITION_CACHE_KEY);
    const cacheSize = cacheJson ? JSON.parse(cacheJson).length : 0;

    return {
      totalAnalyzed: history.length,
      cacheSize,
      mostCommonColor,
      mostCommonMaterial,
      averageConfidence: Math.round(averageConfidence * 100) / 100,
    };
  } catch (error) {
    console.error("Failed to get recognition statistics:", error);
    return {
      totalAnalyzed: 0,
      cacheSize: 0,
      mostCommonColor: null,
      mostCommonMaterial: null,
      averageConfidence: 0,
    };
  }
};
