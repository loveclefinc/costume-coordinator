import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Image,
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

interface OptimizationProposal {
  id: string;
  score: number;
  assignments: Array<{
    participantId: number;
    participantName: string;
    costumeId: number;
    costumeName: string;
    priority: number;
    thumbnailUrl?: string;
  }>;
  violations: string[];
}

export default function OptimizationResultsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const params = useLocalSearchParams();
  const eventId = parseInt(params.eventId as string, 10);

  const [selectedProposalIndex, setSelectedProposalIndex] = useState(0);
  const [proposals, setProposals] = useState<OptimizationProposal[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: event } = trpc.events.list.useQuery();
  const currentEvent = event?.find((e) => e.id === eventId);

  useEffect(() => {
    loadResults();
  }, [eventId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from server
      // For now, use mock data
      const mockProposals: OptimizationProposal[] = [
        {
          id: "proposal-1",
          score: 280,
          assignments: [
            {
              participantId: 1,
              participantName: "Alice",
              costumeId: 1,
              costumeName: "ピンクのドレス",
              priority: 1,
            },
            {
              participantId: 2,
              participantName: "Bob",
              costumeId: 5,
              costumeName: "紫のスーツ",
              priority: 2,
            },
          ],
          violations: [],
        },
        {
          id: "proposal-2",
          score: 260,
          assignments: [
            {
              participantId: 1,
              participantName: "Alice",
              costumeId: 2,
              costumeName: "赤いドレス",
              priority: 2,
            },
            {
              participantId: 2,
              participantName: "Bob",
              costumeId: 6,
              costumeName: "黒のスーツ",
              priority: 1,
            },
          ],
          violations: [],
        },
      ];
      setProposals(mockProposals);
    } catch (error) {
      console.error("Failed to load results:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderAssignmentCard = ({ item }: { item: OptimizationProposal["assignments"][0] }) => (
    <View style={[styles.assignmentCard, { backgroundColor: colors.card }]}>
      <View style={styles.assignmentHeader}>
        <ThemedText type="defaultSemiBold">{item.participantName}</ThemedText>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor: item.priority === 1 ? colors.success : colors.warning,
            },
          ]}
        >
          <ThemedText style={styles.priorityText}>第{item.priority}希望</ThemedText>
        </View>
      </View>
      <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.s }}>
        {item.costumeName}
      </ThemedText>
    </View>
  );

  const renderProposalTab = ({ item, index }: { item: OptimizationProposal; index: number }) => (
    <Pressable
      style={[
        styles.proposalTab,
        {
          backgroundColor: selectedProposalIndex === index ? colors.tint : colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={() => setSelectedProposalIndex(index)}
    >
      <ThemedText
        style={{
          color: selectedProposalIndex === index ? "#FFFFFF" : colors.text,
          fontWeight: "600",
        }}
      >
        提案{index + 1}
      </ThemedText>
      <ThemedText
        style={{
          color: selectedProposalIndex === index ? "#FFFFFF" : colors.textSecondary,
          fontSize: 12,
        }}
      >
        スコア: {item.score}
      </ThemedText>
    </Pressable>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (proposals.length === 0) {
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
          <Pressable onPress={() => router.back()}>
            <ThemedText style={{ fontSize: 24 }}>←</ThemedText>
          </Pressable>
          <ThemedText type="subtitle">最適化結果</ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ThemedText type="title">結果がありません</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.m }}>
            最適化を実行してください
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const currentProposal = proposals[selectedProposalIndex];

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
          最適化結果
        </ThemedText>
      </View>

      {/* Event Info */}
      {currentEvent && (
        <View style={[styles.eventInfo, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">{currentEvent.name}</ThemedText>
          <ThemedText style={{ color: colors.textSecondary, marginTop: Spacing.s }}>
            📅 {new Date(currentEvent.eventDate).toLocaleDateString("ja-JP")}
          </ThemedText>
        </View>
      )}

      {/* Proposal Tabs */}
      <FlatList
        data={proposals}
        renderItem={renderProposalTab}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.proposalTabs}
      />

      {/* Current Proposal Details */}
      <ScrollView
        contentContainerStyle={[
          styles.proposalDetails,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m),
          },
        ]}
      >
        {/* Score Section */}
        <View style={[styles.scoreSection, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">総合スコア</ThemedText>
          <View style={styles.scoreDisplay}>
            <ThemedText style={styles.scoreValue}>{currentProposal.score}</ThemedText>
            <ThemedText style={{ color: colors.textSecondary }}>点</ThemedText>
          </View>
        </View>

        {/* Assignments */}
        <View style={styles.assignmentsSection}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>
            衣装割り当て
          </ThemedText>
          <FlatList
            data={currentProposal.assignments}
            renderItem={renderAssignmentCard}
            keyExtractor={(item) => `${item.participantId}-${item.costumeId}`}
            scrollEnabled={false}
          />
        </View>

        {/* Violations */}
        {currentProposal.violations.length > 0 && (
          <View style={[styles.violationsSection, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={{ color: colors.error, marginBottom: Spacing.m }}>
              ⚠️ 制約違反
            </ThemedText>
            {currentProposal.violations.map((violation, index) => (
              <ThemedText
                key={index}
                style={{
                  color: colors.error,
                  marginBottom: Spacing.s,
                }}
              >
                • {violation}
              </ThemedText>
            ))}
          </View>
        )}

        {/* Comparison Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle">比較情報</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>最高スコア:</ThemedText>
            <ThemedText>{Math.max(...proposals.map((p) => p.score))}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>現在のスコア:</ThemedText>
            <ThemedText>{currentProposal.score}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={{ color: colors.textSecondary }}>スコア差:</ThemedText>
            <ThemedText style={{ color: colors.warning }}>
              {Math.max(...proposals.map((p) => p.score)) - currentProposal.score}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Action Button */}
      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.m),
            backgroundColor: colors.elevated,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <ThemedText style={styles.actionButtonText}>この提案を確定</ThemedText>
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
  },
  eventInfo: {
    padding: Spacing.m,
    marginBottom: Spacing.m,
  },
  proposalTabs: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    gap: Spacing.s,
  },
  proposalTab: {
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.l,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    alignItems: "center",
  },
  proposalDetails: {
    padding: Spacing.m,
  },
  scoreSection: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
    alignItems: "center",
  },
  scoreDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FF6B9D",
  },
  assignmentsSection: {
    marginBottom: Spacing.l,
  },
  assignmentCard: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.m,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  priorityText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  violationsSection: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
  },
  infoSection: {
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.l,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.s,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBar: {
    padding: Spacing.m,
  },
  actionButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
