import asyncio
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db.session import get_session, get_session_factory
from app.models.schemas import (
    GuestQuota,
    Project,
    ProjectListItem,
    ProjectStatus,
    ProjectSummary,
    UploadResponse,
    User,
)
from app.services.auth import get_current_user
from app.services.event_bus import EventBus
from app.services.openrouter import LLMParseError, OpenRouterClient, get_openrouter
from app.services.pdf_processor import count_pages, extract_single_page_pdf
from app.services.storage import (
    PdfBlobStore,
    ProjectRepository,
    get_blob_store,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])

# Cap folhas per project — bounds the analysis prompt (one image per folha) and
# the byte cost of the viewer. Surfaced as a 400 when exceeded.
MAX_SHEETS = 16


def _sheet_specs(project_id: str, blobs: PdfBlobStore) -> list[dict]:
    """Resolve a project's folhas into analysis specs (one image source each)."""
    specs: list[dict] = []
    for s in blobs.resolve_sheets(project_id):
        src = blobs.source_path_for(project_id, s["file_id"])
        specs.append({"path": str(src), "page_index": s.get("page_index", 0), "sheet": s["index"]})
    return specs


def _serve_sheet_pdf(project_id: str, sheet_index: int, blobs: PdfBlobStore) -> Response:
    """Return one folha as a single-page PDF (extracted on demand)."""
    sheet = next((s for s in blobs.resolve_sheets(project_id) if s["index"] == sheet_index), None)
    if sheet is None:
        raise HTTPException(status_code=404, detail="Folha não encontrada.")
    src = blobs.source_path_for(project_id, sheet["file_id"])
    if not src.exists():
        raise HTTPException(status_code=404, detail="PDF não encontrado.")
    try:
        pdf_bytes = extract_single_page_pdf(src, sheet.get("page_index", 0))
    except Exception:
        raise HTTPException(status_code=404, detail="PDF não encontrado.")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Cache-Control": "private, max-age=3600", "Content-Disposition": "inline"},
    )


async def _save_uploads(
    project_id: str,
    files: list[UploadFile],
    blobs: PdfBlobStore,
    settings: Settings,
    start_index: int,
) -> tuple[list[dict], int, int]:
    """Stream each uploaded PDF to files/{file_id}.pdf and explode its pages into
    ordered sheet-manifest entries. Returns (entries, total_pages, total_size)."""
    blobs.files_dir(project_id)  # ensure the files/ dir exists
    max_bytes = settings.max_pdf_size_mb * 1024 * 1024
    entries: list[dict] = []
    written: list[str] = []  # file_ids written by THIS call, for cleanup on error
    total_pages = 0
    total_size = 0
    idx = start_index
    try:
        for up in files:
            if up.content_type not in ("application/pdf", "application/x-pdf", "binary/octet-stream"):
                raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos.")
            file_id = uuid.uuid4().hex
            written.append(file_id)
            dest = blobs.file_path(project_id, file_id)
            size = 0
            async with aiofiles.open(dest, "wb") as out:
                while chunk := await up.read(1024 * 1024):
                    size += len(chunk)
                    if size > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Cada arquivo deve ter até {settings.max_pdf_size_mb}MB.",
                        )
                    await out.write(chunk)
            try:
                n = count_pages(dest)
            except Exception:
                raise HTTPException(status_code=400, detail="PDF inválido ou corrompido.")
            if n <= 0:
                raise HTTPException(status_code=400, detail="PDF sem páginas.")
            stem = Path(up.filename or "folha.pdf").stem
            for p in range(n):
                entries.append(
                    {
                        "index": idx,
                        "file_id": file_id,
                        "page_index": p,
                        "label": f"{stem} (p.{p + 1})" if n > 1 else stem,
                        "source_filename": up.filename,
                    }
                )
                idx += 1
            total_pages += n
            total_size += size
    except Exception:
        # Leave no orphan blobs behind: drop everything this call wrote.
        for fid in written:
            blobs.file_path(project_id, fid).unlink(missing_ok=True)
        raise
    return entries, total_pages, total_size


def _user_friendly_error(exc: Exception) -> str:
    """Map background-task exceptions to a message safe to show in the app.

    The raw exception (stack trace, JSON column/line numbers, etc) is logged
    separately; users only see a short Portuguese explanation.
    """
    if isinstance(exc, LLMParseError):
        return "Não foi possível interpretar a resposta da IA. Tente reenviar o PDF."
    return "Falha ao analisar o PDF. Tente novamente em alguns instantes."


