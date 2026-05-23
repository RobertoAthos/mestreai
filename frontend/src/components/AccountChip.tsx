import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

import { LogoutIcon, SparklesIcon } from "@/components/Icon";
import { useAuth } from "@/store/AuthContext";
import { colors, radius, spacing, typography } from "@/theme";
import { duration } from "@/theme/animations";

const SHEET_EXIT_MS = 220;

export function AccountChip() {
  const router = useRouter();
  const { user, logout } = useAuth();

  // `open` drives what the user sees (animation visibility).
  // `mounted` keeps the Modal alive long enough for the exit animation
  // to play before React Native tears the native modal down.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const isGuest = !!user?.is_guest;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), SHEET_EXIT_MS + 20);
    return () => clearTimeout(t);
  }, [open]);

  const openSheet = () => setOpen(true);
  const closeSheet = () => setOpen(false);

  const onLogout = async () => {
    closeSheet();
    await logout();
    router.replace("/(auth)/login");
  };

  const onSignup = () => {
    closeSheet();
    router.push("/(auth)/signup");
  };

  return (
    <>
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel="Abrir menu da conta"
        style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}
      >
        <View style={[styles.avatar, isGuest && styles.avatarGuest]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </Pressable>

      <Modal
        transparent
        visible={mounted}
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        {open && (
          <Animated.View
            entering={FadeIn.duration(duration.sm)}
            exiting={FadeOut.duration(SHEET_EXIT_MS)}
            style={styles.backdrop}
          >
            <TouchableWithoutFeedback onPress={closeSheet}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInDown.duration(duration.md).springify().damping(20).stiffness(220)}
              exiting={SlideOutDown.duration(SHEET_EXIT_MS)}
              style={styles.sheet}
            >
              <View style={styles.handle} />
              <View style={styles.sheetHeader}>
                <View style={[styles.avatarLarge, isGuest && styles.avatarGuest]}>
                  <Text style={styles.avatarLargeText}>{initial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user?.name || (isGuest ? "Visitante" : "Conta")}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {isGuest ? "Sessão temporária" : user?.email || ""}
                  </Text>
                </View>
              </View>

              {isGuest && (
                <Pressable
                  onPress={onSignup}
                  style={({ pressed }) => [
                    styles.menuItem,
                    styles.menuPrimary,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <SparklesIcon size={18} color={colors.onSecondaryContainer} />
                  <Text style={styles.menuItemTextPrimary}>Cadastre-se para desbloquear</Text>
                </Pressable>
              )}

              <Pressable
                onPress={onLogout}
                style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.85 }]}
              >
                <LogoutIcon size={18} color={colors.error} />
                <Text style={[styles.menuItemText, { color: colors.error }]}>
                  {isGuest ? "Encerrar sessão" : "Sair"}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: { padding: 4 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.surfaceContainerHighest,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGuest: {
    backgroundColor: colors.secondaryContainer,
    borderColor: "rgba(0, 97, 114, 0.3)",
  },
  avatarText: { ...typography.titleMd, color: colors.onSurface, fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 28, 48, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: { ...typography.titleLg, color: colors.onSurface },
  name: { ...typography.titleMd, color: colors.onSurface },
  email: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  menuPrimary: { backgroundColor: colors.secondaryContainer },
  menuItemText: { ...typography.titleMd, color: colors.onSurface, fontSize: 14 },
  menuItemTextPrimary: { ...typography.titleMd, color: colors.onSecondaryContainer, fontSize: 14 },
});
