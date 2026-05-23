import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ClipboardIcon } from "@/components/Icon";
import { colors, radius, spacing, typography } from "@/theme";

type Props = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

export function EmptyState({ title, description, icon }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBg}>{icon ?? <ClipboardIcon color={colors.secondary} size={28} />}</View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    borderStyle: "dashed",
  },
  iconBg: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    textAlign: "center",
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 280,
  },
});
