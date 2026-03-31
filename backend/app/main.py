"""FastAPI application factory and root router."""

import logging
import sys
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

# Configure root logger so all aero.* messages are visible
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s [%(name)s] %(message)s",
    stream=sys.stdout,
)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, async_session
from app.core.init_db import init_db
from app.api.auth import router as auth_router
from app.api.users import router as users_router

# Import models so Base.metadata sees all tables
import app.models  # noqa: F401

logger = logging.getLogger("aero")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — startup / shutdown hooks."""
    logger.info("AERO backend starting up")

    # Create tables if they don't exist
    from app.core.database import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ensured")

    # Seed default admin user
    async with async_session() as session:
        await init_db(session)

    yield
    logger.info("AERO backend shutting down")


def create_app() -> FastAPI:
    """Build and return the FastAPI application instance."""
    application = FastAPI(
        title="AERO PSE",
        description="Aviation Event Report & Oversight — Process Safety Engine",
        version="0.1.0",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health endpoint — lightweight, no DB dependency
    @application.get("/api/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # Mount API routers
    application.include_router(auth_router)
    application.include_router(users_router)

    return application


app = create_app()
