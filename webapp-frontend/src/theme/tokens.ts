/**
 * CSS-variable references for every design token, so dynamic inline styles
 * (accent bars, status colors) can pull from the same source of truth defined
 * in globals.css. For static styling prefer the Tailwind utilities
 * (bg-primary, text-on-surface, …) which map to these same variables.
 */
export const colors = {
  surface: "var(--color-surface)",
  surfaceDim: "var(--color-surface-dim)",
  surfaceBright: "var(--color-surface-bright)",
  surfaceContainerLowest: "var(--color-surface-container-lowest)",
  surfaceContainerLow: "var(--color-surface-container-low)",
  surfaceContainer: "var(--color-surface-container)",
  surfaceContainerHigh: "var(--color-surface-container-high)",
  surfaceContainerHighest: "var(--color-surface-container-highest)",

  onSurface: "var(--color-on-surface)",
  onSurfaceVariant: "var(--color-on-surface-variant)",
  inverseSurface: "var(--color-inverse-surface)",
  inverseOnSurface: "var(--color-inverse-on-surface)",

  outline: "var(--color-outline)",
  outlineVariant: "var(--color-outline-variant)",

  primary: "var(--color-primary)",
  onPrimary: "var(--color-on-primary)",
  primaryContainer: "var(--color-primary-container)",
  onPrimaryContainer: "var(--color-on-primary-container)",
  primarySubtle: "var(--color-primary-subtle)",

  secondary: "var(--color-secondary)",
  onSecondary: "var(--color-on-secondary)",
  secondaryContainer: "var(--color-secondary-container)",
  onSecondaryContainer: "var(--color-on-secondary-container)",

  tertiary: "var(--color-tertiary)",
  onTertiary: "var(--color-on-tertiary)",
  tertiaryContainer: "var(--color-tertiary-container)",
  onTertiaryContainer: "var(--color-on-tertiary-container)",

  error: "var(--color-error)",
  onError: "var(--color-on-error)",
  errorContainer: "var(--color-error-container)",
  onErrorContainer: "var(--color-on-error-container)",
} as const;
