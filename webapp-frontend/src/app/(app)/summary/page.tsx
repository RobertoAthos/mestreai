"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Fab } from "@/components/Fab";
import {
  ArrowRightIcon,
  ChatIcon,
  ChecklistIcon,
  ChevronRightIcon,
  ClipboardIcon,
  DoorIcon,
  FileIcon,
  type IconProps,
  InfoIcon,
  LayersIcon,
  PlusIcon,
  RulerIcon,
  ScanIcon,
  TrashIcon,
  WallIcon,
  WindowIcon,
} from "@/components/Icon";
import type { PlanDetail, PlanElement } from "@/components/InteractivePlanViewer";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Spinner } from "@/components/Spinner";
import { StatusChip } from "@/components/StatusChip";
import { api, ApiError, getProjectPdf } from "@/lib/api";
import { useApp } from "@/store/AppContext";
import type { Geometry, Room, Sheet } from "@/types/api";

// react-pdf must run client-side only (it touches the DOM / a web worker).
const InteractivePlanViewer = dynamic(
  () => import("@/components/InteractivePlanViewer").then((m) => m.InteractivePlanViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[clamp(360px,68vh,720px)] items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-low">
        <Spinner size={28} color="var(--color-secondary)" />
      </div>
    ),
  },
);

/* --------------------------------------------------------------- helpers -- */

/** pt-BR number: two decimals, comma separator. Safe against the partially
 *  streamed objects, whose numeric fields can be undefined/NaN at runtime. */
function nf(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits).replace(".", ",");
}

/** A single measurement in metres, or "—" when missing. */
function mVal(value?: number | null): string {
  return value != null && Number.isFinite(value) ? `${nf(value)} m` : "—";
}

/** "L × A m", or "—" when either side is missing (incomplete streamed row). */
function dims(width?: number | null, height?: number | null): string {
  if (width == null || height == null || !Number.isFinite(width) || !Number.isFinite(height)) {
    return "—";
  }
  return `${nf(width)} × ${nf(height)} m`;
}

/** A geometry is usable only when every coordinate is a finite number — guards
 *  against the partially-streamed objects that arrive mid-analysis. */
function validGeo(g?: Geometry | null): g is Geometry {
  return !!g && [g.x, g.y, g.w, g.h].every((n) => typeof n === "number" && Number.isFinite(n));
}

/** Usable for the interactive overlay: any finite geometry, on any folha. The
 *  viewer draws only the current folha's boxes; selecting an element on another
 *  folha switches to it first. Keeps planElements + nav-item ids in lockstep. */
function interactiveGeo(g?: Geometry | null): g is Geometry {
  return validGeo(g);
}

/** Effective floor area of a room: explicit area, else width × length. */
function roomArea(room: Room): number | null {
  if (room.area_m2 != null && Number.isFinite(room.area_m2)) return room.area_m2;
  if (
    room.width_m != null &&
    room.length_m != null &&
    Number.isFinite(room.width_m) &&
    Number.isFinite(room.length_m)
  ) {
    return room.width_m * room.length_m;
  }
  return null;
}

function roomDimensions(room: Room): string {
  if (room.width_m != null && room.length_m != null) {
    return dims(room.width_m, room.length_m);
  }
  const area = roomArea(room);
  return area != null ? `${nf(area)} m²` : "—";
}

/** Map a nav-item id back to the section it belongs to (for auto-expand). */
function sectionIdOf(itemId: string): string {
  if (itemId.startsWith("room-")) return "sec-ambientes";
  if (itemId.startsWith("door-")) return "sec-portas";
  if (itemId.startsWith("window-")) return "sec-janelas";
  if (itemId.startsWith("wall-")) return "sec-paredes";
  return "";
}

function reduceMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* --------------------------------------------------------------- nav types -- */

type NavItem = { id: string; primary: string; secondary?: string; detail: PlanDetail };
type NavSection = { id: string; label: string; Icon: ComponentType<IconProps>; items: NavItem[] };

/* ------------------------------------------------------------------ page -- */

