"""Order status lifecycle tests — submit, reject, accept, settlements + operation cascades."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import (
    create_helicopter,
    create_crew_member_db,
    create_landing_site,
    create_pilot_crew_member,
    create_operation,
    confirm_operation,
)

pytestmark = pytest.mark.asyncio

_CSRF = {"X-Requested-With": "XMLHttpRequest"}


# ── Shared order-setup helper ───────────────────────────────────────

async def _setup_order_env(
    client: AsyncClient,
    auth_cookies: dict,
    *,
    heli_reg: str = "SP-ORD",
    max_payload: int = 5000,
    range_km: int = 500,
) -> dict:
    """Create helicopter, pilot crew member, landing sites, confirmed operation.

    Returns dict with ids needed to create an order.
    """
    heli_id = await create_helicopter(
        registration=heli_reg,
        max_payload_weight=max_payload,
        range_km=range_km,
    )
    pilot_id = await create_pilot_crew_member()
    site_a = await create_landing_site(name=f"Start-{heli_reg}", lat=50.0, lon=20.0)
    site_b = await create_landing_site(name=f"End-{heli_reg}", lat=51.0, lon=21.0)
    op_id = await create_operation(client, auth_cookies["Planner"])
    await confirm_operation(client, auth_cookies["Supervisor"], op_id)
    return {
        "heli_id": heli_id,
        "pilot_id": pilot_id,
        "site_a": site_a,
        "site_b": site_b,
        "op_id": op_id,
    }


async def _create_order(
    client: AsyncClient,
    auth_cookies: dict,
    env: dict,
    *,
    start_dt: str = "2027-01-20T08:00:00Z",
    end_dt: str = "2027-01-20T16:00:00Z",
    crew_ids: list[int] | None = None,
    estimated_route_km: int | None = None,
) -> int:
    """Create an order via API as Pilot, return its id."""
    payload: dict = {
        "planned_start_datetime": start_dt,
        "planned_end_datetime": end_dt,
        "helicopter_id": env["heli_id"],
        "crew_member_ids": crew_ids or [],
        "start_landing_site_id": env["site_a"],
        "end_landing_site_id": env["site_b"],
        "operation_ids": [env["op_id"]],
        "estimated_route_km": estimated_route_km if estimated_route_km is not None else 50,
    }
    resp = await client.post("/api/orders", json=payload, cookies=auth_cookies["Pilot"], headers=_CSRF)
    assert resp.status_code == 201, f"Order create failed: {resp.text}"
    return resp.json()["id"]


# ── Submit (1→2) ────────────────────────────────────────────────────


class TestOrderSubmit:
    async def test_submit_success(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-SUB1")
        oid = await _create_order(client, auth_cookies, env)

        resp = await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
        assert resp.status_code == 200
        assert resp.json()["status"] == 2

    async def test_submit_from_non_status1_fails(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-SUB2")
        oid = await _create_order(client, auth_cookies, env)

        # Submit once (1→2)
        resp = await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
        assert resp.status_code == 200

        # Submit again (2→? should fail)
        resp = await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
        assert resp.status_code == 400
        assert "must be 1" in resp.json()["detail"]


# ── Reject (2→3) ────────────────────────────────────────────────────


class TestOrderReject:
    async def test_reject_success(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-REJ1")
        oid = await _create_order(client, auth_cookies, env)

        await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
        resp = await client.post(f"/api/orders/{oid}/reject", cookies=auth_cookies["Supervisor"], headers=_CSRF)
        assert resp.status_code == 200
        assert resp.json()["status"] == 3

    async def test_reject_from_non_status2_fails(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-REJ2")
        oid = await _create_order(client, auth_cookies, env)

        # Try reject from status 1 (not submitted)
        resp = await client.post(f"/api/orders/{oid}/reject", cookies=auth_cookies["Supervisor"], headers=_CSRF)
        assert resp.status_code == 400
        assert "must be 2" in resp.json()["detail"]


# ── Accept (2→4) ────────────────────────────────────────────────────


class TestOrderAccept:
    async def test_accept_success(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-ACC1")
        oid = await _create_order(client, auth_cookies, env)

        await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
        resp = await client.post(f"/api/orders/{oid}/accept", cookies=auth_cookies["Supervisor"], headers=_CSRF)
        assert resp.status_code == 200
        assert resp.json()["status"] == 4

    async def test_accept_from_non_status2_fails(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-ACC2")
        oid = await _create_order(client, auth_cookies, env)

        # Try accept from status 1 (not submitted)
        resp = await client.post(f"/api/orders/{oid}/accept", cookies=auth_cookies["Supervisor"], headers=_CSRF)
        assert resp.status_code == 400
        assert "must be 2" in resp.json()["detail"]

    async def test_accept_rejects_end_before_start(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Create order with end <= start datetime → 422 (schema validation)."""
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-ACC3")
        # Schema validator now rejects invalid dates at create time
        payload = {
            "planned_start_datetime": "2027-01-20T10:00:00Z",
            "planned_end_datetime": "2027-01-19T08:00:00Z",  # end < start
            "helicopter_id": env["heli_id"],
            "crew_member_ids": [],
            "start_landing_site_id": env["site_a"],
            "end_landing_site_id": env["site_b"],
            "operation_ids": [env["op_id"]],
            "estimated_route_km": 50,
        }
        resp = await client.post("/api/orders", json=payload, cookies=auth_cookies["Pilot"], headers=_CSRF)
        assert resp.status_code == 422, f"Should reject invalid dates on create: {resp.text}"


