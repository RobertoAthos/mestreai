import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ChevronRightIcon, CompassIcon, FileIcon, HouseIcon } from "@/components/Icon";
import { StatusChip, statusAccentColor } from "@/components/StatusChip";
import { colors, elevation, radius, spacing, typography } from "@/theme";
import { enter, layout, spring, stagger } from "@/theme/animations";
import type { ProjectListItem } from "@/types/api";

type Props = {
  project: ProjectListItem;
  onPress: () => void;
  /** Index in the list, used for staggered entrance. */
  index?: number;
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function pickIcon(name: string, status: string) {
  const lower = name.toLowerCase();
  if (lower.includes("casa") || lower.includes("lote") || lower.includes("residenc")) {
    return <HouseIcon size={22} color={colors.secondary} />;
  }
  if (lower.includes("ediff") || lower.includes("ediffic") || lower.includes("estrut")) {
    return <CompassIcon size={22} color={colors.secondary} />;
  }
  return <FileIcon size={20} color={colors.secondary} />;
}

export function ProjectCard({ project, onPress, index = 0 }: Props) {
  const accent = statusAccentColor(project.status);
  const subtitle = `${formatDate(project.created_at)} • ${project.pages} ${project.pages === 1 ? "página" : "páginas"}`;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={enter.fadeUp(stagger(index, 60, 6))}
      layout={layout}
      style={animatedStyle}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, spring.press); }}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`Abrir projeto ${project.name}`}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.iconWrap}>{pickIcon(project.name, project.status)}</View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {project.name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.right}>
          <StatusChip status={project.status} />
          <ChevronRightIcon size={16} color={colors.outline} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 20,
    paddingHorizontal: 20,
    paddingLeft: 24,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    overflow: "hidden",
    ...elevation.card,
  },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 6 },
  iconWrap: {
    width: 44,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: 2 },
  title: { ...typography.titleMd, color: colors.onSurface },
  subtitle: { ...typography.bodyMd, color: colors.secondary },
  right: { alignItems: "flex-end", gap: spacing.sm },
});
