import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function CostumesListScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [costumes, setCostumes] = useState<CostumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "warm" | "cool" | "neutral">("all");

  useEffect(() => {
    loadCostumes();
  }, []);

  const loadCostumes = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      if (data) {
        const parsedCostumes: CostumeData[] = JSON.parse(data);
        setCostumes(parsedCostumes);
      }
    } catch (error) {
      console.error("Failed to load costumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCostumes =
    filter === "all"
      ? costumes
      : costumes.filter((costume) => costume.colorCategory === filter);

  const renderCostumeCard = ({ item }: { item: CostumeData }) => (
    <Pressable
      style={[styles.costumeCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/costume-detail?id=${item.id}` as any)}
    >
      <Image source={{ uri: item.imageUri }} style={styles.costumeImage} />
      <View style={styles.costumeInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {item.name}
        </ThemedText>
        <View style={styles.colorBadge}>
          <View
            style={[
              styles.colorDot,
              {
                backgroundColor: item.colors.primary,
              },
            ]}
          />
          <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
            {item.colorCategory}
          </ThemedText>
        </View>
        <ThemedText style={{ color: colors.textSecondary, fontSize: 12, marginTop: Spacing.s }}>
          {item.pattern}
        </ThemedText>
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
          衣装一覧
        </ThemedText>
        <Pressable onPress={() => router.push("/add-costume" as any)}>
          <ThemedText style={{ fontSize: 24 }}>+</ThemedText>
        </Pressable>
      </View>

      {/* Filter Buttons */}
      <View
        style={[
          styles.filterSection,
          {
            backgroundColor: colors.elevated,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === "all" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilter("all")}
        >
          <ThemedText
            style={{
              color: filter === "all" ? "#FFFFFF" : colors.text,
              fontSize: 14,
            }}
          >
            すべて
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === "warm" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilter("warm")}
        >
          <ThemedText
            style={{
              color: filter === "warm" ? "#FFFFFF" : colors.text,
              fontSize: 14,
            }}
          >
            暖色系
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === "cool" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilter("cool")}
        >
          <ThemedText
            style={{
              color: filter === "cool" ? "#FFFFFF" : colors.text,
              fontSize: 14,
            }}
          >
            寒色系
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            styles.filterButton,
            {
              backgroundColor: filter === "neutral" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setFilter("neutral")}
        >
          <ThemedText
            style={{
              color: filter === "neutral" ? "#FFFFFF" : colors.text,
              fontSize: 14,
            }}
          >
            中間色
          </ThemedText>
        </Pressable>
      </View>

      {/* Costumes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : filteredCostumes.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={{ fontSize: 48 }}>👗</ThemedText>
          <ThemedText type="subtitle" style={{ marginTop: Spacing.m }}>
            衣装がまだありません
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.s }}>
            衣装を追加して始めましょう
          </ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/add-costume" as any)}
          >
            <ThemedText style={styles.addButtonText}>衣装を追加</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredCostumes}
          renderItem={renderCostumeCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
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
  filterSection: {
    flexDirection: "row",
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  filterButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
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
  addButton: {
    marginTop: Spacing.l,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.button,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.m,
  },
  columnWrapper: {
    gap: Spacing.m,
  },
  costumeCard: {
    flex: 1,
    borderRadius: BorderRadius.card,
    overflow: "hidden",
  },
  costumeImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  costumeInfo: {
    padding: Spacing.m,
  },
  colorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CCCCCC",
  },
});
