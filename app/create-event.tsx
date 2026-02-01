import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
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

const TONE_OPTIONS = [
  { value: "pastel", label: "パステル" },
  { value: "vivid", label: "ビビッド" },
  { value: "dark", label: "ダーク" },
  { value: "neutral", label: "ニュートラル" },
] as const;

type ToneType = typeof TONE_OPTIONS[number]["value"];

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<EventPreset | null>(null);

  // 色希望順位制
  const [colorPreference1, setColorPreference1] = useState<ColorType[]>([]);
  const [colorPreference2, setColorPreference2] = useState<ColorType[]>([]);
  const [colorPreference3, setColorPreference3] = useState<ColorType[]>([]);

  // トーン希望順位制
  const [tonePreference1, setTonePreference1] = useState<ToneType | null>(null);
  const [tonePreference2, setTonePreference2] = useState<ToneType | null>(null);
  const [tonePreference3, setTonePreference3] = useState<ToneType | null>(null);

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
      const colorPreferences = [
        colorPreference1.length > 0 ? colorPreference1 : null,
        colorPreference2.length > 0 ? colorPreference2 : null,
        colorPreference3.length > 0 ? colorPreference3 : null,
      ].filter((c): c is ColorType[] => c !== null);

      const tonePreferences = [tonePreference1, tonePreference2, tonePreference3].filter(
        (t): t is ToneType => t !== null
      );

      const patternPreferences = [patternPreference1, patternPreference2, patternPreference3].filter(
        (p): p is PatternType => p !== null
      );

      const result = await createEventMutation.mutateAsync({
        name: name.trim(),
        eventDate: new Date(eventDate).toISOString(),
        conditions: {
          colorPreferences: colorPreferences.length > 0 ? colorPreferences : undefined,
          tonePreferences: tonePreferences.length > 0 ? tonePreferences : undefined,
          patternPreferences: patternPreferences.length > 0 ? patternPreferences : undefined,
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

  const renderColorSelector = (
    label: string,
    selectedColors: ColorType[],
    setSelectedColors: (colors: ColorType[]) => void
  ) => {
    // Show placeholder when no colors are selected
    const hasSelection = selectedColors.length > 0;
    
    return (
    <View style={styles.preferenceSection}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {!hasSelection && (
        <ThemedText style={{ color: colors.textSecondary, fontSize: 14, marginTop: Spacing.s }}>
          色を選択してください
        </ThemedText>
      )}
      <View style={styles.colorGrid}>
        {COLOR_OPTIONS.map((color) => (
          <Pressable
            key={color.value}
            onPress={() => {
              const isSelected = selectedColors.includes(color.value);
              if (isSelected) {
                setSelectedColors(selectedColors.filter((c) => c !== color.value));
              } else {
                setSelectedColors([...selectedColors, color.value]);
              }
            }}
            style={[
              styles.colorOption,
              {
                backgroundColor: color.hex,
                borderWidth: selectedColors.includes(color.value) ? 3 : 1,
                borderColor: selectedColors.includes(color.value) ? colors.text : colors.border,
              },
            ]}
          >
            {selectedColors.includes(color.value) && (
              <ThemedText style={{ fontSize: 18 }}>✓</ThemedText>
            )}
          </Pressable>
        ))}
      </View>
      {selectedColors.length > 0 && (
        <View style={styles.selectedChips}>
          {selectedColors.map((color) => (
            <View
              key={color}
              style={[
                styles.chip,
                {
                  backgroundColor: COLOR_OPTIONS.find((c) => c.value === color)?.hex || "#ccc",
                },
              ]}
            >
              <ThemedText style={{ fontSize: 12, color: "#fff" }}>
                {COLOR_OPTIONS.find((c) => c.value === color)?.label}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
    );
  };

  const renderToneSelector = (
    label: string,
    selectedTone: ToneType | null,
    setSelectedTone: (tone: ToneType | null) => void
  ) => (
    <View style={styles.preferenceSection}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <View style={styles.optionGrid}>
        <Pressable
          onPress={() => setSelectedTone(null)}
          style={[
            styles.optionButton,
            {
              backgroundColor: selectedTone === null ? colors.tint : colors.card,
            },
          ]}
        >
          <ThemedText style={{ color: selectedTone === null ? "#fff" : colors.text }}>
            指定なし
          </ThemedText>
        </Pressable>
        {TONE_OPTIONS.map((tone) => (
          <Pressable
            key={tone.value}
            onPress={() => setSelectedTone(tone.value)}
            style={[
              styles.optionButton,
              {
                backgroundColor: selectedTone === tone.value ? colors.tint : colors.card,
              },
            ]}
          >
            <ThemedText style={{ color: selectedTone === tone.value ? "#fff" : colors.text }}>
              {tone.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderPatternSelector = (
    label: string,
    selectedPattern: PatternType | null,
    setSelectedPattern: (pattern: PatternType | null) => void
  ) => (
    <View style={styles.preferenceSection}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <View style={styles.optionGrid}>
        <Pressable
          onPress={() => setSelectedPattern(null)}
          style={[
            styles.optionButton,
            {
              backgroundColor: selectedPattern === null ? colors.tint : colors.card,
            },
          ]}
        >
          <ThemedText style={{ color: selectedPattern === null ? "#fff" : colors.text }}>
            指定なし
          </ThemedText>
        </Pressable>
        {PATTERN_OPTIONS.map((pattern) => (
          <Pressable
            key={pattern.value}
            onPress={() => setSelectedPattern(pattern.value)}
            style={[
              styles.optionButton,
              {
                backgroundColor: selectedPattern === pattern.value ? colors.tint : colors.card,
              },
            ]}
          >
            <ThemedText style={{ color: selectedPattern === pattern.value ? "#fff" : colors.text }}>
              {pattern.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

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
            placeholder="例: 2024-05-15"
            placeholderTextColor={colors.textDisabled}
            value={eventDate}
            onChangeText={setEventDate}
          />
        </View>

        {/* Presets */}
        <View style={styles.presetsSection}>
          <ThemedText type="subtitle">プリセット</ThemedText>
          <View style={styles.presetButtons}>
            {EVENT_PRESETS.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => {
                  setSelectedPreset(preset);
                  if (preset.conditions.specificColors) {
                    setColorPreference1(preset.conditions.specificColors as ColorType[]);
                  }
                  if (preset.conditions.tone) {
                    setTonePreference1(preset.conditions.tone as ToneType);
                  }
                  if (preset.conditions.patternRules?.patternPreferences?.[0]) {
                    setPatternPreference1(preset.conditions.patternRules.patternPreferences[0] as PatternType);
                  }
                }}
                style={[
                  styles.presetButton,
                  {
                    backgroundColor:
                      selectedPreset?.name === preset.name ? colors.tint : colors.card,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: selectedPreset?.name === preset.name ? "#fff" : colors.text,
                  }}
                >
                  {preset.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Color Preferences */}
        <View style={styles.section}>
          <ThemedText type="subtitle">色の希望</ThemedText>
          {renderColorSelector("第1希望", colorPreference1, setColorPreference1)}
          {renderColorSelector("第2希望", colorPreference2, setColorPreference2)}
          {renderColorSelector("第3希望", colorPreference3, setColorPreference3)}
        </View>

        {/* Tone Preferences */}
        <View style={styles.section}>
          <ThemedText type="subtitle">トーンの希望</ThemedText>
          {renderToneSelector("第1希望", tonePreference1, setTonePreference1)}
          {renderToneSelector("第2希望", tonePreference2, setTonePreference2)}
          {renderToneSelector("第3希望", tonePreference3, setTonePreference3)}
        </View>

        {/* Pattern Preferences */}
        <View style={styles.section}>
          <ThemedText type="subtitle">柄の希望</ThemedText>
          {renderPatternSelector("第1希望", patternPreference1, setPatternPreference1)}
          {renderPatternSelector("第2希望", patternPreference2, setPatternPreference2)}
          {renderPatternSelector("第3希望", patternPreference3, setPatternPreference3)}
        </View>

        {/* Create Button */}
        <Pressable
          onPress={createEvent}
          disabled={loading}
          style={[
            styles.createButton,
            {
              backgroundColor: colors.tint,
              opacity: loading ? 0.6 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>
              イベントを作成
            </ThemedText>
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
    paddingHorizontal: Spacing.m,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.l,
  },
  inputSection: {
    marginBottom: Spacing.l,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    marginTop: Spacing.s,
  },
  presetsSection: {
    marginBottom: Spacing.l,
  },
  presetButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  presetButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.button,
  },
  section: {
    marginBottom: Spacing.l,
  },
  preferenceSection: {
    marginBottom: Spacing.m,
    paddingBottom: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  colorOption: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: BorderRadius.button,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  chip: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.button,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  optionButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.s,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  createButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    marginTop: Spacing.l,
  },
});
