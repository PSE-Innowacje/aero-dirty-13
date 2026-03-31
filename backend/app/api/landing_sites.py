"""LandingSite CRUD endpoints — PRD 6.3 site management."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import require_role
from app.models.landing_site import LandingSite
from app.schemas.landing_site import (
    LandingSiteCreate,
    LandingSiteResponse,
    LandingSiteUpdate,
)

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/landing-sites", tags=["landing-sites"])

AdminUser = Annotated[object, Depends(require_role("Administrator"))]
ReadUser = Annotated[
    object,
    Depends(require_role("Administrator", "Osoba nadzorująca", "Pilot")),
]


@router.get("", response_model=list[LandingSiteResponse])
async def list_landing_sites(
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[LandingSite]:
    """List all landing sites sorted by name."""
    result = await db.execute(
        select(LandingSite).order_by(LandingSite.name)
    )
    return list(result.scalars().all())


@router.post("", response_model=LandingSiteResponse, status_code=status.HTTP_201_CREATED)
async def create_landing_site(
    body: LandingSiteCreate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LandingSite:
    """Create a new landing site. Admin only."""
    landing_site = LandingSite(**body.model_dump())
    db.add(landing_site)
    await db.flush()
    await db.refresh(landing_site)
    logger.info(
        "LandingSite created: %s (id=%d) by admin",
        landing_site.name,
        landing_site.id,
    )
    return landing_site


@router.get("/{site_id}", response_model=LandingSiteResponse)
async def get_landing_site(
    site_id: int,
    _user: ReadUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LandingSite:
    """Get a landing site by ID."""
    result = await db.execute(
        select(LandingSite).where(LandingSite.id == site_id)
    )
    landing_site = result.scalars().first()
    if landing_site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Landing site {site_id} not found",
        )
    return landing_site


@router.put("/{site_id}", response_model=LandingSiteResponse)
async def update_landing_site(
    site_id: int,
    body: LandingSiteUpdate,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LandingSite:
    """Update an existing landing site. Admin only."""
    result = await db.execute(
        select(LandingSite).where(LandingSite.id == site_id)
    )
    landing_site = result.scalars().first()
    if landing_site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Landing site {site_id} not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(landing_site, key, value)

    await db.flush()
    await db.refresh(landing_site)
    logger.info(
        "LandingSite updated: %s (id=%d)", landing_site.name, landing_site.id
    )
    return landing_site


@router.delete("/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_landing_site(
    site_id: int,
    _admin: AdminUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a landing site by ID. Admin only."""
    result = await db.execute(
        select(LandingSite).where(LandingSite.id == site_id)
    )
    landing_site = result.scalars().first()
    if landing_site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Landing site {site_id} not found",
        )

    await db.delete(landing_site)
    logger.info(
        "LandingSite deleted: %s (id=%d)", landing_site.name, site_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
