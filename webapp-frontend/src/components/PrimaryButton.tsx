"use client";

import type { ReactNode } from "react";

import { Spinner } from "@/components/Spinner";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary border-primary",
  secondary: "bg-secondary-container text-on-secondary-container border-secondary-container",
  ghost: "bg-transparent text-on-surface border-surface-container-highest",
};

export function PrimaryButton({
  label,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
  loading,
  leadingIcon,
  fullWidth = true,
  className,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      className={[
        "press inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border px-6 type-title-md",
        variants[variant],
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:brightness-[0.97]",
        className ?? "",
      ].join(" ")}
    >
      {loading ? (
        <Spinner size={22} />
      ) : (
        <>
          {leadingIcon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
