import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppHeader } from "@/components/AppHeader";
import { GuestBanner } from "@/components/GuestBanner";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloseIcon,
  CloudUploadIcon,
  PdfFileIcon,
  SparkleIcon,
  SparklesIcon,
} from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { api, ApiError } from "@/services/api";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { colors, elevation, radius, spacing, typography } from "@/theme";

type Stage = "idle" | "selected" | "uploading" | "done" | "error";

interface PickedFile {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function UploadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshProjects, setCurrentProject, pollProject, quota, refreshQuota } = useApp();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  const isGuest = !!user?.is_guest;
  const guestExhausted = isGuest && quota ? quota.used >= (quota.limit ?? 1) : false;

  const pickFile = async () => {
    if (guestExhausted) {
      Alert.alert(
        "Limite do modo visitante atingido",
        "Cadastre-se gratuitamente para enviar novas plantas e manter o histórico.",
        [
          { text: "Cadastre-se", onPress: () => router.push("/(auth)/signup") },
          { text: "Agora não", style: "cancel" },
        ],
      );
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.mimeType && asset.mimeType !== "application/pdf") {
        Alert.alert(
          "Arquivo não suportado",
          "Apenas PDFs são aceitos. Exporte a planta no formato PDF diretamente do CAD/BIM.",
        );
        return;
      }
      setFile({ uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType });
      setStage("selected");
      setError(undefined);
      Haptics.selectionAsync().catch(() => {});
    } catch (err) {
      setError("Não foi possível selecionar o arquivo.");
      setStage("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStage("idle");
    setError(undefined);
  };

  const onAnalyze = async () => {
    if (!file) return;
    setStage("uploading");
    setError(undefined);
    try {
      const { project } = await api.uploadProject(
        { uri: file.uri, name: file.name, mimeType: file.mimeType },
        file.name.replace(/\.pdf$/i, ""),
      );
      setStage("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCurrentProject(project.id);
      pollProject(project.id);
      await refreshProjects();
      await refreshQuota();
      setTimeout(() => {
        router.replace("/(tabs)/summary");
      }, 400);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao enviar o PDF.";
      setError(message);
      setStage("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Mestre IA" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text style={styles.title}>Enviar Projeto</Text>
          <Text style={styles.subtitle}>
            Faça o upload do PDF da planta arquitetônica para que a IA extraia medidas, esquadrias e o checklist de execução.
          </Text>
        </View>

        <GuestBanner />

        <Pressable
          onPress={pickFile}
          accessibilityRole="button"
          accessibilityLabel="Selecionar arquivo PDF"
          disabled={guestExhausted}
          style={({ pressed }) => [
            styles.dropZone,
            guestExhausted && styles.dropZoneDisabled,
            pressed && !guestExhausted && styles.dropZonePressed,
          ]}
        >
          <CloudUploadIcon
            size={56}
            color={guestExhausted ? colors.outline : colors.secondary}
          />
          <Text style={[styles.dropTitle, guestExhausted && { color: colors.onSurfaceVariant }]}>
            {guestExhausted
              ? "Limite de uploads do modo visitante atingido"
              : file
              ? "Toque para trocar o arquivo"
              : "Toque para enviar o arquivo do projeto"}
          </Text>
          <Text style={styles.dropHint}>APENAS PDF • ATÉ 25 MB</Text>
        </Pressable>

        {guestExhausted && (
          <View style={styles.unlockBox}>
            <View style={styles.unlockIcon}>
              <SparklesIcon size={20} color={colors.onSecondaryContainer} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.unlockTitle}>Cadastre-se para desbloquear</Text>
              <Text style={styles.unlockBody}>
                Você usou seu projeto de cortesia. Crie uma conta gratuita para enviar quantas
                plantas quiser, manter o histórico e usar o chat em qualquer dispositivo.
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(auth)/signup")}
              accessibilityRole="button"
              accessibilityLabel="Cadastrar"
              style={({ pressed }) => [styles.unlockCta, pressed && { opacity: 0.85 }]}
            >
              <ArrowRightIcon size={16} color={colors.onSecondary} />
            </Pressable>
          </View>
        )}

        {file && (
          <View style={{ gap: spacing.md }}>
            <Text style={styles.sectionLabel}>
              {stage === "done" ? "ENVIADO" : stage === "uploading" ? "ENVIANDO" : "PRONTO PARA ANÁLISE"}
            </Text>
            <View style={styles.fileCard}>
              {stage === "uploading" && <View style={styles.fileProgressTrack} />}
              {stage === "uploading" && <View style={[styles.fileProgressFill, { width: "65%" }]} />}
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}>
                  <PdfFileIcon size={22} color={colors.onSecondaryContainer} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.fileMeta}>
                    {formatSize(file.size)} •{" "}
                    {stage === "uploading"
                      ? "Enviando…"
                      : stage === "done"
                      ? "Concluído"
                      : "Pronto"}
                  </Text>
                </View>
                {stage === "uploading" ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : stage === "done" ? (
                  <CheckCircleIcon size={22} color={colors.tertiary} />
                ) : (
                  <Pressable
                    onPress={reset}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Remover arquivo"
                    style={styles.removeButton}
                  >
                    <CloseIcon size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {error && stage === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Ops, algo deu errado.</Text>
            <Text style={styles.errorBody}>{error}</Text>
          </View>
        )}

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>Dicas para uma boa leitura</Text>
          <Text style={styles.tipsBullet}>• Use o PDF original exportado do CAD/BIM (vetorial).</Text>
          <Text style={styles.tipsBullet}>• Evite digitalizações com sombras ou amassados.</Text>
          <Text style={styles.tipsBullet}>• Confirme que as cotas estão visíveis em todos os ambientes.</Text>
        </View>

        <PrimaryButton
          label={stage === "uploading" ? "Analisando…" : "Analisar com IA"}
          onPress={onAnalyze}
          variant="secondary"
          loading={stage === "uploading"}
          disabled={!file || stage === "uploading" || stage === "done"}
          leadingIcon={<SparkleIcon size={18} color={colors.onSecondaryContainer} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  heading: { gap: spacing.xs },
  title: {
    ...typography.headlineLg,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.secondaryContainer,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    minHeight: 250,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    ...elevation.card,
  },
  dropZonePressed: { opacity: 0.85, backgroundColor: colors.surfaceContainerLow },
  dropZoneDisabled: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
    opacity: 0.7,
  },
  unlockBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(0, 97, 114, 0.2)",
  },
  unlockIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockTitle: { ...typography.titleMd, color: colors.onSecondaryContainer, fontSize: 14 },
  unlockBody: { ...typography.bodySm, color: colors.onSecondaryContainer, opacity: 0.9 },
  unlockCta: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  dropTitle: {
    ...typography.headlineMd,
    color: colors.onSurface,
    textAlign: "center",
  },
  dropHint: {
    ...typography.labelMd,
    color: colors.secondary,
    textTransform: "uppercase",
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
  },
  fileCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    overflow: "hidden",
    ...elevation.card,
  },
  fileProgressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
  },
  fileProgressFill: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 4,
    backgroundColor: colors.secondary,
  },
  fileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  fileIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { ...typography.titleMd, color: colors.onSurface, fontSize: 14 },
  fileMeta: { ...typography.labelMd, color: colors.secondary },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  errorTitle: { ...typography.titleMd, color: colors.onErrorContainer },
  errorBody: { ...typography.bodyMd, color: colors.onErrorContainer },
  tipsBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
  },
  tipsTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: 4 },
  tipsBullet: { ...typography.bodyMd, color: colors.onSurfaceVariant },
});
