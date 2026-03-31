"""Pydantic v2 schemas for FlightOrder endpoints — PRD 6.6."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

STATUS_LABELS: dict[int, str] = {
    1: "Wprowadzone",
    2: "Przekazane do akceptacji",
    3: "Odrzucone",
    4: "Zaakceptowane",
    5: "Zrealizowane w części",
    6: "Zrealizowane w całości",
    7: "Nie zrealizowane",
}


# ── Nested sub-models for response ──────────────────────────────────

class CrewMemberBrief(BaseModel):
    """Lightweight crew member info embedded in order response."""

    id: int
    name: str
    weight: int

    model_config = ConfigDict(from_attributes=True)


class OperationBrief(BaseModel):
    """Lightweight operation info embedded in order response."""

    id: int
    short_description: Optional[str] = None
    status: int

    model_config = ConfigDict(from_attributes=True)


# ── Create / Update ─────────────────────────────────────────────────

class FlightOrderCreate(BaseModel):
    """Schema for creating a flight order."""

    planned_start_datetime: datetime.datetime
    planned_end_datetime: datetime.datetime
    helicopter_id: int
    crew_member_ids: list[int]
    start_landing_site_id: int
    end_landing_site_id: int
    operation_ids: list[int]
    estimated_route_km: int


class FlightOrderUpdate(BaseModel):
    """Schema for updating a flight order — all fields optional."""

    planned_start_datetime: Optional[datetime.datetime] = None
    planned_end_datetime: Optional[datetime.datetime] = None
    helicopter_id: Optional[int] = None
    crew_member_ids: Optional[list[int]] = None
    start_landing_site_id: Optional[int] = None
    end_landing_site_id: Optional[int] = None
    operation_ids: Optional[list[int]] = None
    estimated_route_km: Optional[int] = None
    actual_start_datetime: Optional[datetime.datetime] = None
    actual_end_datetime: Optional[datetime.datetime] = None


# ── Response ─────────────────────────────────────────────────────────

class FlightOrderResponse(BaseModel):
    """Full flight order response with resolved names and nested lists."""

    id: int
    planned_start_datetime: datetime.datetime
    planned_end_datetime: datetime.datetime
    pilot_id: int
    pilot_name: str
    status: int
    helicopter_id: int
    helicopter_registration: str
    crew_weight: Optional[int] = None
    start_landing_site_id: int
    start_landing_site_name: str
    end_landing_site_id: int
    end_landing_site_name: str
    estimated_route_km: Optional[int] = None
    actual_start_datetime: Optional[datetime.datetime] = None
    actual_end_datetime: Optional[datetime.datetime] = None
    created_by_id: int
    created_by_email: str
    created_at: Optional[datetime.datetime] = None
    crew_members: list[CrewMemberBrief] = []
    operations: list[OperationBrief] = []

    model_config = ConfigDict(from_attributes=True)


class FlightOrderListItem(BaseModel):
    """Lightweight flight order item for list endpoint."""

    id: int
    planned_start_datetime: datetime.datetime
    helicopter_registration: str
    pilot_name: str
    status: int

    model_config = ConfigDict(from_attributes=True)
