"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { GuestBanner } from "@/components/GuestBanner";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloseIcon,
  CloudUploadIcon,
  PdfFileIcon,
  SparkleIcon,
  SparklesIcon,
} from "@/components/Icon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Spinner } from "@/components/Spinner";
import { api, ApiError } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";

type Stage = "idle" | "selected" | "uploading" | "done" | "error";

function formatSize(bytes?: number): string {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function isPdf(f: File): boolean {
  return !f.type || f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

const MAX_FILE_BYTES = 25 * 1024 * 1024; // mirrors backend settings.max_pdf_size_mb

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshProjects, setCurrentProject, streamProject, quota, refreshQuota } = useApp();

  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(undefined);
  const [dragging, setDragging] = useState(false);

  const isGuest = !!user?.is_guest;
  const guestExhausted = isGuest && quota ? quota.used >= (quota.limit ?? 1) : false;
  const busy = stage === "uploading" || stage === "done";

  const acceptFiles = (picked: File[]) => {
    const pdfs = picked.filter(isPdf);
    const notPdf = picked.length - pdfs.length;
    const valid = pdfs.filter((f) => f.size <= MAX_FILE_BYTES);
    const tooBig = pdfs.length - valid.length;
    if (valid.length) {
      setFiles((prev) => {
        const merged = [...prev];
        for (const f of valid) {
          if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
        }
        return merged;
      });
    }
    const reasons: string[] = [];
    if (notPdf > 0) reasons.push("apenas PDFs são aceitos");
    if (tooBig > 0) reasons.push("cada arquivo deve ter até 25 MB");
    if (reasons.length && !valid.length) {
      setError(`Nenhum arquivo válido — ${reasons.join("; ")}.`);
      setStage("error");
      setNotice(undefined);
    } else {
      setError(undefined);
      setNotice(reasons.length ? `Alguns arquivos foram ignorados (${reasons.join("; ")}).` : undefined);
      if (valid.length) setStage("selected");
    }
  };

  const openPicker = () => {
    if (busy) return;
    if (guestExhausted) {
      router.push("/signup");
      return;
    }
    inputRef.current?.click();
  };

  const removeAt = (index: number) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStage("idle");
      return next;
    });
  };

  const reset = () => {
    setFiles([]);
    setStage("idle");
    setError(undefined);
    setNotice(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onAnalyze = async () => {
    if (busy || !files.length) return;
    setStage("uploading");
    setError(undefined);
    setNotice(undefined);
    try {
      const name = files.length === 1 ? files[0].name.replace(/\.pdf$/i, "") : undefined;
      const { project } = await api.uploadProject(files, name);
      setStage("done");
      setCurrentProject(project.id);
      streamProject(project.id);
      void refreshProjects();
      void refreshQuota();
      setTimeout(() => router.push("/summary"), 400);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao enviar os PDFs.");
      setStage("error");
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          acceptFiles(e.target.files ? Array.from(e.target.files) : []);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />

      <div className="animate-fade-down flex flex-col gap-1">
        <h1 className="type-headline-lg text-on-surface">Enviar Projeto</h1>
        <p className="type-body-md text-on-surface-variant">
          Envie os PDFs das folhas do projeto — planta baixa, cortes, fachadas… — para extrair as
          medidas, esquadrias e o checklist de execução.
        </p>
      </div>

      <GuestBanner />

      <div
        role="button"
        tabIndex={guestExhausted ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          if (guestExhausted) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (guestExhausted) return;
          acceptFiles(e.dataTransfer.files ? Array.from(e.dataTransfer.files) : []);
        }}
        aria-label="Selecionar arquivos PDF"
        aria-disabled={guestExhausted}
        className={[
          "flex min-h-[250px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center shadow-card transition-colors",
          guestExhausted
            ? "cursor-not-allowed border-outline-variant bg-surface-container-low opacity-70"
            : "cursor-pointer border-secondary-container bg-surface-container-lowest hover:bg-surface-container-low",
          dragging ? "border-secondary bg-surface-container-low" : "",
        ].join(" ")}
      >
        <CloudUploadIcon size={56} color={guestExhausted ? "var(--color-outline)" : "var(--color-secondary)"} />
        <p
          className={[
            "type-headline-md",
            guestExhausted ? "text-on-surface-variant" : "text-on-surface",
          ].join(" ")}
        >
          {guestExhausted
            ? "Limite de uploads do modo visitante atingido"
            : files.length
              ? "Clique ou arraste para adicionar mais folhas"
              : "Clique ou arraste os PDFs do projeto aqui"}
        </p>
        <p className="type-label-md uppercase text-secondary">
          PDF • UMA OU VÁRIAS FOLHAS • ATÉ 25 MB CADA
        </p>
      </div>

      {guestExhausted && (
        <div className="flex items-center gap-4 rounded-lg border border-[rgba(0,97,114,0.2)] bg-secondary-container p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-on-secondary-container">
            <SparklesIcon size={20} />
          </span>
          <div className="flex-1">
            <p className="type-title-md text-[14px] text-on-secondary-container">
              Cadastre-se para desbloquear
            </p>
            <p className="type-body-sm text-on-secondary-container opacity-90">
              Você usou seu projeto de cortesia. Crie uma conta gratuita para enviar quantas plantas
              quiser, manter o histórico e usar o chat em qualquer dispositivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            aria-label="Cadastrar"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-on-secondary"
          >
            <ArrowRightIcon size={16} color="var(--color-on-secondary)" />
          </button>
        </div>
      )}

      {notice && (
        <div className="rounded-md border border-[rgba(245,158,11,0.35)] bg-surface-container-low p-3">
          <p className="type-body-sm text-on-surface-variant">{notice}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="type-label-md uppercase text-on-surface-variant">
              {stage === "done" ? "ENVIADO" : stage === "uploading" ? "ENVIANDO" : "FOLHAS DO PROJETO"}
            </p>
            <span className="font-mono text-[12px] tabular-nums text-secondary">
              {files.length} {files.length === 1 ? "folha" : "folhas"}
            </span>
          </div>
          {files.map((file, i) => (
            <div
              key={`${file.name}-${file.size}-${i}`}
              className="relative overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest p-4 shadow-card"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-secondary-container text-on-secondary-container">
                  <PdfFileIcon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate type-title-md text-[14px] text-on-surface">{file.name}</p>
                  <p className="type-label-md text-secondary">{formatSize(file.size)}</p>
                </div>
                {stage === "uploading" ? (
                  <Spinner size={22} color="var(--color-secondary)" />
                ) : stage === "done" ? (
                  <CheckCircleIcon size={22} color="var(--color-tertiary)" />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remover ${file.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
                  >
                    <CloseIcon size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && stage === "error" && (
        <div className="flex flex-col gap-1 rounded-md bg-error-container p-4">
          <p className="type-title-md text-on-error-container">Ops, algo deu errado.</p>
          <p className="type-body-md text-on-error-container">{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-1 rounded-md bg-surface-container-low p-4">
        <p className="mb-1 type-title-md text-on-surface">Dicas para uma boa leitura</p>
        <p className="type-body-md text-on-surface-variant">
          • Envie cada folha (planta, cortes, fachadas) como uma página/PDF separado.
        </p>
        <p className="type-body-md text-on-surface-variant">
          • Use o PDF original exportado do CAD/BIM (vetorial).
        </p>
        <p className="type-body-md text-on-surface-variant">
          • Confirme que as cotas estão visíveis em todos os ambientes.
        </p>
      </div>

      <PrimaryButton
        label={stage === "uploading" ? "Analisando…" : "Analisar projeto"}
        onClick={onAnalyze}
        variant="secondary"
        loading={stage === "uploading"}
        disabled={files.length === 0 || busy}
        leadingIcon={<SparkleIcon size={18} color="var(--color-on-secondary-container)" />}
      />
    </div>
  );
}
