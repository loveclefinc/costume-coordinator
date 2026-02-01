import { StyleSheet, View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  // Allow local mode - fetch events only if authenticated
  const { data: events, isLoading, refetch } = trpc.events.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Load local events from AsyncStorage
  useEffect(() => {
    loadLocalEvents();
  }, []);

  const loadLocalEvents = async () => {
    try {
      const data = await AsyncStorage.getItem("local_events");
      if (data) {
        setLocalEvents(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load local events:", error);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  // Use server events if authenticated, otherwise use local events
  const displayEvents = isAuthenticated ? (events || []) : localEvents;

  const handleCreateEvent = () => {
    router.push("/create-event" as any);
  };

  const handleJoinByUrl = () => {
    router.push("/join-event" as any);
  };

  const handleConcertInfo = async () => {
    try {
      await WebBrowser.openBrowserAsync("https://concert-jp.info");
    } catch (error) {
      console.error("Failed to open concert info:", error);
    }
  };

  const handleEventPress = (eventId: number) => {
    router.push(`/event-detail?id=${eventId}` as any);
  };

  const renderEventCard = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.eventCard, { backgroundColor: colors.card }]}
      onPress={() => handleEventPress(item.id)}
    >
      <View style={styles.eventHeader}>
        <ThemedText type="subtitle">{item.name}</ThemedText>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: item.status === "active" ? colors.success : colors.textDisabled,
            },
          ]}
        >
          <ThemedText style={styles.statusText}>
            {item.status === "active" ? "進行中" : "終了"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.eventInfo}>
        <ThemedText style={{ color: colors.textSecondary }}>
          📅 {new Date(item.eventDate).toLocaleDateString("ja-JP")}
        </ThemedText>
        <ThemedText style={{ color: colors.textSecondary }}>
          👥 {item.participants?.length || 0}人
        </ThemedText>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText type="title" style={styles.emptyTitle}>
        イベントを作成または参加
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        新しいイベントを作成するか、{"\n"}招待URLから既存のイベントに参加しましょう
      </ThemedText>
      <View style={styles.emptyButtons}>
        <Pressable
          style={[styles.emptyButton, { backgroundColor: colors.tint }]}
          onPress={handleCreateEvent}
        >
          <ThemedText style={styles.emptyButtonText}>イベントを作成</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.emptyButton, { backgroundColor: colors.secondary }]}
          onPress={handleJoinByUrl}
        >
          <ThemedText style={styles.emptyButtonText}>URLから参加</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.emptyButton, { backgroundColor: colors.warning || "#FF9800" }]}
          onPress={handleConcertInfo}
        >
          <ThemedText style={styles.emptyButtonText}>🎤 コンサートを告知</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  if (authLoading || isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

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
        <ThemedText type="title">イベント</ThemedText>
        <View style={{ flexDirection: "row", gap: Spacing.m }}>
          <Pressable onPress={() => router.push("/event-history" as any)}>
            <ThemedText style={{ fontSize: 24 }}>📜</ThemedText>
          </Pressable>
          <Pressable onPress={handleCreateEvent}>
            <ThemedText style={{ fontSize: 32 }}>+</ThemedText>
          </Pressable>
        </View>
      </View>

      {displayEvents.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={displayEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.m),
            },
          ]}
        />
      )}

      {/* Action buttons */}
      {displayEvents.length > 0 && (
        <View
          style={[
            styles.bottomButtons,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.m) + 56,
              paddingHorizontal: Spacing.m,
            },
          ]}
        >
          <Pressable
            style={[styles.joinButton, { backgroundColor: colors.secondary }]}
            onPress={handleJoinByUrl}
          >
            <ThemedText style={styles.joinButtonText}>招待URLから参加</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.joinButton, { backgroundColor: colors.warning || "#FF9800" }]}
            onPress={handleConcertInfo}
          >
            <ThemedText style={styles.joinButtonText}>🎤 コンサートを告知</ThemedText>
          </Pressable>
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.m,
  },
  list: {
    padding: Spacing.m,
  },
  listContent: {
    padding: Spacing.m,
  },
  eventCard: {
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
    marginBottom: Spacing.m,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.s,
  },
  statusBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  eventInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  emptyTitle: {
    marginBottom: Spacing.m,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  emptyButtons: {
    gap: Spacing.m,
  },
  emptyButton: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.button,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    gap: Spacing.m,
  },
  joinButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
