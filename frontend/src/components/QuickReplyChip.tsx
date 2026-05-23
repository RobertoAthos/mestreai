import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { colors, elevation, radius, spacing, typography } from "@/theme";
import { enter, spring, stagger } from "@/theme/animations";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Position in the chip row, used for the stagger. */
  index?: number;
};

export function QuickReplyChip({ label, onPress, disabled, index = 0 }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={enter.fadeUp(stagger(index, 40, 6))} style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          if (disabled) return;
          scale.value = withSpring(0.95, spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, spring.press);
        }}
        style={[styles.chip, disabled && { opacity: 0.6 }]}
      >
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(198, 198, 205, 0.5)",
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    ...elevation.card,
  },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: "none",
    letterSpacing: 0,
  },
});
