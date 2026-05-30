import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_session, get_session_factory
from app.models.schemas import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ChatRole,
    ProjectStatus,
    User,
)
from app.services.auth import get_current_user
from app.services.openrouter import OpenRouterClient, get_openrouter
from app.services.storage import ChatRepository, ProjectRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


def _initial_quick_replies() -> list[str]:
    return [
        "Lista de portas",
        "Lista de janelas",
        "Medidas dos quartos",
        "Checklist de execução",
    ]


async def _maintain_chat_memory(
    project_id: str,
    full_history: list[ChatMessage],
    client: OpenRouterClient,
) -> None:
    """Re-summarize the messages that fell outside the sliding window.

    Runs after a chat turn is persisted so the next turn can pull a fresh
    memory. Best-effort: any failure (LLM, DB) is swallowed — the chat keeps
    working, it just won't gain new long-term memory until the next attempt.
    """
    settings = get_settings()
    window = max(1, settings.chat_history_window)
    threshold = max(window + 1, settings.chat_memory_threshold)
    if len(full_history) <= threshold:
        return

    older = full_history[:-window]
    summary = await client.summarize_chat_history(older)
    if not summary:
        return

    factory = get_session_factory()
    try:
        async with factory() as session:
            await ProjectRepository(session).update_chat_memory(project_id, summary)
            await session.commit()
    except Exception:
        logger.exception("Failed to persist chat memory for project %s", project_id)


@router.get("/{project_id}", response_model=list[ChatMessage])
async def get_chat_history(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ChatMessage]:
    project_repo = ProjectRepository(session)
    chat_repo = ChatRepository(session)

    project = await project_repo.get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    history = await chat_repo.list_for_project(project_id)
    if history:
        return history

    greeting = ChatMessage(
        id=uuid.uuid4().hex,
        role=ChatRole.ASSISTANT,
        content=(
            f"Olá! Já analisei o projeto **{project.name}**. "
            "Posso te ajudar com medidas, esquadrias, paredes e o passo a passo da execução. "
            "Toque em um dos atalhos abaixo ou me pergunte o que quiser."
        )
        if project.status == ProjectStatus.READY
        else (
            f"Estou analisando o projeto **{project.name}**. "
            "Assim que terminar, te aviso aqui e libero as consultas."
        ),
        created_at=datetime.utcnow(),
        quick_replies=_initial_quick_replies() if project.status == ProjectStatus.READY else [],
    )
    return await chat_repo.add_many(project_id, [greeting])


