import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COSTUMES_STORAGE_KEY = "costumes";

interface CostumeData {
  id: string;
  name: string;
  imageUri: string;
  thumbnailUri: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: "solid" | "floral" | "stripe" | "dot" | "other";
  tags: string[];
  usageHistory: Array<{ eventId: string; date: string }>;
  createdAt: string;
  updatedAt: string;
}

export default function CostumeDetailScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams();
  const costumeId = params.id as string;

  const [costume, setCostume] = useState<CostumeData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCostume();
  }, [costumeId]);

  const loadCostume = async () => {
    try {
      const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      if (data) {
        const costumes: CostumeData[] = JSON.parse(data);
        const found = costumes.find((c) => c.id === costumeId);
        if (found) {
          setCostume(found);
          setEditedName(found.name);
        }
      }
    } catch (error) {
      console.error("Failed to load costume:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCostume = async () => {
    if (!costume) return;

    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      if (data) {
        const costumes: CostumeData[] = JSON.parse(data);
        const index = costumes.findIndex((c) => c.id === costumeId);
        if (index !== -1) {
          costumes[index] = {
            ...costume,
            name: editedName,
            updatedAt: new Date().toISOString(),
          };
          await AsyncStorage.setItem(COSTUMES_STORAGE_KEY, JSON.stringify(costumes));
          setCostume(costumes[index]);
          setIsEditing(false);
          Alert.alert("保存完了", "衣装情報を更新しました");
        }
      }
    } catch (error) {
      console.error("Failed to save costume:", error);
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const deleteCostume = async () => {
    Alert.alert("削除確認", "この衣装を削除しますか？", [
      { text: "キャンセル", onPress: () => {} },
      {
        text: "削除",
        onPress: async () => {
          try {
            setLoading(true);
            const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
            if (data) {
              const costumes: CostumeData[] = JSON.parse(data);
              const filtered = costumes.filter((c) => c.id !== costumeId);
              await AsyncStorage.setItem(COSTUMES_STORAGE_KEY, JSON.stringify(filtered));
              Alert.alert("削除完了", "衣装を削除しました", [
                {
                  text: "OK",
                  onPress: () => router.back(),
                },
              ]);
            }
          } catch (error) {
            console.error("Failed to delete costume:", error);
            Alert.alert("エラー", "削除に失敗しました");
          } finally {
            setLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!costume) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, Spacing.m),
              paddingHorizontal: Spacing.m,
            },
          ]}
        >
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">衣装詳細</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ThemedText type="title">衣装が見つかりません</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Spacing.m),
            paddingHorizontal: Spacing.m,
            backgroundColor: colors.elevated,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
        </Pressable>
        <ThemedText type="subtitle" style={{ flex: 1, marginLeft: Spacing.m }}>
          衣装詳細
        </ThemedText>
        <Pressable onPress={() => setIsEditing(!isEditing)}>
          <ThemedText style={{ fontSize: 20 }}>{isEditing ? "✓" : "✎"}</ThemedText>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m) + 80,
          },
        ]}
      >
        {/* Image */}
        <Image source={{ uri: costume.imageUri }} style={styles.image} />

        {/* Name Section */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">衣装名</ThemedText>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editedName}
              onChangeText={setEditedName}
            />
          ) : (
            <ThemedText style={{ marginTop: Spacing.s, fontSize: 18 }}>{costume.name}</ThemedText>
          )}
        </View>

        {/* Color Information */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">色情報</ThemedText>

          <View style={styles.colorRow}>
            <ThemedText style={{ color: colors.textSecondary }}>メインカラー:</ThemedText>
            <View style={styles.colorDisplay}>
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: costume.colors.primary },
                ]}
              />
              <ThemedText>{costume.colors.primary}</ThemedText>
            </View>
          </View>

          {costume.colors.secondary && (
            <View style={styles.colorRow}>
              <ThemedText style={{ color: colors.textSecondary }}>サブカラー:</ThemedText>
              <View style={styles.colorDisplay}>
                <View
                  style={[
                    styles.colorBox,
                    { backgroundColor: costume.colors.secondary },
                  ]}
                />
                <ThemedText>{costume.colors.secondary}</ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Category & Tone */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: colors.textSecondary }}>色系統:</ThemedText>
              <ThemedText style={{ marginTop: Spacing.s }}>{costume.colorCategory}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: colors.textSecondary }}>トーン:</ThemedText>
              <ThemedText style={{ marginTop: Spacing.s }}>{costume.tone}</ThemedText>
            </View>
          </View>
        </View>

        {/* Pattern & Tags */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: colors.textSecondary }}>柄:</ThemedText>
              <ThemedText style={{ marginTop: Spacing.s }}>{costume.pattern}</ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: colors.textSecondary }}>タグ:</ThemedText>
              <ThemedText style={{ marginTop: Spacing.s }}>
                {costume.tags.length > 0 ? costume.tags.join(", ") : "なし"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Usage History */}
        {costume.usageHistory.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle">使用履歴</ThemedText>
            {costume.usageHistory.map((usage, index) => (
              <View key={index} style={styles.historyItem}>
                <ThemedText style={{ color: colors.textSecondary }}>
                  {new Date(usage.date).toLocaleDateString("ja-JP")}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Metadata */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">情報</ThemedText>
          <View style={styles.metaRow}>
            <ThemedText style={{ color: colors.textSecondary }}>作成日:</ThemedText>
            <ThemedText>{new Date(costume.createdAt).toLocaleDateString("ja-JP")}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={{ color: colors.textSecondary }}>更新日:</ThemedText>
            <ThemedText>{new Date(costume.updatedAt).toLocaleDateString("ja-JP")}</ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m),
            backgroundColor: colors.elevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        ]}
      >
        {isEditing ? (
          <>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.tint }]}
              onPress={saveCostume}
            >
              <ThemedText style={styles.actionButtonText}>保存</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => {
                setIsEditing(false);
                setEditedName(costume.name);
              }}
            >
              <ThemedText style={styles.actionButtonText}>キャンセル</ThemedText>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.tint }]}
              onPress={() => setIsEditing(true)}
            >
              <ThemedText style={styles.actionButtonText}>編集</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={deleteCostume}
            >
              <ThemedText style={styles.actionButtonText}>削除</ThemedText>
            </Pressable>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.m,
  },
  scrollContent: {
    padding: Spacing.m,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
  },
  section: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
  },
  input: {
    marginTop: Spacing.s,
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    fontSize: 16,
  },
  colorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.s,
  },
  colorDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  colorBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.m,
  },
  historyItem: {
    paddingVertical: Spacing.s,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.s,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBar: {
    flexDirection: "row",
    gap: Spacing.m,
    padding: Spacing.m,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
