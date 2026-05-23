import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import UserORM
from app.db.session import get_session
from app.models.schemas import AuthResponse, LoginRequest, SignupRequest, User
from app.services.auth import (
    get_current_user,
    hash_password,
    issue_token,
    orm_user_to_schema,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    email = payload.email.lower().strip()
    existing = await session.execute(select(UserORM).where(UserORM.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="Já existe uma conta com esse e-mail.")

    user = UserORM(
        id=uuid.uuid4().hex,
        email=email,
        name=payload.name.strip(),
        password_hash=hash_password(payload.password),
        is_guest=False,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)

    return AuthResponse(
        access_token=issue_token(user.id, token_type="user"),
        user=orm_user_to_schema(user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    email = payload.email.lower().strip()
    result = await session.execute(select(UserORM).where(UserORM.email == email))
    user = result.scalar_one_or_none()
    # Reject guest accounts here even if someone somehow guesses the synthetic
    # email — guests have no password and shouldn't authenticate via /login.
    if user is None or user.is_guest or not user.password_hash:
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    return AuthResponse(
        access_token=issue_token(user.id, token_type="user"),
        user=orm_user_to_schema(user),
    )


@router.post("/guest", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def guest_session(
    session: AsyncSession = Depends(get_session),
) -> AuthResponse:
    """Issue a guest token + create a throwaway user row so the rest of the
    system can treat guests like any other user (with a quota check)."""
    guest_id = uuid.uuid4().hex
    user = UserORM(
        id=guest_id,
        email=f"guest-{guest_id}@local",
        name="Visitante",
        password_hash=None,
        is_guest=True,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)
    return AuthResponse(
        access_token=issue_token(user.id, token_type="guest"),
        user=orm_user_to_schema(user),
    )


@router.get("/me", response_model=User)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
