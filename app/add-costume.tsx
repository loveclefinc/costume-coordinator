import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { analyzeColor, getColorName, extractDominantColor } from "@/lib/image-analysis";
import { ColorPicker } from "@/components/color-picker";

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

export default function AddCostumeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#FF6B9D");
  const [colorCategory, setColorCategory] = useState<"warm" | "cool" | "neutral" | null>(null);
  const [tone, setTone] = useState<"pastel" | "vivid" | "dark" | "neutral" | null>(null);
  const [pattern, setPattern] = useState<"solid" | "floral" | "stripe" | "dot" | "other">("solid");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("権限が必要です", "ギャラリーへのアクセス権限を許可してください");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);

      // Generate thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setThumbnailUri(thumbnail.uri);

      // Simple color extraction (using a default color for now)
      // In a real implementation, you would analyze the image pixels
      try {
        const extractedColor = await extractDominantColor(uri);
        if (extractedColor) {
          setPrimaryColor(extractedColor);
        }
      } catch (error) {
        console.error("Color extraction failed:", error);
        setPrimaryColor("#FF6B9D");
      }
    }
  };

  const takePicture = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("権限が必要です", "カメラへのアクセス権限を許可してください");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);

      // Generate thumbnail
      const thumbnail = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 512 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setThumbnailUri(thumbnail.uri);

      try {
        const extractedColor = await extractDominantColor(uri);
        if (extractedColor) {
          setPrimaryColor(extractedColor);
        }
      } catch (error) {
        console.error("Color extraction failed:", error);
        setPrimaryColor("#FF6B9D");
      }
    }
  };

  const saveCostume = async () => {
    if (!imageUri || !name.trim()) {
      Alert.alert("入力エラー", "画像と衣装名を入力してください");
      return;
    }

    setLoading(true);

    try {
      // Analyze color
      if (!colorCategory || !tone) {
        Alert.alert("入力エラー", "色系統とトーンを選択してください");
        setLoading(false);
        return;
      }

      const newCostume: CostumeData = {
        id: Date.now().toString(),
        name: name.trim(),
        imageUri,
        thumbnailUri: thumbnailUri || imageUri,
        colors: {
          primary: primaryColor,
        },
        colorCategory,
        tone,
        pattern,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        usageHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Load existing costumes
      const existingData = await AsyncStorage.getItem(COSTUMES_STORAGE_KEY);
      const costumes: CostumeData[] = existingData ? JSON.parse(existingData) : [];

      // Add new costume
      costumes.push(newCostume);

      // Save to AsyncStorage
      await AsyncStorage.setItem(COSTUMES_STORAGE_KEY, JSON.stringify(costumes));

      Alert.alert("保存完了", "衣装を保存しました", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Failed to save costume:", error);
      Alert.alert("エラー", "衣装の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const patternOptions: Array<{ value: typeof pattern; label: string }> = [
    { value: "solid", label: "無地" },
    { value: "floral", label: "花柄" },
    { value: "stripe", label: "ストライプ" },
    { value: "dot", label: "ドット" },
    { value: "other", label: "その他" },
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
          <ThemedText type="title">衣装を追加</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Image Picker */}
        <View style={[styles.imageSection, { backgroundColor: colors.card }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: colors.border }]}>
              <ThemedText style={styles.imagePlaceholderText}>📷</ThemedText>
              <ThemedText style={{ color: colors.textSecondary }}>
                写真を選択または撮影
              </ThemedText>
            </View>
          )}

          <View style={styles.imageButtons}>
            <Pressable
              style={[styles.imageButton, { backgroundColor: colors.tint }]}
              onPress={pickImage}
            >
              <ThemedText style={styles.imageButtonText}>ギャラリー</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.imageButton, { backgroundColor: colors.secondary }]}
              onPress={takePicture}
            >
              <ThemedText style={styles.imageButtonText}>カメラ</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">衣装名</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="例: ピンクのドレス"
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Color Picker */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">メインカラー</ThemedText>
          <View
            style={[
              styles.colorPicker,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
            <View style={{ flex: 1 }}>
              <ThemedText style={{ color: colors.textSecondary }}>
                {getColorName(primaryColor)}
              </ThemedText>
              <ThemedText>{primaryColor}</ThemedText>
            </View>
            <Pressable onPress={() => setShowColorPicker(!showColorPicker)}>
              <ThemedText style={{ color: colors.tint }}>変更</ThemedText>
            </Pressable>
          </View>

          {showColorPicker && (
            <ColorPicker
              selectedColor={primaryColor}
              onColorSelect={(color) => setPrimaryColor(color)}
            />
          )}
        </View>

        {/* Color Category Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">色系統</ThemedText>
          <View style={styles.patternButtons}>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: colorCategory === "warm" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setColorCategory("warm")}
            >
              <ThemedText
                style={{
                  color: colorCategory === "warm" ? "#FFFFFF" : colors.text,
                }}
              >
                暖色系
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: colorCategory === "cool" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setColorCategory("cool")}
            >
              <ThemedText
                style={{
                  color: colorCategory === "cool" ? "#FFFFFF" : colors.text,
                }}
              >
                寒色系
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: colorCategory === "neutral" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setColorCategory("neutral")}
            >
              <ThemedText
                style={{
                  color: colorCategory === "neutral" ? "#FFFFFF" : colors.text,
                }}
              >
                中間色
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Tone Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">トーン</ThemedText>
          <View style={styles.patternButtons}>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: tone === "pastel" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setTone("pastel")}
            >
              <ThemedText
                style={{
                  color: tone === "pastel" ? "#FFFFFF" : colors.text,
                }}
              >
                パステル
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: tone === "vivid" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setTone("vivid")}
            >
              <ThemedText
                style={{
                  color: tone === "vivid" ? "#FFFFFF" : colors.text,
                }}
              >
                ビビッド
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: tone === "dark" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setTone("dark")}
            >
              <ThemedText
                style={{
                  color: tone === "dark" ? "#FFFFFF" : colors.text,
                }}
              >
                ダーク
              </ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.patternButton,
                {
                  backgroundColor: tone === "neutral" ? colors.tint : colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setTone("neutral")}
            >
              <ThemedText
                style={{
                  color: tone === "neutral" ? "#FFFFFF" : colors.text,
                }}
              >
                ニュートラル
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Pattern Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">柄</ThemedText>
          <View style={styles.patternButtons}>
            {patternOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.patternButton,
                  {
                    backgroundColor: pattern === option.value ? colors.tint : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setPattern(option.value)}
              >
                <ThemedText
                  style={{
                    color: pattern === option.value ? "#FFFFFF" : colors.text,
                  }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tags Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle">タグ (カンマ区切り)</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="例: フォーマル, 夏, エレガント"
            placeholderTextColor={colors.textDisabled}
            value={tags}
            onChangeText={setTags}
          />
        </View>

        {/* Save Button */}
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: colors.tint },
            loading && { opacity: 0.6 },
          ]}
          onPress={saveCostume}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.saveButtonText}>保存</ThemedText>
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
  imageSection: {
    borderRadius: BorderRadius.card,
    padding: Spacing.m,
    marginBottom: Spacing.l,
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.thumbnail,
    marginBottom: Spacing.m,
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.thumbnail,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.m,
  },
  imagePlaceholderText: {
    fontSize: 64,
    marginBottom: Spacing.s,
  },
  imageButtons: {
    flexDirection: "row",
    gap: Spacing.m,
  },
  imageButton: {
    flex: 1,
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
  },
  imageButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  colorPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.m,
    marginTop: Spacing.s,
    padding: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#CCCCCC",
  },
  patternButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  patternButton: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
  },
  saveButton: {
    paddingVertical: Spacing.m,
    borderRadius: BorderRadius.button,
    alignItems: "center",
    marginTop: Spacing.l,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
