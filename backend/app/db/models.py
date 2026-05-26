from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserORM(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Guests get an auto-generated email like `guest-<id>@local` so the
    # unique index still applies; we hide that from the API.
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_guest: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    projects: Mapped[list["ProjectORM"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class ProjectORM(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="processing")
    pages: Mapped[int] = mapped_column(default=0, nullable=False)
    size_bytes: Mapped[int] = mapped_column(default=0, nullable=False)
    error: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)
    summary: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # Rolling LLM-generated summary of older chat turns once the raw history
    # outgrows the sliding window. Lets the assistant keep continuity across
    # arbitrarily long conversations without re-sending every message.
    chat_memory: Mapped[Optional[str]] = mapped_column(Text(), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[UserORM] = relationship(back_populates="projects")
    messages: Mapped[list["ChatMessageORM"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ChatMessageORM.created_at",
    )


class ChatMessageORM(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text(), nullable=False)
    quick_replies: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )

    project: Mapped[ProjectORM] = relationship(back_populates="messages")


Index("ix_chat_messages_project_created", ChatMessageORM.project_id, ChatMessageORM.created_at)
