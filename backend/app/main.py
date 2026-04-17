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

import logging as _log422

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

_validation_logger = _log422.getLogger("aero.validation")

from app.core.config import settings
from app.core.database import engine, async_session
from app.core.init_db import init_db
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.helicopters import router as helicopters_router
from app.api.crew_members import router as crew_members_router
from app.api.landing_sites import router as landing_sites_router
from app.api.operations import router as operations_router
from app.api.orders import router as orders_router
from app.api.stats import router as stats_router

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
        title="AERO",
        description="Aviation Event Report & Oversight",
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
    application.include_router(helicopters_router)
    application.include_router(crew_members_router)
    application.include_router(landing_sites_router)
    application.include_router(operations_router)
    application.include_router(orders_router)
    application.include_router(stats_router)

    @application.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        _validation_logger.warning("Validation error on %s: %s", request.url, exc.errors())
        if settings.DEBUG:
            return JSONResponse(status_code=422, content={"detail": exc.errors()})
        return JSONResponse(status_code=422, content={"detail": "Invalid request data"})

    @application.middleware("http")
    async def csrf_check(request: Request, call_next):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)
        if not request.cookies.get("access_token"):
            return await call_next(request)
        if request.url.path in ("/api/auth/login", "/api/auth/refresh"):
            return await call_next(request)
        if request.headers.get("x-requested-with") != "XMLHttpRequest":
            return JSONResponse(status_code=403, content={"detail": "CSRF check failed"})
        return await call_next(request)

    return application


app = create_app()
