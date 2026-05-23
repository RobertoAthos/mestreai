import React from "react";
import { Image, type ImageStyle, type StyleProp } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

// Aspect ratio of the brand PNG (366x422). Width is the controllable
// dimension; height tracks the ratio so the artwork never stretches.
const ASPECT = 366 / 422;

export function Logo({ size = 28, style }: Props) {
  return (
    <Image
      source={require("../../assets/logo.png")}
      resizeMode="contain"
      style={[{ width: size * ASPECT, height: size }, style]}
      accessible
      accessibilityLabel="Mestre IA"
    />
  );
}
