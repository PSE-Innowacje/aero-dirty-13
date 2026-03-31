"""CRUD cycle tests — create/list/get/update/delete for 4 resource types as Admin."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


# ═══════════════════════════════════════════════════════════════════════
# Helicopter CRUD
# ═══════════════════════════════════════════════════════════════════════


class TestHelicopterCRUD:
    """Full CRUD lifecycle for helicopters via the API."""

    CREATE_PAYLOAD = {
        "registration_number": "SP-CRUD",
        "helicopter_type": "Bell 407",
        "max_crew": 5,
        "max_payload_weight": 800,
        "status": "aktywny",
        "inspection_date": "2027-12-31",
        "range_km": 500,
    }

    async def test_create_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/helicopters",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["registration_number"] == "SP-CRUD"
        assert data["helicopter_type"] == "Bell 407"
        assert data["max_crew"] == 5
        assert data["max_payload_weight"] == 800
        assert data["status"] == "aktywny"
        assert data["range_km"] == 500
        assert "id" in data

    async def test_list_helicopters(
        self, client: AsyncClient, auth_headers: dict
    ):
        # Create one first
        await client.post(
            "/api/helicopters",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        resp = await client.get(
            "/api/helicopters", headers=auth_headers["Administrator"]
        )
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        regs = [h["registration_number"] for h in items]
        assert "SP-CRUD" in regs

    async def test_get_helicopter_by_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/helicopters",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        heli_id = resp.json()["id"]

        resp = await client.get(
            f"/api/helicopters/{heli_id}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        assert resp.json()["registration_number"] == "SP-CRUD"

    async def test_update_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/helicopters",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        heli_id = resp.json()["id"]

        resp = await client.put(
            f"/api/helicopters/{heli_id}",
            json={"max_crew": 8, "description": "Updated"},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["max_crew"] == 8
        assert data["description"] == "Updated"
        # Unchanged fields preserved
        assert data["registration_number"] == "SP-CRUD"

    async def test_delete_helicopter(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/helicopters",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        heli_id = resp.json()["id"]

        resp = await client.delete(
            f"/api/helicopters/{heli_id}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

        # Confirm it's gone
        resp = await client.get(
            f"/api/helicopters/{heli_id}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# Crew Member CRUD
# ═══════════════════════════════════════════════════════════════════════


class TestCrewMemberCRUD:
    """Full CRUD lifecycle for crew members via the API."""

    CREATE_PAYLOAD = {
        "first_name": "CrudTest",
        "last_name": "Member",
        "email": "crudtest@test.com",
        "weight": 80,
        "role": "Obserwator",
        "training_expiry": "2027-12-31",
    }

    async def test_create_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/crew-members",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "CrudTest"
        assert data["last_name"] == "Member"
        assert data["email"] == "crudtest@test.com"
        assert data["weight"] == 80
        assert data["role"] == "Obserwator"
        assert "id" in data

    async def test_list_crew_members(
        self, client: AsyncClient, auth_headers: dict
    ):
        await client.post(
            "/api/crew-members",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        resp = await client.get(
            "/api/crew-members", headers=auth_headers["Administrator"]
        )
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        emails = [c["email"] for c in items]
        assert "crudtest@test.com" in emails

    async def test_get_crew_member_by_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/crew-members",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        cid = resp.json()["id"]

        resp = await client.get(
            f"/api/crew-members/{cid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "crudtest@test.com"

    async def test_update_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/crew-members",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        cid = resp.json()["id"]

        resp = await client.put(
            f"/api/crew-members/{cid}",
            json={"weight": 90, "last_name": "Updated"},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["weight"] == 90
        assert data["last_name"] == "Updated"
        assert data["first_name"] == "CrudTest"

    async def test_delete_crew_member(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/crew-members",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        cid = resp.json()["id"]

        resp = await client.delete(
            f"/api/crew-members/{cid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

        resp = await client.get(
            f"/api/crew-members/{cid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# Landing Site CRUD
# ═══════════════════════════════════════════════════════════════════════


class TestLandingSiteCRUD:
    """Full CRUD lifecycle for landing sites via the API."""

    CREATE_PAYLOAD = {
        "name": "Crud Test Site",
        "latitude": 51.5,
        "longitude": 19.5,
    }

    async def test_create_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/landing-sites",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Crud Test Site"
        assert data["latitude"] == 51.5
        assert data["longitude"] == 19.5
        assert "id" in data

    async def test_list_landing_sites(
        self, client: AsyncClient, auth_headers: dict
    ):
        await client.post(
            "/api/landing-sites",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        resp = await client.get(
            "/api/landing-sites", headers=auth_headers["Administrator"]
        )
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        names = [s["name"] for s in items]
        assert "Crud Test Site" in names

    async def test_get_landing_site_by_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/landing-sites",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        sid = resp.json()["id"]

        resp = await client.get(
            f"/api/landing-sites/{sid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Crud Test Site"

    async def test_update_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/landing-sites",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        sid = resp.json()["id"]

        resp = await client.put(
            f"/api/landing-sites/{sid}",
            json={"name": "Updated Site", "latitude": 52.0},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Updated Site"
        assert data["latitude"] == 52.0
        assert data["longitude"] == 19.5  # unchanged

    async def test_delete_landing_site(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/landing-sites",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        sid = resp.json()["id"]

        resp = await client.delete(
            f"/api/landing-sites/{sid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

        resp = await client.get(
            f"/api/landing-sites/{sid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════════
# User CRUD
# ═══════════════════════════════════════════════════════════════════════


class TestUserCRUD:
    """Full CRUD lifecycle for users via the API."""

    CREATE_PAYLOAD = {
        "first_name": "CrudNew",
        "last_name": "User",
        "email": "crudnew@test.com",
        "password": "securepass123",
        "system_role": "Pilot",
    }

    async def test_create_user(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/users",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "CrudNew"
        assert data["last_name"] == "User"
        assert data["email"] == "crudnew@test.com"
        assert data["system_role"] == "Pilot"
        assert "id" in data
        # Password should not be in response
        assert "password" not in data
        assert "hashed_password" not in data

    async def test_list_users(
        self, client: AsyncClient, auth_headers: dict
    ):
        await client.post(
            "/api/users",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        resp = await client.get(
            "/api/users", headers=auth_headers["Administrator"]
        )
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        # At least the 4 seed users + 1 new one
        assert len(items) >= 5
        emails = [u["email"] for u in items]
        assert "crudnew@test.com" in emails

    async def test_get_user_by_id(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/users",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        uid = resp.json()["id"]

        resp = await client.get(
            f"/api/users/{uid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "crudnew@test.com"

    async def test_update_user(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/users",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        uid = resp.json()["id"]

        resp = await client.put(
            f"/api/users/{uid}",
            json={"first_name": "Updated", "system_role": "Administrator"},
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Updated"
        assert data["system_role"] == "Administrator"
        assert data["last_name"] == "User"  # unchanged

    async def test_delete_user(
        self, client: AsyncClient, auth_headers: dict
    ):
        resp = await client.post(
            "/api/users",
            json=self.CREATE_PAYLOAD,
            headers=auth_headers["Administrator"],
        )
        uid = resp.json()["id"]

        resp = await client.delete(
            f"/api/users/{uid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 204

        resp = await client.get(
            f"/api/users/{uid}",
            headers=auth_headers["Administrator"],
        )
        assert resp.status_code == 404
