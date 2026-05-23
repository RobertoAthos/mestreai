/**
 * Animation tokens — keeps timing/easing/spring presets consistent
 * across every motion in the app. Values are tuned for "feels native"
 * on mobile: quick enough to not feel sluggish, slow enough to convey
 * spatial relationships.
 */

import {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  type WithSpringConfig,
} from "react-native-reanimated";

export const duration = {
  /** Tiny micro-interactions (press feedback). */
  xs: 120,
  /** Default for most UI transitions. */
  sm: 220,
  /** List items, larger surfaces. */
  md: 320,
  /** Long form transitions, used sparingly. */
  lg: 480,
} as const;

export const spring = {
  /** Snappy press feedback. Mid-stiffness so it lands fast without overshoot. */
  press: { damping: 18, stiffness: 320, mass: 0.6 } satisfies WithSpringConfig,
  /** Card / FAB entrance. Slight bounce. */
  card: { damping: 16, stiffness: 200, mass: 0.8 } satisfies WithSpringConfig,
} as const;

/** Stagger helper — returns a per-index delay capped so a long list
 * doesn't drag the last items in noticeably late. */
export function stagger(i: number, step = 50, max = 8): number {
  return Math.min(i, max) * step;
}

export const enter = {
  fade: () => FadeIn.duration(duration.sm),
  fadeUp: (delayMs = 0) => FadeInUp.duration(duration.md).delay(delayMs),
  fadeDown: (delayMs = 0) => FadeInDown.duration(duration.md).delay(delayMs),
};

export const layout = Layout.duration(duration.sm);
