"""Helicopter CRUD endpoints — PRD 6.1 fleet management."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_role
from app.models.helicopter import Helicopter
from app.schemas.helicopter import HelicopterCreate, HelicopterResponse, HelicopterUpdate

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/helicopters", tags=["helicopters"])

AdminUser = Annotated[object, Depends(require_role("Administrator"))]
ReadUser = Annotated[
    object,
    Depends(require_role("Administrator", "Osoba nadzorująca", "Pilot")),
]


@router.get("", response_model=list[HelicopterResponse])
async def list_helicopters(
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[Helicopter]:
    """List all helicopters sorted by status then registration_number."""
    result = await db.execute(
        select(Helicopter).order_by(Helicopter.status, Helicopter.registration_number)
    )
    return list(result.scalars().all())


@router.post("", response_model=HelicopterResponse, status_code=status.HTTP_201_CREATED)
async def create_helicopter(
    body: HelicopterCreate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Helicopter:
    """Create a new helicopter. Admin only."""
    existing = await db.execute(
        select(Helicopter).where(
            Helicopter.registration_number == body.registration_number
        )
    )
    if existing.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration number {body.registration_number} already exists",
        )

    helicopter = Helicopter(**body.model_dump())
    db.add(helicopter)
    await db.flush()
    await db.refresh(helicopter)
    logger.info(
        "Helicopter created: %s (type=%s) by admin",
        helicopter.registration_number,
        helicopter.helicopter_type,
    )
    return helicopter


@router.get("/{helicopter_id}", response_model=HelicopterResponse)
async def get_helicopter(
    helicopter_id: int,
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Helicopter:
    """Get a helicopter by ID."""
    result = await db.execute(
        select(Helicopter).where(Helicopter.id == helicopter_id)
    )
    helicopter = result.scalars().first()
    if helicopter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Helicopter {helicopter_id} not found",
        )
    return helicopter


@router.put("/{helicopter_id}", response_model=HelicopterResponse)
async def update_helicopter(
    helicopter_id: int,
    body: HelicopterUpdate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Helicopter:
    """Update an existing helicopter. Admin only."""
    result = await db.execute(
        select(Helicopter).where(Helicopter.id == helicopter_id)
    )
    helicopter = result.scalars().first()
    if helicopter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Helicopter {helicopter_id} not found",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Check registration_number uniqueness if changing
    if (
        "registration_number" in update_data
        and update_data["registration_number"] != helicopter.registration_number
    ):
        dup = await db.execute(
            select(Helicopter).where(
                Helicopter.registration_number == update_data["registration_number"]
            )
        )
        if dup.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Registration number {update_data['registration_number']} already exists",
            )

    for key, value in update_data.items():
        setattr(helicopter, key, value)

    await db.flush()
    await db.refresh(helicopter)
    logger.info(
        "Helicopter updated: %s (id=%d)", helicopter.registration_number, helicopter.id
    )
    return helicopter


@router.delete("/{helicopter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_helicopter(
    helicopter_id: int,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a helicopter by ID. Admin only."""
    result = await db.execute(
        select(Helicopter).where(Helicopter.id == helicopter_id)
    )
    helicopter = result.scalars().first()
    if helicopter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Helicopter {helicopter_id} not found",
        )

    await db.delete(helicopter)
    logger.info(
        "Helicopter deleted: %s (id=%d)",
        helicopter.registration_number,
        helicopter_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
