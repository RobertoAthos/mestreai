"use client";

import { useEffect, useId, useRef } from "react";

import { PrimaryButton } from "@/components/PrimaryButton";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const msgId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;

    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    // Land focus on the safe action (Cancel is the last button in DOM order).
    const initial = focusables();
    (initial[initial.length - 1] ?? node)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-[rgba(2,4,10,0.72)] p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={msgId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-up w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-modal outline-none"
      >
        <h2 className="type-title-lg text-on-surface">{title}</h2>
        <p id={msgId} className="mt-2 type-body-md text-on-surface-variant">
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <PrimaryButton
            label={confirmLabel}
            loading={loading}
            onClick={onConfirm}
            variant="primary"
            className={destructive ? "!border-error !bg-error !text-on-error" : undefined}
          />
          <PrimaryButton label={cancelLabel} onClick={onCancel} variant="ghost" />
        </div>
      </div>
    </div>
  );
}
