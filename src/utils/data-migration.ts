/**
 * データ移行・エクスポート・インポート機能
 * Expo Go版からAPK版への移行をサポート
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ExportedData {
  version: string;
  exportedAt: string;
  events: any[];
  costumes: any[];
  participants: any[];
  usageHistory: any[];
  optimizationResults: any[];
  settings: any;
}

/**
 * ローカルストレージから全データをエクスポート
 */
export const exportAllData = async (): Promise<ExportedData> => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    const data: ExportedData = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      events: [],
      costumes: [],
      participants: [],
      usageHistory: [],
      optimizationResults: [],
      settings: {},
    };

    // 各キーのデータを取得
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (!value) continue;

      try {
        const parsedValue = JSON.parse(value);

        // キーに基づいてデータを分類
        if (key.startsWith("event_")) {
          data.events.push(parsedValue);
        } else if (key.startsWith("costume_")) {
          data.costumes.push(parsedValue);
        } else if (key.startsWith("participant_")) {
          data.participants.push(parsedValue);
        } else if (key.startsWith("usage_history_")) {
          data.usageHistory.push(parsedValue);
        } else if (key.startsWith("optimization_")) {
          data.optimizationResults.push(parsedValue);
        } else if (key === "app_settings") {
          data.settings = parsedValue;
        }
      } catch (e) {
        console.warn(`Failed to parse data for key: ${key}`, e);
      }
    }

    return data;
  } catch (error) {
    console.error("Failed to export data:", error);
    throw error;
  }
};

/**
 * JSONファイルからデータをインポート
 */
export const importData = async (exportedData: ExportedData): Promise<void> => {
  try {
    // バージョン確認
    if (exportedData.version !== "1.0.0") {
      console.warn(`Data version mismatch: ${exportedData.version}`);
    }

    // イベントをインポート
    for (const event of exportedData.events) {
      const key = `event_${event.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    }

    // 衣装をインポート
    for (const costume of exportedData.costumes) {
      const key = `costume_${costume.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(costume));
    }

    // 参加者をインポート
    for (const participant of exportedData.participants) {
      const key = `participant_${participant.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(participant));
    }

    // 使用履歴をインポート
    for (const history of exportedData.usageHistory) {
      const key = `usage_history_${history.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(history));
    }

    // 最適化結果をインポート
    for (const result of exportedData.optimizationResults) {
      const key = `optimization_${result.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));
    }

    // 設定をインポート
    if (Object.keys(exportedData.settings).length > 0) {
      await AsyncStorage.setItem("app_settings", JSON.stringify(exportedData.settings));
    }

    console.log("Data imported successfully");
  } catch (error) {
    console.error("Failed to import data:", error);
    throw error;
  }
};

/**
 * エクスポートデータをJSONファイルとして生成
 */
export const generateExportFile = async (): Promise<string> => {
  try {
    const data = await exportAllData();
    const jsonString = JSON.stringify(data, null, 2);
    const fileName = `costume-coordinator-backup-${new Date().toISOString().split("T")[0]}.json`;

    return jsonString;
  } catch (error) {
    console.error("Failed to generate export file:", error);
    throw error;
  }
};

/**
 * エクスポートデータをSupabaseに同期
 */
export const syncExportedDataToSupabase = async (
  exportedData: ExportedData,
  supabaseClient: any
): Promise<void> => {
  try {
    const user = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // イベントをSupabaseに同期
    for (const event of exportedData.events) {
      const { error } = await supabaseClient.from("events").upsert({
        ...event,
        user_id: user.id,
      });
      if (error) throw error;
    }

    // 衣装をSupabaseに同期
    for (const costume of exportedData.costumes) {
      const { error } = await supabaseClient.from("costumes").upsert({
        ...costume,
        user_id: user.id,
      });
      if (error) throw error;
    }

    // 参加者をSupabaseに同期
    for (const participant of exportedData.participants) {
      const { error } = await supabaseClient.from("participants").upsert(participant);
      if (error) throw error;
    }

    // 使用履歴をSupabaseに同期
    for (const history of exportedData.usageHistory) {
      const { error } = await supabaseClient.from("costume_usage_history").upsert({
        ...history,
        user_id: user.id,
      });
      if (error) throw error;
    }

    // 最適化結果をSupabaseに同期
    for (const result of exportedData.optimizationResults) {
      const { error } = await supabaseClient.from("optimization_results").upsert({
        ...result,
        user_id: user.id,
      });
      if (error) throw error;
    }

    console.log("Data synced to Supabase successfully");
  } catch (error) {
    console.error("Failed to sync data to Supabase:", error);
    throw error;
  }
};

/**
 * Supabaseからデータを取得してローカルストレージに同期
 */
export const syncSupabaseDataToLocal = async (supabaseClient: any): Promise<void> => {
  try {
    const user = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // イベントを取得
    const { data: events, error: eventsError } = await supabaseClient
      .from("events")
      .select("*")
      .eq("user_id", user.id);
    if (eventsError) throw eventsError;

    for (const event of events || []) {
      const key = `event_${event.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(event));
    }

    // 衣装を取得
    const { data: costumes, error: costumesError } = await supabaseClient
      .from("costumes")
      .select("*")
      .eq("user_id", user.id);
    if (costumesError) throw costumesError;

    for (const costume of costumes || []) {
      const key = `costume_${costume.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(costume));
    }

    // 参加者を取得
    const { data: participants, error: participantsError } = await supabaseClient
      .from("participants")
      .select("*")
      .eq("user_id", user.id);
    if (participantsError) throw participantsError;

    for (const participant of participants || []) {
      const key = `participant_${participant.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(participant));
    }

    // 使用履歴を取得
    const { data: usageHistory, error: usageError } = await supabaseClient
      .from("costume_usage_history")
      .select("*")
      .eq("user_id", user.id);
    if (usageError) throw usageError;

    for (const history of usageHistory || []) {
      const key = `usage_history_${history.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(history));
    }

    // 最適化結果を取得
    const { data: optimizationResults, error: optimizationError } = await supabaseClient
      .from("optimization_results")
      .select("*")
      .eq("user_id", user.id);
    if (optimizationError) throw optimizationError;

    for (const result of optimizationResults || []) {
      const key = `optimization_${result.id}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));
    }

    console.log("Data synced from Supabase to local storage successfully");
  } catch (error) {
    console.error("Failed to sync data from Supabase:", error);
    throw error;
  }
};

/**
 * データの整合性を確認
 */
export const validateExportedData = (data: ExportedData): boolean => {
  try {
    // 必須フィールドの確認
    if (!data.version || !data.exportedAt) {
      return false;
    }

    // バージョンの確認
    if (data.version !== "1.0.0") {
      console.warn(`Unsupported data version: ${data.version}`);
      return false;
    }

    // 配列フィールドの確認
    if (
      !Array.isArray(data.events) ||
      !Array.isArray(data.costumes) ||
      !Array.isArray(data.participants) ||
      !Array.isArray(data.usageHistory) ||
      !Array.isArray(data.optimizationResults)
    ) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Data validation failed:", error);
    return false;
  }
};

/**
 * エクスポートデータのサイズを計算
 */
export const calculateExportSize = (data: ExportedData): number => {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
};
