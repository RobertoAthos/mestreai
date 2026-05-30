import math
from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class ProjectStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class Geometry(BaseModel):
    """Normalized bounding box of an element on the floor-plan page.

    x, y, w, h are fractions of the page in [0, 1], with the origin at the
    top-left corner (x = left edge, y = top edge). `page` is the zero-based
    page index. Coordinates are kept normalized — never pixels — so the web
    overlay maps correctly regardless of the PDF's scale, DPI or zoom level.
    """

    x: float
    y: float
    w: float
    h: float
    page: int = 0
    # 0-based index into the project's ordered sheets. New analyses set this
    # explicitly; legacy single-PDF projects only carry `page`, so the validator
    # backfills `sheet = page` (their pages ARE their sheets).
    sheet: Optional[int] = None

    @model_validator(mode="after")
    def _normalize(self) -> "Geometry":
        """Coerce non-finite values and clamp the box into the page, so one bad
        coordinate from the LLM can never break the overlay/zoom math nor fail
        the whole ProjectSummary validation."""

        def fin(v: float) -> float:
            return float(v) if isinstance(v, (int, float)) and math.isfinite(v) else 0.0

        x = min(max(fin(self.x), 0.0), 1.0)
        y = min(max(fin(self.y), 0.0), 1.0)
        w = min(max(fin(self.w), 0.0), 1.0)
        h = min(max(fin(self.h), 0.0), 1.0)
        if x + w > 1.0:
            w = 1.0 - x
        if y + h > 1.0:
            h = 1.0 - y
        self.x, self.y, self.w, self.h = x, y, w, h
        if self.page < 0:
            self.page = 0
        if self.sheet is not None and self.sheet < 0:
            self.sheet = 0
        if self.sheet is None:
            self.sheet = self.page
        return self


class Room(BaseModel):
    name: str
    width_m: Optional[float] = None
    length_m: Optional[float] = None
    area_m2: Optional[float] = None
    notes: Optional[str] = None
    geometry: Optional[Geometry] = None


class Door(BaseModel):
    code: str
    width_m: float
    height_m: float
    room: Optional[str] = None
    notes: Optional[str] = None
    geometry: Optional[Geometry] = None


class Window(BaseModel):
    code: str
    width_m: float
    height_m: float
    sill_height_m: Optional[float] = None
    room: Optional[str] = None
    notes: Optional[str] = None
    geometry: Optional[Geometry] = None


class WallSpec(BaseModel):
    type: str
    thickness_cm: float
    notes: Optional[str] = None
    geometry: Optional[Geometry] = None


class ProjectSummary(BaseModel):
    rooms: list[Room] = Field(default_factory=list)
    doors: list[Door] = Field(default_factory=list)
    windows: list[Window] = Field(default_factory=list)
    walls: list[WallSpec] = Field(default_factory=list)
    execution_checklist: list[str] = Field(default_factory=list)
    general_notes: Optional[str] = None


class Sheet(BaseModel):
    """One folha of a project — a single renderable page. Derived from the
    on-disk manifest (or synthesized for legacy projects); never a DB column."""

    index: int
    label: str
    page_count: int = 1
    source_filename: Optional[str] = None


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
    sheets: list[Sheet] = Field(default_factory=list)


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
