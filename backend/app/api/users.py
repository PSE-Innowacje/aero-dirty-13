"""User CRUD endpoints — restricted to Administrator role."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.api.deps import require_role
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/users", tags=["users"])

AdminUser = Annotated[User, Depends(require_role("Administrator"))]


@router.get("", response_model=list[UserResponse])
async def list_users(
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[User]:
    """List all system users. Admin only."""
    result = await db.execute(select(User).order_by(User.id))
    return list(result.scalars().all())


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Create a new system user. Admin only."""
    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email {body.email} is already registered",
        )

    user = User(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        system_role=body.system_role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    logger.info("User created: %s (role=%s) by admin", user.email, user.system_role)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Get a user by ID. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: UserUpdate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Update an existing user. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Remove current_password before ORM loop — must never reach the model
    update_data.pop("current_password", None)

    # Verify current password before allowing password change
    if "password" in update_data and update_data["password"] is not None:
        if not body.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="current_password is required when changing password",
            )
        if not verify_password(body.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="current_password is incorrect",
            )

    # Hash password if provided
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    # Check email uniqueness if changing email
    if "email" in update_data and update_data["email"] != user.email:
        dup = await db.execute(
            select(User).where(User.email == update_data["email"])
        )
        if dup.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email {update_data['email']} is already registered",
            )

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    await db.refresh(user)
    logger.info("User updated: %s (id=%d)", user.email, user.id)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a user by ID. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User {user_id} not found",
        )

    await db.delete(user)
    logger.info("User deleted: %s (id=%d)", user.email, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
