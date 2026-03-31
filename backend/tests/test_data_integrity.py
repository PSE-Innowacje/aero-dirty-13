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

from tests.conftest import TestSessionLocal

pytestmark = pytest.mark.asyncio


# ── Helpers ──────────────────────────────────────────────────────────


async def _create_helicopter(
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


async def _create_crew_member_db(
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


async def _create_landing_site(*, name: str = "Site A", lat: float = 50.0, lon: float = 20.0) -> int:
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


async def _create_pilot_crew_member() -> int:
    """Create a pilot crew member matching the test pilot user (pilot@test.com)."""
    return await _create_crew_member_db(
        first_name="Pilot",
        last_name="User",
        email="pilot@test.com",
        weight=80,
        role="Pilot",
        pilot_license_number="LIC-001",
        pilot_license_expiry="2027-12-31",
        training_expiry="2027-12-31",
    )


async def _create_operation(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    proposed_earliest: str = "2027-01-15",
    proposed_latest: str = "2027-01-20",
) -> int:
    """Create an operation via API as Planner, return its id."""
    resp = await client.post(
        "/api/operations",
        json={
            "short_description": "Test Op",
            "proposed_date_earliest": proposed_earliest,
            "proposed_date_latest": proposed_latest,
        },
        headers=headers,
    )
    assert resp.status_code == 201, f"Operation create failed: {resp.text}"
    return resp.json()["id"]


async def _confirm_operation(
    client: AsyncClient, headers: dict[str, str], op_id: int
) -> None:
    """Confirm an operation (1→3) via Supervisor."""
    resp = await client.post(
        f"/api/operations/{op_id}/confirm",
        json={
            "planned_date_earliest": "2027-01-15",
            "planned_date_latest": "2027-01-20",
        },
        headers=headers,
    )
    assert resp.status_code == 200, f"Operation confirm failed: {resp.text}"


# ── Crew Role Tests ─────────────────────────────────────────────────


class TestCrewRoles:
    """Crew roles must accept Mechanik and Operator in addition to Pilot/Obserwator."""

    async def test_create_crew_mechanik(
        self, client: AsyncClient, auth_headers: dict
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
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["role"] == "Mechanik"

    async def test_create_crew_operator(
        self, client: AsyncClient, auth_headers: dict
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
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201, resp.text
        assert resp.json()["role"] == "Operator"

    async def test_create_crew_invalid_role(
        self, client: AsyncClient, auth_headers: dict
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
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 422


# ── Operations Sort Order Tests ──────────────────────────────────────


class TestOperationsSort:
    """Operations must be sorted by planned_date_earliest ASC."""

    async def test_operations_sorted_by_planned_date_asc(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Create 3 operations with different planned dates, verify ASC sort."""
        planner = auth_headers["Planner"]
        supervisor = auth_headers["Supervisor"]

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
                headers=supervisor,
            )
            assert resp.status_code == 200, resp.text

        # List operations — should be sorted by planned_date_earliest ASC
        resp = await client.get("/api/operations", headers=planner)
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
        self, client: AsyncClient, auth_headers: dict
    ):
        """Order with end_datetime <= start_datetime → accept returns 400."""
        pilot_h = auth_headers["Pilot"]
        supervisor_h = auth_headers["Supervisor"]
        planner_h = auth_headers["Planner"]

        # Setup: create helicopter, pilot crew member, landing sites, operation
        heli_id = await _create_helicopter()
        pilot_cm_id = await _create_pilot_crew_member()
        site_a = await _create_landing_site(name="Site A", lat=50.0, lon=20.0)
        site_b = await _create_landing_site(name="Site B", lat=51.0, lon=21.0)
        op_id = await _create_operation(client, planner_h)
        await _confirm_operation(client, supervisor_h, op_id)

        # Create order with end BEFORE start (invalid dates)
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
            },
            headers=pilot_h,
        )
        assert resp.status_code == 201, f"Order create should succeed (validation is on accept): {resp.text}"
        order_id = resp.json()["id"]

        # Submit order (1→2)
        resp = await client.post(f"/api/orders/{order_id}/submit", headers=pilot_h)
        assert resp.status_code == 200, resp.text

        # Accept order (2→4) should be rejected due to bad dates
        resp = await client.post(f"/api/orders/{order_id}/accept", headers=supervisor_h)
        assert resp.status_code == 400
        assert "planned_end_datetime must be after planned_start_datetime" in resp.json()["detail"]

    async def test_accept_passes_valid_dates(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Order with end > start → accept succeeds (2→4)."""
        pilot_h = auth_headers["Pilot"]
        supervisor_h = auth_headers["Supervisor"]
        planner_h = auth_headers["Planner"]

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
            },
            headers=pilot_h,
        )
        assert resp.status_code == 201, resp.text
        order_id = resp.json()["id"]

        resp = await client.post(f"/api/orders/{order_id}/submit", headers=pilot_h)
        assert resp.status_code == 200

        resp = await client.post(f"/api/orders/{order_id}/accept", headers=supervisor_h)
        assert resp.status_code == 200
        assert resp.json()["status"] == 4


# ── Helicopter Active Status Tests ───────────────────────────────────


class TestHelicopterActiveStatus:
    """Order save must reject inactive helicopter."""

    async def test_inactive_helicopter_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Create order with inactive helicopter → 400."""
        pilot_h = auth_headers["Pilot"]
        planner_h = auth_headers["Planner"]
        supervisor_h = auth_headers["Supervisor"]

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
            },
            headers=pilot_h,
        )
        assert resp.status_code == 400
        assert "not active" in resp.json()["detail"]

    async def test_active_helicopter_accepted(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Create order with active helicopter → 201."""
        pilot_h = auth_headers["Pilot"]
        planner_h = auth_headers["Planner"]
        supervisor_h = auth_headers["Supervisor"]

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
            },
            headers=pilot_h,
        )
        assert resp.status_code == 201, resp.text


# ── Crew Weight Includes Pilot Test ──────────────────────────────────


class TestCrewWeightIncludesPilot:
    """crew_weight in order response must include pilot's weight."""

    async def test_crew_weight_includes_pilot(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Order crew_weight = pilot_weight + sum(crew_member weights)."""
        pilot_h = auth_headers["Pilot"]
        planner_h = auth_headers["Planner"]
        supervisor_h = auth_headers["Supervisor"]

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
            },
            headers=pilot_h,
        )
        assert resp.status_code == 201, resp.text
        data = resp.json()
        # pilot weight (80) + crew1 weight (90) = 170
        assert data["crew_weight"] == 170, (
            f"Expected crew_weight=170 (pilot 80 + crew 90), got {data['crew_weight']}"
        )
