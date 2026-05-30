"use client";

import { useRouter } from "next/navigation";

import { ArrowRightIcon, SparklesIcon } from "@/components/Icon";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";

type Props = {
  variant?: "full" | "compact";
};

export function GuestBanner({ variant = "full" }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { quota } = useApp();

  if (!user?.is_guest) return null;

  const used = quota?.used ?? 0;
  const limit = quota?.limit ?? 1;
  const remaining = Math.max(0, limit - used);
  const exhausted = remaining <= 0;

  const title = exhausted
    ? "Você usou sua análise de cortesia"
    : `Modo visitante · ${used} de ${limit} usado(s)`;

  const description = exhausted
    ? "Cadastre-se gratuitamente para enviar novas plantas, manter o histórico e usar o chat."
    : "Você tem 1 upload para experimentar. Cadastre-se para liberar uploads ilimitados, histórico e chat persistente.";

  // Indigo tone for the normal state, rose for the exhausted state.
  const tone = exhausted
    ? {
        box: "border-[rgba(220,38,38,0.25)] bg-error-container",
        text: "text-on-error-container",
        icon: "text-error",
        arrow: "var(--color-on-error-container)",
      }
    : {
        box: "border-[rgba(79,71,229,0.25)] bg-primary-container",
        text: "text-on-primary-container",
        icon: "text-primary",
        arrow: "var(--color-on-primary-container)",
      };

  return (
    <button
      type="button"
      onClick={() => router.push("/signup")}
      aria-label="Cadastre-se para desbloquear recursos"
      className={[
        "press flex w-full items-center gap-4 rounded-lg border text-left",
        variant === "compact" ? "p-2.5" : "p-4",
        tone.box,
      ].join(" ")}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest ${tone.icon}`}
      >
        <SparklesIcon size={18} />
      </span>
      <span className="flex-1">
        <span className={`block type-title-md text-[14px] ${tone.text}`}>{title}</span>
        <span className={`block type-body-sm opacity-90 ${tone.text}`}>{description}</span>
      </span>
      <span
        className={`flex shrink-0 items-center gap-1 rounded-full bg-surface-container-lowest px-2.5 py-1.5 ${tone.text}`}
      >
        <span className="type-label-md">CADASTRAR</span>
        <ArrowRightIcon size={14} color={tone.arrow} />
      </span>
    </button>
  );
}
