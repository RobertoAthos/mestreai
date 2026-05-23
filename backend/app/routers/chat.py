import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
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

router = APIRouter(prefix="/chat", tags=["chat"])


def _initial_quick_replies() -> list[str]:
    return [
        "Lista de portas",
        "Lista de janelas",
        "Medidas dos quartos",
        "Checklist de execução",
    ]


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

    answer, quick_replies = await client.chat(payload.message, project.summary, history)
    assistant_msg = ChatMessage(
        id=uuid.uuid4().hex,
        role=ChatRole.ASSISTANT,
        content=answer,
        created_at=datetime.utcnow(),
        quick_replies=quick_replies or _initial_quick_replies(),
    )

    full = await chat_repo.add_many(payload.project_id, [user_msg, assistant_msg])
    return ChatResponse(message=assistant_msg, history=full)


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
