"""Shared test fixtures — async SQLite engine, test users, auth cookies, AsyncClient.

Also provides reusable DB helper functions for creating test entities
(helicopters, crew members, landing sites, operations) used across
test_data_integrity.py, test_rbac.py, and test_crud.py.
"""

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


async def _get_cookies(client: AsyncClient, email: str) -> dict[str, str]:
    """Login and return cookies dict for the given user."""
    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return dict(resp.cookies)


@pytest_asyncio.fixture
async def auth_cookies(client: AsyncClient, seed_users) -> dict[str, dict[str, str]]:
    """Return a dict mapping role name → cookie dict for that role's test user."""
    cookies: dict[str, dict[str, str]] = {}
    role_email = {
        "Administrator": "admin@test.com",
        "Planner": "planner@test.com",
        "Supervisor": "supervisor@test.com",
        "Pilot": "pilot@test.com",
    }
    for role, email in role_email.items():
        cookies[role] = await _get_cookies(client, email)
    return cookies


# ── Shared DB helper functions (used across multiple test modules) ──


async def create_helicopter(
    *,
    registration: str = "SP-TEST",
    status: str = "aktywny",
    inspection_date: str = "2027-12-31",
    max_crew: int = 5,
    max_payload_weight: int = 1000,
    range_km: int = 500,
) -> int:
    """Insert a helicopter directly via DB, return its id."""
    async with TestSessionLocal() as session:
        result = await session.execute(
            text(
                "INSERT INTO helicopters "
                "(registration_number, helicopter_type, max_crew, max_payload_weight, status, inspection_date, range_km) "
                "VALUES (:reg, 'TestType', :max_crew, :max_payload, :status, :insp, :range_km)"
            ),
            {
                "reg": registration,
                "max_crew": max_crew,
                "max_payload": max_payload_weight,
                "status": status,
                "insp": inspection_date,
                "range_km": range_km,
            },
        )
        heli_id = result.lastrowid
        await session.commit()
    return heli_id


async def create_crew_member_db(
    *,
    first_name: str = "Test",
    last_name: str = "Crew",
    email: str = "crew@test.com",
    weight: int = 80,
    role: str = "Obserwator",
    pilot_license_number: str | None = None,
    pilot_license_expiry: str | None = None,
    training_expiry: str = "2027-12-31",
) -> int:
    """Insert a crew member directly via DB, return its id."""
    async with TestSessionLocal() as session:
        result = await session.execute(
            text(
                "INSERT INTO crew_members "
                "(first_name, last_name, email, weight, role, "
                "pilot_license_number, pilot_license_expiry, training_expiry) "
                "VALUES (:fn, :ln, :email, :weight, :role, :pln, :ple, :te)"
            ),
            {
                "fn": first_name,
                "ln": last_name,
                "email": email,
                "weight": weight,
                "role": role,
                "pln": pilot_license_number,
                "ple": pilot_license_expiry,
                "te": training_expiry,
            },
        )
        cid = result.lastrowid
        await session.commit()
    return cid


async def create_landing_site(*, name: str = "Site A", lat: float = 50.0, lon: float = 20.0) -> int:
    """Insert a landing site directly via DB, return its id."""
    async with TestSessionLocal() as session:
        result = await session.execute(
            text(
                "INSERT INTO landing_sites (name, latitude, longitude) VALUES (:name, :lat, :lon)"
            ),
            {"name": name, "lat": lat, "lon": lon},
        )
        sid = result.lastrowid
        await session.commit()
    return sid


async def create_pilot_crew_member() -> int:
    """Create a pilot crew member matching the test pilot user (pilot@test.com)."""
    return await create_crew_member_db(
        first_name="Pilot",
        last_name="User",
        email="pilot@test.com",
        weight=80,
        role="Pilot",
        pilot_license_number="LIC-001",
        pilot_license_expiry="2027-12-31",
        training_expiry="2027-12-31",
    )


async def create_operation(
    client: AsyncClient,
    cookies: dict[str, str],
    *,
    proposed_earliest: str = "2027-01-15",
    proposed_latest: str = "2027-01-20",
) -> int:
    """Create an operation via API as Planner, return its id."""
    resp = await client.post(
        "/api/operations",
        json={
            "order_number": "TEST-OP-001",
            "short_description": "Test Op",
            "activity_types": ["oględziny wizualne"],
            "proposed_date_earliest": proposed_earliest,
            "proposed_date_latest": proposed_latest,
        },
        cookies=cookies,
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert resp.status_code == 201, f"Operation create failed: {resp.text}"
    return resp.json()["id"]


async def confirm_operation(
    client: AsyncClient, cookies: dict[str, str], op_id: int
) -> None:
    """Confirm an operation (1→3) via Supervisor."""
    resp = await client.post(
        f"/api/operations/{op_id}/confirm",
        json={
            "planned_date_earliest": "2027-01-15",
            "planned_date_latest": "2027-01-20",
        },
        cookies=cookies,
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert resp.status_code == 200, f"Operation confirm failed: {resp.text}"
