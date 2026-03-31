"""RBAC matrix tests — verify role-based access on orders and users endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ── Orders endpoint RBAC ────────────────────────────────────────────


class TestOrdersRBAC:
    """Planner must get 403 on orders; other roles get 200."""

    async def test_planner_cannot_list_orders(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Planner → GET /api/orders → 403 (not 200)."""
        resp = await client.get("/api/orders", headers=auth_headers["Planner"])
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Insufficient permissions"

    async def test_planner_cannot_get_order_detail(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Planner → GET /api/orders/1 → 403 (regardless of whether order exists)."""
        resp = await client.get("/api/orders/1", headers=auth_headers["Planner"])
        assert resp.status_code == 403

    @pytest.mark.parametrize(
        "role",
        ["Administrator", "Supervisor", "Pilot"],
    )
    async def test_allowed_roles_can_list_orders(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        """Administrator, Supervisor, Pilot → GET /api/orders → 200."""
        resp = await client.get("/api/orders", headers=auth_headers[role])
        assert resp.status_code == 200

    @pytest.mark.parametrize(
        "role",
        ["Administrator", "Supervisor", "Pilot"],
    )
    async def test_allowed_roles_can_get_order_detail(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        """Non-existent order returns 404 (not 403) for authorized roles."""
        resp = await client.get("/api/orders/9999", headers=auth_headers[role])
        # 404 proves the role check passed — we reach the "not found" handler
        assert resp.status_code == 404


# ── Users endpoint RBAC (sanity check — existing guard) ─────────────


class TestUsersRBAC:
    """Non-admin roles must get 403 on /api/users."""

    @pytest.mark.parametrize(
        "role",
        ["Planner", "Supervisor", "Pilot"],
    )
    async def test_non_admin_cannot_list_users(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        """Non-admin role → GET /api/users → 403."""
        resp = await client.get("/api/users", headers=auth_headers[role])
        assert resp.status_code == 403

    async def test_admin_can_list_users(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Administrator → GET /api/users → 200."""
        resp = await client.get("/api/users", headers=auth_headers["Administrator"])
        assert resp.status_code == 200


# ── Negative tests: authentication edge cases ───────────────────────


class TestAuthEdgeCases:
    """Unauthenticated / invalid token gets 401, not 403."""

    async def test_no_token_returns_401_on_orders(self, client: AsyncClient, seed_users):
        """Missing Authorization header → 401."""
        resp = await client.get("/api/orders")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401_on_orders(
        self, client: AsyncClient, seed_users
    ):
        """Bogus JWT → 401."""
        resp = await client.get(
            "/api/orders",
            headers={"Authorization": "Bearer invalid-token-garbage"},
        )
        assert resp.status_code == 401

    async def test_no_token_returns_401_on_users(self, client: AsyncClient, seed_users):
        """Missing Authorization header → 401 on /api/users."""
        resp = await client.get("/api/users")
        assert resp.status_code == 401
