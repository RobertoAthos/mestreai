import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors, radius, spacing, typography } from "@/theme";
import { enter, spring } from "@/theme/animations";

type Props = {
  label: string;
  onPress: () => void;
  icon: React.ReactNode;
  offsetBottom?: number;
};

export function Fab({ label, onPress, icon, offsetBottom }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      entering={enter.fadeUp(160)}
      style={[
        styles.wrap,
        { bottom: offsetBottom ?? (Platform.OS === "ios" ? 104 : 88) },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => { scale.value = withSpring(0.95, spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, spring.press); }}
        style={styles.pill}
      >
        {icon}
        <Text style={styles.label}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    height: 56,
    borderRadius: radius.full,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 6,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSecondary,
  },
});
