"""Shared test fixtures — async SQLite engine, test users, auth tokens, AsyncClient."""

from __future__ import annotations

# ── Patch env BEFORE any app imports (Settings() reads env at import time) ──
import os
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest")

import asyncio
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.user import User

# ── Async SQLite engine & session ───────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── Event loop fixture (session-scoped) ─────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Database setup/teardown ─────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("PRAGMA foreign_keys=ON"))
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ── get_db override ─────────────────────────────────────────────────

async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


# ── Test users ──────────────────────────────────────────────────────

TEST_PASSWORD = "testpass123"

TEST_USERS = [
    {
        "first_name": "Admin",
        "last_name": "User",
        "email": "admin@test.com",
        "system_role": "Administrator",
    },
    {
        "first_name": "Planner",
        "last_name": "User",
        "email": "planner@test.com",
        "system_role": "Osoba planująca",
    },
    {
        "first_name": "Supervisor",
        "last_name": "User",
        "email": "supervisor@test.com",
        "system_role": "Osoba nadzorująca",
    },
    {
        "first_name": "Pilot",
        "last_name": "User",
        "email": "pilot@test.com",
        "system_role": "Pilot",
    },
]


@pytest_asyncio.fixture
async def seed_users():
    """Seed 4 test users (one per role) and return them."""
    hashed = get_password_hash(TEST_PASSWORD)
    users: list[User] = []
    async with TestSessionLocal() as session:
        for data in TEST_USERS:
            user = User(
                first_name=data["first_name"],
                last_name=data["last_name"],
                email=data["email"],
                hashed_password=hashed,
                system_role=data["system_role"],
            )
            session.add(user)
            users.append(user)
        await session.commit()
        for u in users:
            await session.refresh(u)
    return users


# ── Auth token helpers ──────────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client wired to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _get_token(client: AsyncClient, email: str) -> str:
    """Login and return the Bearer token string."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, seed_users) -> dict[str, dict[str, str]]:
    """Return a dict mapping role name → auth headers for that role's test user."""
    headers: dict[str, dict[str, str]] = {}
    role_email = {
        "Administrator": "admin@test.com",
        "Planner": "planner@test.com",
        "Supervisor": "supervisor@test.com",
        "Pilot": "pilot@test.com",
    }
    for role, email in role_email.items():
        token = await _get_token(client, email)
        headers[role] = {"Authorization": f"Bearer {token}"}
    return headers
