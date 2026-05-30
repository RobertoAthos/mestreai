"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/Icon";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  leftIcon?: ReactNode;
  helperText?: string;
  error?: string;
  isPassword?: boolean;
};

export function TextField({
  label,
  leftIcon,
  helperText,
  error,
  isPassword,
  className,
  id,
  ...inputProps
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [hidden, setHidden] = useState(!!isPassword);
  const showHidden = isPassword && hidden;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="px-1 type-label-md text-on-surface-variant">
          {label}
        </label>
      )}
      <div
        className={[
          "relative flex items-center rounded-md border bg-surface transition-shadow",
          "focus-within:ring-2 focus-within:ring-secondary/40",
          error ? "border-error" : "border-outline focus-within:border-secondary",
        ].join(" ")}
        style={{ height: 52 }}
      >
        {leftIcon && (
          <span className="pointer-events-none absolute left-4 flex items-center text-on-surface-variant">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword ? (showHidden ? "password" : "text") : "text"}
          className={[
            "h-full w-full rounded-md bg-transparent px-4 text-[15px] text-on-surface outline-none placeholder:text-outline",
            leftIcon ? "pl-11" : "",
            isPassword ? "pr-11" : "",
            className ?? "",
          ].join(" ")}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setHidden((h) => !h)}
            aria-label={hidden ? "Mostrar senha" : "Ocultar senha"}
            className="absolute right-3 flex items-center p-1 text-on-surface-variant"
          >
            {hidden ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          </button>
        )}
      </div>
      {(error || helperText) && (
        <span
          className="px-1 type-body-sm"
          style={{ color: error ? "var(--color-error)" : "var(--color-on-surface-variant)" }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
}
