import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { spring } from "@/theme/animations";
import { colors, radius, spacing, typography } from "@/theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  fullWidth?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  leadingIcon,
  fullWidth = true,
}: Props) {
  const palette = variants[variant];
  const isDisabled = disabled || loading;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, fullWidth && { alignSelf: "stretch" }]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          if (isDisabled) return;
          scale.value = withSpring(0.97, spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, spring.press);
        }}
        style={[
          styles.base,
          { backgroundColor: palette.bg, borderColor: palette.border },
          isDisabled && { opacity: 0.6 },
        ]}
      >
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={palette.fg} />
          ) : (
            <>
              {leadingIcon}
              <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const variants: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
  secondary: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, border: colors.secondaryContainer },
  ghost: { bg: "transparent", fg: colors.onSurface, border: colors.surfaceContainerHighest },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  label: {
    ...typography.titleMd,
  },
});
