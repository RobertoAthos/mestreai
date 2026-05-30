"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentType } from "react";

import {
  ArrowRightIcon,
  ChatIcon,
  ChecklistIcon,
  CloudUploadIcon,
  DoorIcon,
  type IconProps,
  RulerIcon,
  ScanIcon,
  SparkleIcon,
  WallIcon,
  WindowIcon,
  ZapIcon,
} from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { Reveal } from "@/components/Reveal";
import { Spinner } from "@/components/Spinner";
import { StatusChip } from "@/components/StatusChip";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";

const NAV_LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "O que você recebe" },
];

function useTryAnalyzer() {
  const router = useRouter();
  const { status, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const start = async () => {
    if (loading) return;
    setError(undefined);
    if (status === "authenticated") {
      router.push("/upload");
      return;
    }
    setLoading(true);
    try {
      await continueAsGuest();
      router.push("/upload");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível iniciar. Tente novamente.");
      setLoading(false);
    }
  };

  return { start, loading, error, authenticated: status === "authenticated" };
}

export default function LandingPage() {
  const { start, loading, error } = useTryAnalyzer();

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-on-surface">
      {/* Ambient atmosphere — soft indigo/cyan washes on the white canvas */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div
          className="animate-glow absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(79,71,229,0.16), transparent 65%)" }}
        />
        <div
          className="animate-glow absolute -right-40 top-1/4 h-[32rem] w-[32rem] rounded-full blur-3xl [animation-delay:1.5s]"
          style={{ background: "radial-gradient(circle, rgba(95,220,240,0.16), transparent 65%)" }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-surface-container-highest/70 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="font-display text-[19px] font-bold tracking-tight text-on-surface">
              Mestre IA
            </span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav-link hidden px-3 py-2 md:inline-block">
                {l.label}
              </a>
            ))}
            <Link href="/login" className="nav-link px-3 py-2">
              Analisar meu projeto
            </Link>
            <CtaButton onClick={start} loading={loading} compact label="Analisar grátis" />
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="landing-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_78%)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
            <div className="flex flex-col items-start gap-7">
              <span className="reveal inline-flex items-center gap-2 rounded-full border border-surface-container-highest bg-surface-container-low px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-secondary">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                Leitura automática de plantas em PDF
              </span>

              <h1 className="reveal font-display text-[clamp(40px,7vw,68px)] font-black leading-[0.98] tracking-tight [animation-delay:80ms]">
                Sua planta,
                <br />
                <span className="text-gradient">pronta pra obra.</span>
              </h1>

              <p className="reveal max-w-md text-[17px] leading-relaxed text-on-surface-variant [animation-delay:160ms]">
                Envie o PDF e receba as medidas dos ambientes, as portas e janelas, as paredes e o
                passo a passo da obra — em poucos minutos.
              </p>

              <div className="reveal flex w-full flex-col items-start gap-4 [animation-delay:240ms] sm:flex-row sm:items-center">
                <CtaButton onClick={start} loading={loading} label="Analisar projeto grátis" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                  sem cadastro · 1 projeto grátis
                </span>
              </div>
              {error && <p className="reveal text-sm text-error">{error}</p>}
            </div>

            <div className="reveal [animation-delay:200ms]">
              <BlueprintScan />
            </div>
          </div>

          {/* Capability ribbon */}
          <div className="relative border-y border-surface-container-highest/70 bg-surface-container-low/50">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-on-surface-variant sm:px-6">
              <span className="font-semibold text-secondary">Você recebe</span>
              {["Ambientes", "Portas", "Janelas", "Paredes", "Passo a passo", "Áreas"].map((t, i) => (
                <span key={t} className="flex items-center gap-6">
                  {i > 0 && <span className="h-1 w-1 rounded-full bg-outline-variant" />}
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <Reveal>
            <SectionEyebrow label="Como funciona" title="Da planta ao canteiro em 3 passos" />
          </Reveal>
          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <span
              aria-hidden
              className="absolute left-0 right-0 top-7 hidden border-t border-dashed border-surface-container-highest md:block"
            />
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <Step index={i + 1} {...s} />
              </Reveal>
            ))}
          </div>
        </section>

        {/* What you get — bento */}
        <section id="recursos" className="scroll-mt-20 border-y border-surface-container-highest/70 bg-surface-container-low/40 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal>
              <SectionEyebrow label="O que você recebe" title="Tudo da sua planta, organizado" />
            </Reveal>
            <Reveal>
              <div className="mt-12 grid auto-rows-[minmax(168px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f, i) => (
                  <FeatureCard key={f.title} index={i + 1} span={f.span} {...f} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA band — bold indigo on white */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-primary p-10 text-center shadow-top sm:p-16">
              <div className="landing-grid pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay" />
              <div
                aria-hidden
                className="animate-glow pointer-events-none absolute -bottom-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(95,220,240,0.35), transparent 70%)" }}
              />
              <div className="relative flex flex-col items-center gap-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary-subtle">
                  comece agora
                </span>
                <h2 className="max-w-2xl font-display text-[clamp(28px,4.5vw,44px)] font-black leading-[1.05] tracking-tight text-on-primary">
                  Analise sua primeira planta <span style={{ color: "#5fdcf0" }}>de graça</span>.
                </h2>
                <p className="max-w-md text-primary-subtle">
                  Um projeto de cortesia, sem cadastro. Acompanhe a leitura da planta em tempo real.
                </p>
                <button
                  type="button"
                  onClick={start}
                  disabled={loading}
                  className="press inline-flex items-center gap-2 rounded-xl bg-secondary-container px-6 py-3.5 font-semibold text-on-secondary-container shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-70"
                >
                  {loading ? (
                    <Spinner size={18} color="var(--color-on-secondary-container)" />
                  ) : (
                    <ArrowRightIcon size={18} color="var(--color-on-secondary-container)" />
                  )}
                  {loading ? "Preparando…" : "Analisar projeto grátis"}
                </button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-container-highest/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo size={24} />
            <span className="font-display text-[15px] font-bold tracking-tight">Mestre IA</span>
          </div>
          <p className="text-[13px] text-on-surface-variant">
            Leitura de plantas arquitetônicas para o canteiro de obras
          </p>
          <Link href="/login" className="nav-link">
            Analisar meu projeto
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces -- */

