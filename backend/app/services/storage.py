"""Persistence layer — Postgres via SQLAlchemy + on-disk PDF blobs.

The structured project metadata, AI summary and chat history live in
Postgres. PDFs themselves stay on the filesystem under
`{storage_path}/{project_id}/source.pdf` because there's no value in
shoving raw blobs through asyncpg for the MVP.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.models import ChatMessageORM, ProjectORM
from app.models.schemas import (
    ChatMessage,
    ChatRole,
    Project,
    ProjectStatus,
    ProjectSummary,
)


# ---------- PDF blob store -------------------------------------------------


class PdfBlobStore:
    """Keeps the raw PDFs on disk, keyed by project id."""

    def __init__(self) -> None:
        self.root = get_settings().storage_dir

    def project_dir(self, project_id: str) -> Path:
        path = self.root / project_id
        path.mkdir(parents=True, exist_ok=True)
        return path

    def pdf_path(self, project_id: str) -> Path:
        return self.project_dir(project_id) / "source.pdf"

    def remove(self, project_id: str) -> None:
        folder = self.root / project_id
        if not folder.exists():
            return
        for path in folder.iterdir():
            path.unlink(missing_ok=True)
        folder.rmdir()


_blob_store: Optional[PdfBlobStore] = None


def get_blob_store() -> PdfBlobStore:
    global _blob_store
    if _blob_store is None:
        _blob_store = PdfBlobStore()
    return _blob_store


# ---------- ORM <-> Pydantic mapping --------------------------------------


def _orm_to_project(row: ProjectORM) -> Project:
    summary = ProjectSummary.model_validate(row.summary) if row.summary else None
    return Project(
        id=row.id,
        name=row.name,
        filename=row.filename,
        status=ProjectStatus(row.status),
        created_at=row.created_at,
        updated_at=row.updated_at,
        pages=row.pages,
        size_bytes=row.size_bytes,
        summary=summary,
        error=row.error,
    )


def _orm_to_message(row: ChatMessageORM) -> ChatMessage:
    return ChatMessage(
        id=row.id,
        role=ChatRole(row.role),
        content=row.content,
        created_at=row.created_at,
        quick_replies=list(row.quick_replies or []),
    )


# ---------- Project repository --------------------------------------------


class ProjectRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_user(self, user_id: str) -> list[Project]:
        result = await self.session.execute(
            select(ProjectORM)
            .where(ProjectORM.user_id == user_id)
            .order_by(ProjectORM.created_at.desc())
        )
        return [_orm_to_project(row) for row in result.scalars()]

    async def count_for_user(self, user_id: str) -> int:
        result = await self.session.execute(
            select(func.count(ProjectORM.id)).where(ProjectORM.user_id == user_id)
        )
        return int(result.scalar_one() or 0)

    async def get_for_user(self, project_id: str, user_id: str) -> Optional[Project]:
        result = await self.session.execute(
            select(ProjectORM).where(
                ProjectORM.id == project_id,
                ProjectORM.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        return _orm_to_project(row) if row else None

    async def get_unscoped(self, project_id: str) -> Optional[Project]:
        """For background tasks that don't have a request user in scope."""
        row = await self.session.get(ProjectORM, project_id)
        return _orm_to_project(row) if row else None

    async def create(self, project: Project, *, user_id: str) -> Project:
        row = ProjectORM(
            id=project.id,
            user_id=user_id,
            name=project.name,
            filename=project.filename,
            status=project.status.value,
            pages=project.pages,
            size_bytes=project.size_bytes,
            error=project.error,
            summary=project.summary.model_dump(mode="json") if project.summary else None,
        )
        self.session.add(row)
        await self.session.flush()
        await self.session.refresh(row)
        return _orm_to_project(row)

    async def update_status(
        self,
        project_id: str,
        status: ProjectStatus,
        *,
        summary: Optional[ProjectSummary] = None,
        error: Optional[str] = None,
    ) -> Optional[Project]:
        row = await self.session.get(ProjectORM, project_id)
        if not row:
            return None
        row.status = status.value
        if summary is not None:
            row.summary = summary.model_dump(mode="json")
        if error is not None:
            row.error = error
        await self.session.flush()
        await self.session.refresh(row)
        return _orm_to_project(row)

    async def delete_for_user(self, project_id: str, user_id: str) -> bool:
        result = await self.session.execute(
            select(ProjectORM).where(
                ProjectORM.id == project_id,
                ProjectORM.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            return False
        await self.session.delete(row)
        await self.session.flush()
        return True


# ---------- Chat repository -----------------------------------------------


class ChatRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_project(self, project_id: str) -> list[ChatMessage]:
        result = await self.session.execute(
            select(ChatMessageORM)
            .where(ChatMessageORM.project_id == project_id)
            .order_by(ChatMessageORM.created_at.asc(), ChatMessageORM.id.asc())
        )
        return [_orm_to_message(row) for row in result.scalars()]

    async def add_many(self, project_id: str, messages: list[ChatMessage]) -> list[ChatMessage]:
        for msg in messages:
            self.session.add(
                ChatMessageORM(
                    id=msg.id,
                    project_id=project_id,
                    role=msg.role.value,
                    content=msg.content,
                    quick_replies=msg.quick_replies,
                    created_at=msg.created_at,
                )
            )
        await self.session.flush()
        return await self.list_for_project(project_id)

    async def clear(self, project_id: str) -> None:
        await self.session.execute(
            delete(ChatMessageORM).where(ChatMessageORM.project_id == project_id)
        )
        await self.session.flush()
