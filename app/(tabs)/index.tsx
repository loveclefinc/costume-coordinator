import { StyleSheet, View, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

interface Costume {
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

const COSTUMES_STORAGE_KEY = "costumes";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [costumes, setCostumes] = useState<Costume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCostumes();
  }, []);

  const loadCostumes = async () => {
    try {
      const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      if (data) {
        setCostumes(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load costumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCostume = () => {
    router.push("/add-costume" as any);
  };

  const handleViewCostumes = () => {
    router.push("/costumes-list" as any);
  };

  const handleCostumePress = (costume: Costume) => {
    router.push(`/costume-detail?id=${costume.id}` as any);
  };

  const renderCostumeCard = ({ item }: { item: Costume }) => (
    <Pressable
      style={[styles.costumeCard, { backgroundColor: colors.card }]}
      onPress={() => handleCostumePress(item)}
    >
      <View style={[styles.thumbnail, { backgroundColor: colors.border }]}>
        <ThemedText style={styles.thumbnailPlaceholder}>📷</ThemedText>
      </View>
      <ThemedText style={styles.costumeName} numberOfLines={2}>
        {item.name}
      </ThemedText>
      <View style={[styles.colorIndicator, { backgroundColor: item.colors.primary }]} />
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <ThemedText type="title" style={styles.emptyTitle}>
        衣装を追加しましょう
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
        写真を撮影または選択して、{"\n"}あなたの衣装コレクションを始めましょう
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: colors.tint }]}
        onPress={handleAddCostume}
      >
        <ThemedText style={styles.emptyButtonText}>最初の衣装を追加</ThemedText>
      </Pressable>
    </View>
  );

  if (loading) {
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
        <ThemedText type="title">My Costumes</ThemedText>
        <Pressable onPress={handleViewCostumes}>
          <ThemedText style={{ fontSize: 24 }}>👗</ThemedText>
        </Pressable>
      </View>

      {costumes.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={costumes}
          renderItem={renderCostumeCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.m) + 72, // FAB height + margin
            },
          ]}
          columnWrapperStyle={styles.row}
        />
      )}

      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.tint,
            bottom: Math.max(insets.bottom, Spacing.m) + 56, // Tab bar height
            right: Spacing.m,
          },
        ]}
        onPress={handleAddCostume}
      >
        <ThemedText style={styles.fabIcon}>+</ThemedText>
      </Pressable>
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
  grid: {
    padding: Spacing.m,
  },
  row: {
    justifyContent: "space-between",
  },
  costumeCard: {
    width: "48%",
    borderRadius: BorderRadius.card,
    padding: Spacing.s,
    marginBottom: Spacing.m,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.thumbnail,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.s,
  },
  thumbnailPlaceholder: {
    fontSize: 48,
  },
  costumeName: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  colorIndicator: {
    height: 8,
    borderRadius: 4,
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
  emptyButton: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.button,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "300",
  },
});
