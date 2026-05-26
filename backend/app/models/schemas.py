from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class ProjectStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Room(BaseModel):
    name: str
    width_m: Optional[float] = None
    length_m: Optional[float] = None
    area_m2: Optional[float] = None
    notes: Optional[str] = None


class Door(BaseModel):
    code: str
    width_m: float
    height_m: float
    room: Optional[str] = None
    notes: Optional[str] = None


class Window(BaseModel):
    code: str
    width_m: float
    height_m: float
    sill_height_m: Optional[float] = None
    room: Optional[str] = None
    notes: Optional[str] = None


class WallSpec(BaseModel):
    type: str
    thickness_cm: float
    notes: Optional[str] = None


class ProjectSummary(BaseModel):
    rooms: list[Room] = Field(default_factory=list)
    doors: list[Door] = Field(default_factory=list)
    windows: list[Window] = Field(default_factory=list)
    walls: list[WallSpec] = Field(default_factory=list)
    execution_checklist: list[str] = Field(default_factory=list)
    general_notes: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    filename: str
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime
    pages: int = 0
    size_bytes: int = 0
    summary: Optional[ProjectSummary] = None
    error: Optional[str] = None
    chat_memory: Optional[str] = None


class ProjectListItem(BaseModel):
    id: str
    name: str
    status: ProjectStatus
    created_at: datetime
    pages: int


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessage(BaseModel):
    id: str
    role: ChatRole
    content: str
    created_at: datetime
    quick_replies: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    project_id: str
    message: str


class ChatResponse(BaseModel):
    message: ChatMessage
    history: list[ChatMessage]


class UploadResponse(BaseModel):
    project: Project


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    app: str
    environment: str
    mock_ai: bool


# ---------- Auth ----------------------------------------------------------


class User(BaseModel):
    id: str
    email: Optional[str] = None  # hidden for guests
    name: Optional[str] = None
    is_guest: bool
    created_at: datetime


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: User


class GuestQuota(BaseModel):
    """Returned alongside the projects list so the frontend can show
    "X de Y uploads usados" without a second round-trip."""

    is_guest: bool
    used: int
    limit: Optional[int] = None  # None for authenticated users (unlimited)
