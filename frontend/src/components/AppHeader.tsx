import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AccountChip } from "@/components/AccountChip";
import { ArrowLeftIcon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { colors, radius, spacing, typography } from "@/theme";

type Props = {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  onBack?: () => void;
  trailing?: React.ReactNode;
};

export function AppHeader({ title = "Mestre IA", subtitle, showLogo = true, onBack, trailing }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <ArrowLeftIcon size={22} color={colors.onSurface} />
          </Pressable>
        ) : showLogo ? (
          <Logo size={36} />
        ) : null}
        <View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.right}>{trailing ?? <AccountChip />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 4, flex: 1 },
  right: { marginLeft: spacing.sm },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.titleLg, color: colors.onSurface },
  subtitle: { ...typography.bodyMd, color: colors.secondary, marginTop: -2 },
});
