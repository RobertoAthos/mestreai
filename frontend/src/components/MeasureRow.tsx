import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "@/theme";

type Props = {
  label: string;
  value: string;
  sub?: string;
};

export function MeasureRow({ label, value, sub }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
        {sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.md,
  },
  label: {
    ...typography.bodyLg,
    color: colors.onSurfaceVariant,
  },
  sub: {
    ...typography.bodySm,
    color: colors.secondary,
    marginTop: 2,
  },
  pill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: "JetBrainsMono_500Medium",
    fontSize: 14,
    color: colors.onSurface,
  },
});
