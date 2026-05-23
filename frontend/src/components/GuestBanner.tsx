import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ArrowRightIcon, SparklesIcon } from "@/components/Icon";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";
import { colors, radius, spacing, typography } from "@/theme";

type Props = {
  variant?: "full" | "compact";
};

export function GuestBanner({ variant = "full" }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { quota } = useApp();

  if (!user?.is_guest) return null;

  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 1;
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;

  const title = exhausted
    ? "Você usou sua análise de cortesia"
    : `Modo visitante · ${used} de ${limit} usado(s)`;

  const description = exhausted
    ? "Cadastre-se gratuitamente para enviar novas plantas, manter o histórico e usar o chat."
    : "Você tem 1 upload para experimentar. Cadastre-se para liberar uploads ilimitados, histórico e chat persistente.";

  return (
    <Pressable
      onPress={() => router.push("/(auth)/signup")}
      accessibilityRole="button"
      accessibilityLabel="Cadastre-se para desbloquear recursos"
      style={({ pressed }) => [
        styles.box,
        variant === "compact" && styles.boxCompact,
        exhausted && styles.boxAlert,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.iconWrap}>
        <SparklesIcon size={18} color={colors.secondary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaLabel}>CADASTRAR</Text>
        <ArrowRightIcon size={14} color={colors.onSecondaryContainer} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 1,
    borderColor: "rgba(0, 97, 114, 0.2)",
  },
  boxCompact: { padding: spacing.sm + 2 },
  boxAlert: {
    backgroundColor: colors.errorContainer,
    borderColor: "rgba(186, 26, 26, 0.25)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { ...typography.titleMd, color: colors.onSecondaryContainer, fontSize: 14 },
  description: { ...typography.bodySm, color: colors.onSecondaryContainer, opacity: 0.9 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLowest,
  },
  ctaLabel: { ...typography.labelMd, color: colors.onSecondaryContainer },
});
