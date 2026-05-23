import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { EyeIcon, EyeOffIcon } from "@/components/Icon";
import { colors, radius, spacing, typography } from "@/theme";

type Props = TextInputProps & {
  label?: string;
  leftIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  helperText?: string;
  error?: string;
  isPassword?: boolean;
};

export function TextField({
  label,
  leftIcon,
  trailing,
  helperText,
  error,
  isPassword,
  style,
  ...inputProps
}: Props) {
  const [hidden, setHidden] = useState(!!isPassword);
  const showHidden = isPassword && hidden;
  const borderColor = error ? colors.error : colors.outline;
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputBox, { borderColor }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...inputProps}
          secureTextEntry={showHidden}
          placeholderTextColor={colors.outline}
          style={[styles.input, leftIcon ? { paddingLeft: 44 } : null, style]}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar senha" : "Ocultar senha"}
            style={styles.trailing}
          >
            {hidden ? <EyeIcon size={18} color={colors.outline} /> : <EyeOffIcon size={18} color={colors.outline} />}
          </Pressable>
        ) : trailing ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : null}
      </View>
      {(error || helperText) && (
        <Text style={[styles.helper, error && { color: colors.error }]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
  inputBox: {
    position: "relative",
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  leftIcon: {
    position: "absolute",
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  trailing: {
    position: "absolute",
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingLeft: spacing.sm,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingRight: 44,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: colors.onSurface,
  },
  helper: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    paddingHorizontal: 4,
  },
});
