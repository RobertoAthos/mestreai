/**
 * Mestre IA — design tokens (mapped from DESIGN.md).
 * Single source of truth for colors, typography, spacing, radius and shadows.
 */

export const colors = {
  // Surface family — light blue-tinted background to give the blueprint feel.
  surface: "#f8f9ff",
  surfaceDim: "#cbdbf5",
  surfaceBright: "#f8f9ff",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#eff4ff",
  surfaceContainer: "#e5eeff",
  surfaceContainerHigh: "#dce9ff",
  surfaceContainerHighest: "#d3e4fe",

  // Foreground.
  onSurface: "#0b1c30",
  onSurfaceVariant: "#45464d",
  inverseSurface: "#213145",
  inverseOnSurface: "#eaf1ff",

  // Outline.
  outline: "#76777d",
  outlineVariant: "#c6c6cd",

  // Primary — deep navy used for hero containers and active states.
  primary: "#131b2e",
  onPrimary: "#ffffff",
  primaryContainer: "#131b2e",
  onPrimaryContainer: "#7c839b",
  primarySubtle: "#7c839b",

  // Secondary — technical teal used for accents, links and chips.
  secondary: "#00687a",
  onSecondary: "#ffffff",
  secondaryContainer: "#57dffe",
  onSecondaryContainer: "#006172",

  // Tertiary — emerald used for success / completed.
  tertiary: "#2e7d32",
  onTertiary: "#ffffff",
  tertiaryContainer: "#e8f5e9",
  onTertiaryContainer: "#1b5e20",

  // Error.
  error: "#ba1a1a",
  onError: "#ffffff",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // Status colors used by chips and accent borders.
  statusSuccess: "#2e7d32",
  statusProcessing: "#57dffe",
  statusDraft: "#00687a",
  statusError: "#ba1a1a",
} as const;

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
} as const;

export type FontFamily = (typeof fontFamily)[keyof typeof fontFamily];

export const typography = {
  displayLg: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 48,
    letterSpacing: -0.8,
  },
  headlineLg: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  headlineMd: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    lineHeight: 32,
  },
  titleLg: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 28,
  },
  titleMd: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  labelMd: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  codeMd: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenPadding: 16,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const elevation = {
  card: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modal: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 8,
  },
  nav: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
} as const;

export const theme = {
  colors,
  fontFamily,
  typography,
  spacing,
  radius,
  elevation,
};

export type Theme = typeof theme;