export default function SummaryPage() {
  const router = useRouter();
  const {
    currentProject,
    currentProjectId,
    openProject,
    refreshProjects,
    streamProject,
    restartStream,
    partialSummary,
    isStreaming,
    deleteProject,
  } = useApp();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Interactive-plan state, shared between the viewer and the nav.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | undefined>(undefined);
  const [retryNonce, setRetryNonce] = useState(0);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [sheetBusy, setSheetBusy] = useState(false);
  const sheetCacheRef = useRef<Map<number, ArrayBuffer>>(new Map());
  const prevProjectRef = useRef<string | undefined>(undefined);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [pendingRemoveSheet, setPendingRemoveSheet] = useState<number | null>(null);

  useEffect(() => {
    if (currentProjectId) openProject(currentProjectId);
  }, [currentProjectId, openProject]);

  // Auto-attach to the analysis stream when the project is still processing.
  useEffect(() => {
    if (currentProject?.status === "processing" && currentProject?.id) {
      streamProject(currentProject.id);
    }
  }, [currentProject?.status, currentProject?.id, streamProject]);

  // Fetch the CURRENT folha's PDF (auth'd), cached per sheet. On project change,
  // reset the cache + selection + sheet so nothing carries over.
  const projectId = currentProject?.id;
  const projectFailed = currentProject?.status === "failed";
  useEffect(() => {
    if (prevProjectRef.current !== projectId) {
      prevProjectRef.current = projectId;
      sheetCacheRef.current.clear();
      setSelectedId(null);
      setHoveredId(null);
      setExpanded(new Set());
      if (currentSheet !== 0) {
        setCurrentSheet(0); // re-runs this effect with sheet 0
        return;
      }
    }
    if (!projectId || projectFailed) {
      setPdfData(null);
      return;
    }
    const cached = sheetCacheRef.current.get(currentSheet);
    if (cached) {
      setPdfData(cached);
      setPdfLoading(false);
      setPdfError(undefined);
      return;
    }
    let cancelled = false;
    setPdfLoading(true);
    setPdfError(undefined);
    setPdfData(null);
    getProjectPdf(projectId, currentSheet)
      .then((buf) => {
        if (cancelled) return;
        sheetCacheRef.current.set(currentSheet, buf);
        setPdfData(buf);
      })
      .catch((err) => {
        if (!cancelled)
          setPdfError(err instanceof ApiError ? err.message : "Não foi possível carregar a planta.");
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, projectFailed, retryNonce, currentSheet]);

  const processing = currentProject?.status === "processing";
  const summary = processing && partialSummary ? partialSummary : currentProject?.summary;

  // Re-analysis (add/remove folha) finishes once the project leaves processing —
  // then we drop back to the normal gateway behavior for first analyses.
  useEffect(() => {
    if (!processing) setReanalyzing(false);
  }, [processing]);

  const totalArea = useMemo(() => {
    if (!summary?.rooms?.length) return null;
    const sum = summary.rooms.reduce((acc, r) => acc + (roomArea(r) ?? 0), 0);
    return sum > 0 ? sum : null;
  }, [summary]);

  // Elements with geometry → the SVG overlay the viewer draws.
  const planElements = useMemo<PlanElement[]>(() => {
    if (!summary) return [];
    const out: PlanElement[] = [];
    summary.rooms?.forEach((r, i) => {
      if (!interactiveGeo(r.geometry)) return;
      const a = roomArea(r);
      const detail = [a != null ? `${nf(a)} m²` : null, dims(r.width_m, r.length_m) !== "—" ? dims(r.width_m, r.length_m) : null]
        .filter(Boolean)
        .join(" · ");
      out.push({ id: `room-${i}`, kind: "room", label: r.name, detail: detail || undefined, geometry: r.geometry });
    });
    summary.doors?.forEach((d, i) => {
      if (!interactiveGeo(d.geometry)) return;
      const detail = [dims(d.width_m, d.height_m), d.room].filter(Boolean).join(" · ");
      out.push({ id: `door-${i}`, kind: "door", label: `Porta ${d.code}`, detail: detail || undefined, geometry: d.geometry });
    });
    summary.windows?.forEach((w, i) => {
      if (!interactiveGeo(w.geometry)) return;
      const detail = [dims(w.width_m, w.height_m), w.room].filter(Boolean).join(" · ");
      out.push({ id: `window-${i}`, kind: "window", label: `Janela ${w.code}`, detail: detail || undefined, geometry: w.geometry });
    });
    return out;
  }, [summary]);

  // Accordion sections + a lookup of every item's detail (for the overlay).
  const { sections, detailById } = useMemo(() => {
    const detailById = new Map<string, PlanDetail>();
    const out: NavSection[] = [];
    if (!summary) return { sections: out, detailById };

    if (summary.rooms?.length) {
      const items: NavItem[] = summary.rooms.map((r, i) => {
        const a = roomArea(r);
        const detail: PlanDetail = {
          title: r.name,
          kind: "room",
          fields: [
            { label: "Largura", value: mVal(r.width_m) },
            { label: "Comprimento", value: mVal(r.length_m) },
            { label: "Área", value: a != null ? `${nf(a)} m²` : "—" },
          ],
          notes: r.notes ?? undefined,
        };
        const id = `room-${i}`;
        detailById.set(id, detail);
        return { id, primary: r.name, secondary: a != null ? `${nf(a)} m²` : roomDimensions(r), detail };
      });
      out.push({ id: "sec-ambientes", label: "Ambientes", Icon: RulerIcon, items });
    }

    if (summary.doors?.length) {
      const items: NavItem[] = summary.doors.map((d, i) => {
        const detail: PlanDetail = {
          title: `Porta ${d.code}`,
          kind: "door",
          fields: [
            { label: "Largura", value: mVal(d.width_m) },
            { label: "Altura", value: mVal(d.height_m) },
            { label: "Ambiente", value: d.room ?? "—" },
          ],
          notes: d.notes ?? undefined,
        };
        const id = `door-${i}`;
        detailById.set(id, detail);
        return { id, primary: d.code, secondary: dims(d.width_m, d.height_m), detail };
      });
      out.push({ id: "sec-portas", label: "Portas", Icon: DoorIcon, items });
    }

    if (summary.windows?.length) {
      const items: NavItem[] = summary.windows.map((w, i) => {
        const detail: PlanDetail = {
          title: `Janela ${w.code}`,
          kind: "window",
          fields: [
            { label: "Largura", value: mVal(w.width_m) },
            { label: "Altura", value: mVal(w.height_m) },
            { label: "Peitoril", value: mVal(w.sill_height_m) },
            { label: "Ambiente", value: w.room ?? "—" },
          ],
          notes: w.notes ?? undefined,
        };
        const id = `window-${i}`;
        detailById.set(id, detail);
        return { id, primary: w.code, secondary: dims(w.width_m, w.height_m), detail };
      });
      out.push({ id: "sec-janelas", label: "Janelas", Icon: WindowIcon, items });
    }

    if (summary.walls?.length) {
      const items: NavItem[] = summary.walls.map((wall, i) => {
        const thick =
          wall.thickness_cm != null && Number.isFinite(wall.thickness_cm)
            ? `${wall.thickness_cm.toFixed(0)} cm`
            : "—";
        const detail: PlanDetail = {
          title: wall.type,
          kind: "wall",
          fields: [{ label: "Espessura", value: thick }],
          notes: wall.notes ?? undefined,
        };
        const id = `wall-${i}`;
        detailById.set(id, detail);
        return { id, primary: wall.type, secondary: thick, detail };
      });
      out.push({ id: "sec-paredes", label: "Paredes", Icon: WallIcon, items });
    }

    return { sections: out, detailById };
  }, [summary]);

  // Select an item from anywhere — focus the viewer (if it has a box) and
  // auto-expand its section so it's visible in the nav.
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) {
      const sec = sectionIdOf(id);
      if (sec) setExpanded((prev) => (prev.has(sec) ? prev : new Set(prev).add(sec)));
    }
  }, []);

  // From the nav: also scroll the viewer into view (matters on mobile).
  const selectFromNav = useCallback(
    (id: string) => {
      select(id);
      requestAnimationFrame(() =>
        document
          .getElementById("plan-viewer")
          ?.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" }),
      );
    },
    [select],
  );

  const toggleSection = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Re-analysis after add/remove folha: clear the per-sheet cache + reset to
  // sheet 0, refetch the project (now processing, summary cleared) and re-stream.
  const reanalyze = useCallback(
    async (targetSheet = 0) => {
      if (!projectId) return;
      sheetCacheRef.current.clear();
      setReanalyzing(true);
      setCurrentSheet(Math.max(0, targetSheet));
      setSelectedId(null);
      // Force the per-sheet fetch to re-run even if the index is unchanged (the
      // bytes for sheet 0 may have changed after a remove).
      setRetryNonce((n) => n + 1);
      await openProject(projectId);
      // Force a fresh attach: the in-flight stream (if any) was subscribed to the
      // pre-reset backend ProjectStream and must be torn down so we subscribe to
      // the NEW one and clear the stale partialSummary. streamProject would
      // early-return on the same-id idempotency guard here.
      restartStream(projectId);
    },
    [projectId, openProject, restartStream],
  );

  const onAddSheets = useCallback(
    async (picked: File[]) => {
      if (!projectId || !picked.length) return;
      setSheetBusy(true);
      try {
        await api.addSheets(projectId, picked);
        await reanalyze(currentSheet); // appends don't shift existing indices
      } catch {
        // The project's processing/failed state reflects the outcome on refresh.
      } finally {
        setSheetBusy(false);
      }
    },
    [projectId, currentSheet, reanalyze],
  );

  const onRemoveSheet = useCallback(
    async (index: number) => {
      if (!projectId) return;
      setSheetBusy(true);
      try {
        await api.removeSheet(projectId, index);
        await reanalyze(0); // indices repacked server-side; land on the first folha
      } catch {
        // ignore; project state reflects the outcome
      } finally {
        setSheetBusy(false);
      }
    },
    [projectId, reanalyze],
  );

  // Clamp any sheet change into range (streaming geometry can carry a sheet
  // index that exceeds the real folha count before the backend clamp lands).
  const sheetCount = currentProject?.sheets?.length ?? 1;
  const changeSheet = useCallback(
    (s: number) => setCurrentSheet(Math.min(Math.max(0, s), Math.max(0, sheetCount - 1))),
    [sheetCount],
  );

  // Drop a selection/hover whose item no longer exists (e.g. it vanished when
  // streaming reconciled the summary).
  useEffect(() => {
    if (selectedId && !detailById.has(selectedId)) setSelectedId(null);
    if (hoveredId && !detailById.has(hoveredId)) setHoveredId(null);
  }, [detailById, selectedId, hoveredId]);

  const confirmDelete = async () => {
    if (!currentProject) return;
    setDeleting(true);
    try {
      await deleteProject(currentProject.id);
      router.replace("/dashboard");
    } catch {
      setDeleting(false);
    }
  };

  /* ---- gateway states ---------------------------------------------------- */

  if (!currentProject) {
    return (
      <StateFrame>
        <EmptyState
          headingLevel="h1"
          title="Selecione um projeto"
          description="Abra um projeto no Dashboard ou envie um novo PDF para analisar."
          icon={<ClipboardIcon size={28} color="var(--color-secondary)" />}
        />
        <PrimaryButton label="Enviar novo PDF" onClick={() => router.push("/upload")} fullWidth={false} />
      </StateFrame>
    );
  }

  if (processing && !summary && !reanalyzing) {
    return (
      <ScanningState
        live={isStreaming}
        filename={currentProject.filename}
        onReconnect={() => {
          streamProject(currentProject.id);
          refreshProjects();
        }}
      />
    );
  }

  if (currentProject.status === "failed") {
    return (
      <StateFrame>
        <EmptyState
          headingLevel="h1"
          title="Não consegui analisar o PDF"
          description={currentProject.error || "Tente reenviar o PDF original exportado do CAD/BIM."}
          icon={<InfoIcon size={28} color="var(--color-error)" />}
        />
        <PrimaryButton label="Enviar novo PDF" onClick={() => router.push("/upload")} fullWidth={false} />
      </StateFrame>
    );
  }

  /* ---- the document ------------------------------------------------------ */

  const viewerNode = (
    <InteractivePlanViewer
      data={pdfData}
      loading={pdfLoading}
      error={pdfError}
      elements={planElements}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={select}
      onHover={setHoveredId}
      onRetry={() => setRetryNonce((n) => n + 1)}
      currentSheet={currentSheet}
      onSheetChange={changeSheet}
      detail={selectedId ? (detailById.get(selectedId) ?? null) : null}
      onCloseDetail={() => select(null)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <TitleBlock
        name={currentProject.name}
        filename={currentProject.filename}
        pages={currentProject.pages}
        status={currentProject.status}
        live={processing}
        totalArea={totalArea}
        roomCount={summary?.rooms?.length ?? 0}
        doorCount={summary?.doors?.length ?? 0}
        windowCount={summary?.windows?.length ?? 0}
        wallCount={summary?.walls?.length ?? 0}
        onDelete={() => setConfirmOpen(true)}
      />

      <div
        className={
          sections.length > 0
            ? "flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-8"
            : "flex flex-col gap-6"
        }
      >
        {sections.length > 0 && (
          <div className="order-2 lg:order-1">
            <PlanNav
              sections={sections}
              expanded={expanded}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onToggle={toggleSection}
              onSelect={selectFromNav}
              onHover={setHoveredId}
            />
          </div>
        )}

        <div id="plan-viewer" className="order-1 flex scroll-mt-20 flex-col gap-6 lg:order-2">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-container-highest bg-surface-container-lowest text-secondary"
            >
              <LayersIcon size={18} />
            </span>
            <h2 className="font-display text-[20px] font-semibold tracking-tight text-on-surface">
              Planta Interativa
            </h2>
            {processing && (
              <span className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 type-label-md text-on-secondary-container">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                Ao vivo
              </span>
            )}
          </div>

          <SheetsBar
            sheets={currentProject.sheets}
            currentSheet={currentSheet}
            busy={sheetBusy}
            onSelect={changeSheet}
            onAdd={() => addInputRef.current?.click()}
            onRemove={setPendingRemoveSheet}
          />
          <input
            ref={addInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files ? Array.from(e.target.files) : [];
              e.target.value = "";
              if (picked.length) void onAddSheets(picked);
            }}
          />

          {viewerNode}

          {summary?.execution_checklist?.length ? (
            <MainSection Icon={ChecklistIcon} title="Guia de Execução" count={summary.execution_checklist.length}>
              <ol className="flex flex-col">
                {summary.execution_checklist.map((step, i) => (
                  <ExecutionStep
                    key={i}
                    index={i + 1}
                    text={step}
                    last={i === summary.execution_checklist.length - 1}
                  />
                ))}
              </ol>
            </MainSection>
          ) : null}

          {summary?.general_notes ? (
            <MainSection Icon={InfoIcon} title="Pontos de Atenção" tone="warning">
              <div className="relative overflow-hidden rounded-xl border border-[rgba(220,38,38,0.25)] bg-error-container/60 p-5">
                <span className="absolute inset-y-0 left-0 w-1 bg-error" />
                <div className="flex items-start gap-3 pl-2">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error">
                    <InfoIcon size={20} />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="type-title-md text-on-error-container">Confirme antes de iniciar a alvenaria</p>
                    <p className="type-body-md text-on-surface">{summary.general_notes}</p>
                  </div>
                </div>
              </div>
            </MainSection>
          ) : null}

          {/* Closing CTA — the desktop affordance; mobile uses the floating FAB. */}
          <section className="blueprint-grid relative hidden overflow-hidden rounded-xl border border-primary/30 bg-primary-container/40 p-6 sm:block sm:p-8">
            <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="type-title-lg text-on-surface">Ficou com dúvidas na planta?</h3>
                <p className="type-body-md text-on-surface-variant">
                  Pergunte qualquer coisa sobre as medidas, esquadrias ou o passo a passo da obra.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="press group inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 type-title-md text-on-primary shadow-fab transition-shadow hover:brightness-105"
              >
                <ChatIcon size={18} color="var(--color-on-primary)" />
                Tirar dúvida no chat
                <ArrowRightIcon
                  size={16}
                  color="var(--color-on-primary)"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile-only floating action; desktop uses the inline closing CTA. */}
      <div className="sm:hidden">
        <Fab
          label="Tirar dúvida no chat"
          onClick={() => router.push("/chat")}
          icon={<ChatIcon size={18} color="var(--color-on-secondary)" />}
        />
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir projeto"
        message={`Tem certeza que deseja excluir "${currentProject.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        open={pendingRemoveSheet !== null}
        title="Remover folha"
        message="Remover esta folha vai reprocessar o projeto e atualizar o resumo. Deseja continuar?"
        confirmLabel="Remover"
        destructive
        loading={sheetBusy}
        onConfirm={() => {
          const idx = pendingRemoveSheet;
          setPendingRemoveSheet(null);
          if (idx !== null) void onRemoveSheet(idx);
        }}
        onCancel={() => setPendingRemoveSheet(null)}
      />
    </div>
  );
}

/* --------------------------------------------------------------- plan nav -- */

function PlanNav({
  sections,
  expanded,
  selectedId,
  hoveredId,
  onToggle,
  onSelect,
  onHover,
}: {
  sections: NavSection[];
  expanded: Set<string>;
  selectedId: string | null;
  hoveredId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <nav aria-label="Conteúdo do documento" className="lg:sticky lg:top-24">
      <p className="mb-3 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-on-surface-variant">
        Neste documento
      </p>
      <div className="flex flex-col gap-1.5">
        {sections.map((s, i) => {
          const open = expanded.has(s.id);
          const count = s.items.length;
          return (
            <div
              key={s.id}
              className="overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest"
            >
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                aria-expanded={open}
                className="press flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-surface-container-low"
              >
                <ChevronRightIcon
                  size={15}
                  color="var(--color-on-surface-variant)"
                  className={["shrink-0 transition-transform", open ? "rotate-90" : ""].join(" ")}
                />
                <span aria-hidden className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-surface-container-highest bg-surface-container-low text-secondary"
                >
                  <s.Icon size={15} />
                </span>
                <span className="flex-1 type-title-md text-[15px] text-on-surface">{s.label}</span>
                <span className="font-mono text-[12px] tabular-nums text-on-surface-variant">{count}</span>
              </button>

              {open && (
                <ul className="flex flex-col gap-0.5 border-t border-surface-container-highest/70 p-2">
                  {s.items.map((it) => {
                    const active = it.id === selectedId;
                    const hot = it.id === hoveredId;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(it.id)}
                          onMouseEnter={() => onHover(it.id)}
                          onMouseLeave={() => onHover(null)}
                          aria-pressed={active}
                          className={[
                            "press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-secondary",
                            active
                              ? "bg-primary/10 ring-1 ring-primary/40"
                              : hot
                                ? "bg-surface-container-low"
                                : "hover:bg-surface-container-low",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden
                            className={[
                              "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                              active ? "bg-primary" : "bg-outline-variant",
                            ].join(" ")}
                          />
                          <span className="flex-1 truncate type-body-md text-on-surface">{it.primary}</span>
                          {it.secondary && (
                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-on-surface-variant">
                              {it.secondary}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/* --------------------------------------------------------------- sheets -- */

function SheetsBar({
  sheets,
  currentSheet,
  busy,
  onSelect,
  onAdd,
  onRemove,
}: {
  sheets: Sheet[];
  currentSheet: number;
  busy: boolean;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const multi = sheets.length > 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {sheets.map((s) => {
        const active = s.index === currentSheet;
        return (
          <span
            key={s.index}
            className={[
              "group inline-flex items-center overflow-hidden rounded-lg border transition-colors",
              active
                ? "border-primary bg-primary/10"
                : "border-surface-container-highest bg-surface-container-lowest hover:bg-surface-container-low",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => onSelect(s.index)}
              aria-current={active ? "true" : undefined}
              aria-label={`Folha ${s.index + 1}: ${s.label}`}
              className="press flex items-center gap-1.5 px-2.5 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
            >
              <span className="font-mono text-[11px] tabular-nums text-on-surface-variant">
                {String(s.index + 1).padStart(2, "0")}
              </span>
              <span
                title={s.label}
                className={[
                  "max-w-[10rem] truncate type-label-md",
                  active ? "text-on-surface" : "text-on-surface-variant",
                ].join(" ")}
              >
                {s.label}
              </span>
            </button>
            {multi && (
              <button
                type="button"
                onClick={() => onRemove(s.index)}
                disabled={busy}
                aria-label={`Remover ${s.label}`}
                title="Remover folha"
                className="press mr-0.5 flex h-7 w-6 items-center justify-center rounded-md text-on-surface-variant opacity-0 transition-opacity hover:bg-error-container hover:text-error focus-visible:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 disabled:opacity-40"
              >
                <TrashIcon size={13} />
              </button>
            )}
          </span>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="press inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-container-highest px-3 py-1.5 type-label-md text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-50"
      >
        {busy ? (
          <Spinner size={14} color="var(--color-secondary)" />
        ) : (
          <PlusIcon size={14} color="var(--color-secondary)" />
        )}
        Adicionar folha
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ title block -- */

function TitleBlock({
  name,
  filename,
  pages,
  status,
  live,
  totalArea,
  roomCount,
  doorCount,
  windowCount,
  wallCount,
  onDelete,
}: {
  name: string;
  filename: string;
  pages: number;
  status: "processing" | "ready" | "failed";
  live: boolean;
  totalArea: number | null;
  roomCount: number;
  doorCount: number;
  windowCount: number;
  wallCount: number;
  onDelete: () => void;
}) {
  const fields: { label: string; value: string; accent?: boolean }[] = [
    { label: "Área total", value: totalArea != null ? `${nf(totalArea)} m²` : "—", accent: true },
    { label: "Ambientes", value: String(roomCount) },
    { label: "Portas", value: String(doorCount) },
    { label: "Janelas", value: String(windowCount) },
    { label: "Paredes", value: String(wallCount) },
  ];

  return (
    <header className="animate-fade-down blueprint-grid relative overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-lowest p-5 shadow-card sm:p-7">
      {/* Corner brackets — drawing-sheet motif. */}
      {[
        "left-2.5 top-2.5 border-l-2 border-t-2",
        "right-2.5 top-2.5 border-r-2 border-t-2",
        "left-2.5 bottom-2.5 border-b-2 border-l-2",
        "right-2.5 bottom-2.5 border-b-2 border-r-2",
      ].map((pos) => (
        <span key={pos} aria-hidden className={`pointer-events-none absolute h-4 w-4 rounded-[1px] border-secondary/40 ${pos}`} />
      ))}

      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Folha técnica · análise da planta
            </span>
            <h1 className="font-display text-[clamp(26px,4.5vw,38px)] font-bold leading-[1.05] tracking-tight text-on-surface break-words [overflow-wrap:anywhere]">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-on-surface-variant">
                <FileIcon size={14} color="var(--color-on-surface-variant)" />
                <span className="max-w-[60vw] truncate sm:max-w-xs">{filename}</span>
              </span>
              <span className="text-outline-variant">·</span>
              <span className="font-mono text-[12px] text-on-surface-variant">
                {pages} {pages === 1 ? "página" : "páginas"}
              </span>
              <StatusChip status={status} />
              {live && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-2.5 py-1 type-label-md text-on-secondary-container">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
                  Ao vivo
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onDelete}
            aria-label="Excluir projeto"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-error-container hover:text-error"
          >
            <TrashIcon size={19} />
          </button>
        </div>

        {/* Dimension-line divider. */}
        <div aria-hidden className="flex items-center text-outline-variant">
          <span className="h-2 w-px bg-current" />
          <span className="h-px flex-1 bg-current" />
          <span className="h-2 w-px bg-current" />
        </div>

        {/* Spec fields — like a title-block data table. */}
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-surface-container-highest bg-surface-container-highest sm:grid-cols-3 lg:grid-cols-5">
          {fields.map((f) => (
            <div key={f.label} className="flex flex-col gap-1 bg-surface-container-lowest px-4 py-3">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
                {f.label}
              </dt>
              <dd
                className={[
                  "font-mono text-[22px] font-semibold tabular-nums leading-none",
                  f.accent ? "text-secondary" : "text-on-surface",
                ].join(" ")}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

/* ------------------------------------------------------ main-column block -- */

function MainSection({
  Icon,
  title,
  count,
  tone = "default",
  children,
}: {
  Icon: ComponentType<IconProps>;
  title: string;
  count?: number;
  tone?: "default" | "warning";
  children: ReactNode;
}) {
  const accent = tone === "warning" ? "var(--color-error)" : "var(--color-secondary)";
  return (
    <section>
      <div className="mb-4 flex items-center gap-3 border-b border-surface-container-highest pb-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-container-highest bg-surface-container-lowest"
          style={{ color: accent }}
        >
          <Icon size={18} />
        </span>
        <h2 className="flex-1 font-display text-[20px] font-semibold tracking-tight text-on-surface">{title}</h2>
        {count != null && (
          <span className="rounded-full bg-surface-container-low px-2.5 py-1 font-mono text-[12px] tabular-nums text-on-surface-variant">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------- execution -- */

function ExecutionStep({ index, text, last }: { index: number; text: string; last: boolean }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span aria-hidden className="absolute bottom-0 left-[13px] top-7 w-px bg-surface-container-highest" />}
      <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[12px] font-semibold text-on-primary shadow-[0_4px_12px_-4px_rgba(79,71,229,0.6)]">
        {index}
      </span>
      <p className="pt-0.5 type-body-md text-on-surface">{text}</p>
    </li>
  );
}

/* ---------------------------------------------------------- shared states -- */

function StateFrame({ children }: { children: ReactNode }) {
  return (
    <div className="blueprint-grid flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-surface-container-highest bg-surface-container-lowest/60 px-6 py-16 text-center">
      {children}
    </div>
  );
}

/** Branded "reading the blueprint" state while the first analysis streams in. */
function ScanningState({
  live,
  filename,
  onReconnect,
}: {
  live: boolean;
  filename: string;
  onReconnect: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-8 py-10">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-surface-container-highest bg-surface-container-lowest shadow-top">
        <div className="flex items-center gap-2 border-b border-surface-container-highest px-4 py-3">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="h-2 w-2 rounded-full bg-primary/60" />
          <span className="h-2 w-2 rounded-full bg-secondary-container" />
          <span className="ml-2 max-w-[55%] truncate font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
            {filename}
          </span>
        </div>

        <div className="blueprint-grid relative aspect-[5/3] p-5">
          <svg viewBox="0 0 420 250" className="relative h-full w-full" fill="none">
            <rect x="20" y="20" width="380" height="210" rx="3" stroke="#4f46e5" strokeWidth="2.5" />
            <g stroke="#818cf8" strokeWidth="2">
              <path d="M250 20 V150" />
              <path d="M20 150 H250" />
              <path d="M250 95 H400" strokeOpacity="0.8" />
            </g>
            <g fill="#4f46e5">
              {[
                [20, 20],
                [400, 20],
                [20, 230],
                [400, 230],
                [250, 150],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.2" />
              ))}
            </g>
            <g className="font-mono" fill="#4f5871" fontSize="11" letterSpacing="1.5">
              <text x="110" y="90">SALA</text>
              <text x="305" y="60">QUARTO</text>
              <text x="100" y="195">COZINHA</text>
            </g>
          </svg>
          <div
            className="animate-scan pointer-events-none absolute inset-x-3 top-0 h-24"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(95,220,240,0.18) 45%, rgba(95,220,240,0.42) 50%, rgba(95,220,240,0.18) 55%, transparent)",
            }}
          />
          {[
            "left-3 top-3 border-l-2 border-t-2",
            "right-3 top-3 border-r-2 border-t-2",
            "left-3 bottom-3 border-b-2 border-l-2",
            "right-3 bottom-3 border-b-2 border-r-2",
          ].map((pos) => (
            <span key={pos} className={`absolute h-5 w-5 border-secondary/70 ${pos}`} />
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-surface-container-highest px-4 py-3">
          {live ? <Spinner size={14} color="var(--color-secondary)" /> : <ScanIcon size={14} color="var(--color-secondary)" />}
          <span className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">
            {live ? "extraindo medidas…" : "aguardando leitura…"}
          </span>
        </div>
      </div>

      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="type-headline-md text-on-surface">{live ? "Lendo a planta…" : "Analisando seu projeto"}</h1>
        <p className="type-body-md text-on-surface-variant">
          Estamos extraindo as medidas, esquadrias e o passo a passo da obra. Os blocos aparecem aqui
          conforme a leitura avança.
        </p>
        <PrimaryButton label="Reconectar" variant="ghost" fullWidth={false} onClick={onReconnect} />
      </div>
    </div>
  );
}
