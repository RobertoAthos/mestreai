"use client";

import { CheckIcon } from "@/components/Icon";

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel?: string;
  ariaLabelledBy?: string;
};

export function Checkbox({ checked, onChange, accessibilityLabel, ariaLabelledBy }: Props) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabelledBy ? undefined : accessibilityLabel}
      aria-labelledby={ariaLabelledBy}
      className="p-0.5"
    >
      <span
        className={[
          "flex h-5 w-5 items-center justify-center rounded-sm border-[1.5px] transition-colors",
          checked ? "bg-secondary border-secondary" : "bg-surface border-outline-variant",
        ].join(" ")}
      >
        {checked && <CheckIcon size={14} color="var(--color-on-secondary)" strokeWidth={3} />}
      </span>
    </button>
  );
}