function CtaButton({
  onClick,
  loading,
  label,
  compact,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={[
        "press group inline-flex items-center gap-2 rounded-xl bg-secondary font-semibold text-on-secondary transition-shadow disabled:opacity-70",
        "shadow-[0_8px_30px_-6px_rgba(79,71,229,0.5)] hover:shadow-[0_10px_40px_-4px_rgba(79,71,229,0.65)]",
        compact ? "px-4 py-2.5 text-[13px]" : "px-6 py-3.5 text-[15px]",
      ].join(" ")}
    >
      {loading ? (
        <Spinner size={compact ? 16 : 18} />
      ) : (
        <SparkleIcon size={compact ? 16 : 18} color="var(--color-on-secondary)" />
      )}
      {loading ? "Preparando…" : label}
      {!loading && !compact && (
        <ArrowRightIcon
          size={18}
          color="var(--color-on-secondary)"
          className="transition-transform group-hover:translate-x-0.5"
        />
      )}
    </button>
  );
}

function SectionEyebrow({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">
        {label}
      </span>
      <h2 className="font-display text-[clamp(26px,4vw,40px)] font-bold leading-tight tracking-tight text-on-surface">
        {title}
      </h2>
    </div>
  );
}

const STEPS: { Icon: ComponentType<IconProps>; title: string; desc: string }[] = [
  { Icon: CloudUploadIcon, title: "Envie o PDF", desc: "Arraste o PDF da planta do projeto." },
  { Icon: ScanIcon, title: "Leitura automática", desc: "As medidas e esquadrias saem sozinhas." },
  { Icon: ChatIcon, title: "Tire dúvidas", desc: "Pergunte sobre a planta e leve o passo a passo." },
];

function Step({
  index,
  Icon,
  title,
  desc,
}: {
  index: number;
  Icon: ComponentType<IconProps>;
  title: string;
  desc: string;
}) {
  return (
    <div className="relative flex flex-col items-center gap-3 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-container-highest bg-surface-container-lowest text-secondary shadow-[0_8px_24px_-10px_rgba(79,71,229,0.6)]">
        <Icon size={24} />
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-on-primary">
          {index}
        </span>
      </div>
      <h3 className="font-display text-[20px] font-semibold tracking-tight text-on-surface">
        {title}
      </h3>
      <p className="max-w-[220px] text-[14px] text-on-surface-variant">{desc}</p>
    </div>
  );
}

const FEATURES: {
  Icon: ComponentType<IconProps>;
  title: string;
  desc: string;
  span?: boolean;
}[] = [
  {
    Icon: RulerIcon,
    title: "Medidas dos ambientes",
    desc: "Largura, comprimento e área de cada cômodo, direto das cotas.",
    span: true,
  },
  { Icon: DoorIcon, title: "Portas", desc: "Código, vão e ambiente." },
  { Icon: WindowIcon, title: "Janelas", desc: "Medidas e peitoril." },
  { Icon: WallIcon, title: "Paredes", desc: "Tipo e espessura." },
  { Icon: ChecklistIcon, title: "Passo a passo da obra", desc: "A ordem certa pra executar, em lista." },
  {
    Icon: ChatIcon,
    title: "Tire dúvidas na conversa",
    desc: "Pergunte qualquer coisa sobre a planta e receba a resposta na hora.",
    span: true,
  },
  { Icon: ZapIcon, title: "Em tempo real", desc: "Os dados aparecem conforme a planta é lida." },
];

