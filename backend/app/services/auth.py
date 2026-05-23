"""Password hashing + JWT issue/verify + FastAPI auth dependency."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.db.models import UserORM
from app.db.session import get_session
from app.models.schemas import User

TokenType = Literal["user", "guest"]


# ---------- Password hashing ----------------------------------------------


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


# ---------- JWT -----------------------------------------------------------


def issue_token(
    user_id: str,
    *,
    token_type: TokenType,
    settings: Optional[Settings] = None,
) -> str:
    settings = settings or get_settings()
    ttl = (
        settings.jwt_guest_token_ttl_minutes
        if token_type == "guest"
        else settings.jwt_access_token_ttl_minutes
    )
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user_id,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl)).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, settings: Optional[Settings] = None) -> dict:
    settings = settings or get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Sessão inválida.")


# ---------- FastAPI dependency --------------------------------------------


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return header.split(" ", 1)[1].strip()


def _to_pydantic(row: UserORM) -> User:
    return User(
        id=row.id,
        email=None if row.is_guest else row.email,
        name=row.name,
        is_guest=row.is_guest,
        created_at=row.created_at,
    )


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> User:
    payload = decode_token(_extract_bearer(request))
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Sessão inválida.")
    result = await session.execute(select(UserORM).where(UserORM.id == user_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")
    return _to_pydantic(row)


async def get_optional_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Optional[User]:
    """Like get_current_user, but returns None when no/invalid token — for
    routes that work for both signed-in users and anonymous callers."""
    try:
        return await get_current_user(request, session)
    except HTTPException:
        return None


def orm_user_to_schema(row: UserORM) -> User:
    return _to_pydantic(row)