async def _process_project(project_id: str) -> None:
    """Background task — streams the AI analysis into the project's event bus
    AND persists the final result to Postgres so reconnecting clients always
    get a consistent view, even if they joined late.
    """
    factory = get_session_factory()
    client = get_openrouter()
    blobs = get_blob_store()
    specs = _sheet_specs(project_id, blobs)
    stream = EventBus.get_or_create(project_id)

    async with factory() as session:
        repo = ProjectRepository(session)
        project = await repo.get_unscoped(project_id)
        if project is None:
            stream.close()
            return
        final_summary: ProjectSummary | None = None
        final_error: str | None = None
        try:
            async for event in client.stream_summary(specs):
                if event["type"] == "token":
                    stream.publish({"type": "token", "delta": event["delta"]})
                elif event["type"] == "done":
                    final_summary = event["summary"]
                elif event["type"] == "error":
                    final_error = event["message"]
                    break
        except Exception as exc:
            logger.exception("Project %s streaming analysis crashed", project_id)
            final_error = _user_friendly_error(exc)

        try:
            # A newer re-analysis (add/remove folha) may have replaced our stream
            # via EventBus.reset() and scheduled a fresh task. If so, this run is
            # stale (its summary came from the OLD manifest) and must NOT commit
            # and clobber the current run. Close our orphaned stream and bail.
            if EventBus.get(project_id) is not stream:
                logger.info("Project %s analysis superseded; discarding stale result.", project_id)
                return
            if final_summary is not None:
                await repo.update_status(project_id, ProjectStatus.READY, summary=final_summary)
                await session.commit()
                stream.publish({
                    "type": "done",
                    "summary": final_summary.model_dump(mode="json"),
                })
            else:
                message = final_error or "Falha ao analisar o PDF."
                await repo.update_status(project_id, ProjectStatus.FAILED, error=message)
                await session.commit()
                stream.publish({"type": "error", "message": message})
        finally:
            stream.close()


def _quota_for(user: User, used: int, settings: Settings) -> GuestQuota:
    return GuestQuota(
        is_guest=user.is_guest,
        used=used,
        limit=settings.guest_project_quota if user.is_guest else None,
    )


@router.get("", response_model=list[ProjectListItem])
async def list_projects(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ProjectListItem]:
    projects = await ProjectRepository(session).list_for_user(user.id)
    return [
        ProjectListItem(
            id=p.id,
            name=p.name,
            status=p.status,
            created_at=p.created_at,
            pages=p.pages,
        )
        for p in projects
    ]


@router.get("/quota", response_model=GuestQuota)
async def get_quota(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> GuestQuota:
    used = await ProjectRepository(session).count_for_user(user.id)
    return _quota_for(user, used, settings)


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Project:
    project = await ProjectRepository(session).get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return project


@router.get("/{project_id}/file")
async def get_project_pdf(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
) -> Response:
    """Back-compat shim — serves the first folha (sheet 0)."""
    project = await ProjectRepository(session).get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return _serve_sheet_pdf(project_id, 0, blobs)


@router.get("/{project_id}/sheets/{sheet_index}/file")
async def get_sheet_pdf(
    project_id: str,
    sheet_index: int,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
) -> Response:
    """Serve a single folha as a one-page PDF for the interactive viewer."""
    project = await ProjectRepository(session).get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return _serve_sheet_pdf(project_id, sheet_index, blobs)


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_project(
    background: BackgroundTasks,
    files: list[UploadFile] = File(...),
    name: str | None = Form(default=None),
    settings: Settings = Depends(get_settings),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    if not files:
        raise HTTPException(status_code=400, detail="Envie pelo menos um arquivo PDF.")

    repo = ProjectRepository(session)

    if user.is_guest:
        used = await repo.count_for_user(user.id)
        if used >= settings.guest_project_quota:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Limite de {settings.guest_project_quota} projeto(s) no modo visitante. "
                    "Cadastre-se gratuitamente para enviar mais plantas e desbloquear o histórico."
                ),
            )

    project_id = uuid.uuid4().hex
    try:
        entries, total_pages, total_size = await _save_uploads(project_id, files, blobs, settings, 0)
        if not entries:
            raise HTTPException(status_code=400, detail="Nenhuma folha válida encontrada.")
        if len(entries) > MAX_SHEETS:
            raise HTTPException(status_code=400, detail=f"Máximo de {MAX_SHEETS} folhas por projeto.")
    except HTTPException:
        blobs.remove(project_id)
        raise

    blobs.write_manifest(project_id, entries)
    primary_name = files[0].filename or "projeto.pdf"
    display_name = name or Path(primary_name).stem
    now = datetime.utcnow()
    project = Project(
        id=project_id,
        name=display_name,
        filename=primary_name,
        status=ProjectStatus.PROCESSING,
        created_at=now,
        updated_at=now,
        pages=total_pages,
        size_bytes=total_size,
    )
    created = await repo.create(project, user_id=user.id)
    # Pre-create the stream so a client that races to /analyze/stream right
    # after this response finds an open channel instead of "closed".
    EventBus.get_or_create(project_id)
    background.add_task(_process_project, project_id)
    return UploadResponse(project=created)


