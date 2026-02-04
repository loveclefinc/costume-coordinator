import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
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
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorNameToHex, type ColorName } from "@/lib/color-utils";
import { Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";

const COSTUMES_STORAGE_KEY = "costumes";
const EVENTS_STORAGE_KEY = "events";
const PARTICIPANTS_STORAGE_KEY = "event_participants";
const SELECTED_COSTUMES_STORAGE_KEY = "event_selected_costumes";

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

interface Participant {
  id: string;
  name: string;
  instrument: string;
  photoUri?: string;
  selectedCostumeId?: string;
  selectedCostumeName?: string;
  selectedCostumeImage?: string;
  createdAt: string;
}

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams();
  const eventId = parseInt(params.id as string, 10);

  const [costumes, setCostumes] = useState<CostumeData[]>([]);
  const [selectedCostumes, setSelectedCostumes] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [participantInstrument, setParticipantInstrument] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: event, isLoading: eventLoading } = trpc.events.list.useQuery();
  const currentEvent = event?.find((e) => e.id === eventId);
  const submitCostumesMutation = trpc.costumes.submit.useMutation();
  const runOptimizationMutation = trpc.optimization.run.useMutation();

  useEffect(() => {
    loadCostumes();
    loadParticipants();
  }, []);

  const loadCostumes = async () => {
    try {
      const data = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      if (data) {
        setCostumes(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load costumes:", error);
    }
  };

  const loadParticipants = async () => {
    try {
      const key = `event_participants_${eventId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        setParticipants(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load participants:", error);
    }
  };

  const saveParticipants = async (newParticipants: Participant[]) => {
    try {
      const key = `event_participants_${eventId}`;
      await AsyncStorage.setItem(key, JSON.stringify(newParticipants));
      setParticipants(newParticipants);
    } catch (error) {
      console.error("Failed to save participants:", error);
    }
  };

  const addParticipant = async () => {
    if (!participantName.trim() || !participantInstrument.trim()) {
      Alert.alert("入力エラー", "名前と楽器を入力してください");
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: participantName.trim(),
      instrument: participantInstrument.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedParticipants = [...participants, newParticipant];
    await saveParticipants(updatedParticipants);
    setParticipantName("");
    setParticipantInstrument("");
    setShowAddParticipant(false);
  };

  const removeParticipant = async (participantId: string) => {
    const updatedParticipants = participants.filter((p) => p.id !== participantId);
    await saveParticipants(updatedParticipants);
  };

  const pickParticipantPhoto = async (participantId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const updatedParticipants = participants.map((p) =>
          p.id === participantId
            ? { ...p, photoUri: result.assets[0].uri }
            : p
        );
        await saveParticipants(updatedParticipants);
      }
    } catch (error) {
      console.error("Failed to pick photo:", error);
      Alert.alert("エラー", "写真の選択に失敗しました");
    }
  };

  const updateParticipantCostume = async (
    participantId: string,
    costumeId: string,
    costumeName: string,
    costumeImage: string
  ) => {
    const updatedParticipants = participants.map((p) =>
      p.id === participantId
        ? {
            ...p,
            selectedCostumeId: costumeId,
            selectedCostumeName: costumeName,
            selectedCostumeImage: costumeImage,
          }
        : p
    );
    await saveParticipants(updatedParticipants);
  };

  const toggleCostumeSelection = (costumeId: string) => {
    setSelectedCostumes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(costumeId)) {
        newSet.delete(costumeId);
      } else {
        if (newSet.size >= 30) {
          Alert.alert("選択上限", "最大30着まで選択できます");
          return prev;
        }
        newSet.add(costumeId);
      }
      return newSet;
    });
  };

  const submitCostumes = async () => {
    if (selectedCostumes.size === 0) {
      Alert.alert("選択エラー", "少なくとも1着の衣装を選択してください");
      return;
    }

    setLoading(true);

    try {
      const selectedCostumeData = costumes.filter((c) => selectedCostumes.has(c.id));

      const snapshots = selectedCostumeData.map((costume, index) => ({
        costumeData: {
          name: costume.name,
          colors: costume.colors,
          colorCategory: costume.colorCategory,
          tone: costume.tone,
          pattern: costume.pattern,
          tags: costume.tags,
          lastUsedDate: costume.usageHistory[0]?.date || undefined,
        },
        priority: index + 1, // Simple priority based on order
        thumbnailUrl: undefined, // In a real app, upload thumbnail to server
      }));

      await submitCostumesMutation.mutateAsync({
        eventId,
        costumes: snapshots,
      });

      Alert.alert("提出完了", "衣装を提出しました");
    } catch (error) {
      console.error("Failed to submit costumes:", error);
      Alert.alert("エラー", "衣装の提出に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const runOptimization = async () => {
    setLoading(true);

    try {
      const result = await runOptimizationMutation.mutateAsync({ eventId });

      Alert.alert(
        "最適化完了",
        `${result.proposals.length}件の提案を生成しました`,
        [
          {
            text: "結果を見る",
            onPress: () => {
              // Navigate to optimization results screen
              router.push(`/optimization-results?eventId=${eventId}` as any);
            },
          },
        ],
      );
    } catch (error) {
      console.error("Failed to run optimization:", error);
      Alert.alert("エラー", "最適化の実行に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const shareEventInfo = async () => {
    try {
      const conditions = currentEvent?.conditions || {};
      const message = `イベント: ${currentEvent?.name}\n日程: ${currentEvent?.eventDate}\n参加者: ${participants.length}名`;

      await Share.share({
        message,
        title: "イベント情報を共有",
      });
    } catch (error) {
      console.error("Failed to share event info:", error);
      Alert.alert("エラー", "共有に失敗しました");
    }
  };

  const generatePDF = async () => {
    try {
      if (participants.length === 0) {
        Alert.alert("警告", "参加者が登録されていません");
        return;
      }

      let pdfContent = `衣装情報レポート\n`;
      pdfContent += `イベント: ${currentEvent?.name}\n`;
      pdfContent += `開催日: ${new Date(currentEvent?.eventDate || "").toLocaleDateString("ja-JP")}\n`;
      pdfContent += `\n参加者衣装情報:\n\n`;

      for (const participant of participants) {
        pdfContent += `${participant.name}\n`;
        pdfContent += `  楽器: ${participant.instrument}\n`;
        if (participant.selectedCostumeName) {
          pdfContent += `  衣装: ${participant.selectedCostumeName}\n`;
        }
        pdfContent += `\n`;
      }

      const fileName = `costume_info_${currentEvent?.id}_${Date.now()}.txt`;
      const filePath = `/tmp/${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, pdfContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/plain",
          dialogTitle: "衣装情報を共有",
        });
      } else {
        let message = `衣装情報 - ${currentEvent?.name}\n\n`;
        for (const participant of participants) {
          message += `${participant.name} (楽器: ${participant.instrument})`;
          if (participant.selectedCostumeName) {
            message += ` - 衣装: ${participant.selectedCostumeName}`;
          }
          message += `\n`;
        }
        await Share.share({
          message,
          title: "衣装情報を共有",
        });
      }
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      Alert.alert("エラー", "PDF生成に失敗しました");
    }
  };

  const exportParticipantsCostumesToPDF = async () => {
    try {
      if (participants.length === 0) {
        Alert.alert("警告", "参加者が登録されていません");
        return;
      }

      let message = `衣装情報 - ${currentEvent?.name}\n\n`;
      for (const participant of participants) {
        message += `${participant.name} (楽器: ${participant.instrument})\n`;
      }

      await Share.share({
        message,
        title: "衣装情報を共有",
      });

      Alert.alert("成功", "衣装情報を共有しました");
    } catch (error) {
      console.error("Failed to export:", error);
      Alert.alert("エラー", "共有に失敗しました");
    }
  };

  const renderCostumeCard = ({ item }: { item: CostumeData }) => {
    const isSelected = selectedCostumes.has(item.id);

    return (
      <Pressable
        style={[
          styles.costumeCard,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => toggleCostumeSelection(item.id)}
      >
        <Image source={{ uri: item.thumbnailUri }} style={styles.thumbnail} />
        <View style={styles.costumeInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.name}
          </ThemedText>
          <View style={styles.colorIndicator}>
            <View style={[styles.colorDot, { backgroundColor: item.colors.primary }]} />
            <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
              {item.pattern}
            </ThemedText>
          </View>
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.tint }]}>
            <ThemedText style={{ color: "#FFFFFF" }}>✓</ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  if (eventLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!currentEvent) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyState}>
          <ThemedText type="title">イベントが見つかりません</ThemedText>
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
          },
        ]}
      >
        <Pressable onPress={() => router.back()}>
          <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
        </Pressable>
        <ThemedText type="subtitle" numberOfLines={1} style={{ flex: 1, marginLeft: Spacing.m }}>
          {currentEvent.name}
        </ThemedText>
      </View>

      {/* Event Info */}
      <View style={[styles.eventInfo, { backgroundColor: colors.card }]}>
        <View style={styles.infoRow}>
          <ThemedText style={{ color: colors.textSecondary }}>📅 開催日:</ThemedText>
          <ThemedText>{new Date(currentEvent.eventDate).toLocaleDateString("ja-JP")}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={{ color: colors.textSecondary }}>👥 参加者:</ThemedText>
          <ThemedText>{participants.length}人</ThemedText>
        </View>
        
        {/* Color Category */}
        {currentEvent.conditions?.colorCategory && (
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>🎨 色系統:</ThemedText>
            <ThemedText>{currentEvent.conditions.colorCategory}</ThemedText>
          </View>
        )}
        
        {/* Tone */}
        {currentEvent.conditions?.tone && (
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>🎵 トーン:</ThemedText>
            <ThemedText>{currentEvent.conditions.tone}</ThemedText>
          </View>
        )}
        
        {/* Specific Colors */}
        {currentEvent.conditions?.specificColors && currentEvent.conditions.specificColors.length > 0 && (
          <View style={styles.infoColumn}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 8 }}>🎨 指定色:</ThemedText>
            <View style={styles.colorChips}>
              {currentEvent.conditions.specificColors.map((colorName: string) => (
                <View
                  key={colorName}
                  style={[
                    styles.colorChip,
                    { backgroundColor: colorNameToHex(colorName as ColorName) },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Pattern Preferences */}
        {currentEvent.conditions?.patternRules?.patternPreferences && currentEvent.conditions.patternRules.patternPreferences.length > 0 && (
          <View style={styles.infoColumn}>
            <ThemedText style={{ color: colors.textSecondary, marginBottom: 8 }}>👗 柄希望:</ThemedText>
            <View style={styles.patternTags}>
              {currentEvent.conditions.patternRules.patternPreferences.map((pattern: string, index: number) => (
                <View key={pattern} style={[styles.patternTag, { backgroundColor: colors.elevated }]}>
                  <ThemedText style={{ fontSize: 12 }}>
                    {index + 1}. {pattern}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Participants Section */}
      <View style={[styles.section, { backgroundColor: colors.card, marginHorizontal: Spacing.m, marginTop: Spacing.m, borderRadius: BorderRadius.card, padding: Spacing.m }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.m }}>
          <ThemedText type="subtitle">参加者管理</ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => setShowAddParticipant(!showAddParticipant)}
          >
            <ThemedText style={{ color: "#FFFFFF", fontSize: 16 }}>+</ThemedText>
          </Pressable>
        </View>

        {showAddParticipant && (
          <View style={{ marginBottom: Spacing.m, gap: Spacing.s }}>
            <TextInput
              placeholder="名前を入力"
              value={participantName}
              onChangeText={setParticipantName}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholderTextColor={colors.textSecondary}
            />
            <TextInput
              placeholder="担当楽器を入力（例：バイオリン）"
              value={participantInstrument}
              onChangeText={setParticipantInstrument}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              placeholderTextColor={colors.textSecondary}
            />
            <Pressable
              style={[styles.addButton, { backgroundColor: colors.tint, paddingVertical: Spacing.m }]}
              onPress={addParticipant}
            >
              <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>参加者を追加</ThemedText>
            </Pressable>
          </View>
        )}

        {participants.length > 0 && (
          <View style={{ gap: Spacing.s }}>
            {participants.map((participant) => (
              <View
                key={participant.id}
                style={[styles.participantCard, { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, flexDirection: "row", alignItems: "center" }]}
              >
                {participant.photoUri && (
                  <Image
                    source={{ uri: participant.photoUri }}
                    style={{ width: 50, height: 50, borderRadius: 25, marginRight: Spacing.m }}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{participant.name}</ThemedText>
                  <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>{participant.instrument}</ThemedText>
                  {participant.selectedCostumeName && (
                    <ThemedText style={{ color: colors.tint, fontSize: 11, marginTop: 2 }}>衣装: {participant.selectedCostumeName}</ThemedText>
                  )}
                </View>
                <Pressable
                  onPress={() => pickParticipantPhoto(participant.id)}
                  style={{ padding: Spacing.s }}
                >
                  <ThemedText style={{ fontSize: 16 }}>📷</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => removeParticipant(participant.id)}
                  style={{ padding: Spacing.s }}
                >
                  <ThemedText style={{ color: "#FF3B30", fontSize: 16 }}>×</ThemedText>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Costume Selection */}
      <View style={styles.selectionHeader}>
        <ThemedText type="subtitle">衣装を選択 ({selectedCostumes.size}/30)</ThemedText>
      </View>

      <FlatList
        data={costumes}
        renderItem={renderCostumeCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.costumeGrid,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m) + 120,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.textSecondary }}>
              衣装が登録されていません
            </ThemedText>
          </View>
        }
      />

      {/* Action Buttons */}
      <View
        style={[
          styles.actionButtons,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m),
            backgroundColor: colors.elevated,
          },
        ]}
      >
        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: colors.tint },
            loading && { opacity: 0.6 },
          ]}
          onPress={submitCostumes}
          disabled={loading || selectedCostumes.size === 0}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.actionButtonText}>衣装を提出</ThemedText>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: colors.secondary },
            loading && { opacity: 0.6 },
          ]}
          onPress={runOptimization}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.actionButtonText}>最適化実行</ThemedText>
          )}
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: "#666666" },
          ]}
          onPress={shareEventInfo}
        >
          <ThemedText style={styles.actionButtonText}>共有</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: "#FF6B6B" },
          ]}
          onPress={generatePDF}
        >
          <ThemedText style={styles.actionButtonText}>PDF出力</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: "#FF9500" },
          ]}
          onPress={exportParticipantsCostumesToPDF}
        >
          <ThemedText style={styles.actionButtonText}>参加者情報を出力</ThemedText>
        </Pressable>
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
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  eventInfo: {
    padding: Spacing.m,
    gap: Spacing.s,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoColumn: {
    gap: Spacing.xs,
  },
  colorChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  patternTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  patternTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.button,
  },
  selectionHeader: {
    padding: Spacing.m,
  },
  costumeGrid: {
    padding: Spacing.s,
  },
  costumeCard: {
    flex: 1,
    margin: Spacing.s,
    borderRadius: BorderRadius.card,
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  costumeInfo: {
    padding: Spacing.s,
  },
  colorIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  checkmark: {
    position: "absolute",
    top: Spacing.s,
    right: Spacing.s,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.m,
    padding: Spacing.m,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
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
  section: {
    marginVertical: Spacing.s,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    fontSize: 14,
  },
  addButton: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
  },
  smallButton: {
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
  },
});
