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
import { ColorPicker } from "@/components/color-picker";
import { getColorName } from "@/lib/image-analysis";

const COSTUMES_STORAGE_KEY = "costumes";

// 拡充された柄の種類
const PATTERN_OPTIONS = [
  { value: "solid", label: "無地" },
  { value: "floral", label: "花柄" },
  { value: "stripe", label: "ストライプ" },
  { value: "dot", label: "ドット" },
  { value: "check", label: "チェック" },
  { value: "geometric", label: "幾何学模様" },
  { value: "animal", label: "アニマル柄" },
  { value: "other", label: "その他" },
] as const;

type PatternType = typeof PATTERN_OPTIONS[number]["value"];

interface CostumeData {
  id: string;
  name: string;
  imageUri: string;
  thumbnailUri: string;
  wearingPhotos?: string[];
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: PatternType;
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
  const [editedColor, setEditedColor] = useState("#FF6B9D");
  const [editedColorCategory, setEditedColorCategory] = useState<"warm" | "cool" | "neutral">("warm");
  const [editedTone, setEditedTone] = useState<"pastel" | "vivid" | "dark" | "neutral">("pastel");
  const [editedPattern, setEditedPattern] = useState<PatternType>("solid");
  const [showColorPicker, setShowColorPicker] = useState(false);
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
          setEditedColor(found.colors.primary);
          setEditedColorCategory(found.colorCategory);
          setEditedTone(found.tone);
          setEditedPattern(found.pattern as PatternType);
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
            colors: {
              ...costume.colors,
              primary: editedColor,
            },
            colorCategory: editedColorCategory,
            tone: editedTone,
            pattern: editedPattern,
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

  const getPatternLabel = (value: PatternType) => {
    const option = PATTERN_OPTIONS.find((o) => o.value === value);
    return option ? option.label : value;
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

        {/* Wearing Photos Gallery */}
        {costume.wearingPhotos && costume.wearingPhotos.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle">着用写真</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.wearingPhotosScroll}
            >
              {costume.wearingPhotos.map((photo, index) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.wearingPhotoGallery}
                />
              ))}
            </ScrollView>
          </View>
        )}

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
          <ThemedText type="subtitle">メインカラー</ThemedText>

          {isEditing ? (
            <>
              <View
                style={[
                  styles.colorPickerRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.colorBox, { backgroundColor: editedColor }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ color: colors.textSecondary }}>
                    {getColorName(editedColor)}
                  </ThemedText>
                  <ThemedText>{editedColor}</ThemedText>
                </View>
                <Pressable onPress={() => setShowColorPicker(!showColorPicker)}>
                  <ThemedText style={{ color: colors.tint }}>変更</ThemedText>
                </Pressable>
              </View>
              {showColorPicker && (
                <ColorPicker
                  selectedColor={editedColor}
                  onColorSelect={(color) => setEditedColor(color)}
                />
              )}
            </>
          ) : (
            <View style={styles.colorRow}>
              <View style={styles.colorDisplay}>
                <View
                  style={[
                    styles.colorBox,
                    { backgroundColor: costume.colors.primary },
                  ]}
                />
                <ThemedText>{getColorName(costume.colors.primary)}</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, marginLeft: Spacing.s }}>
                  {costume.colors.primary}
                </ThemedText>
              </View>
            </View>
          )}
        </View>

        {/* Color Category */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">色系統</ThemedText>
          {isEditing ? (
            <View style={styles.optionButtons}>
              {(["warm", "cool", "neutral"] as const).map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: editedColorCategory === category ? colors.tint : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setEditedColorCategory(category)}
                >
                  <ThemedText
                    style={{
                      color: editedColorCategory === category ? "#FFFFFF" : colors.text,
                    }}
                  >
                    {category === "warm" ? "暖色系" : category === "cool" ? "寒色系" : "中間色"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={{ marginTop: Spacing.s }}>
              {costume.colorCategory === "warm" ? "暖色系" : costume.colorCategory === "cool" ? "寒色系" : "中間色"}
            </ThemedText>
          )}
        </View>

        {/* Tone */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">トーン</ThemedText>
          {isEditing ? (
            <View style={styles.optionButtons}>
              {(["pastel", "vivid", "dark", "neutral"] as const).map((tone) => (
                <Pressable
                  key={tone}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: editedTone === tone ? colors.tint : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setEditedTone(tone)}
                >
                  <ThemedText
                    style={{
                      color: editedTone === tone ? "#FFFFFF" : colors.text,
                    }}
                  >
                    {tone === "pastel" ? "パステル" : tone === "vivid" ? "ビビッド" : tone === "dark" ? "ダーク" : "ニュートラル"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={{ marginTop: Spacing.s }}>
              {costume.tone === "pastel" ? "パステル" : costume.tone === "vivid" ? "ビビッド" : costume.tone === "dark" ? "ダーク" : "ニュートラル"}
            </ThemedText>
          )}
        </View>

        {/* Pattern */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">柄</ThemedText>
          {isEditing ? (
            <View style={styles.optionButtons}>
              {PATTERN_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor: editedPattern === option.value ? colors.tint : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setEditedPattern(option.value)}
                >
                  <ThemedText
                    style={{
                      color: editedPattern === option.value ? "#FFFFFF" : colors.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={{ marginTop: Spacing.s }}>
              {getPatternLabel(costume.pattern as PatternType)}
            </ThemedText>
          )}
        </View>

        {/* Tags */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">タグ</ThemedText>
          <ThemedText style={{ marginTop: Spacing.s }}>
            {costume.tags.length > 0 ? costume.tags.join(", ") : "なし"}
          </ThemedText>
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
                setEditedColor(costume.colors.primary);
                setEditedColorCategory(costume.colorCategory);
                setEditedTone(costume.tone);
                setEditedPattern(costume.pattern as PatternType);
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
              style={[styles.actionButton, { backgroundColor: colors.error || "#FF3B30" }]}
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
    marginBottom: Spacing.m,
  },
  section: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
  },
  input: {
    marginTop: Spacing.s,
    padding: Spacing.m,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    fontSize: 16,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.s,
  },
  colorDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
  },
  colorBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
  colorPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m,
    marginTop: Spacing.s,
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  optionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  optionButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
  },
  historyItem: {
    marginTop: Spacing.s,
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
  wearingPhotosScroll: {
    marginTop: Spacing.s,
  },
  wearingPhotoGallery: {
    width: 120,
    height: 160,
    borderRadius: BorderRadius.button,
    marginRight: Spacing.m,
  },
});
