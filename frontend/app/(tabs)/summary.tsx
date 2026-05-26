import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { CheckListItem } from "@/components/CheckListItem";
import { EmptyState } from "@/components/EmptyState";
import { Fab } from "@/components/Fab";
import {
  ChatIcon,
  ChecklistIcon,
  ClipboardIcon,
  DoorIcon,
  InfoIcon,
  RulerIcon,
  WallIcon,
  WindowIcon,
} from "@/components/Icon";
import { MeasureRow } from "@/components/MeasureRow";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SummarySection } from "@/components/SummarySection";
import { useApp } from "@/store/AppContext";
import { colors, radius, spacing, typography } from "@/theme";

function formatM(value: number | null | undefined, fallback = "—"): string {
  if (value == null) return fallback;
  return `${value.toFixed(2)}m`;
}

export default function SummaryScreen() {
  const router = useRouter();
  const {
    currentProject,
    currentProjectId,
    openProject,
    refreshProjects,
    streamProject,
    partialSummary,
    isStreaming,
  } = useApp();

  useFocusEffect(
    useCallback(() => {
      if (currentProjectId) openProject(currentProjectId);
    }, [currentProjectId, openProject]),
  );

  // Auto-attach to the analysis stream whenever we land on a project that's
  // still being processed. Idempotent — streamProject is a no-op if we're
  // already attached to this id.
  useEffect(() => {
    if (currentProject?.status === "processing" && currentProject?.id) {
      streamProject(currentProject.id);
    }
  }, [currentProject?.status, currentProject?.id, streamProject]);

  const onRefresh = useCallback(async () => {
    if (currentProjectId) await openProject(currentProjectId);
    await refreshProjects();
  }, [currentProjectId, openProject, refreshProjects]);

  // Show the partial JSON while the analysis is still streaming; once it's
  // done, swap to the canonical summary persisted on the project row.
  const summary =
    currentProject?.status === "processing" && partialSummary
      ? partialSummary
      : currentProject?.summary;

  const goToChat = () => router.push("/(tabs)/chat");

  if (!currentProject) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader />
        <View style={styles.placeholder}>
          <EmptyState
            title="Selecione um projeto"
            description="Toque em um projeto na aba Dashboard ou faça upload de um novo PDF."
            icon={<ClipboardIcon color={colors.secondary} size={28} />}
          />
          <PrimaryButton
            label="Enviar novo PDF"
            onPress={() => router.push("/(tabs)/upload")}
          />
        </View>
      </SafeAreaView>
    );
  }

  // While processing, only show the full-screen spinner until the first
  // partial JSON is parseable — from then on we drop into the normal
  // summary scroll view (rendered below) and let sections fill in live.
  if (currentProject.status === "processing" && !summary) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader />
        <View style={styles.placeholder}>
          <View style={styles.processingWrap}>
            <ActivityIndicator color={colors.secondary} size="large" />
            <Text style={styles.processingTitle}>
              {isStreaming ? "Lendo a planta…" : "Analisando seu projeto"}
            </Text>
            <Text style={styles.processingBody}>
              A IA está extraindo medidas, esquadrias e o passo a passo. Os blocos vão aparecendo aqui conforme ela escreve.
            </Text>
            <PrimaryButton
              label="Reconectar"
              variant="ghost"
              onPress={() => {
                streamProject(currentProject.id);
                onRefresh();
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (currentProject.status === "failed") {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader />
        <View style={styles.placeholder}>
          <EmptyState
            title="Não consegui analisar o PDF"
            description={currentProject.error || "Tente reenviar o PDF original do CAD/BIM."}
            icon={<InfoIcon color={colors.error} size={24} />}
          />
          <PrimaryButton label="Enviar novo PDF" onPress={() => router.push("/(tabs)/upload")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.secondary} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.pageTitle}>Resumo: {currentProject.name}</Text>
          <Text style={styles.pageSubtitle}>
            Visão geral do projeto e pontos críticos para a execução da obra.
          </Text>
          {currentProject.status === "processing" && (
            <View style={styles.streamingPill}>
              <ActivityIndicator color={colors.secondary} size="small" />
              <Text style={styles.streamingText}>
                Atualizando ao vivo conforme a IA lê a planta…
              </Text>
            </View>
          )}
          <View style={styles.statsRow}>
            <Stat value={String(summary?.rooms.length ?? 0)} label="Ambientes" />
            <Stat value={String(summary?.doors.length ?? 0)} label="Portas" />
            <Stat value={String(summary?.windows.length ?? 0)} label="Janelas" />
          </View>
        </View>

        {summary?.rooms?.length ? (
          <SummarySection
            title="Medidas dos Ambientes"
            tone="dark"
            icon={<RulerIcon size={22} color={colors.onSurface} />}
          >
            {summary.rooms.map((room) => (
              <MeasureRow
                key={room.name}
                label={room.name}
                sub={room.notes ?? undefined}
                value={
                  room.width_m && room.length_m
                    ? `${room.width_m.toFixed(2)} × ${room.length_m.toFixed(2)} m`
                    : room.area_m2
                    ? `${room.area_m2.toFixed(2)} m²`
                    : "—"
                }
              />
            ))}
          </SummarySection>
        ) : null}

        {summary?.doors?.length ? (
          <SummarySection
            title="Quadro de Portas"
            tone="accent"
            icon={<DoorIcon size={22} color={colors.secondary} />}
          >
            {summary.doors.map((door, i) => (
              <CheckListItem
                key={door.code}
                title={`${door.code} — ${formatM(door.width_m)} × ${formatM(door.height_m)}`}
                description={[door.room, door.notes].filter(Boolean).join(" • ") || undefined}
                divider={i < summary.doors.length - 1}
              />
            ))}
          </SummarySection>
        ) : null}

        {summary?.windows?.length ? (
          <SummarySection
            title="Quadro de Janelas"
            tone="accent"
            icon={<WindowIcon size={22} color={colors.secondary} />}
          >
            {summary.windows.map((win, i) => (
              <CheckListItem
                key={win.code}
                title={`${win.code} — ${formatM(win.width_m)} × ${formatM(win.height_m)}`}
                description={[
                  win.room,
                  win.sill_height_m != null ? `Peitoril ${formatM(win.sill_height_m)}` : null,
                  win.notes,
                ]
                  .filter(Boolean)
                  .join(" • ") || undefined}
                divider={i < summary.windows.length - 1}
              />
            ))}
          </SummarySection>
        ) : null}

        {summary?.walls?.length ? (
          <SummarySection
            title="Especificação das Paredes"
            tone="dark"
            icon={<WallIcon size={22} color={colors.onSurface} />}
          >
            {summary.walls.map((wall, i) => (
              <CheckListItem
                key={`${wall.type}-${i}`}
                title={`${wall.type} — ${wall.thickness_cm.toFixed(0)} cm`}
                description={wall.notes ?? undefined}
                divider={i < summary.walls.length - 1}
              />
            ))}
          </SummarySection>
        ) : null}

        {summary?.execution_checklist?.length ? (
          <SummarySection
            title="Guia de Execução"
            tone="accent"
            icon={<ChecklistIcon size={22} color={colors.secondary} />}
          >
            {summary.execution_checklist.map((step, i) => (
              <CheckListItem
                key={i}
                title={step}
                index={i + 1}
                divider={i < summary.execution_checklist.length - 1}
              />
            ))}
          </SummarySection>
        ) : null}

        {summary?.general_notes ? (
          <SummarySection
            title="Pontos de Atenção"
            tone="warning"
            icon={<InfoIcon size={22} color={colors.onErrorContainer} />}
          >
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Confirme antes de iniciar a alvenaria</Text>
              <Text style={styles.warningBody}>{summary.general_notes}</Text>
            </View>
          </SummarySection>
        ) : null}
      </ScrollView>
      <Fab
        label="Tirar dúvida no chat"
        onPress={goToChat}
        icon={<ChatIcon size={18} color={colors.onSecondary} />}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.lg, paddingBottom: 200, gap: spacing.lg },
  headerBlock: { gap: spacing.sm },
  pageTitle: { ...typography.headlineLg, color: colors.onSurface, fontSize: 30 },
  pageSubtitle: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: { ...typography.headlineLg, color: colors.onSurface, fontSize: 28 },
  statLabel: { ...typography.labelMd, color: colors.secondary, textAlign: "center" },
  placeholder: { flex: 1, padding: spacing.lg, gap: spacing.lg, justifyContent: "center" },
  processingWrap: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg },
  processingTitle: { ...typography.titleLg, color: colors.onSurface },
  processingBody: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: "center", maxWidth: 320 },
  streamingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  streamingText: { ...typography.labelMd, color: colors.secondary },
  warningBox: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(186, 26, 26, 0.2)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  warningTitle: { ...typography.titleMd, color: colors.onErrorContainer },
  warningBody: { ...typography.bodyMd, color: colors.onSurface },
});
