import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { CheckCircleIcon } from "@/components/Icon";
import { colors, spacing, typography } from "@/theme";

type Props = {
  title: string;
  description?: string;
  index?: number;
  divider?: boolean;
};

export function CheckListItem({ title, description, index, divider = true }: Props) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.iconWrap}>
        <CheckCircleIcon size={18} color={colors.secondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {typeof index === "number" ? `${index}. ` : ""}
          {title}
        </Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: "rgba(198, 198, 205, 0.3)" },
  iconWrap: { marginTop: 2 },
  title: { ...typography.titleMd, color: colors.onSurface, fontSize: 15 },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
