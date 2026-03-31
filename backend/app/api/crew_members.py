"""CrewMember CRUD endpoints — PRD 6.2 crew management."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_role
from app.models.crew_member import CrewMember
from app.schemas.crew_member import CrewMemberCreate, CrewMemberResponse, CrewMemberUpdate

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/crew-members", tags=["crew-members"])

AdminUser = Annotated[object, Depends(require_role("Administrator"))]
ReadUser = Annotated[
    object,
    Depends(require_role("Administrator", "Osoba nadzorująca", "Pilot")),
]


@router.get("", response_model=list[CrewMemberResponse])
async def list_crew_members(
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CrewMember]:
    """List all crew members sorted by email."""
    result = await db.execute(
        select(CrewMember).order_by(CrewMember.email)
    )
    return list(result.scalars().all())


@router.post("", response_model=CrewMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_crew_member(
    body: CrewMemberCreate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CrewMember:
    """Create a new crew member. Admin only."""
    existing = await db.execute(
        select(CrewMember).where(CrewMember.email == body.email)
    )
    if existing.scalars().first() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email {body.email} is already registered",
        )

    crew_member = CrewMember(**body.model_dump())
    db.add(crew_member)
    await db.flush()
    await db.refresh(crew_member)
    logger.info(
        "CrewMember created: %s (role=%s) by admin",
        crew_member.email,
        crew_member.role,
    )
    return crew_member


@router.get("/{member_id}", response_model=CrewMemberResponse)
async def get_crew_member(
    member_id: int,
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CrewMember:
    """Get a crew member by ID."""
    result = await db.execute(
        select(CrewMember).where(CrewMember.id == member_id)
    )
    crew_member = result.scalars().first()
    if crew_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crew member {member_id} not found",
        )
    return crew_member


@router.put("/{member_id}", response_model=CrewMemberResponse)
async def update_crew_member(
    member_id: int,
    body: CrewMemberUpdate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CrewMember:
    """Update an existing crew member. Admin only."""
    result = await db.execute(
        select(CrewMember).where(CrewMember.id == member_id)
    )
    crew_member = result.scalars().first()
    if crew_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crew member {member_id} not found",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Check email uniqueness if changing
    if "email" in update_data and update_data["email"] != crew_member.email:
        dup = await db.execute(
            select(CrewMember).where(CrewMember.email == update_data["email"])
        )
        if dup.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email {update_data['email']} is already registered",
            )

    for key, value in update_data.items():
        setattr(crew_member, key, value)

    await db.flush()
    await db.refresh(crew_member)
    logger.info(
        "CrewMember updated: %s (id=%d)", crew_member.email, crew_member.id
    )
    return crew_member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crew_member(
    member_id: int,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a crew member by ID. Admin only."""
    result = await db.execute(
        select(CrewMember).where(CrewMember.id == member_id)
    )
    crew_member = result.scalars().first()
    if crew_member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Crew member {member_id} not found",
        )

    await db.delete(crew_member)
    logger.info(
        "CrewMember deleted: %s (id=%d)", crew_member.email, member_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
