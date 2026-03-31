"""Seed the database with a default admin user on first startup."""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.user import User

logger = logging.getLogger("aero")


async def init_db(db: AsyncSession) -> None:
    """Create default admin user if no users exist."""
    result = await db.execute(select(User).limit(1))
    existing = result.scalars().first()

    if existing is not None:
        logger.info("Users already exist — skipping admin seed")
        return

    admin = User(
        first_name="Admin",
        last_name="System",
        email="admin@aero.local",
        hashed_password=get_password_hash("admin123"),
        system_role="Administrator",
    )
    db.add(admin)
    await db.commit()
    logger.info("Default admin user created: admin@aero.local")
