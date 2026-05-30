"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { Spinner } from "@/components/Spinner";
import type { Geometry } from "@/types/api";

// pdf.js worker — bundled locally (Turbopack resolves `new URL(..., import.meta.url)`).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Glyph/cmap data for PDFs that use CID fonts, so the canvas renders faithfully.
const PDF_OPTIONS = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
} as const;

// Supersample the page canvas so zooming in stays crisp (vector-quality up to
// ~2x), capped to keep memory sane on large screens.
const RENDER_MULTIPLIER = 2;
const MAX_RENDER_WIDTH = 2400;

export type PlanElementKind = "room" | "door" | "window";

export type PlanElement = {
  id: string;
  kind: PlanElementKind;
  label: string;
  detail?: string;
  geometry: Geometry;
};

/** Details shown in the card overlaid on the PDF when an item is selected. */
export type PlanDetail = {
  title: string;
  kind: PlanElementKind | "wall";
  fields: { label: string; value: string }[];
  notes?: string | null;
};

type Props = {
  /** Raw PDF bytes (auth-fetched by the caller). Null while loading. */
  data: ArrayBuffer | null;
  loading: boolean;
  error?: string;
  elements: PlanElement[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onRetry?: () => void;
  /** Index of the folha currently shown; the overlay filters elements to it,
   *  and selecting an element on another folha asks the parent to switch. */
  currentSheet: number;
  onSheetChange: (sheet: number) => void;
  /** Details for the selected item, rendered as a card on top of the PDF. */
  detail?: PlanDetail | null;
  onCloseDetail?: () => void;
};

type Transform = { scale: number; tx: number; ty: number };
type Size = { w: number; h: number };

const PALETTE: Record<PlanElementKind, { stroke: string; fill: string; active: string; rest: string }> = {
  room: {
    stroke: "#4f46e5",
    rest: "rgba(79,70,229,0.30)",
    fill: "rgba(79,70,229,0.16)",
    active: "rgba(79,70,229,0.28)",
  },
  door: {
    stroke: "#0e7490",
    rest: "rgba(14,116,144,0)",
    fill: "rgba(14,116,144,0.28)",
    active: "rgba(14,116,144,0.34)",
  },
  window: {
    stroke: "#0891b2",
    rest: "rgba(8,145,178,0)",
    fill: "rgba(8,145,178,0.28)",
    active: "rgba(8,145,178,0.36)",
  },
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Which folha an element lives on (legacy projects fall back to page index). */
function sheetOf(g: Geometry): number {
  return g.sheet ?? g.page ?? 0;
}

export function InteractivePlanViewer({
  data,
  loading,
  error,
  elements,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onRetry,
  currentSheet,
  onSheetChange,
  detail,
  onCloseDetail,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState<Size>({ w: 0, h: 0 });
  const [ratio, setRatio] = useState(0); // page height / width
  const [numPages, setNumPages] = useState(0);
  const [docError, setDocError] = useState<string | undefined>(undefined);
  const [animate, setAnimate] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; el: PlanElement } | null>(null);

  const [tf, setTfState] = useState<Transform>({ scale: 1, tx: 0, ty: 0 });
  const tfRef = useRef(tf);
  const setTf = useCallback((next: Transform) => {
    tfRef.current = next;
    setTfState(next);
  }, []);

  // Drag/interaction bookkeeping (refs so handlers stay closure-stable).
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const interactedRef = useRef(false);

  const renderWidth = useMemo(
    () => (vp.w ? Math.min(Math.round(vp.w * RENDER_MULTIPLIER), MAX_RENDER_WIDTH) : 0),
    [vp.w],
  );
  const ready = vp.w > 0 && ratio > 0 && renderWidth > 0;

  const fit = useMemo<Transform>(() => {
    if (!ready) return { scale: 1, tx: 0, ty: 0 };
    const contentW = renderWidth;
    const contentH = renderWidth * ratio;
    const scale = Math.min(vp.w / contentW, vp.h / contentH);
    return {
      scale,
      tx: (vp.w - contentW * scale) / 2,
      ty: (vp.h - contentH * scale) / 2,
    };
  }, [ready, renderWidth, ratio, vp.w, vp.h]);

  const minScale = fit.scale;
  const maxScale = fit.scale * 6;

  const clampTf = useCallback(
    (t: Transform): Transform => {
      if (!ready) return t;
      const scale = clamp(t.scale, minScale, maxScale);
      const contentW = renderWidth * scale;
      const contentH = renderWidth * ratio * scale;
      let { tx, ty } = t;
      tx = contentW <= vp.w ? (vp.w - contentW) / 2 : clamp(tx, vp.w - contentW, 0);
      ty = contentH <= vp.h ? (vp.h - contentH) / 2 : clamp(ty, vp.h - contentH, 0);
      return { scale, tx, ty };
    },
    [ready, renderWidth, ratio, vp.w, vp.h, minScale, maxScale],
  );

  // Measure the viewport.
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () =>
      setVp({ w: node.clientWidth, h: node.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Reset to fit when the page/viewport is (re)measured and the user hasn't
  // panned/zoomed yet.
  useEffect(() => {
    if (ready && !interactedRef.current) setTf(fit);
  }, [ready, fit, setTf]);

  // After interaction, a layout change (resize / orientation) must pull the
  // transform back within the new bounds. clampTf's identity changes whenever
  // the layout inputs do, so this re-clamps exactly then.
  useEffect(() => {
    if (ready && interactedRef.current) setTf(clampTf(tfRef.current));
  }, [ready, clampTf, setTf]);

  // A folha is an independent page: when the sheet changes, drop the previous
  // page's aspect ratio + pan/zoom so the new folha opens fit-to-screen. Zeroing
  // ratio keeps `ready` false until the new page's onLoadSuccess reports its size.
  useEffect(() => {
    setRatio(0);
    interactedRef.current = false;
  }, [currentSheet]);

  const applyTransform = useCallback(
    (next: Transform, { animated = false }: { animated?: boolean } = {}) => {
      const reduced = prefersReducedMotion();
      if (animated && !reduced) {
        setAnimate(true);
        window.setTimeout(() => setAnimate(false), 520);
      }
      setTf(clampTf(next));
    },
    [clampTf, setTf],
  );

  const zoomAt = useCallback(
    (focalX: number, focalY: number, factor: number) => {
      interactedRef.current = true;
      const cur = tfRef.current;
      const nextScale = clamp(cur.scale * factor, minScale, maxScale);
      const k = nextScale / cur.scale;
      applyTransform({
        scale: nextScale,
        tx: focalX - (focalX - cur.tx) * k,
        ty: focalY - (focalY - cur.ty) * k,
      });
    },
    [applyTransform, minScale, maxScale],
  );

  const zoomByButton = useCallback(
    (factor: number) => zoomAt(vp.w / 2, vp.h / 2, factor),
    [zoomAt, vp.w, vp.h],
  );

  const resetView = useCallback(() => {
    interactedRef.current = false;
    applyTransform(fit, { animated: true });
  }, [applyTransform, fit]);

  // Non-passive wheel listener so we can preventDefault (page-zoom on the plan,
  // not the document).
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // Resolve the selected element (only valid, drawn elements reach `elements`).
  const focusTarget = useMemo(
    () => (selectedId ? (elements.find((e) => e.id === selectedId) ?? null) : null),
    [elements, selectedId],
  );
  // Stable signature so we re-frame only when the selection's geometry actually
  // changes — not on every ~150ms streaming tick that re-creates `elements`.
  const fg = focusTarget?.geometry;
  const focusSig = fg ? `${focusTarget!.id}|${fg.x}|${fg.y}|${fg.w}|${fg.h}|${sheetOf(fg)}` : "";

  // Experience B — focus & frame the selected element with a smooth move. Also
  // re-fires when a late-streamed geometry first becomes valid, or on re-fit.
  useEffect(() => {
    if (!ready || !focusTarget) return;
    const g = focusTarget.geometry;
    if (g.w <= 0 || g.h <= 0) return;
    // If the element lives on another folha, switch first; this effect re-runs
    // once that folha's PDF loads (currentSheet changes), then frames the box.
    if (sheetOf(g) !== currentSheet) {
      onSheetChange(sheetOf(g));
      return;
    }
    const contentW = renderWidth;
    const contentH = renderWidth * ratio;
    const boxCx = (g.x + g.w / 2) * contentW;
    const boxCy = (g.y + g.h / 2) * contentH;
    const pad = 0.55; // fraction of the viewport the box should occupy
    const desired = Math.min((vp.w * pad) / (g.w * contentW), (vp.h * pad) / (g.h * contentH));
    const scale = clamp(desired, minScale, maxScale);
    applyTransform(
      { scale, tx: vp.w / 2 - scale * boxCx, ty: vp.h / 2 - scale * boxCy },
      { animated: true },
    );
    interactedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSig, ready, renderWidth, ratio, vp.w, vp.h, minScale, maxScale, currentSheet]);

  // ---- pointer pan -------------------------------------------------------
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    movedRef.current = false;
    interactedRef.current = true;
    startRef.current = { x: e.clientX, y: e.clientY, tx: tfRef.current.tx, ty: tfRef.current.ty };
    setTip(null);
    setAnimate(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
    setTf(clampTf({ scale: tfRef.current.scale, tx: startRef.current.tx + dx, ty: startRef.current.ty + dy }));
  };
  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Click on empty plan area clears the selection (rects stop propagation).
  const onViewportClick = () => {
    if (!movedRef.current) onSelect(null);
  };

  const contentW = renderWidth;
  const contentH = renderWidth * ratio;
  // pdf.js TRANSFERS (detaches) the ArrayBuffer it's handed, so feed it a fresh
  // throwaway copy each time — otherwise the parent's `data` buffer is detached
  // on first load and any remount (StrictMode double-mount in dev, navigating
  // back to /summary in prod) sees a zero-length buffer → "Não foi possível abrir o PDF."
  const file = useMemo(() => (data ? { data: new Uint8Array(data.slice(0)) } : null), [data]);

  // PDF bytes changed (sheet switch or retry-refetch): drop any stale load error
  // so it doesn't mask a freshly-loading folha.
  useEffect(() => {
    setDocError(undefined);
  }, [file]);

  const overlayEls = useMemo(
    () => elements.filter((e) => e.geometry && sheetOf(e.geometry) === currentSheet),
    [elements, currentSheet],
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onClick={onViewportClick}
        className="relative h-[clamp(360px,68vh,720px)] cursor-grab touch-none select-none overflow-hidden rounded-xl border border-surface-container-highest bg-surface-container-low active:cursor-grabbing"
      >
        {/* subtle blueprint texture behind the page */}
        <div aria-hidden className="blueprint-grid pointer-events-none absolute inset-0 opacity-60" />

        {file && !error ? (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              transform: `translate(${tf.tx}px, ${tf.ty}px) scale(${tf.scale})`,
              transition: animate ? "transform 0.5s cubic-bezier(0.22,1,0.36,1)" : "none",
              width: contentW || undefined,
              height: contentH || undefined,
            }}
          >
            <Document
              file={file}
              options={PDF_OPTIONS}
              onLoadSuccess={(pdf: { numPages: number }) => {
                setNumPages(pdf.numPages);
                setDocError(undefined);
              }}
              onLoadError={() => setDocError("Não foi possível abrir o PDF.")}
              loading=""
              error=""
            >
              <Page
                pageNumber={1}
                width={renderWidth || undefined}
                devicePixelRatio={1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={(page: { originalWidth: number; originalHeight: number }) =>
                  setRatio(page.originalHeight / page.originalWidth)
                }
                loading=""
                error=""
              />
            </Document>

            {ready && overlayEls.length > 0 && (
              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                width="100%"
                height="100%"
                className="absolute inset-0"
                style={{ pointerEvents: "none" }}
              >
                {overlayEls.map((el) => {
                  const active = el.id === selectedId;
                  const hot = active || el.id === hoveredId;
                  const c = PALETTE[el.kind];
                  return (
                    <rect
                      key={el.id}
                      x={el.geometry.x}
                      y={el.geometry.y}
                      width={el.geometry.w}
                      height={el.geometry.h}
                      rx={0.004}
                      fill={active ? c.active : hot ? c.fill : "transparent"}
                      stroke={active || hot ? c.stroke : c.rest}
                      strokeWidth={active ? 2.5 : 1.5}
                      vectorEffect="non-scaling-stroke"
                      style={{ pointerEvents: "all", cursor: "pointer", transition: "fill 0.15s ease" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (movedRef.current) return;
                        onSelect(active ? null : el.id);
                      }}
                      onMouseEnter={(e) => {
                        if (draggingRef.current) return;
                        const rect = viewportRef.current?.getBoundingClientRect();
                        onHover(el.id);
                        if (rect) setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, el });
                      }}
                      onMouseMove={(e) => {
                        if (draggingRef.current) return;
                        const rect = viewportRef.current?.getBoundingClientRect();
                        if (rect) setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, el });
                      }}
                      onMouseLeave={() => {
                        onHover(null);
                        setTip(null);
                      }}
                    />
                  );
                })}
              </svg>
            )}
          </div>
        ) : null}

        {/* loading / error overlays */}
        {(loading || (!ready && file && !error && !docError)) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <Spinner size={28} color="var(--color-secondary)" />
            <span className="type-body-sm">Carregando a planta…</span>
          </div>
        )}
        {(error || docError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="type-body-md text-on-surface-variant">{error || docError}</p>
            {error && onRetry && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="press rounded-lg border border-surface-container-highest bg-surface-bright px-4 py-2 type-label-md text-on-surface hover:bg-surface-container-low"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* tooltip — Experience A */}
        {tip && (
          <div
            className="pointer-events-none absolute z-20 max-w-[240px] rounded-lg border border-surface-container-highest bg-surface-bright/95 px-3 py-2 shadow-top backdrop-blur-sm"
            style={{
              left: clamp(tip.x + 14, 8, Math.max(8, vp.w - 248)),
              top: clamp(tip.y + 14, 8, Math.max(8, vp.h - 96)),
            }}
          >
            <p className="type-title-md text-[14px] text-on-surface">{tip.el.label}</p>
            {tip.el.detail && (
              <p className="mt-0.5 font-mono text-[12px] text-on-surface-variant">{tip.el.detail}</p>
            )}
          </div>
        )}

        {/* zoom controls */}
        {ready && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col overflow-hidden rounded-lg border border-surface-container-highest bg-surface-bright/95 shadow-card backdrop-blur-sm">
            <ControlButton label="Aproximar" onClick={() => zoomByButton(1.4)}>
              <path d="M5 10h10M10 5v10" />
            </ControlButton>
            <span aria-hidden className="h-px w-full bg-surface-container-highest" />
            <ControlButton label="Afastar" onClick={() => zoomByButton(1 / 1.4)}>
              <path d="M5 10h10" />
            </ControlButton>
            <span aria-hidden className="h-px w-full bg-surface-container-highest" />
            <ControlButton label="Ajustar à tela" onClick={resetView}>
              <path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" />
            </ControlButton>
          </div>
        )}

        {numPages > 1 && (
          <span className="absolute right-3 top-3 z-20 rounded-full bg-surface-bright/90 px-2.5 py-1 font-mono text-[11px] text-on-surface-variant shadow-card backdrop-blur-sm">
            Página 1 de {numPages}
          </span>
        )}

        {/* Detail card — the selected item's info, overlaid on the PDF. Hidden
            while a folha fails to load so the error + retry button are clear. */}
        {detail && !error && !docError && (
          <div
            className="absolute left-3 top-3 z-30 w-[min(280px,calc(100%-1.5rem))] overflow-hidden rounded-xl border border-surface-container-highest bg-surface-bright/95 shadow-top backdrop-blur-sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: detail.kind === "wall" ? "#4f5871" : PALETTE[detail.kind].stroke }}
            />
            <div className="flex items-start justify-between gap-2 border-b border-surface-container-highest/70 py-2.5 pl-5 pr-2">
              <p className="type-title-md text-[14px] text-on-surface">{detail.title}</p>
              <button
                type="button"
                onClick={onCloseDetail}
                aria-label="Fechar detalhes"
                className="press -mr-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            {detail.fields.length > 0 && (
              <dl className="flex flex-col gap-1.5 py-3 pl-5 pr-4">
                {detail.fields.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3">
                    <dt className="font-mono text-[11px] uppercase tracking-wide text-on-surface-variant">{f.label}</dt>
                    <dd className="font-mono text-[13px] tabular-nums text-on-surface">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {detail.notes && (
              <p className="border-t border-surface-container-highest/70 py-2.5 pl-5 pr-4 type-body-sm text-on-surface-variant">
                {detail.notes}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="px-1 type-body-sm text-on-surface-variant">
        Passe o mouse sobre a planta para destacar · clique em um item (aqui ou na lista ao lado) para
        focar e ver os detalhes · arraste e use a roda do mouse para navegar.
      </p>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="press flex h-9 w-9 items-center justify-center text-on-surface transition-colors hover:bg-surface-container-low"
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}
