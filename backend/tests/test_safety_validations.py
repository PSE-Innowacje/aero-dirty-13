"""Safety validation tests — 5 checks × positive + negative cases."""

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


# ── Shared setup ────────────────────────────────────────────────────

async def _setup_base(
    client: AsyncClient,
    auth_cookies: dict,
    *,
    heli_reg: str,
    inspection_date: str = "2027-12-31",
    max_payload_weight: int = 5000,
    range_km: int = 500,
    pilot_license_expiry: str = "2027-12-31",
    pilot_training_expiry: str = "2027-12-31",
) -> dict:
    """Create base entities for a safety test. Returns ids dict."""
    heli_id = await create_helicopter(
        registration=heli_reg,
        inspection_date=inspection_date,
        max_payload_weight=max_payload_weight,
        range_km=range_km,
    )
    pilot_id = await create_pilot_crew_member()
    # Override pilot fields if needed
    if pilot_license_expiry != "2027-12-31" or pilot_training_expiry != "2027-12-31":
        from sqlalchemy import text
        from tests.conftest import TestSessionLocal

        async with TestSessionLocal() as session:
            await session.execute(
                text(
                    "UPDATE crew_members SET pilot_license_expiry = :ple, "
                    "training_expiry = :te WHERE id = :id"
                ),
                {"ple": pilot_license_expiry, "te": pilot_training_expiry, "id": pilot_id},
            )
            await session.commit()

    site_a = await create_landing_site(name=f"Safe-A-{heli_reg}", lat=50.0, lon=20.0)
    site_b = await create_landing_site(name=f"Safe-B-{heli_reg}", lat=51.0, lon=21.0)
    op_id = await create_operation(client, auth_cookies["Planner"])
    await confirm_operation(client, auth_cookies["Supervisor"], op_id)

    return {
        "heli_id": heli_id,
        "pilot_id": pilot_id,
        "site_a": site_a,
        "site_b": site_b,
        "op_id": op_id,
    }


def _order_payload(env: dict, *, crew_ids: list[int] | None = None, estimated_route_km: int | None = None) -> dict:
    """Build order creation payload."""
    payload: dict = {
        "planned_start_datetime": "2027-06-15T08:00:00Z",
        "planned_end_datetime": "2027-06-15T16:00:00Z",
        "helicopter_id": env["heli_id"],
        "crew_member_ids": crew_ids or [],
        "start_landing_site_id": env["site_a"],
        "end_landing_site_id": env["site_b"],
        "operation_ids": [env["op_id"]],
        "estimated_route_km": estimated_route_km if estimated_route_km is not None else 50,
    }
    return payload


# ── Check 1: Helicopter inspection expired ──────────────────────────


class TestHelicopterInspection:
    async def test_expired_inspection_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Inspection date in the past → 400."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-INS1",
            inspection_date="2020-01-01",  # expired
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert any("inspection" in e.lower() for e in detail), f"Expected inspection error in: {detail}"

    async def test_valid_inspection_passes(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Inspection date in the future → 201."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-INS2",
            inspection_date="2028-12-31",  # valid
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 201


# ── Check 2: Pilot license expired ─────────────────────────────────


class TestPilotLicense:
    async def test_expired_license_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Pilot license expiry in the past → 400."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-LIC1",
            pilot_license_expiry="2020-01-01",  # expired
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert any("license" in e.lower() for e in detail), f"Expected license error in: {detail}"

    async def test_valid_license_passes(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-LIC2",
            pilot_license_expiry="2028-12-31",
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 201


# ── Check 3: Crew training expired ─────────────────────────────────


class TestCrewTraining:
    async def test_expired_crew_training_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Crew member with expired training → 400."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-TRN1",
        )
        # Create a crew member with expired training
        crew_id = await create_crew_member_db(
            first_name="Expired",
            last_name="Trainee",
            email="expired_trainee@test.com",
            weight=75,
            role="Obserwator",
            training_expiry="2020-01-01",  # expired
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, crew_ids=[crew_id]),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert any("training" in e.lower() for e in detail), f"Expected training error in: {detail}"

    async def test_valid_crew_training_passes(
        self, client: AsyncClient, auth_cookies: dict
    ):
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-TRN2",
        )
        crew_id = await create_crew_member_db(
            first_name="Valid",
            last_name="Trainee",
            email="valid_trainee@test.com",
            weight=75,
            role="Obserwator",
            training_expiry="2028-12-31",  # valid
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, crew_ids=[crew_id]),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 201


# ── Check 4: Crew weight exceeds payload ────────────────────────────


class TestCrewWeight:
    async def test_overweight_crew_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Pilot(80) + crew(90) = 170 > max_payload(100) → 400."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-WGT1",
            max_payload_weight=100,  # very low
        )
        crew_id = await create_crew_member_db(
            first_name="Heavy",
            last_name="Crew",
            email="heavy_crew@test.com",
            weight=90,
            role="Obserwator",
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, crew_ids=[crew_id]),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert any("weight" in e.lower() or "payload" in e.lower() for e in detail), (
            f"Expected weight/payload error in: {detail}"
        )

    async def test_within_weight_limit_passes(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """Pilot(80) + crew(90) = 170 < max_payload(500) → 201."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-WGT2",
            max_payload_weight=500,
        )
        crew_id = await create_crew_member_db(
            first_name="Light",
            last_name="Crew",
            email="light_crew@test.com",
            weight=90,
            role="Obserwator",
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, crew_ids=[crew_id]),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 201


# ── Check 5: Route exceeds range ────────────────────────────────────


class TestRouteRange:
    async def test_over_range_rejected(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """estimated_route_km(200) > range_km(100) → 400."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-RNG1",
            range_km=100,  # short range
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, estimated_route_km=200),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 400
        detail = resp.json()["detail"]
        assert any("range" in e.lower() or "distance" in e.lower() for e in detail), (
            f"Expected range/distance error in: {detail}"
        )

    async def test_within_range_passes(
        self, client: AsyncClient, auth_cookies: dict
    ):
        """estimated_route_km(100) < range_km(500) → 201."""
        env = await _setup_base(
            client, auth_cookies,
            heli_reg="SP-RNG2",
            range_km=500,
        )
        resp = await client.post(
            "/api/orders",
            json=_order_payload(env, estimated_route_km=100),
            cookies=auth_cookies["Pilot"],
            headers=_CSRF,
        )
        assert resp.status_code == 201