# ── Settlement Tests ────────────────────────────────────────────────


async def _accept_order(
    client: AsyncClient,
    auth_cookies: dict,
    order_id: int,
) -> None:
    """Submit + accept an order (1→2→4)."""
    resp = await client.post(f"/api/orders/{order_id}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)
    assert resp.status_code == 200
    resp = await client.post(f"/api/orders/{order_id}/accept", cookies=auth_cookies["Supervisor"], headers=_CSRF)
    assert resp.status_code == 200


async def _set_actual_datetimes(
    client: AsyncClient,
    auth_cookies: dict,
    order_id: int,
) -> None:
    """Set actual start/end datetimes on an accepted order via PUT."""
    resp = await client.put(
        f"/api/orders/{order_id}",
        json={
            "actual_start_datetime": "2027-01-20T08:30:00Z",
            "actual_end_datetime": "2027-01-20T15:30:00Z",
        },
        cookies=auth_cookies["Pilot"],
        headers=_CSRF,
    )
    assert resp.status_code == 200, f"Set actual datetimes failed: {resp.text}"


class TestOrderSettlements:
    """Settlement transitions from status 4 with operation cascades."""

    async def test_complete_partial_4_to_5(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-CP1")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)
        await _set_actual_datetimes(client, auth_cookies, oid)

        resp = await client.post(
            f"/api/orders/{oid}/complete-partial", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == 5
        # Operations should cascade to status 5
        for op in data["operations"]:
            assert op["status"] == 5, f"Operation {op['id']} should be status 5"

    async def test_complete_full_4_to_6(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-CF1")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)
        await _set_actual_datetimes(client, auth_cookies, oid)

        resp = await client.post(
            f"/api/orders/{oid}/complete-full", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == 6
        for op in data["operations"]:
            assert op["status"] == 6, f"Operation {op['id']} should be status 6"

    async def test_not_completed_4_to_7(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-NC1")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)
        await _set_actual_datetimes(client, auth_cookies, oid)

        resp = await client.post(
            f"/api/orders/{oid}/not-completed", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == 7
        # Operations should cascade back to status 3
        for op in data["operations"]:
            assert op["status"] == 3, f"Operation {op['id']} should be status 3"


class TestSettlementPrereqs:
    """Settlement without actual datetimes → 400."""

    async def test_complete_partial_without_actuals(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-PR1")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)
        # Do NOT set actual datetimes

        resp = await client.post(
            f"/api/orders/{oid}/complete-partial", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 400
        assert "actual_start_datetime" in resp.json()["detail"]

    async def test_complete_full_without_actuals(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-PR2")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)

        resp = await client.post(
            f"/api/orders/{oid}/complete-full", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 400

    async def test_not_completed_without_actuals(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Status 7 (not completed) does NOT require actual datetimes — flight never happened."""
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-PR3")
        oid = await _create_order(client, auth_cookies, env)
        await _accept_order(client, auth_cookies, oid)

        resp = await client.post(
            f"/api/orders/{oid}/not-completed", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 200


class TestOperationCascadeOnCreate:
    """Creating an order with confirmed operations (status 3) cascades them to status 4."""

    async def test_operations_cascade_3_to_4_on_order_create(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-CAS1")

        # Verify operation is in status 3 before order creation
        resp = await client.get(
            f"/api/operations/{env['op_id']}",
            cookies=auth_cookies["Planner"],
        )
        assert resp.json()["status"] == 3

        # Create order → operation cascades 3→4
        oid = await _create_order(client, auth_cookies, env)

        # Verify operation is now status 4
        resp = await client.get(
            f"/api/operations/{env['op_id']}",
            cookies=auth_cookies["Planner"],
        )
        assert resp.json()["status"] == 4

        # Also verify in the order response
        resp = await client.get(
            f"/api/orders/{oid}",
            cookies=auth_cookies["Pilot"],
        )
        for op in resp.json()["operations"]:
            assert op["status"] == 4


class TestSettlementInvalidStatus:
    """Settlement from non-status-4 → 400."""

    async def test_complete_partial_from_status1(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-IS1")
        oid = await _create_order(client, auth_cookies, env)

        # Try settle from status 1 (not accepted)
        resp = await client.post(
            f"/api/orders/{oid}/complete-partial", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 400
        assert "must be 4" in resp.json()["detail"]

    async def test_complete_full_from_status2(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_order_env(client, auth_cookies, heli_reg="SP-IS2")
        oid = await _create_order(client, auth_cookies, env)
        await client.post(f"/api/orders/{oid}/submit", cookies=auth_cookies["Pilot"], headers=_CSRF)

        resp = await client.post(
            f"/api/orders/{oid}/complete-full", cookies=auth_cookies["Pilot"], headers=_CSRF
        )
        assert resp.status_code == 400
        assert "must be 4" in resp.json()["detail"]
