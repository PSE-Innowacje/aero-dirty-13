"""API smoke test — all 4 roles login and access their permitted endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import (
    TEST_PASSWORD,
    create_helicopter,
    create_crew_member_db,
    create_landing_site,
    create_operation,
)

pytestmark = pytest.mark.asyncio


class TestSmokeLogin:
    """Each of the 4 roles can authenticate and receive a valid JWT."""

    @pytest.mark.parametrize(
        "email",
        [
            "admin@test.com",
            "planner@test.com",
            "supervisor@test.com",
            "pilot@test.com",
        ],
    )
    async def test_role_login(
        self, client: AsyncClient, seed_users, email: str
    ):
        resp = await client.post(
            "/api/auth/login",
            json={"email": email, "password": TEST_PASSWORD},
        )
        assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


class TestSmokeAdministrator:
    """Administrator can access helicopters, crew, landing-sites, users."""

    async def test_admin_lists_helicopters(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/helicopters", headers=auth_headers["Administrator"])
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_admin_lists_crew(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/crew-members", headers=auth_headers["Administrator"])
        assert resp.status_code == 200

    async def test_admin_lists_landing_sites(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/landing-sites", headers=auth_headers["Administrator"])
        assert resp.status_code == 200

    async def test_admin_lists_users(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/users", headers=auth_headers["Administrator"])
        assert resp.status_code == 200


class TestSmokePlanner:
    """Planner can access operations."""

    async def test_planner_lists_operations(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/operations", headers=auth_headers["Planner"])
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    async def test_planner_creates_operation(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/operations",
            json={
                "order_number": "SMOKE-001",
                "short_description": "Smoke test op",
                "activity_types": ["oględziny wizualne"],
                "proposed_date_earliest": "2027-01-15",
                "proposed_date_latest": "2027-01-20",
            },
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 201


class TestSmokeSupervisor:
    """Supervisor can access operations, orders, helicopters."""

    async def test_supervisor_lists_operations(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/operations", headers=auth_headers["Supervisor"])
        assert resp.status_code == 200

    async def test_supervisor_lists_orders(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/orders", headers=auth_headers["Supervisor"])
        assert resp.status_code == 200

    async def test_supervisor_lists_helicopters(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/helicopters", headers=auth_headers["Supervisor"])
        assert resp.status_code == 200


class TestSmokePilot:
    """Pilot can access orders, operations, helicopters."""

    async def test_pilot_lists_orders(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/orders", headers=auth_headers["Pilot"])
        assert resp.status_code == 200

    async def test_pilot_lists_operations(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/operations", headers=auth_headers["Pilot"])
        assert resp.status_code == 200

    async def test_pilot_lists_helicopters(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/helicopters", headers=auth_headers["Pilot"])
        assert resp.status_code == 200
