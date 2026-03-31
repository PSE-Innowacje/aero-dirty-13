"""Operation status lifecycle tests — confirm, reject, resign transitions + invalid paths."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import create_operation

pytestmark = pytest.mark.asyncio


class TestConfirmOperation:
    """Supervisor confirms operation: 1→3 with planned dates."""

    async def test_confirm_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == 3
        assert data["planned_date_earliest"] == "2027-02-01"
        assert data["planned_date_latest"] == "2027-02-10"

    async def test_confirm_from_non_status1_fails(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Confirm from status 3 (already confirmed) → 400."""
        op_id = await create_operation(client, auth_headers["Planner"])
        # Confirm once (1→3)
        resp = await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 200

        # Confirm again (3→? should fail)
        resp = await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-03-01",
                "planned_date_latest": "2027-03-10",
            },
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 400
        assert "must be 1" in resp.json()["detail"]

    async def test_confirm_nonexistent_operation(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/operations/99999/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 404

    async def test_confirm_wrong_role_planner(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Planner cannot confirm — Supervisor-only endpoint."""
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 403

    async def test_confirm_wrong_role_pilot(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Pilot cannot confirm."""
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 403


class TestRejectOperation:
    """Supervisor rejects operation: 1→2."""

    async def test_reject_success(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/reject",
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == 2

    async def test_reject_from_non_status1_fails(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Reject from status 3 (confirmed) → 400."""
        op_id = await create_operation(client, auth_headers["Planner"])
        # Confirm first (1→3)
        await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        # Now try reject from status 3
        resp = await client.post(
            f"/api/operations/{op_id}/reject",
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 400
        assert "must be 1" in resp.json()["detail"]

    async def test_reject_wrong_role_planner(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/reject",
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 403

    async def test_reject_wrong_role_pilot(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/reject",
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 403


class TestResignOperation:
    """Planner resigns from operation: 1/3/4→7."""

    async def test_resign_from_status1(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == 7

    async def test_resign_from_status3(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        # Confirm (1→3)
        await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == 7

    async def test_resign_from_status4(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Status 4 means operation is 'planned' (after order links it).
        We set it via DB directly to avoid full order flow here."""
        from sqlalchemy import text
        from tests.conftest import TestSessionLocal

        op_id = await create_operation(client, auth_headers["Planner"])
        # Confirm to status 3 first
        await client.post(
            f"/api/operations/{op_id}/confirm",
            json={
                "planned_date_earliest": "2027-02-01",
                "planned_date_latest": "2027-02-10",
            },
            headers=auth_headers["Supervisor"],
        )
        # Set to status 4 directly (normally done by order creation cascade)
        async with TestSessionLocal() as session:
            await session.execute(
                text("UPDATE flight_operations SET status = 4 WHERE id = :id"),
                {"id": op_id},
            )
            await session.commit()

        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == 7

    @pytest.mark.parametrize("bad_status", [2, 5, 6, 7])
    async def test_resign_from_invalid_status_fails(
        self, client: AsyncClient, auth_headers: dict, bad_status: int
    ):
        """Resign from status 2/5/6/7 → 400."""
        from sqlalchemy import text
        from tests.conftest import TestSessionLocal

        op_id = await create_operation(client, auth_headers["Planner"])
        # Set status directly via DB
        async with TestSessionLocal() as session:
            await session.execute(
                text("UPDATE flight_operations SET status = :s WHERE id = :id"),
                {"s": bad_status, "id": op_id},
            )
            await session.commit()

        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Planner"],
        )
        assert resp.status_code == 400

    async def test_resign_wrong_role_supervisor(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Supervisor cannot resign — Planner-only endpoint."""
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 403

    async def test_resign_wrong_role_pilot(
        self, client: AsyncClient, auth_headers: dict
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.post(
            f"/api/operations/{op_id}/resign",
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 403
