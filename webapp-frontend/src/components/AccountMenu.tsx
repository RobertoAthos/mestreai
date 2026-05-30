"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoutIcon, SparklesIcon } from "@/components/Icon";
import { useAuth } from "@/store/AuthContext";

export function AccountMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();
  const isGuest = !!user?.is_guest;

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    // Move focus into the panel so keyboard users land on the first action.
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.relatedTarget as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    wrapRef.current?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      wrapRef.current?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout();
    router.replace("/login");
  };

  const onSignup = () => {
    close(false);
    router.push("/signup");
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menu da conta"
        aria-haspopup="true"
        aria-expanded={open}
        className="press flex p-1"
      >
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-full border type-title-md text-[14px]",
            isGuest
              ? "border-[rgba(0,97,114,0.3)] bg-secondary-container text-on-secondary-container"
              : "border-surface-container-highest bg-surface-container-high text-on-surface",
          ].join(" ")}
        >
          {initial}
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="animate-fade-down absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest p-4 shadow-modal"
        >
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <span
              className={[
                "flex h-12 w-12 items-center justify-center rounded-full type-title-lg",
                isGuest
                  ? "bg-secondary-container text-on-secondary-container"
                  : "bg-surface-container-high text-on-surface",
              ].join(" ")}
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate type-title-md text-on-surface">
                {user?.name || (isGuest ? "Visitante" : "Conta")}
              </p>
              <p className="truncate type-body-md text-on-surface-variant">
                {isGuest ? "Sessão temporária" : user?.email || ""}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {isGuest && (
              <button
                type="button"
                onClick={onSignup}
                className="press flex items-center gap-3 rounded-md bg-secondary-container p-4 text-left text-on-secondary-container"
              >
                <SparklesIcon size={18} />
                <span className="type-title-md text-[14px]">Cadastre-se para desbloquear</span>
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              className="press flex items-center gap-3 rounded-md bg-surface-container-low p-4 text-left text-error"
            >
              <LogoutIcon size={18} color="var(--color-error)" />
              <span className="type-title-md text-[14px]">{isGuest ? "Encerrar sessão" : "Sair"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
