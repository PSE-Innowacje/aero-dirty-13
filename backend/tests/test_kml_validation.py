"""KML validation tests — Poland bounding box (PRD 6.5.a)."""

import pytest
from httpx import AsyncClient

from tests.conftest import create_operation

pytestmark = pytest.mark.asyncio


def make_kml(coords: list[tuple[float, float]]) -> bytes:
    """Generate minimal KML bytes with given (lat, lon) coordinate pairs.

    KML format uses lon,lat,alt ordering — this helper handles the swap.
    """
    coord_str = " ".join(f"{lon},{lat},0" for lat, lon in coords)
    kml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<kml xmlns="http://www.opengis.net/kml/2.2">'
        "<Document><Placemark><LineString>"
        f"<coordinates>{coord_str}</coordinates>"
        "</LineString></Placemark></Document></kml>"
    )
    return kml.encode("utf-8")


class TestKmlPolandBoundary:
    """KML uploads must reject coordinates outside Poland."""

    async def test_kml_inside_poland_accepted(
        self, client: AsyncClient, auth_headers: dict
    ):
        """KML with all coords inside Poland -> accepted."""
        planner_h = auth_headers["Planner"]
        op_id = await create_operation(client, planner_h)
        kml = make_kml([(52.23, 21.01), (52.10, 20.95), (51.75, 21.15)])
        resp = await client.post(
            f"/api/operations/{op_id}/kml",
            files={"file": ("route.kml", kml, "application/vnd.google-earth.kml+xml")},
            headers=planner_h,
        )
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["route_km"] >= 0
        assert len(data["route_coordinates"]) == 3

    async def test_kml_outside_poland_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        """KML with coords outside Poland (Berlin) -> 400."""
        planner_h = auth_headers["Planner"]
        op_id = await create_operation(client, planner_h)
        # Berlin coordinates — outside Poland
        kml = make_kml([(52.52, 13.40), (52.53, 13.41)])
        resp = await client.post(
            f"/api/operations/{op_id}/kml",
            files={"file": ("route.kml", kml, "application/vnd.google-earth.kml+xml")},
            headers=planner_h,
        )
        assert resp.status_code == 400
        assert "Poland" in resp.json()["detail"]

    async def test_kml_mixed_coords_rejected(
        self, client: AsyncClient, auth_headers: dict
    ):
        """KML with some coords inside, some outside Poland -> 400."""
        planner_h = auth_headers["Planner"]
        op_id = await create_operation(client, planner_h)
        # First point in Poland (Warsaw), second in Germany (Berlin)
        kml = make_kml([(52.23, 21.01), (52.52, 13.40)])
        resp = await client.post(
            f"/api/operations/{op_id}/kml",
            files={"file": ("route.kml", kml, "application/vnd.google-earth.kml+xml")},
            headers=planner_h,
        )
        assert resp.status_code == 400
        assert "Poland" in resp.json()["detail"]
