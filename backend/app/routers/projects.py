import asyncio
import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
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
from app.services.pdf_processor import count_pages
from app.services.storage import (
    PdfBlobStore,
    ProjectRepository,
    get_blob_store,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


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
    pdf_path = blobs.pdf_path(project_id)
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
            async for event in client.stream_summary(pdf_path):
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


@router.post("", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_project(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    name: str | None = Form(default=None),
    settings: Settings = Depends(get_settings),
    session: AsyncSession = Depends(get_session),
    blobs: PdfBlobStore = Depends(get_blob_store),
    user: User = Depends(get_current_user),
) -> UploadResponse:
    if file.content_type not in ("application/pdf", "application/x-pdf", "binary/octet-stream"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos.")

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
    pdf_path = blobs.pdf_path(project_id)

    size = 0
    max_bytes = settings.max_pdf_size_mb * 1024 * 1024
    async with aiofiles.open(pdf_path, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                await out.close()
                blobs.remove(project_id)
                raise HTTPException(
                    status_code=413,
                    detail=f"Arquivo maior que o limite de {settings.max_pdf_size_mb}MB.",
                )
            await out.write(chunk)

    try:
        pages = count_pages(pdf_path)
    except Exception:
        blobs.remove(project_id)
        raise HTTPException(status_code=400, detail="PDF inválido ou corrompido.")

    display_name = name or Path(file.filename or f"projeto-{project_id[:6]}.pdf").stem
    now = datetime.utcnow()
    project = Project(
        id=project_id,
        name=display_name,
        filename=file.filename or "projeto.pdf",
        status=ProjectStatus.PROCESSING,
        created_at=now,
        updated_at=now,
        pages=pages,
        size_bytes=size,
    )
    created = await repo.create(project, user_id=user.id)
    # Pre-create the stream so a client that races to /analyze/stream right
    # after this response finds an open channel instead of "closed".
    EventBus.get_or_create(project_id)
    background.add_task(_process_project, project_id)
    return UploadResponse(project=created)


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
