"use client";

type Props = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  index?: number;
};

export function QuickReplyChip({ label, onClick, disabled, index = 0 }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
      className={[
        "press animate-fade-up shrink-0 whitespace-nowrap rounded-full border border-[rgba(198,198,205,0.5)] bg-surface-container-low px-4 py-[9px] text-[12px] font-medium text-on-surface-variant shadow-card",
        disabled ? "opacity-60" : "hover:bg-surface-container",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
