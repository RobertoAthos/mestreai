"use client";

import {
  ChevronRightIcon,
  CompassIcon,
  FileIcon,
  HouseIcon,
  TrashIcon,
} from "@/components/Icon";
import { StatusChip, statusAccentColor } from "@/components/StatusChip";
import type { ProjectListItem } from "@/types/api";

type Props = {
  project: ProjectListItem;
  onOpen: () => void;
  onDelete?: () => void;
  index?: number;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function PickIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("casa") || lower.includes("lote") || lower.includes("residenc")) {
    return <HouseIcon size={22} />;
  }
  if (lower.includes("edif") || lower.includes("estrut")) {
    return <CompassIcon size={22} />;
  }
  return <FileIcon size={20} />;
}

export function ProjectCard({ project, onOpen, onDelete, index = 0 }: Props) {
  const accent = statusAccentColor(project.status);
  const subtitle = `${formatDate(project.created_at)} • ${project.pages} ${
    project.pages === 1 ? "página" : "páginas"
  }`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Abrir projeto ${project.name}`}
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
      className="press animate-fade-up group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-md border border-surface-container-highest bg-surface-container-lowest py-5 pl-6 pr-5 shadow-card transition-shadow hover:shadow-top"
    >
      <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: accent }} />
      <div className="flex h-12 w-11 items-center justify-center rounded-md bg-surface-container text-secondary">
        <PickIcon name={project.name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate type-title-md text-on-surface">{project.name}</p>
        <p className="truncate type-body-md text-secondary">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <StatusChip status={project.status} />
        <div className="flex items-center gap-1">
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label={`Excluir projeto ${project.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-full text-error opacity-0 transition-opacity hover:bg-error-container group-hover:opacity-100 focus:opacity-100"
            >
              <TrashIcon size={16} />
            </button>
          )}
          <ChevronRightIcon size={16} color="var(--color-outline)" />
        </div>
      </div>
    </div>
  );
}
