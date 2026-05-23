import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Animated from "react-native-reanimated";

import { Checkbox } from "@/components/Checkbox";
import {
  ArrowRightIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { ApiError } from "@/services/api";
import { useAuth } from "@/store/AuthContext";
import { colors, radius, spacing, typography } from "@/theme";
import { enter } from "@/theme/animations";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const trimmedEmail = email.trim().toLowerCase();
  const validation = (): string | undefined => {
    if (name.trim().length < 2) return "Informe seu nome completo.";
    if (!EMAIL_RE.test(trimmedEmail)) return "E-mail inválido.";
    if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (password !== confirm) return "As senhas não conferem.";
    if (!terms) return "Você precisa aceitar os Termos de Uso para continuar.";
    return undefined;
  };

  const canSubmit = !submitting && !validation();

  const onSubmit = async () => {
    const reason = validation();
    if (reason) {
      setError(reason);
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await signup(name, trimmedEmail, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta.");
    } finally {
      setSubmitting(false);
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
            <Logo size={72} />
          </Animated.View>

          <Animated.View entering={enter.fadeUp(120)} style={styles.form}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Crie sua conta</Text>
              <Text style={styles.formSubtitle}>
                Insira seus dados para começar a gerenciar suas obras.
              </Text>
            </View>

            <TextField
              label="NOME COMPLETO"
              placeholder="Ex: Roberto Silva"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              leftIcon={<UserIcon />}
              editable={!submitting}
            />

            <TextField
              label="E-MAIL"
              placeholder="roberto@empresa.com.br"
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
              label="SENHA (MÍN. 8 CARACTERES)"
              placeholder="••••••••"
              autoCapitalize="none"
              autoComplete="password-new"
              value={password}
              onChangeText={setPassword}
              leftIcon={<LockIcon />}
              isPassword
              editable={!submitting}
            />

            <TextField
              label="CONFIRMAR SENHA"
              placeholder="••••••••"
              autoCapitalize="none"
              autoComplete="password-new"
              value={confirm}
              onChangeText={setConfirm}
              leftIcon={<ShieldCheckIcon />}
              isPassword
              editable={!submitting}
            />

            <Pressable
              onPress={() => setTerms((v) => !v)}
              style={styles.termsRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: terms }}
            >
              <Checkbox checked={terms} onChange={setTerms} />
              <Text style={styles.termsText}>
                Concordo com os <Text style={styles.termsLink}>Termos de Uso</Text> e a{" "}
                <Text style={styles.termsLink}>Política de Privacidade</Text>.
              </Text>
            </Pressable>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <PrimaryButton
              label="Criar conta"
              onPress={onSubmit}
              variant="secondary"
              loading={submitting}
              disabled={!canSubmit}
              leadingIcon={<ArrowRightIcon size={18} color={colors.onSecondaryContainer} />}
            />
          </Animated.View>

          <Animated.View entering={enter.fadeUp(220)} style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta?</Text>
            <Link href="/(auth)/login" style={styles.footerLink}>
              Entrar
            </Link>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm + 4,
  },
  brand: { alignItems: "center" },
  form: { gap: spacing.sm + 4 },
  formHeader: { alignItems: "center", gap: 2 },
  formTitle: { ...typography.titleLg, color: colors.onSurface, fontSize: 22 },
  formSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: "center" },
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: 2,
  },
  termsText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 18 },
  termsLink: {
    color: colors.secondary,
    fontFamily: "Inter_600SemiBold",
  },
  errorBox: {
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  errorText: { ...typography.bodyMd, color: colors.onErrorContainer },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  footerLink: { ...typography.titleMd, color: colors.secondary, fontSize: 15 },
});