@router.post("/{project_id}/sheets", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def add_sheets(
    project_id: str,
    background: BackgroundTasks,
    files: list[UploadFile] = File(...),
    settings: Settings = Depends(get_settings),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    repo = ProjectRepository(session)
    project = await repo.get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    if not files:
        raise HTTPException(status_code=400, detail="Envie pelo menos um arquivo PDF.")
    if user.is_guest:
        # Guests get one simple project; don't let add-sheet become an unmetered
        # way to keep firing full (paid) multi-image re-analyses.
        raise HTTPException(
            status_code=403,
            detail="Cadastre-se gratuitamente para adicionar mais folhas ao projeto.",
        )

    existing = blobs.resolve_sheets(project_id)
    # Freeze a synthesized legacy manifest before appending to it.
    if blobs.read_manifest(project_id) is None:
        blobs.write_manifest(project_id, existing)

    next_idx = max((s["index"] for s in existing), default=-1) + 1
    entries, _pages, _size = await _save_uploads(project_id, files, blobs, settings, next_idx)
    combined = existing + entries
    if len(combined) > MAX_SHEETS:
        for fid in {e["file_id"] for e in entries}:
            blobs.file_path(project_id, fid).unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Máximo de {MAX_SHEETS} folhas por projeto.")

    blobs.write_manifest(project_id, combined)
    await repo.mark_processing(project_id, pages=len(combined))
    await session.commit()
    # Fresh stream so reconnecting clients see the re-analysis, not the old run.
    EventBus.reset(project_id)
    background.add_task(_process_project, project_id)
    updated = await repo.get_for_user(project_id, user.id)
    if updated is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return UploadResponse(project=updated)


@router.delete("/{project_id}/sheets/{sheet_index}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_sheet(
    project_id: str,
    sheet_index: int,
    background: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
    user: User = Depends(get_current_user),
) -> None:
    repo = ProjectRepository(session)
    project = await repo.get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    sheets = blobs.resolve_sheets(project_id)
    removed = next((s for s in sheets if s["index"] == sheet_index), None)
    if removed is None:
        raise HTTPException(status_code=404, detail="Folha não encontrada.")
    if len(sheets) <= 1:
        raise HTTPException(status_code=400, detail="Um projeto precisa de pelo menos uma folha.")

    remaining = [s for s in sheets if s["index"] != sheet_index]
    # Drop the underlying blob only if no remaining folha references it.
    if removed["file_id"] != "__source__" and not any(s["file_id"] == removed["file_id"] for s in remaining):
        blobs.file_path(project_id, removed["file_id"]).unlink(missing_ok=True)
    # Re-pack indices to stay contiguous (0..n-1); re-analysis regenerates the summary.
    for new_index, sheet in enumerate(remaining):
        sheet["index"] = new_index
    blobs.write_manifest(project_id, remaining)

    await repo.mark_processing(project_id, pages=len(remaining))
    await session.commit()
    EventBus.reset(project_id)
    background.add_task(_process_project, project_id)
    return None


def _sse(event: dict) -> bytes:
    """Serialize a dict as a single SSE `data:` frame."""
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")


async def _stream_project_events(
    project_id: str,
    request: Request,
    initial: Project,
) -> AsyncIterator[bytes]:
    # Always send the current row first so the client knows where it stands
    # (covers the "already finished before I connected" case).
    yield _sse({"type": "status", "project": initial.model_dump(mode="json")})

    stream = EventBus.get(project_id)
    if stream is None or (stream.done.is_set() and not stream.subscribers):
        # No in-flight analysis (already done, never started, or expired).
        yield _sse({"type": "closed"})
        return

    queue = stream.subscribe()
    try:
        while True:
            if await request.is_disconnected():
                return
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                # Heartbeat — keeps proxies/load balancers from killing the
                # connection during long quiet stretches.
                yield b": ping\n\n"
                continue
            yield _sse(event)
            if event.get("type") in ("done", "error"):
                return
    finally:
        stream.unsubscribe(queue)


@router.get("/{project_id}/analyze/stream")
async def stream_project_analysis(
    project_id: str,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    project = await ProjectRepository(session).get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return StreamingResponse(
        _stream_project_events(project_id, request, project),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
) -> None:
    deleted = await ProjectRepository(session).delete_for_user(project_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    blobs.remove(project_id)
