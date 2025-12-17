import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const PRESET_COLORS = [
  // Reds
  "#FF0000",
  "#FF3333",
  "#FF6666",
  "#FF9999",
  "#FFCCCC",
  // Pinks
  "#FF1493",
  "#FF69B4",
  "#FFB6C1",
  "#FFC0CB",
  "#FFE4E1",
  // Oranges
  "#FF8C00",
  "#FFA500",
  "#FFB347",
  "#FFCC99",
  "#FFE4B5",
  // Yellows
  "#FFFF00",
  "#FFFF33",
  "#FFFF66",
  "#FFFF99",
  "#FFFFCC",
  // Greens
  "#008000",
  "#00AA00",
  "#00CC00",
  "#66FF66",
  "#CCFFCC",
  // Teals
  "#008080",
  "#20B2AA",
  "#40E0D0",
  "#7FFFD4",
  "#AFEEEE",
  // Blues
  "#0000FF",
  "#0033FF",
  "#0066FF",
  "#3399FF",
  "#99CCFF",
  // Purples
  "#800080",
  "#9932CC",
  "#BA55D3",
  "#DA70D6",
  "#EE82EE",
  // Grays
  "#808080",
  "#A9A9A9",
  "#D3D3D3",
  "#DCDCDC",
  "#F5F5F5",
  // Browns
  "#8B4513",
  "#A0522D",
  "#CD853F",
  "#DEB887",
  "#F4A460",
  // Blacks & Whites
  "#000000",
  "#FFFFFF",
];

export function ColorPicker({ selectedColor, onColorSelect }: ColorPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <View style={styles.container}>
      <ThemedText type="subtitle" style={{ marginBottom: Spacing.m }}>
        色を選択
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colorGrid}
      >
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorOption,
              {
                backgroundColor: color,
                borderWidth: selectedColor === color ? 3 : 2,
                borderColor: selectedColor === color ? colors.tint : "#CCCCCC",
              },
            ]}
            onPress={() => onColorSelect(color)}
          />
        ))}
      </ScrollView>

      {/* Selected Color Display */}
      <View style={[styles.selectedColorDisplay, { backgroundColor: colors.card }]}>
        <View
          style={[
            styles.selectedColorBox,
            {
              backgroundColor: selectedColor,
              borderColor: colors.border,
            },
          ]}
        />
        <ThemedText style={{ marginLeft: Spacing.m }}>{selectedColor}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.m,
  },
  colorGrid: {
    flexDirection: "row",
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.m,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  selectedColorDisplay: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.m,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.m,
  },
  selectedColorBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
});