function FeatureCard({
  index,
  Icon,
  title,
  desc,
  span,
}: {
  index: number;
  Icon: ComponentType<IconProps>;
  title: string;
  desc: string;
  span?: boolean;
}) {
  return (
    <div
      className={[
        "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest p-6 shadow-card transition-all hover:-translate-y-1 hover:border-secondary/50 hover:shadow-top",
        span ? "sm:col-span-2" : "",
      ].join(" ")}
    >
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-60" />
      <div className="relative flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-low text-secondary transition-shadow group-hover:shadow-[0_0_22px_-6px_rgba(79,71,229,0.7)]">
          <Icon size={22} />
        </span>
        <span className="font-mono text-[12px] text-on-surface-variant">
          {String(index).padStart(2, "0")}
        </span>
      </div>
      <h3 className="relative font-display text-[19px] font-semibold tracking-tight text-on-surface">
        {title}
      </h3>
      <p className="relative max-w-prose text-[14px] leading-relaxed text-on-surface-variant">
        {desc}
      </p>
    </div>
  );
}

/** Animated floor-plan "scan" — the product's value, shown not told. */
function BlueprintScan() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div
        className="animate-glow absolute -inset-6 rounded-[2rem] blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(79,71,229,0.14), transparent 70%)" }}
      />
      <div className="relative overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-top">
        {/* chrome */}
        <div className="flex items-center gap-2 border-b border-surface-container-highest px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-error/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-secondary-container" />
          <span className="h-2.5 w-2.5 rounded-full bg-tertiary/60" />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
            residencia-alphaville.pdf
          </span>
        </div>

        {/* plan + scanner */}
        <div className="relative aspect-[4/3] p-5">
          <div className="landing-grid absolute inset-0 opacity-70" />
          <svg viewBox="0 0 420 300" className="relative h-full w-full" fill="none">
            {/* outer walls — indigo */}
            <rect x="24" y="24" width="372" height="230" rx="3" stroke="#4f46e5" strokeWidth="2.5" />
            {/* partitions — light indigo */}
            <g stroke="#818cf8" strokeWidth="2" strokeLinejoin="round">
              <path d="M250 24 V160" />
              <path d="M24 160 H250" />
              <path d="M250 100 H396" strokeOpacity="0.85" />
              <path d="M250 130 a26 26 0 0 1 -26 26" strokeWidth="1.4" strokeOpacity="0.8" />
              <path d="M150 160 a24 24 0 0 0 24 -24" strokeWidth="1.4" strokeOpacity="0.8" />
            </g>
            {/* nodes */}
            <g fill="#4f46e5">
              {[
                [24, 24],
                [396, 24],
                [24, 254],
                [396, 254],
                [250, 160],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.4" />
              ))}
            </g>
            {/* dimension line */}
            <g stroke="#8990a6" strokeWidth="1">
              <path d="M24 274 H396" strokeDasharray="3 4" />
              <path d="M24 268 V280 M396 268 V280" />
            </g>
            {/* room labels (mono) */}
            <g className="font-mono" fill="#4f5871" fontSize="11" letterSpacing="1.5">
              <text x="120" y="96">SALA</text>
              <text x="305" y="68">SUÍTE</text>
              <text x="110" y="214">COZINHA</text>
              <text x="300" y="200">BANHO</text>
            </g>
            <text x="200" y="291" className="font-mono" fill="#8990a6" fontSize="11" letterSpacing="1.5">
              12,40 m
            </text>
          </svg>

          {/* scanner sweep */}
          <div
            className="animate-scan pointer-events-none absolute inset-x-3 top-0 h-24"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(95,220,240,0.16) 45%, rgba(95,220,240,0.4) 50%, rgba(95,220,240,0.16) 55%, transparent)",
            }}
          />
          {/* corner brackets */}
          {[
            "left-3 top-3 border-l-2 border-t-2",
            "right-3 top-3 border-r-2 border-t-2",
            "left-3 bottom-3 border-b-2 border-l-2",
            "right-3 bottom-3 border-b-2 border-r-2",
          ].map((pos) => (
            <span key={pos} className={`absolute h-5 w-5 border-secondary/70 ${pos}`} />
          ))}
        </div>

        {/* live status footer */}
        <div className="flex items-center gap-2 border-t border-surface-container-highest px-4 py-3">
          <Spinner size={14} color="var(--color-secondary)" />
          <span className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
            lendo as medidas…
          </span>
        </div>
      </div>

      {/* floating extracted-data chips */}
      <div className="animate-float absolute -left-4 bottom-16 hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest px-3 py-2 shadow-top sm:block">
        <p className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">Sala</p>
        <p className="font-mono text-[13px] font-medium text-on-surface">4,20 × 3,60 m</p>
      </div>
      <div className="animate-float absolute -right-3 top-20 hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest px-3 py-2 shadow-top [animation-delay:1.2s] sm:flex sm:items-center sm:gap-2">
        <DoorIcon size={16} color="var(--color-secondary)" />
        <span className="font-mono text-[12px] text-on-surface">P1 · 0,90 × 2,10</span>
      </div>
      <div className="absolute -right-2 -top-3 hidden sm:block">
        <span className="animate-float inline-block rounded-full shadow-lg [animation-delay:0.6s]">
          <StatusChip status="ready" />
        </span>
      </div>
    </div>
  );
}
