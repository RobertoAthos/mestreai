import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ArrowRightIcon, LockIcon, MailIcon, SparklesIcon, UserIcon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { ApiError } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import { colors, spacing, typography } from "@/theme";
import { enter } from "@/theme/animations";

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const canSubmit = email.trim().length > 3 && password.length >= 1 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGuest = async () => {
    if (guestLoading) return;
    setGuestLoading(true);
    setError(undefined);
    try {
      await continueAsGuest();
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar o modo visitante.");
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={enter.fadeDown(0)} style={styles.brand}>
            <Logo size={96} />
          </Animated.View>

          <Animated.View entering={enter.fadeUp(120)} style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Bem-vindo de volta</Text>
              <Text style={styles.formSubtitle}>Acesse sua conta para continuar.</Text>
            </View>

            <TextField
              label="E-MAIL"
              placeholder="exemplo@mestreia.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              leftIcon={<MailIcon />}
              editable={!submitting}
            />

            <TextField
              label="SENHA"
              placeholder="••••••••"
              autoCapitalize="none"
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
              leftIcon={<LockIcon />}
              isPassword
              onSubmitEditing={onSubmit}
              editable={!submitting}
            />

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              label="Entrar"
              onPress={onSubmit}
              variant="secondary"
              loading={submitting}
              disabled={!canSubmit}
              leadingIcon={<ArrowRightIcon size={18} color={colors.onSecondary} />}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>NÃO TEM CONTA?</Text>
              <View style={styles.dividerLine} />
            </View>

            <PrimaryButton
              label="Criar nova conta"
              onPress={() => router.push("/(auth)/signup")}
              variant="primary"
              leadingIcon={<UserIcon size={18} color={colors.onPrimary} />}
            />

            <PrimaryButton
              label={guestLoading ? "Carregando…" : "Continuar como visitante"}
              onPress={onGuest}
              variant="ghost"
              loading={guestLoading}
              disabled={guestLoading}
              leadingIcon={<SparklesIcon size={18} color={colors.secondary} />}
            />
            <Text style={styles.guestHint}>
              Como visitante você poderá enviar 1 projeto para experimentar. Cadastre-se para
              liberar uploads ilimitados, histórico e chat persistente.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceContainerLowest },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    justifyContent: "center",
  },
  brand: { alignItems: "center" },
  form: { gap: spacing.sm + 4 },
  formHeader: { alignItems: "center", gap: 2 },
  formTitle: { ...typography.titleLg, color: colors.onSurface, fontSize: 22 },
  formSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: "center" },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: 12,
    padding: spacing.sm + 2,
  },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerLabel: { ...typography.labelMd, color: colors.outline },
  guestHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    paddingHorizontal: spacing.sm,
  },
});
