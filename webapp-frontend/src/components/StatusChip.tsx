import { RefreshIcon } from "@/components/Icon";
import { colors } from "@/theme/tokens";
import type { ProjectStatus } from "@/types/api";

const labels: Record<ProjectStatus, string> = {
  ready: "Analisado",
  processing: "Processando",
  failed: "Falhou",
};

const chipStyles: Record<ProjectStatus, { bg: string; fg: string; accent: string }> = {
  ready: { bg: colors.tertiaryContainer, fg: colors.onTertiaryContainer, accent: colors.tertiary },
  processing: {
    bg: colors.primaryContainer,
    fg: colors.onPrimaryContainer,
    accent: colors.primary,
  },
  failed: { bg: colors.errorContainer, fg: colors.onErrorContainer, accent: colors.error },
};

export function statusAccentColor(status: ProjectStatus): string {
  return chipStyles[status].accent;
}

export function StatusChip({ status }: { status: ProjectStatus }) {
  const style = chipStyles[status];
  return (
    <span
      className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 type-label-md"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      {status === "processing" && (
        <RefreshIcon size={12} strokeWidth={2.4} className="animate-spin [animation-duration:2.5s]" />
      )}
      {labels[status]}
    </span>
  );
}
