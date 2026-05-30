"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Checkbox } from "@/components/Checkbox";
import { ArrowRightIcon, LockIcon, MailIcon, ShieldCheckIcon, UserIcon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { TextField } from "@/components/TextField";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const trimmedEmail = email.trim().toLowerCase();
  const validation = (): string | undefined => {
    if (name.trim().length < 2) return "Informe seu nome completo.";
    if (!EMAIL_RE.test(trimmedEmail)) return "E-mail inválido.";
    if (password.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (password !== confirm) return "As senhas não conferem.";
    if (!terms) return "Você precisa aceitar os Termos de Uso para continuar.";
    return undefined;
  };

  const canSubmit = !submitting && !validation();

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const reason = validation();
    if (reason) {
      setError(reason);
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await signup(name, trimmedEmail, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-4 py-10">
      <div className="animate-fade-down flex justify-center">
        <Logo size={72} />
      </div>

      <form onSubmit={onSubmit} className="animate-fade-up flex flex-col gap-3">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <h1 className="type-title-lg text-[22px] text-on-surface">Crie sua conta</h1>
          <p className="type-body-md text-on-surface-variant">
            Insira seus dados para começar a gerenciar suas obras.
          </p>
        </div>

        <TextField
          label="NOME COMPLETO"
          placeholder="Ex: Roberto Silva"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserIcon size={18} />}
          disabled={submitting}
        />

        <TextField
          label="E-MAIL"
          placeholder="roberto@empresa.com.br"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<MailIcon size={18} />}
          disabled={submitting}
        />

        <TextField
          label="SENHA (MÍN. 8 CARACTERES)"
          placeholder="••••••••"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<LockIcon size={18} />}
          isPassword
          disabled={submitting}
        />

        <TextField
          label="CONFIRMAR SENHA"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          leftIcon={<ShieldCheckIcon size={18} />}
          isPassword
          disabled={submitting}
        />

        <div className="flex items-start gap-2 py-0.5">
          <Checkbox checked={terms} onChange={setTerms} ariaLabelledBy="terms-label" />
          <p
            id="terms-label"
            onClick={() => setTerms((v) => !v)}
            className="flex-1 cursor-pointer type-body-sm leading-[18px] text-on-surface-variant"
          >
            Concordo com os <span className="font-semibold text-secondary">Termos de Uso</span> e a{" "}
            <span className="font-semibold text-secondary">Política de Privacidade</span>.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-error-container p-2.5">
            <p className="type-body-md text-on-error-container">{error}</p>
          </div>
        )}

        <PrimaryButton
          label="Criar conta"
          type="submit"
          variant="secondary"
          loading={submitting}
          disabled={!canSubmit}
          leadingIcon={<ArrowRightIcon size={18} color="var(--color-on-secondary-container)" />}
        />
      </form>

      <div className="animate-fade-up flex items-center justify-center gap-1.5 pt-0.5">
        <span className="type-body-md text-on-surface-variant">Já possui uma conta?</span>
        <Link href="/login" className="type-title-md text-[15px] text-secondary hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
