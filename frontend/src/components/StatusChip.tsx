import React from "react";
import { StyleSheet, View, Text } from "react-native";

import { RefreshIcon } from "@/components/Icon";
import { colors, radius, spacing, typography } from "@/theme";
import type { ProjectStatus } from "@/types/api";

type Props = {
  status: ProjectStatus;
};

const labels: Record<ProjectStatus, string> = {
  ready: "Analisado",
  processing: "Processando",
  failed: "Falhou",
};

export function StatusChip({ status }: Props) {
  const style = chipStyles[status];
  return (
    <View style={[styles.chip, { backgroundColor: style.bg }]}>
      {status === "processing" && (
        <RefreshIcon size={12} color={style.fg} strokeWidth={2.4} />
      )}
      <Text style={[styles.label, { color: style.fg }]}>{labels[status]}</Text>
    </View>
  );
}

export function statusAccentColor(status: ProjectStatus): string {
  return chipStyles[status].accent;
}

const chipStyles: Record<ProjectStatus, { bg: string; fg: string; accent: string }> = {
  ready: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, accent: colors.tertiary },
  processing: { bg: colors.secondaryContainer, fg: colors.onSecondaryContainer, accent: colors.secondaryContainer },
  failed: { bg: colors.errorContainer, fg: colors.onErrorContainer, accent: colors.error },
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  label: {
    ...typography.labelMd,
  },
});
