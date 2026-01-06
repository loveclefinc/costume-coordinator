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
  wearingPhotos?: string[];
  colors: {
    primary: string;
    secondary?: string;
  };
  colorCategory: "warm" | "cool" | "neutral";
  tone: "pastel" | "vivid" | "dark" | "neutral";
  pattern: "solid" | "floral" | "stripe" | "dot" | "check" | "geometric" | "animal" | "other";
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
  const [colorFilter, setColorFilter] = useState<"all" | "warm" | "cool" | "neutral">("all");
  const [patternFilter, setPatternFilter] = useState<"all" | "solid" | "floral" | "stripe" | "dot" | "check" | "geometric" | "animal" | "other">("all");
  const [toneFilter, setToneFilter] = useState<"all" | "pastel" | "vivid" | "dark" | "neutral">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredCostumes = costumes.filter((costume) => {
    const matchesColor = colorFilter === "all" || costume.colorCategory === colorFilter;
    const matchesPattern = patternFilter === "all" || costume.pattern === patternFilter;
    const matchesTone = toneFilter === "all" || costume.tone === toneFilter;
    const matchesSearch = searchQuery === "" || costume.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesColor && matchesPattern && matchesTone && matchesSearch;
  });

  const renderCostumeCard = ({ item }: { item: CostumeData }) => (
    <Pressable
      style={[styles.costumeCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/costume-detail?id=${item.id}` as any)}
    >
      <Image source={{ uri: item.imageUri }} style={styles.costumeImage} />
      
      {/* Wearing Photos Thumbnails */}
      {item.wearingPhotos && item.wearingPhotos.length > 0 && (
        <View style={styles.wearingPhotosThumbnails}>
          {item.wearingPhotos.slice(0, 3).map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={[
                styles.wearingPhotoThumbnail,
                { marginLeft: index > 0 ? -12 : 0 },
              ]}
            />
          ))}
          {item.wearingPhotos.length > 3 && (
            <View style={styles.morePhotosIndicator}>
              <ThemedText style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}>
                +{item.wearingPhotos.length - 3}
              </ThemedText>
            </View>
          )}
        </View>
      )}
      
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
              backgroundColor: colorFilter === "all" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setColorFilter("all")}
        >
          <ThemedText
            style={{
              color: colorFilter === "all" ? "#FFFFFF" : colors.text,
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
              backgroundColor: colorFilter === "warm" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setColorFilter("warm")}
        >
          <ThemedText
            style={{
              color: colorFilter === "warm" ? "#FFFFFF" : colors.text,
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
              backgroundColor: colorFilter === "cool" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setColorFilter("cool")}
        >
          <ThemedText
            style={{
              color: colorFilter === "cool" ? "#FFFFFF" : colors.text,
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
              backgroundColor: colorFilter === "neutral" ? colors.tint : colors.card,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setColorFilter("neutral")}
        >
          <ThemedText
            style={{
              color: colorFilter === "neutral" ? "#FFFFFF" : colors.text,
              fontSize: 14,
            }}
          >
            中間色
          </ThemedText>
        </Pressable>
      </View>

      {/* Tone Filter */}
      <View style={styles.filterSection}>
        <ThemedText style={{ fontSize: 14, fontWeight: "600", marginBottom: Spacing.s }}>
          トーンで絞り込み
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: toneFilter === "all" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setToneFilter("all")}
            >
              <ThemedText
                style={{
                  color: toneFilter === "all" ? "#FFFFFF" : colors.text,
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
                  backgroundColor: toneFilter === "pastel" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setToneFilter("pastel")}
            >
              <ThemedText
                style={{
                  color: toneFilter === "pastel" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                パステル
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: toneFilter === "vivid" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setToneFilter("vivid")}
            >
              <ThemedText
                style={{
                  color: toneFilter === "vivid" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                鮮やか
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: toneFilter === "dark" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setToneFilter("dark")}
            >
              <ThemedText
                style={{
                  color: toneFilter === "dark" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                深い
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: toneFilter === "neutral" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setToneFilter("neutral")}
            >
              <ThemedText
                style={{
                  color: toneFilter === "neutral" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                中立
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      {/* Pattern Filter */}
      <View style={styles.filterSection}>
        <ThemedText style={{ fontSize: 14, fontWeight: "600", marginBottom: Spacing.s }}>
          柄で絞り込み
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: patternFilter === "all" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPatternFilter("all")}
            >
              <ThemedText
                style={{
                  color: patternFilter === "all" ? "#FFFFFF" : colors.text,
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
                  backgroundColor: patternFilter === "solid" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPatternFilter("solid")}
            >
              <ThemedText
                style={{
                  color: patternFilter === "solid" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                無地
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: patternFilter === "floral" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPatternFilter("floral")}
            >
              <ThemedText
                style={{
                  color: patternFilter === "floral" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                花柄
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: patternFilter === "stripe" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPatternFilter("stripe")}
            >
              <ThemedText
                style={{
                  color: patternFilter === "stripe" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                ストライプ
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.filterButton,
                {
                  backgroundColor: patternFilter === "dot" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setPatternFilter("dot")}
            >
              <ThemedText
                style={{
                  color: patternFilter === "dot" ? "#FFFFFF" : colors.text,
                  fontSize: 14,
                }}
              >
                ドット
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
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
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.s,
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
  wearingPhotosThumbnails: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
    paddingRight: 8,
  },
  wearingPhotoThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  morePhotosIndicator: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
