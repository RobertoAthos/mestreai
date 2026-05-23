import { Redirect, Stack } from "expo-router";

import { useAuth } from "@/store/AuthContext";
import { colors } from "@/theme";

export default function AuthLayout() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status === "authenticated") return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        // Within auth, login ↔ signup is navigation — slide preserves
        // the spatial relationship between them.
        animation: "slide_from_right",
        animationDuration: 240,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
