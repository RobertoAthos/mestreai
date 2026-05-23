import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, elevation, radius, spacing, typography } from "@/theme";

type Tone = "neutral" | "accent" | "dark" | "warning";

type Props = {
  title: string;
  icon: React.ReactNode;
  tone?: Tone;
  children: React.ReactNode;
};

const tones: Record<Tone, { accent: string; bg: string; border: string; title: string }> = {
  neutral: {
    accent: colors.secondary,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  accent: {
    accent: colors.secondary,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  dark: {
    accent: colors.onSurface,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  warning: {
    accent: colors.error,
    bg: colors.errorContainer,
    border: "rgba(186, 26, 26, 0.5)",
    title: colors.onErrorContainer,
  },
};

export function SummarySection({ title, icon, tone = "neutral", children }: Props) {
  const palette = tones[tone];
  return (
    <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <View style={[styles.accent, { backgroundColor: palette.accent }]} />
      <View style={styles.header}>
        {icon}
        <Text style={[styles.title, { color: palette.title }]}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingLeft: spacing.lg + 8,
    overflow: "hidden",
    ...elevation.card,
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.headlineMd },
  body: { marginTop: spacing.sm, gap: spacing.sm },
});
