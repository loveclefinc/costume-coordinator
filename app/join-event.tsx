import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import { trpc } from "@/lib/trpc";

export default function JoinEventScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams();

  // Extract invite code from URL if present
  const initialInviteCode = (params.inviteCode as string) || "";

  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [loading, setLoading] = useState(false);
  const [eventInfo, setEventInfo] = useState<any>(null);

  const joinEventMutation = trpc.events.join.useMutation();

  const fetchEventInfo = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("入力エラー", "招待コードを入力してください");
      return;
    }

    setLoading(true);

    try {
      // Fetch event info using a simple approach
      // In a real app, you would use the tRPC query properly
      // For now, we'll simulate fetching
      const mockEvent = {
        id: 1,
        name: "Spring Concert 2025",
        eventDate: new Date().toISOString(),
        conditions: {
          colorCategory: "warm",
          tone: "pastel",
        },
      };

      setEventInfo(mockEvent);
    } catch (error) {
      console.error("Failed to fetch event:", error);
      Alert.alert("エラー", "招待コードが見つかりません");
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async () => {
    setLoading(true);

    try {
      await joinEventMutation.mutateAsync({
        inviteCode: inviteCode.trim(),
      });

      Alert.alert("参加完了", `${eventInfo.name}に参加しました`, [
        {
          text: "OK",
          onPress: () => {
            router.push("/(tabs)/events" as any);
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to join event:", error);
      Alert.alert("エラー", "イベントへの参加に失敗しました");
    } finally {
      setLoading(false);
    }
  };

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
          <ThemedText type="title">イベントに参加</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionSection}>
          <ThemedText type="subtitle">招待コードを入力</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.s }}>
            イベント主催者から受け取った招待コードを入力してください
          </ThemedText>
        </View>

        {/* Invite Code Input */}
        <View style={styles.inputSection}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="招待コードを入力"
            placeholderTextColor={colors.textDisabled}
            value={inviteCode}
            onChangeText={setInviteCode}
            editable={!loading}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Fetch Button */}
        <Pressable
          style={[
            styles.fetchButton,
            { backgroundColor: colors.tint },
            loading && { opacity: 0.6 },
          ]}
          onPress={fetchEventInfo}
          disabled={loading || !inviteCode.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.fetchButtonText}>イベント情報を確認</ThemedText>
          )}
        </Pressable>

        {/* Event Info Display */}
        {eventInfo && (
          <View style={[styles.eventInfoSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle">{eventInfo.name}</ThemedText>

            <View style={[styles.infoRow, { marginTop: Spacing.m }]}>
              <ThemedText style={{ color: colors.textSecondary }}>📅 開催日:</ThemedText>
              <ThemedText>{new Date(eventInfo.eventDate).toLocaleDateString("ja-JP")}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={{ color: colors.textSecondary }}>👥 参加者:</ThemedText>
              <ThemedText>0人</ThemedText>
            </View>

            {eventInfo.conditions?.colorCategory && (
              <View style={styles.infoRow}>
                <ThemedText style={{ color: colors.textSecondary }}>🎨 色系統:</ThemedText>
                <ThemedText>{eventInfo.conditions.colorCategory}</ThemedText>
              </View>
            )}

            {eventInfo.conditions?.tone && (
              <View style={styles.infoRow}>
                <ThemedText style={{ color: colors.textSecondary }}>✨ トーン:</ThemedText>
                <ThemedText>{eventInfo.conditions.tone}</ThemedText>
              </View>
            )}

            {/* Join Button */}
            <Pressable
              style={[
                styles.joinButton,
                { backgroundColor: colors.tint },
                loading && { opacity: 0.6 },
              ]}
              onPress={joinEvent}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.joinButtonText}>このイベントに参加</ThemedText>
              )}
            </Pressable>
          </View>
        )}

        {/* Alternative: Direct URL */}
        <View style={styles.alternativeSection}>
          <ThemedText style={{ color: colors.textSecondary, textAlign: "center" }}>
            または、招待URLをタップしてください
          </ThemedText>
        </View>
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
  instructionSection: {
    marginBottom: Spacing.l,
  },
  inputSection: {
    marginBottom: Spacing.l,
  },
  input: {
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    fontSize: 16,
  },
  fetchButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    marginBottom: Spacing.l,
  },
  fetchButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  eventInfoSection: {
    padding: Spacing.l,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.s,
  },
  joinButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    marginTop: Spacing.l,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  alternativeSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.l,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
});
