import { Redirect, Tabs } from "expo-router";
import type { ReactElement } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  ChatIcon,
  ClipboardIcon,
  DashboardIcon,
  UploadIcon,
} from "@/components/Icon";
import { useAuth } from "@/store/AuthContext";
import { colors, elevation, radius, spacing, typography } from "@/theme";

type IconComponent = (props: { size?: number; color?: string; strokeWidth?: number }) => ReactElement;

const ICON_SIZE = 22;

function TabIcon({ Icon, focused }: { Icon: IconComponent; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon size={ICON_SIZE} color={focused ? colors.onPrimary : colors.secondary} strokeWidth={2} />
    </View>
  );
}

export default function TabsLayout() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status === "anonymous") return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.secondary,
        // Bottom-tab transition: "shift" cross-fades the incoming tab
        // with a subtle slide. lazy=false keeps siblings warm so the
        // animation isn't preceded by an empty-mount flash.
        animation: "shift",
        lazy: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon Icon={DashboardIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Upload",
          tabBarIcon: ({ focused }) => <TabIcon Icon={UploadIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: "Resumo",
          tabBarIcon: ({ focused }) => <TabIcon Icon={ClipboardIcon} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => <TabIcon Icon={ChatIcon} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 88 : 72,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 28 : spacing.sm,
    paddingHorizontal: spacing.sm,
    ...elevation.nav,
  },
  tabItem: {
    borderRadius: radius.md,
  },
  tabLabel: {
    ...typography.labelMd,
    marginTop: 2,
  },
  iconWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
});
