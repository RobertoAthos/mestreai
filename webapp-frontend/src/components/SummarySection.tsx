import type { ReactNode } from "react";

import { colors } from "@/theme/tokens";

type Tone = "neutral" | "accent" | "dark" | "warning";

type Props = {
  title: string;
  icon: ReactNode;
  tone?: Tone;
  children: ReactNode;
};

const tones: Record<Tone, { accent: string; bg: string; border: string; title: string }> = {
  neutral: {
    accent: colors.secondary,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  accent: {
    accent: colors.secondary,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  dark: {
    accent: colors.onSurface,
    bg: colors.surfaceContainerLowest,
    border: colors.outlineVariant,
    title: colors.onSurface,
  },
  warning: {
    accent: colors.error,
    bg: colors.errorContainer,
    border: "rgba(186, 26, 26, 0.5)",
    title: colors.onErrorContainer,
  },
};

export function SummarySection({ title, icon, tone = "neutral", children }: Props) {
  const palette = tones[tone];
  return (
    <section
      className="animate-fade-up relative overflow-hidden rounded-lg border py-6 pl-8 pr-6 shadow-card"
      style={{ backgroundColor: palette.bg, borderColor: palette.border }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 w-2"
        style={{ backgroundColor: palette.accent }}
      />
      <header className="flex items-center gap-2">
        {icon}
        <h3 className="type-headline-md" style={{ color: palette.title }}>
          {title}
        </h3>
      </header>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </section>
  );
}
