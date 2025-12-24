import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const EVENT_HISTORY_STORAGE_KEY = "event_history";

interface EventHistoryItem {
  id: string;
  eventId: number;
  eventName: string;
  eventDate: string;
  participants: Array<{
    name: string;
    costumeName: string;
    costumeId: string;
  }>;
  createdAt: string;
}

export default function EventHistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [history, setHistory] = useState<EventHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(EVENT_HISTORY_STORAGE_KEY);
      if (data) {
        const parsedHistory: EventHistoryItem[] = JSON.parse(data);
        setHistory(parsedHistory.sort((a, b) => 
          new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
        ));
      }
    } catch (error) {
      console.error("Failed to load event history:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryCard = ({ item }: { item: EventHistoryItem }) => (
    <Pressable
      style={[styles.historyCard, { backgroundColor: colors.card }]}
      onPress={() => {
        // Navigate to event detail or show history detail
      }}
    >
      <View style={styles.historyHeader}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {item.eventName}
        </ThemedText>
        <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
          {new Date(item.eventDate).toLocaleDateString("ja-JP")}
        </ThemedText>
      </View>
      
      <View style={styles.participantsSection}>
        <ThemedText style={{ fontSize: 13, color: colors.textSecondary, marginBottom: Spacing.xs }}>
          参加者: {item.participants.length}人
        </ThemedText>
        {item.participants.slice(0, 3).map((participant, index) => (
          <View key={index} style={styles.participantRow}>
            <ThemedText style={{ fontSize: 12 }}>
              {participant.name}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: colors.textSecondary }}>
              {participant.costumeName}
            </ThemedText>
          </View>
        ))}
        {item.participants.length > 3 && (
          <ThemedText style={{ fontSize: 12, color: colors.textSecondary, marginTop: Spacing.xs }}>
            他 {item.participants.length - 3}人
          </ThemedText>
        )}
      </View>
    </Pressable>
  );

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
          イベント履歴
        </ThemedText>
      </View>

      {/* History List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={{ fontSize: 48 }}>📜</ThemedText>
          <ThemedText type="subtitle" style={{ marginTop: Spacing.m }}>
            履歴がまだありません
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.s }}>
            イベントを完了すると履歴が表示されます
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.m),
            },
          ]}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.l,
  },
  listContent: {
    padding: Spacing.m,
    gap: Spacing.m,
  },
  historyCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
  },
  historyHeader: {
    marginBottom: Spacing.m,
  },
  participantsSection: {
    gap: Spacing.xs,
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs / 2,
  },
});
