"""Data integrity & validation tests — S02 fixes.

Covers:
- Crew roles accept Mechanik/Operator (and reject invalid)
- Operations sorted by planned_date_earliest ASC
- Order accept validates dates (end must be after start)
- Helicopter active status enforced on order save
- Crew weight includes pilot weight
"""

from __future__ import annotations

import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy import text

from tests.conftest import (
    TestSessionLocal,
    create_helicopter,
    create_crew_member_db,
    create_landing_site,
    create_pilot_crew_member,
    create_operation,
    confirm_operation,
)

pytestmark = pytest.mark.asyncio

_CSRF = {"X-Requested-With": "XMLHttpRequest"}

# ── Helpers (re-exported from conftest for backward compatibility) ────
# All helpers are now in conftest.py:
#   create_helicopter, create_crew_member_db, create_landing_site,
#   create_pilot_crew_member, create_operation, confirm_operation
# Local aliases with underscore prefix for existing test code:
_create_helicopter = create_helicopter
_create_crew_member_db = create_crew_member_db
_create_landing_site = create_landing_site
_create_pilot_crew_member = create_pilot_crew_member
_create_operation = create_operation
_confirm_operation = confirm_operation


# ── Crew Role Tests ─────────────────────────────────────────────────


class TestCrewRoles:
    """Crew roles must accept Mechanik and Operator in addition to Pilot/Obserwator."""

    async def test_create_crew_mechanik(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """POST /api/crew-members with role=Mechanik → 201."""
        resp = await client.post(
            "/api/crew-members",
            json={
                "first_name": "Jan",
                "last_name": "Mechanik",
                "email": "mechanik@test.com",
                "weight": 80,
                "role": "Mechanik",
                "training_expiry": "2027-12-31",
            },
            cookies=auth_cookies["Administrator"],
            headers=_CSRF,
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["role"] == "Mechanik"

    async def test_create_crew_operator(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """POST /api/crew-members with role=Operator → 201."""
        resp = await client.post(
            "/api/crew-members",
            json={
                "first_name": "Anna",
                "last_name": "Operator",
                "email": "operator@test.com",
                "weight": 70,
                "role": "Operator",
                "training_expiry": "2027-12-31",
            },
            cookies=auth_cookies["Administrator"],
            headers=_CSRF,
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["role"] == "Operator"

    async def test_create_crew_invalid_role(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """POST /api/crew-members with role=InvalidRole → 422."""
        resp = await client.post(
            "/api/crew-members",
            json={
                "first_name": "Bad",
                "last_name": "Role",
                "email": "badrole@test.com",
                "weight": 75,
                "role": "InvalidRole",
                "training_expiry": "2027-12-31",
            },
            cookies=auth_cookies["Administrator"],
            headers=_CSRF,
        )
        assert resp.status_code == 422


# ── Operations Sort Order Tests ──────────────────────────────────────


class TestOperationsSort:
    """Operations must be sorted by planned_date_earliest ASC."""

    async def test_operations_sorted_by_planned_date_asc(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Create 3 operations with different planned dates, verify ASC sort."""
        planner = auth_cookies["Planner"]
        supervisor = auth_cookies["Supervisor"]

        # Create 3 operations
        op1_id = await _create_operation(client, planner, proposed_earliest="2027-03-01", proposed_latest="2027-03-10")
        op2_id = await _create_operation(client, planner, proposed_earliest="2027-01-01", proposed_latest="2027-01-10")
        op3_id = await _create_operation(client, planner, proposed_earliest="2027-02-01", proposed_latest="2027-02-10")

        # Confirm all 3 with different planned dates to control sort order
        for op_id, earliest, latest in [
            (op1_id, "2027-03-01", "2027-03-10"),
            (op2_id, "2027-01-01", "2027-01-10"),
            (op3_id, "2027-02-01", "2027-02-10"),
        ]:
            resp = await client.post(
                f"/api/operations/{op_id}/confirm",
                json={"planned_date_earliest": earliest, "planned_date_latest": latest},
                cookies=supervisor,
                headers=_CSRF,
            )
            assert resp.status_code == 200, resp.text

        # List operations — should be sorted by planned_date_earliest ASC
        resp = await client.get("/api/operations", cookies=planner)
        assert resp.status_code == 200
        ops = resp.json()
        assert len(ops) == 3

        dates = [op["planned_date_earliest"] for op in ops]
        assert dates == ["2027-01-01", "2027-02-01", "2027-03-01"], (
            f"Expected ASC sort, got {dates}"
        )


# ── Order Accept Date Validation Tests ───────────────────────────────


class TestOrderAcceptDateValidation:
    """Order accept must reject orders where end <= start datetime."""

    async def test_accept_rejects_end_before_start(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Order with end_datetime <= start_datetime → create returns 422."""
        pilot_h = auth_cookies["Pilot"]
        supervisor_h = auth_cookies["Supervisor"]
        planner_h = auth_cookies["Planner"]

        # Setup: create helicopter, pilot crew member, landing sites, operation
        heli_id = await _create_helicopter()
        pilot_cm_id = await _create_pilot_crew_member()
        site_a = await _create_landing_site(name="Site A", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site B", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        # Create order with end BEFORE start — schema validator rejects immediately
        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T10:00:00Z",
                "planned_end_datetime": "2027-01-19T08:00:00Z",  # end < start
                "helicopter_id": heli_id,
                "crew_member_ids": [],
                "start_landing_site_id": site_a,
                "end_landing_site_id": site_b,
                "operation_ids": [op_id],
                "estimated_route_km": 50,
            },
            cookies=pilot_h,
            headers=_CSRF,
        )
        assert resp.status_code == 422, f"Should reject invalid dates on create: {resp.text}"

    async def test_accept_passes_valid_dates(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Order with end > start → accept succeeds (2→4)."""
        pilot_h = auth_cookies["Pilot"]
        supervisor_h = auth_cookies["Supervisor"]
        planner_h = auth_cookies["Planner"]

        heli_id = await _create_helicopter(registration="SP-GOOD")
        await _create_pilot_crew_member()
        site_a = await _create_landing_site(name="Site C", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site D", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T08:00:00Z",
                "planned_end_datetime": "2027-01-20T16:00:00Z",  # end > start ✓
                "helicopter_id": heli_id,
                "crew_member_ids": [],
                "start_landing_site_id": site_a,
                "end_landing_site_id": site_b,
                "operation_ids": [op_id],
                "estimated_route_km": 50,
            },
            cookies=pilot_h,
            headers=_CSRF,
        )
        assert resp.status_code == 201, resp.text
        order_id = resp.json()["id"]

        resp = await client.post(f"/api/orders/{order_id}/submit", cookies=pilot_h, headers=_CSRF)
        assert resp.status_code == 200

        resp = await client.post(f"/api/orders/{order_id}/accept", cookies=supervisor_h, headers=_CSRF)
        assert resp.status_code == 200
        assert resp.json()["status"] == 4


# ── Helicopter Active Status Tests ───────────────────────────────────


class TestHelicopterActiveStatus:
    """Order save must reject inactive helicopter."""

    async def test_inactive_helicopter_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Create order with inactive helicopter → 400."""
        pilot_h = auth_cookies["Pilot"]
        planner_h = auth_cookies["Planner"]
        supervisor_h = auth_cookies["Supervisor"]

        heli_id = await _create_helicopter(registration="SP-DEAD", status="nieaktywny")
        await _create_pilot_crew_member()
        site_a = await _create_landing_site(name="Site E", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site F", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T08:00:00Z",
                "planned_end_datetime": "2027-01-20T16:00:00Z",
                "helicopter_id": heli_id,
                "crew_member_ids": [],
                "start_landing_site_id": site_a,
                "end_landing_site_id": site_b,
                "operation_ids": [op_id],
                "estimated_route_km": 50,
            },
            cookies=pilot_h,
            headers=_CSRF,
        )
        assert resp.status_code == 400
        assert "not active" in resp.json()["detail"]

    async def test_active_helicopter_accepted(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Create order with active helicopter → 201."""
        pilot_h = auth_cookies["Pilot"]
        planner_h = auth_cookies["Planner"]
        supervisor_h = auth_cookies["Supervisor"]

        heli_id = await _create_helicopter(registration="SP-LIVE", status="aktywny")
        await _create_pilot_crew_member()
        site_a = await _create_landing_site(name="Site G", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site H", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T08:00:00Z",
                "planned_end_datetime": "2027-01-20T16:00:00Z",
                "helicopter_id": heli_id,
                "crew_member_ids": [],
                "start_landing_site_id": site_a,
                "end_landing_site_id": site_b,
                "operation_ids": [op_id],
                "estimated_route_km": 50,
            },
            cookies=pilot_h,
            headers=_CSRF,
        )
        assert resp.status_code == 201, resp.text


# ── Crew Weight Includes Pilot Test ──────────────────────────────────


class TestCrewWeightIncludesPilot:
    """crew_weight in order response must include pilot's weight."""

    async def test_crew_weight_includes_pilot(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Order crew_weight = pilot_weight + sum(crew_member weights)."""
        pilot_h = auth_cookies["Pilot"]
        planner_h = auth_cookies["Planner"]
        supervisor_h = auth_cookies["Supervisor"]

        heli_id = await _create_helicopter(registration="SP-WGT", max_payload_weight=5000)
        pilot_cm_id = await _create_pilot_crew_member()  # weight=80
        crew1_id = await _create_crew_member_db(
            first_name="Crew", last_name="One", email="crew1@test.com",
            weight=90, role="Obserwator",
        )
        site_a = await _create_landing_site(name="Site I", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site J", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T08:00:00Z",
                "planned_end_datetime": "2027-01-20T16:00:00Z",
                "helicopter_id": heli_id,
                "crew_member_ids": [crew1_id],
                "start_landing_site_id": site_a,
                "end_landing_site_id": site_b,
                "operation_ids": [op_id],
                "estimated_route_km": 50,
            },
            cookies=pilot_h,
            headers=_CSRF,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        # pilot weight (80) + crew1 weight (90) = 170
        assert data["crew_weight"] == 170, (
            f"Expected crew_weight=170 (pilot 80 + crew 90), got {data['crew_weight']}"
        )
