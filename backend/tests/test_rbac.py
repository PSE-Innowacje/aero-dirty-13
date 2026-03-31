"""RBAC matrix tests — verify role-based access on all 6 endpoint groups × 4 roles."""

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


# ═══════════════════════════════════════════════════════════════════════
# Helicopters RBAC
# GET → Admin, Supervisor, Pilot = 200; Planner = 403
# POST/PUT/DELETE → Admin = 201/200/204; others = 403
# ═══════════════════════════════════════════════════════════════════════


class TestHelicoptersRBAC:
    """Role-based access on /api/helicopters."""

    @pytest.mark.parametrize("role", ["Administrator", "Supervisor", "Pilot"])
    async def test_allowed_roles_can_list_helicopters(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/helicopters", headers=auth_headers[role])
        assert resp.status_code == 200

    async def test_planner_cannot_list_helicopters(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/helicopters", headers=auth_headers["Planner"])
        assert resp.status_code == 403

    async def test_admin_can_create_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/helicopters",
            json={
                "registration_number": "SP-RBAC1",
                "helicopter_type": "Bell 407",
                "max_crew": 5,
                "max_payload_weight": 800,
                "status": "aktywny",
                "inspection_date": "2027-12-31",
                "range_km": 500,
            },
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_create_helicopter(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/helicopters",
            json={
                "registration_number": f"SP-DENY-{role[:3].upper()}",
                "helicopter_type": "Bell 407",
                "max_crew": 5,
                "max_payload_weight": 800,
                "status": "aktywny",
                "inspection_date": "2027-12-31",
                "range_km": 500,
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_update_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        heli_id = await create_helicopter(registration="SP-UPD1")
        resp = await client.put(
            f"/api/helicopters/{heli_id}",
            json={"max_crew": 6},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_update_helicopter(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        heli_id = await create_helicopter(registration=f"SP-UPD-{role[:3].upper()}")
        resp = await client.put(
            f"/api/helicopters/{heli_id}",
            json={"max_crew": 6},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_delete_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        heli_id = await create_helicopter(registration="SP-DEL1")
        resp = await client.delete(
            f"/api/helicopters/{heli_id}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_delete_helicopter(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        heli_id = await create_helicopter(registration=f"SP-DEL-{role[:3].upper()}")
        resp = await client.delete(
            f"/api/helicopters/{heli_id}",
            headers=auth_headers[role],
        )
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Crew Members RBAC
# GET → Admin, Supervisor, Pilot = 200; Planner = 403
# POST/PUT/DELETE → Admin = 201/200/204; others = 403
# ═══════════════════════════════════════════════════════════════════════


class TestCrewMembersRBAC:
    """Role-based access on /api/crew-members."""

    @pytest.mark.parametrize("role", ["Administrator", "Supervisor", "Pilot"])
    async def test_allowed_roles_can_list_crew_members(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/crew-members", headers=auth_headers[role])
        assert resp.status_code == 200

    async def test_planner_cannot_list_crew_members(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/crew-members", headers=auth_headers["Planner"])
        assert resp.status_code == 403

    async def test_admin_can_create_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/crew-members",
            json={
                "first_name": "RbacTest",
                "last_name": "Crew",
                "email": "rbac-crew@test.com",
                "weight": 80,
                "role": "Obserwator",
                "training_expiry": "2027-12-31",
            },
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_create_crew_member(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/crew-members",
            json={
                "first_name": f"Deny{role}",
                "last_name": "Crew",
                "email": f"deny-{role.lower()}@test.com",
                "weight": 80,
                "role": "Obserwator",
                "training_expiry": "2027-12-31",
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_update_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        cid = await create_crew_member_db(email="rbac-upd@test.com")
        resp = await client.put(
            f"/api/crew-members/{cid}",
            json={"weight": 85},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_update_crew_member(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        cid = await create_crew_member_db(email=f"rbac-upd-{role.lower()}@test.com")
        resp = await client.put(
            f"/api/crew-members/{cid}",
            json={"weight": 85},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_delete_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        cid = await create_crew_member_db(email="rbac-del@test.com")
        resp = await client.delete(
            f"/api/crew-members/{cid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_delete_crew_member(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        cid = await create_crew_member_db(email=f"rbac-del-{role.lower()}@test.com")
        resp = await client.delete(
            f"/api/crew-members/{cid}",
            headers=auth_headers[role],
        )
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Landing Sites RBAC
# GET → Admin, Supervisor, Pilot = 200; Planner = 403
# POST/PUT/DELETE → Admin = 201/200/204; others = 403
# ═══════════════════════════════════════════════════════════════════════


class TestLandingSitesRBAC:
    """Role-based access on /api/landing-sites."""

    @pytest.mark.parametrize("role", ["Administrator", "Supervisor", "Pilot"])
    async def test_allowed_roles_can_list_landing_sites(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/landing-sites", headers=auth_headers[role])
        assert resp.status_code == 200

    async def test_planner_cannot_list_landing_sites(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/landing-sites", headers=auth_headers["Planner"])
        assert resp.status_code == 403

    async def test_admin_can_create_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/landing-sites",
            json={"name": "RBAC Site", "latitude": 50.0, "longitude": 20.0},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_create_landing_site(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/landing-sites",
            json={"name": f"Deny {role}", "latitude": 50.0, "longitude": 20.0},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_update_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        sid = await create_landing_site(name="RBAC Upd Site")
        resp = await client.put(
            f"/api/landing-sites/{sid}",
            json={"name": "Updated Site"},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_update_landing_site(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        sid = await create_landing_site(name=f"RBAC Upd {role}")
        resp = await client.put(
            f"/api/landing-sites/{sid}",
            json={"name": "Denied Update"},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_admin_can_delete_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        sid = await create_landing_site(name="RBAC Del Site")
        resp = await client.delete(
            f"/api/landing-sites/{sid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_delete_landing_site(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        sid = await create_landing_site(name=f"RBAC Del {role}")
        resp = await client.delete(
            f"/api/landing-sites/{sid}",
            headers=auth_headers[role],
        )
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Operations RBAC
# GET → all roles = 200
# POST/PUT → Planner + Supervisor = 201/200; Admin + Pilot = 403
# ═══════════════════════════════════════════════════════════════════════


class TestOperationsRBAC:
    """Role-based access on /api/operations."""

    @pytest.mark.parametrize(
        "role", ["Administrator", "Planner", "Supervisor", "Pilot"]
    )
    async def test_all_roles_can_list_operations(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/operations", headers=auth_headers[role])
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Planner", "Supervisor"])
    async def test_planner_supervisor_can_create_operation(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/operations",
            json={
                "order_number": f"OP-{role[:3].upper()}",
                "short_description": f"Op by {role}",
                "activity_types": ["oględziny wizualne"],
                "proposed_date_earliest": "2027-05-01",
                "proposed_date_latest": "2027-05-10",
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Administrator", "Pilot"])
    async def test_admin_pilot_cannot_create_operation(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/operations",
            json={
                "short_description": f"Op denied {role}",
                "proposed_date_earliest": "2027-05-01",
                "proposed_date_latest": "2027-05-10",
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Planner", "Supervisor"])
    async def test_planner_supervisor_can_update_operation(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        # Create an operation first (use Planner, which is allowed)
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.put(
            f"/api/operations/{op_id}",
            json={"short_description": f"Updated by {role}"},
            headers=auth_headers[role],
        )
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Administrator", "Pilot"])
    async def test_admin_pilot_cannot_update_operation(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        op_id = await create_operation(client, auth_headers["Planner"])
        resp = await client.put(
            f"/api/operations/{op_id}",
            json={"short_description": f"Denied by {role}"},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Orders RBAC
# GET → Admin, Supervisor, Pilot = 200; Planner = 403
# POST → Pilot = 201; others = 403
# PUT → Pilot + Supervisor = 200; Admin + Planner = 403
# ═══════════════════════════════════════════════════════════════════════


class TestOrdersRBAC:
    """Role-based access on /api/orders."""

    async def test_planner_cannot_list_orders(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/orders", headers=auth_headers["Planner"])
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Insufficient permissions"

    async def test_planner_cannot_get_order_detail(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/orders/1", headers=auth_headers["Planner"])
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Administrator", "Supervisor", "Pilot"])
    async def test_allowed_roles_can_list_orders(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/orders", headers=auth_headers[role])
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Administrator", "Supervisor", "Pilot"])
    async def test_allowed_roles_can_get_order_detail(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/orders/9999", headers=auth_headers[role])
        # 404 proves the role check passed
        assert resp.status_code == 404

    async def test_pilot_can_create_order(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Pilot can create an order (requires setup entities)."""
        heli_id = await create_helicopter(registration="SP-ORD1")
        await create_pilot_crew_member()
        site_a = await create_landing_site(name="Ord Site A")
        site_b = await create_landing_site(name="Ord Site B")
        op_id = await create_operation(client, auth_headers["Planner"])
        await confirm_operation(client, auth_headers["Supervisor"], op_id)

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
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Administrator", "Planner", "Supervisor"])
    async def test_non_pilot_cannot_create_order(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/orders",
            json={
                "planned_start_datetime": "2027-01-20T08:00:00Z",
                "planned_end_datetime": "2027-01-20T16:00:00Z",
                "helicopter_id": 1,
                "crew_member_ids": [],
                "start_landing_site_id": 1,
                "end_landing_site_id": 2,
                "operation_ids": [],
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    async def test_pilot_can_update_order(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Pilot can update their own order."""
        heli_id = await create_helicopter(registration="SP-ORDU")
        await create_pilot_crew_member()
        site_a = await create_landing_site(name="Upd Site A")
        site_b = await create_landing_site(name="Upd Site B")
        op_id = await create_operation(client, auth_headers["Planner"])
        await confirm_operation(client, auth_headers["Supervisor"], op_id)

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
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 201
        order_id = resp.json()["id"]

        resp = await client.put(
            f"/api/orders/{order_id}",
            json={"estimated_route_km": 100},
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 200

    async def test_supervisor_can_update_order(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Supervisor can update an order."""
        heli_id = await create_helicopter(registration="SP-ORDS")
        await create_pilot_crew_member()
        site_a = await create_landing_site(name="Sup Upd A")
        site_b = await create_landing_site(name="Sup Upd B")
        op_id = await create_operation(client, auth_headers["Planner"])
        await confirm_operation(client, auth_headers["Supervisor"], op_id)

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
            headers=auth_headers["Pilot"],
        )
        assert resp.status_code == 201
        order_id = resp.json()["id"]

        resp = await client.put(
            f"/api/orders/{order_id}",
            json={"estimated_route_km": 150},
            headers=auth_headers["Supervisor"],
        )
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Administrator", "Planner"])
    async def test_admin_planner_cannot_update_order(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.put(
            "/api/orders/9999",
            json={"estimated_route_km": 100},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Users RBAC (Admin only for all CRUD)
# ═══════════════════════════════════════════════════════════════════════


class TestUsersRBAC:
    """Users RBAC: read (list/get) for Admin+Supervisor+Pilot; write (create/update/delete) Admin only."""

    @pytest.mark.parametrize("role", ["Planner"])
    async def test_planner_cannot_list_users(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/users", headers=auth_headers[role])
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Supervisor", "Pilot"])
    async def test_supervisor_pilot_can_list_users(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/users", headers=auth_headers[role])
        assert resp.status_code == 200

    async def test_admin_can_list_users(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.get("/api/users", headers=auth_headers["Administrator"])
        assert resp.status_code == 200

    async def test_admin_can_create_user(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/users",
            json={
                "first_name": "New",
                "last_name": "User",
                "email": "newuser-rbac@test.com",
                "password": "securepass123",
                "system_role": "Pilot",
            },
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_create_user(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.post(
            "/api/users",
            json={
                "first_name": "Denied",
                "last_name": "User",
                "email": f"deny-{role.lower()}-user@test.com",
                "password": "securepass123",
                "system_role": "Pilot",
            },
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Planner"])
    async def test_planner_cannot_get_user(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/users/1", headers=auth_headers[role])
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Supervisor", "Pilot"])
    async def test_supervisor_pilot_can_get_user(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.get("/api/users/1", headers=auth_headers[role])
        assert resp.status_code == 200

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_update_user(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.put(
            "/api/users/1",
            json={"first_name": "Hacked"},
            headers=auth_headers[role],
        )
        assert resp.status_code == 403

    @pytest.mark.parametrize("role", ["Planner", "Supervisor", "Pilot"])
    async def test_non_admin_cannot_delete_user(
        self, client: AsyncClient, auth_headers: dict, role: str
    ):
        resp = await client.delete("/api/users/1", headers=auth_headers[role])
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════
# Authentication edge cases
# ═══════════════════════════════════════════════════════════════════════


class TestAuthEdgeCases:
    """Unauthenticated / invalid token gets 401, not 403."""

    async def test_no_token_returns_401_on_orders(self, client: AsyncClient, seed_users):
        resp = await client.get("/api/orders")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401_on_orders(
        self, client: AsyncClient, seed_users
    ):
        resp = await client.get(
            "/api/orders",
            headers={"Authorization": "Bearer invalid-token-garbage"},
        )
        assert resp.status_code == 401

    async def test_no_token_returns_401_on_users(self, client: AsyncClient, seed_users):
        resp = await client.get("/api/users")
        assert resp.status_code == 401
