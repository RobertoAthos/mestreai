import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";

import { HardHatIcon } from "@/components/Icon";
import { colors, radius, spacing, typography } from "@/theme";
import { enter, layout } from "@/theme/animations";
import type { ChatRole } from "@/types/api";

type Props = {
  role: ChatRole;
  content: string;
  timestamp?: string;
};

export function ChatBubble({ role, content, timestamp }: Props) {
  const isUser = role === "user";
  return (
    <Animated.View
      entering={enter.fadeUp(0)}
      layout={layout}
      style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <HardHatIcon size={20} color={colors.onPrimary} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>{content}</Text>
        {timestamp && (
          <Text style={[styles.time, isUser ? styles.userTime : styles.aiTime]}>{timestamp}</Text>
        )}
      </View>
    </Animated.View>
  );
}

export function TimestampPill({ label }: { label: string }) {
  return (
    <Animated.View entering={enter.fade()} style={styles.timestampWrap}>
      <View style={styles.timestampPill}>
        <Text style={styles.timestampText}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm + 4,
    width: "100%",
    paddingVertical: spacing.xs,
  },
  rowStart: { justifyContent: "flex-start" },
  rowEnd: { justifyContent: "flex-end" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(198, 198, 205, 0.5)",
  },
  bubble: {
    maxWidth: "82%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "transparent",
    minHeight: 44,
  },
  aiBubble: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: "rgba(198, 198, 205, 0.3)",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
  },
  text: { ...typography.bodyLg, fontSize: 15 },
  aiText: { color: colors.onSurfaceVariant },
  userText: { color: colors.onPrimary },
  time: { ...typography.labelMd, marginTop: 4 },
  aiTime: { color: colors.secondary },
  userTime: { color: colors.primarySubtle, opacity: 0.8 },
  timestampWrap: { alignItems: "center", paddingVertical: spacing.sm },
  timestampPill: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(198, 198, 205, 0.5)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  timestampText: { ...typography.labelMd, color: colors.secondary },
});
