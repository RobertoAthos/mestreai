import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { GuestBanner } from "@/components/GuestBanner";
import { PlusIcon } from "@/components/Icon";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeader } from "@/components/SectionHeader";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { colors, elevation, radius, spacing, typography } from "@/theme";
import { enter, spring } from "@/theme/animations";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    projects,
    projectsStatus,
    projectsError,
    refreshProjects,
    refreshQuota,
    setCurrentProject,
  } = useApp();

  useFocusEffect(
    useCallback(() => {
      refreshProjects();
      refreshQuota();
    }, [refreshProjects, refreshQuota]),
  );

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Mestre";

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status !== "failed").length;
    const ready = projects.filter((p) => p.status === "ready").length;
    const compliance = projects.length === 0 ? 0 : Math.round((ready / projects.length) * 100);
    return { active, compliance };
  }, [projects]);

  const onOpenProject = (id: string) => {
    setCurrentProject(id);
    router.push("/(tabs)/summary");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={projectsStatus === "loading"}
            onRefresh={refreshProjects}
            tintColor={colors.secondary}
          />
        }
      >
        <Animated.View entering={enter.fadeDown(0)} style={styles.welcome}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.greeting}>{firstName}.</Text>
          <Text style={styles.subtitle}>Resumo da obra de hoje.</Text>
        </Animated.View>

        <Animated.View entering={enter.fadeUp(60)}>
          <GuestBanner />
        </Animated.View>

        <HeroCard onPress={() => router.push("/(tabs)/upload")} />

        <Animated.View entering={enter.fadeUp(180)} style={{ gap: spacing.md }}>
          <SectionHeader
            title="Projetos Recentes"
            action={{ label: "Ver todos", onPress: refreshProjects }}
          />

          {projectsStatus === "loading" && projects.length === 0 && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.secondary} />
            </View>
          )}

          {projectsStatus === "error" && (
            <Text style={styles.errorText}>{projectsError}</Text>
          )}

          {projectsStatus !== "loading" && projects.length === 0 && (
            <EmptyState
              title="Nenhum projeto ainda."
              description="Envie o PDF da planta arquitetônica para que o Mestre IA possa analisar."
            />
          )}

          <View style={{ gap: spacing.sm }}>
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                index={i}
                project={project}
                onPress={() => onOpenProject(project.id)}
              />
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={enter.fadeUp(240)} style={styles.statsRow}>
          <StatTile value={String(stats.active)} label="Projetos ativos" />
          <StatTile value={`${stats.compliance}%`} label="Análises prontas" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroCard({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={enter.fadeUp(120)} style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.98, spring.press); }}
        onPressOut={() => { scale.value = withSpring(1, spring.press); }}
        accessibilityRole="button"
        accessibilityLabel="Novo Projeto"
        style={styles.heroCard}
      >
        <View style={styles.heroDecoration} />
        <View style={styles.heroIcon}>
          <PlusIcon size={28} color={colors.primarySubtle} strokeWidth={1.8} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={styles.heroTitle}>Novo Projeto</Text>
          <Text style={styles.heroSubtitle}>Envie um PDF para iniciar a análise da planta.</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  welcome: { gap: 4 },
  greeting: {
    ...typography.displayLg,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyLg,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 160,
    justifyContent: "space-between",
    overflow: "hidden",
    ...elevation.card,
  },
  heroDecoration: {
    position: "absolute",
    right: -32,
    top: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySubtle,
    opacity: 0.1,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.primarySubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    ...typography.headlineLg,
    color: colors.primarySubtle,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    color: colors.primarySubtle,
    opacity: 0.9,
  },
  loaderWrap: { paddingVertical: spacing.lg, alignItems: "center" },
  errorText: { ...typography.bodyMd, color: colors.error },
  statsRow: { flexDirection: "row", gap: spacing.md },
  statTile: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    ...elevation.card,
  },
  statValue: {
    ...typography.displayLg,
    color: colors.onSurface,
  },
  statLabel: {
    ...typography.labelMd,
    color: colors.secondary,
    textAlign: "center",
  },
});
