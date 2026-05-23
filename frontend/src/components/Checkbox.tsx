import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { CheckIcon } from "@/components/Icon";
import { colors, radius } from "@/theme";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
};

export function Checkbox({ checked, onChange, accessibilityLabel }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      style={styles.tap}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <CheckIcon size={14} color={colors.onSecondary} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tap: { padding: 2 },
  box: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  boxChecked: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
});
