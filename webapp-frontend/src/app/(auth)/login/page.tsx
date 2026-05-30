"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArrowRightIcon, LockIcon, MailIcon, SparklesIcon, UserIcon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const canSubmit = email.trim().length > 3 && password.length >= 1 && !submitting;

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(undefined);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const onGuest = async () => {
    if (guestLoading) return;
    setGuestLoading(true);
    setError(undefined);
    try {
      await continueAsGuest();
      router.replace("/upload");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível iniciar o modo visitante.",
      );
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div className="animate-fade-down flex justify-center">
        <Logo size={96} />
      </div>

      <form onSubmit={onSubmit} className="animate-fade-up flex flex-col gap-3">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 className="type-title-lg text-[22px] text-on-surface">Bem-vindo de volta</h1>
          <p className="type-body-md text-on-surface-variant">Acesse sua conta para continuar.</p>
        </div>

        <TextField
          label="E-MAIL"
          placeholder="exemplo@mestreia.com"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<MailIcon size={18} />}
          disabled={submitting}
        />

        <TextField
          label="SENHA"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<LockIcon size={18} />}
          isPassword
          disabled={submitting}
        />

        {error && (
          <div className="rounded-xl bg-error-container p-2.5">
            <p className="type-body-md text-on-error-container">{error}</p>
          </div>
        )}

        <PrimaryButton
          label="Entrar"
          type="submit"
          variant="secondary"
          loading={submitting}
          disabled={!canSubmit}
          leadingIcon={<ArrowRightIcon size={18} />}
        />

        <div className="flex items-center gap-2 py-0.5">
          <span className="h-px flex-1 bg-outline-variant" />
          <span className="type-label-md text-on-surface-variant">NÃO TEM CONTA?</span>
          <span className="h-px flex-1 bg-outline-variant" />
        </div>

        <PrimaryButton
          label="Criar nova conta"
          variant="primary"
          onClick={() => router.push("/signup")}
          leadingIcon={<UserIcon size={18} />}
        />

        <PrimaryButton
          label={guestLoading ? "Carregando…" : "Continuar como visitante"}
          variant="ghost"
          onClick={onGuest}
          loading={guestLoading}
          disabled={guestLoading}
          leadingIcon={<SparklesIcon size={18} color="var(--color-secondary)" />}
        />
        <p className="px-2 text-center type-body-sm text-on-surface-variant">
          Como visitante você poderá enviar 1 projeto para experimentar. Cadastre-se para liberar
          uploads ilimitados, histórico e chat persistente.
        </p>
      </form>

      <p className="text-center type-body-sm text-on-surface-variant">
        <Link href="/" className="text-secondary underline-offset-2 hover:underline">
          ← Voltar para a página inicial
        </Link>
      </p>
    </div>
  );
}
