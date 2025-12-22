import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import { trpc } from "@/lib/trpc";
import { EVENT_PRESETS, type EventPreset } from "@/lib/event-presets";

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

// 色の選択肢
const COLOR_OPTIONS = [
  { value: "red", label: "赤", hex: "#FF0000" },
  { value: "green", label: "緑", hex: "#00FF00" },
  { value: "yellow", label: "黄色", hex: "#FFFF00" },
  { value: "blue", label: "青", hex: "#0000FF" },
  { value: "pink", label: "ピンク", hex: "#FF69B4" },
  { value: "purple", label: "紫", hex: "#800080" },
  { value: "orange", label: "オレンジ", hex: "#FFA500" },
  { value: "white", label: "白", hex: "#FFFFFF" },
  { value: "black", label: "黒", hex: "#000000" },
  { value: "brown", label: "茶色", hex: "#8B4513" },
  { value: "gray", label: "グレー", hex: "#808080" },
  { value: "gold", label: "ゴールド", hex: "#FFD700" },
  { value: "silver", label: "シルバー", hex: "#C0C0C0" },
] as const;

type ColorType = typeof COLOR_OPTIONS[number]["value"];

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<EventPreset | null>(null);
  const [colorCategory, setColorCategory] = useState<"warm" | "cool" | "neutral" | null>(null);
  const [tone, setTone] = useState<"pastel" | "vivid" | "dark" | "neutral" | null>(null);
  
  // 特定の色指定
  const [specificColors, setSpecificColors] = useState<ColorType[]>([]);
  
  // 柄希望順位制
  const [patternPreference1, setPatternPreference1] = useState<PatternType | null>(null);
  const [patternPreference2, setPatternPreference2] = useState<PatternType | null>(null);
  const [patternPreference3, setPatternPreference3] = useState<PatternType | null>(null);
  
  const [avoidSimilarColors, setAvoidSimilarColors] = useState(true);
  const [recentUsageExcludeDays, setRecentUsageExcludeDays] = useState("30");
  const [loading, setLoading] = useState(false);

  const createEventMutation = trpc.events.create.useMutation();

  const createEvent = async () => {
    if (!name.trim() || !eventDate.trim()) {
      Alert.alert("入力エラー", "イベント名と開催日を入力してください");
      return;
    }

    setLoading(true);

    try {
      const patternPreferences = [patternPreference1, patternPreference2, patternPreference3].filter(
        (p): p is PatternType => p !== null
      );

      const result = await createEventMutation.mutateAsync({
        name: name.trim(),
        eventDate: new Date(eventDate).toISOString(),
        conditions: {
          colorCategory: colorCategory || undefined,
          tone: tone || undefined,
          specificColors: specificColors.length > 0 ? specificColors : undefined,
          patternRules: {
            allowFloral: true, // 互換性のため残す
            patternPreferences, // 新しい柄希望順位
          },
          avoidSimilarColors,
          recentUsageExcludeDays: parseInt(recentUsageExcludeDays, 10),
        },
      });

      Alert.alert(
        "イベント作成完了",
        `招待コード: ${result.inviteCode}\n\nこのコードを共有してください`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      console.error("Failed to create event:", error);
      Alert.alert("エラー", "イベントの作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const colorOptions: Array<{ value: typeof colorCategory; label: string }> = [
    { value: null, label: "指定なし" },
    { value: "warm", label: "暖色系" },
    { value: "cool", label: "寒色系" },
    { value: "neutral", label: "中間色" },
  ];

  const toneOptions: Array<{ value: typeof tone; label: string }> = [
    { value: null, label: "指定なし" },
    { value: "pastel", label: "パステル" },
    { value: "vivid", label: "ビビッド" },
    { value: "dark", label: "ダーク" },
    { value: "neutral", label: "ニュートラル" },
  ];

  const patternOptionsWithNull: Array<{ value: PatternType | null; label: string }> = [
    { value: null, label: "指定なし" },
    ...PATTERN_OPTIONS,
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Spacing.m),
            paddingBottom: Math.max(insets.bottom, Spacing.m),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <ThemedText type="title">イベント作成</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Name Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">イベント名</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="例: 春のコンサート"
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Event Date Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">開催日 (YYYY-MM-DD)</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="2025-03-15"
            placeholderTextColor={colors.textDisabled}
            value={eventDate}
            onChangeText={setEventDate}
          />
        </View>

        {/* Preset Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">プリセットテーマ（任意）</ThemedText>
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            プリセットを選択すると、条件が自動設定されます
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.s }}>
            <View style={styles.presetButtons}>
              {EVENT_PRESETS.map((preset) => (
                <Pressable
                  key={preset.name}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: selectedPreset?.name === preset.name ? colors.tint : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPreset(preset);
                    // Apply preset conditions
                    setColorCategory(preset.conditions.colorCategory || null);
                    setTone(preset.conditions.tone || null);
                    setSpecificColors((preset.conditions.specificColors as ColorType[]) || []);
                    const patterns = (preset.conditions.patternRules?.patternPreferences as PatternType[]) || [];
                    setPatternPreference1(patterns[0] || null);
                    setPatternPreference2(patterns[1] || null);
                    setPatternPreference3(patterns[2] || null);
                    setAvoidSimilarColors(preset.conditions.avoidSimilarColors);
                    setRecentUsageExcludeDays(preset.conditions.recentUsageExcludeDays.toString());
                  }}
                >
                  <ThemedText style={{ fontSize: 32, marginBottom: 4 }}>{preset.icon}</ThemedText>
                  <ThemedText
                    style={{
                      color: selectedPreset?.name === preset.name ? "#FFFFFF" : colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {preset.name}
                  </ThemedText>
                  <ThemedText
                    style={{
                      color: selectedPreset?.name === preset.name ? "#FFFFFF" : colors.textSecondary,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {preset.description}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Color Category Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">色系統</ThemedText>
          <View style={styles.optionButtons}>
            {colorOptions.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: colorCategory === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setColorCategory(option.value)}
              >
                <ThemedText
                  style={{
                    color: colorCategory === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Specific Colors Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">特定の色指定（複数選択可）</ThemedText>
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
            例: クリスマスなら赤、緑、黄色を選択
          </ThemedText>
          <View style={styles.colorGrid}>
            {COLOR_OPTIONS.map((option) => {
              const isSelected = specificColors.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: option.hex,
                      borderColor: isSelected ? colors.tint : colors.border,
                      borderWidth: isSelected ? 3 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSpecificColors(specificColors.filter((c) => c !== option.value));
                    } else {
                      setSpecificColors([...specificColors, option.value]);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.colorLabel,
                      {
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                      },
                    ]}
                  >
                    <ThemedText style={{ color: "#FFFFFF", fontSize: 12 }}>
                      {option.label}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Tone Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">トーン</ThemedText>
          <View style={styles.optionButtons}>
            {toneOptions.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: tone === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTone(option.value)}
              >
                <ThemedText
                  style={{
                    color: tone === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pattern Preference 1 */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">柄 - 第1希望</ThemedText>
          <View style={styles.optionButtons}>
            {patternOptionsWithNull.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: patternPreference1 === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPatternPreference1(option.value)}
              >
                <ThemedText
                  style={{
                    color: patternPreference1 === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pattern Preference 2 */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">柄 - 第2希望</ThemedText>
          <View style={styles.optionButtons}>
            {patternOptionsWithNull.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: patternPreference2 === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPatternPreference2(option.value)}
              >
                <ThemedText
                  style={{
                    color: patternPreference2 === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pattern Preference 3 */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">柄 - 第3希望</ThemedText>
          <View style={styles.optionButtons}>
            {patternOptionsWithNull.map((option) => (
              <Pressable
                key={option.label}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: patternPreference3 === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPatternPreference3(option.value)}
              >
                <ThemedText
                  style={{
                    color: patternPreference3 === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Avoid Similar Colors */}
        <View style={styles.inputSection}>
          <View style={styles.switchRow}>
            <ThemedText type="subtitle">同系色の同時使用を回避</ThemedText>
            <Switch
              value={avoidSimilarColors}
              onValueChange={setAvoidSimilarColors}
              trackColor={{ false: colors.textDisabled, true: colors.tint }}
            />
          </View>
        </View>

        {/* Recent Usage Exclude Days */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">直近使用除外日数</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="30"
            placeholderTextColor={colors.textDisabled}
            value={recentUsageExcludeDays}
            onChangeText={setRecentUsageExcludeDays}
            keyboardType="number-pad"
          />
        </View>

        {/* Create Button */}
        <Pressable
          style={[
            styles.createButton,
            { backgroundColor: colors.tint },
            loading && { opacity: 0.6 },
          ]}
          onPress={createEvent}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.createButtonText}>イベントを作成</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.m,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  inputSection: {
    marginBottom: Spacing.l,
  },
  input: {
    marginTop: Spacing.s,
    padding: Spacing.m,
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    fontSize: 16,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  createButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    marginTop: Spacing.l,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  colorOption: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.card,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  colorLabel: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  presetButtons: {
    flexDirection: "row",
    gap: Spacing.m,
  },
  presetButton: {
    width: 140,
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    alignItems: "center",
  },
});