@router.post("", response_model=ChatResponse)
async def send_message(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    client: OpenRouterClient = Depends(get_openrouter),
) -> ChatResponse:
    project_repo = ProjectRepository(session)
    chat_repo = ChatRepository(session)

    project = await project_repo.get_for_user(payload.project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    if project.status != ProjectStatus.READY:
        raise HTTPException(status_code=409, detail="Projeto ainda está sendo processado.")

    history = await chat_repo.list_for_project(payload.project_id)
    user_msg = ChatMessage(
        id=uuid.uuid4().hex,
        role=ChatRole.USER,
        content=payload.message.strip(),
        created_at=datetime.utcnow(),
    )

    answer, quick_replies = await client.chat(
        payload.message, project.summary, history, project.chat_memory,
    )
    assistant_msg = ChatMessage(
        id=uuid.uuid4().hex,
        role=ChatRole.ASSISTANT,
        content=answer,
        created_at=datetime.utcnow(),
        quick_replies=quick_replies or _initial_quick_replies(),
    )

    full = await chat_repo.add_many(payload.project_id, [user_msg, assistant_msg])
    # Memory maintenance is independent of the user's request — fire and forget.
    asyncio.create_task(_maintain_chat_memory(payload.project_id, full, client))
    return ChatResponse(message=assistant_msg, history=full)


def _sse(event: dict) -> bytes:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n".encode("utf-8")


async def _stream_chat_events(
    payload: ChatRequest,
    request: Request,
    user_id: str,
    client: OpenRouterClient,
) -> AsyncIterator[bytes]:
    factory = get_session_factory()

    # Open our own session here: the request's session would already be closed
    # by the time the StreamingResponse generator starts iterating.
    async with factory() as session:
        project_repo = ProjectRepository(session)
        chat_repo = ChatRepository(session)

        project = await project_repo.get_for_user(payload.project_id, user_id)
        if project is None:
            yield _sse({"type": "error", "message": "Projeto não encontrado."})
            return
        if project.status != ProjectStatus.READY:
            yield _sse({"type": "error", "message": "Projeto ainda está sendo processado."})
            return

        history = await chat_repo.list_for_project(payload.project_id)
        chat_memory = project.chat_memory

        user_msg = ChatMessage(
            id=uuid.uuid4().hex,
            role=ChatRole.USER,
            content=payload.message.strip(),
            created_at=datetime.utcnow(),
        )
        assistant_id = uuid.uuid4().hex
        yield _sse({
            "type": "user_message",
            "message": user_msg.model_dump(mode="json"),
        })
        yield _sse({"type": "assistant_start", "id": assistant_id})

        answer_buffer = ""
        quick_replies: list[str] = []
        had_error = False
        try:
            async for event in client.stream_chat(
                payload.message, project.summary, history, chat_memory,
            ):
                # NOTE: do NOT poll request.is_disconnected() here. This is a POST
                # SSE: Starlette's is_disconnected() reads the buffered
                # `http.disconnect` that follows a consumed request body and
                # returns True on the first call, killing the stream before any
                # token is sent (the GET analysis stream is immune). A real
                # client disconnect is handled by the failing yield below.
                if event["type"] == "token":
                    delta = event["delta"]
                    answer_buffer += delta
                    # Re-chunk into small pieces so the client renders a smooth
                    # typewriter effect — providers often deliver large deltas.
                    for i in range(0, len(delta), 4):
                        yield _sse({"type": "token", "delta": delta[i : i + 4]})
                        await asyncio.sleep(0.01)
                elif event["type"] == "done":
                    answer_buffer = event["answer"]
                    quick_replies = event["quick_replies"]
                elif event["type"] == "error":
                    had_error = True
                    yield _sse({"type": "error", "message": event["message"]})
                    break
        except Exception as exc:
            had_error = True
            logger.exception("chat stream crashed")
            yield _sse({"type": "error", "message": f"Falha no chat: {exc}"})

        if had_error:
            return

        fallback_replies = [
            "Lista de portas",
            "Lista de janelas",
            "Medidas dos quartos",
            "Checklist de execução",
        ]
        assistant_msg = ChatMessage(
            id=assistant_id,
            role=ChatRole.ASSISTANT,
            content=answer_buffer.strip() or "(sem resposta)",
            created_at=datetime.utcnow(),
            quick_replies=quick_replies or fallback_replies,
        )
        full_history = await chat_repo.add_many(
            payload.project_id, [user_msg, assistant_msg]
        )
        await session.commit()

        # Memory refresh runs in the background — never block the SSE close.
        asyncio.create_task(
            _maintain_chat_memory(payload.project_id, full_history, client)
        )

        yield _sse({
            "type": "done",
            "message": assistant_msg.model_dump(mode="json"),
        })


@router.post("/stream")
async def stream_message(
    payload: ChatRequest,
    request: Request,
    user: User = Depends(get_current_user),
    client: OpenRouterClient = Depends(get_openrouter),
) -> StreamingResponse:
    return StreamingResponse(
        _stream_chat_events(payload, request, user.id, client),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{project_id}", status_code=204)
async def reset_chat(
    project_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    project_repo = ProjectRepository(session)
    chat_repo = ChatRepository(session)

    project = await project_repo.get_for_user(project_id, user.id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    await chat_repo.clear(project_id)
    # Wipe the rolling memory too — otherwise the next message keeps
    # answering with context from a conversation the user just deleted.
    await project_repo.update_chat_memory(project_id, None)
