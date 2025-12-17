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

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [colorCategory, setColorCategory] = useState<"warm" | "cool" | "neutral" | null>(null);
  const [tone, setTone] = useState<"pastel" | "vivid" | "dark" | "neutral" | null>(null);
  const [allowFloral, setAllowFloral] = useState(true);
  const [floralMaxCount, setFloralMaxCount] = useState("");
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
      const result = await createEventMutation.mutateAsync({
        name: name.trim(),
        eventDate: new Date(eventDate).toISOString(),
        conditions: {
          colorCategory: colorCategory || undefined,
          tone: tone || undefined,
          patternRules: {
            allowFloral,
            floralMaxCount: floralMaxCount ? parseInt(floralMaxCount, 10) : undefined,
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

        {/* Floral Pattern Settings */}
        <View style={styles.inputSection}>
          <View style={styles.switchRow}>
            <ThemedText type="subtitle">花柄を許可</ThemedText>
            <Switch
              value={allowFloral}
              onValueChange={setAllowFloral}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor="#FFFFFF"
            />
          </View>
          {allowFloral && (
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: colors.border,
                  marginTop: Spacing.s,
                },
              ]}
              placeholder="花柄の最大人数 (空欄=制限なし)"
              placeholderTextColor={colors.textDisabled}
              value={floralMaxCount}
              onChangeText={setFloralMaxCount}
              keyboardType="number-pad"
            />
          )}
        </View>

        {/* Avoid Similar Colors */}
        <View style={styles.inputSection}>
          <View style={styles.switchRow}>
            <ThemedText type="subtitle">類似色を回避</ThemedText>
            <Switch
              value={avoidSimilarColors}
              onValueChange={setAvoidSimilarColors}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor="#FFFFFF"
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
    borderRadius: BorderRadius.button,
    borderWidth: 1,
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
});
