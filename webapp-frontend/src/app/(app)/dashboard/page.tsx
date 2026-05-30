"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { GuestBanner } from "@/components/GuestBanner";
import { PlusIcon } from "@/components/Icon";
import { ProjectCard } from "@/components/ProjectCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/Spinner";
import { useApp } from "@/store/AppContext";
import { useAuth } from "@/store/AuthContext";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia,";
  if (h < 18) return "Boa tarde,";
  return "Boa noite,";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    projects,
    projectsStatus,
    projectsError,
    refreshProjects,
    refreshQuota,
    setCurrentProject,
    deleteProject,
  } = useApp();

  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    refreshProjects();
    refreshQuota();
  }, [refreshProjects, refreshQuota]);

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "Mestre";

  const stats = useMemo(() => {
    const active = projects.filter((p) => p.status !== "failed").length;
    const ready = projects.filter((p) => p.status === "ready").length;
    const compliance = projects.length === 0 ? 0 : Math.round((ready / projects.length) * 100);
    return { active, compliance };
  }, [projects]);

  const onOpenProject = (id: string) => {
    setCurrentProject(id);
    router.push("/summary");
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProject(toDelete.id);
      setToDelete(null);
    } catch {
      // keep dialog open; surface a soft error
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="animate-fade-down">
        <h1 className="type-display-lg text-on-surface">{greeting()}</h1>
        <h1 className="type-display-lg text-on-surface">{firstName}.</h1>
        <p className="mt-1 type-body-lg text-secondary">Resumo da obra de hoje.</p>
      </div>

      <div className="animate-fade-up">
        <GuestBanner />
      </div>

      {/* Hero — new project */}
      <button
        type="button"
        onClick={() => router.push("/upload")}
        aria-label="Novo Projeto"
        className="press animate-fade-up relative flex min-h-40 flex-col justify-between overflow-hidden rounded-lg bg-primary p-6 text-left shadow-card"
      >
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-subtle opacity-10" />
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-primary-subtle text-primary-subtle">
          <PlusIcon size={28} strokeWidth={1.8} />
        </span>
        <span className="flex flex-col gap-1">
          <span className="type-headline-lg text-primary-subtle">Novo Projeto</span>
          <span className="type-body-md text-on-primary opacity-95">
            Envie um PDF para iniciar a análise da planta.
          </span>
        </span>
      </button>

      <div className="flex flex-col gap-4">
        <SectionHeader title="Projetos Recentes" action={{ label: "Ver todos", onClick: refreshProjects }} />

        {projectsStatus === "loading" && projects.length === 0 && (
          <div className="flex justify-center py-6 text-secondary">
            <Spinner size={24} />
          </div>
        )}

        {projectsStatus === "error" && <p className="type-body-md text-error">{projectsError}</p>}

        {projectsStatus !== "loading" && projects.length === 0 && (
          <EmptyState
            title="Nenhum projeto ainda."
            description="Envie o PDF da planta arquitetônica para que o Mestre IA possa analisar."
          />
        )}

        <div className="flex flex-col gap-2">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              index={i}
              project={project}
              onOpen={() => onOpenProject(project.id)}
              onDelete={() => setToDelete({ id: project.id, name: project.name })}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatTile value={String(stats.active)} label="Projetos ativos" />
        <StatTile value={`${stats.compliance}%`} label="Análises prontas" />
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir projeto"
        message={`Tem certeza que deseja excluir "${toDelete?.name ?? ""}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="animate-fade-up flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-surface-container-highest bg-surface-container-lowest p-6 text-center shadow-card">
      <span className="type-display-lg text-on-surface">{value}</span>
      <span className="type-label-md text-secondary">{label.toUpperCase()}</span>
    </div>
  );
}
