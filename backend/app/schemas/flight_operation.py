"""Pydantic v2 schemas for FlightOperation endpoints — PRD 6.5."""

from __future__ import annotations

import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_ACTIVITY_TYPES = [
    "oględziny wizualne",
    "skan 3D",
    "lokalizacja awarii",
    "zdjęcia",
    "patrolowanie",
]

STATUS_LABELS: dict[int, str] = {
    1: "Wprowadzone",
    2: "Odrzucone",
    3: "Potwierdzone",
    4: "Zaplanowane",
    5: "Częściowo zrealizowane",
    6: "Zrealizowane",
    7: "Rezygnacja",
}


# ── Create / Update ────────────────────────────────────────────────

class OperationCreate(BaseModel):
    """Schema for creating a flight operation (no KML — uploaded separately)."""

    order_number: Optional[str] = Field(None, max_length=30)
    short_description: Optional[str] = Field(None, max_length=100)
    activity_types: Optional[list[str]] = None
    additional_info: Optional[str] = Field(None, max_length=500)
    contact_emails: Optional[list[str]] = None
    proposed_date_earliest: Optional[datetime.date] = None
    proposed_date_latest: Optional[datetime.date] = None

    @field_validator("activity_types")
    @classmethod
    def validate_activity_types(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        for item in v:
            if item not in VALID_ACTIVITY_TYPES:
                raise ValueError(
                    f"Invalid activity type '{item}'. "
                    f"Must be one of: {', '.join(VALID_ACTIVITY_TYPES)}"
                )
        return v

    @field_validator("order_number")
    @classmethod
    def order_number_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @field_validator("short_description")
    @classmethod
    def short_description_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("additional_info")
    @classmethod
    def additional_info_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 500:
            raise ValueError("must be 500 characters or fewer")
        return v

    @field_validator("contact_emails")
    @classmethod
    def validate_emails(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        for email in v:
            if "@" not in email:
                raise ValueError(f"Invalid email: {email}")
        return v


class OperationUpdate(BaseModel):
    """Schema for updating a flight operation — all fields optional."""

    order_number: Optional[str] = Field(None, max_length=30)
    short_description: Optional[str] = Field(None, max_length=100)
    activity_types: Optional[list[str]] = None
    additional_info: Optional[str] = Field(None, max_length=500)
    contact_emails: Optional[list[str]] = None
    proposed_date_earliest: Optional[datetime.date] = None
    proposed_date_latest: Optional[datetime.date] = None
    planned_date_earliest: Optional[datetime.date] = None
    planned_date_latest: Optional[datetime.date] = None
    post_realization_notes: Optional[str] = Field(None, max_length=500)

    @field_validator("activity_types")
    @classmethod
    def validate_activity_types(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        for item in v:
            if item not in VALID_ACTIVITY_TYPES:
                raise ValueError(
                    f"Invalid activity type '{item}'. "
                    f"Must be one of: {', '.join(VALID_ACTIVITY_TYPES)}"
                )
        return v

    @field_validator("order_number")
    @classmethod
    def order_number_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @field_validator("short_description")
    @classmethod
    def short_description_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("additional_info")
    @classmethod
    def additional_info_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 500:
            raise ValueError("must be 500 characters or fewer")
        return v

    @field_validator("post_realization_notes")
    @classmethod
    def post_realization_notes_strip(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 500:
            raise ValueError("must be 500 characters or fewer")
        return v

    @field_validator("contact_emails")
    @classmethod
    def validate_emails(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        for email in v:
            if "@" not in email:
                raise ValueError(f"Invalid email: {email}")
        return v


# ── Response sub-models ─────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    """Single audit log entry for API responses."""

    id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime.datetime
    changed_by_email: str

    model_config = ConfigDict(from_attributes=True)


class CommentEntry(BaseModel):
    """Single comment entry for API responses."""

    id: int
    content: str
    created_at: datetime.datetime
    author_email: str
    author_name: str

    model_config = ConfigDict(from_attributes=True)


class ConfirmRequest(BaseModel):
    """Schema for confirming an operation — Supervisor provides planned dates."""

    planned_date_earliest: datetime.date
    planned_date_latest: datetime.date


class CommentCreate(BaseModel):
    """Schema for creating a comment on an operation."""

    content: str = Field(..., min_length=1, max_length=500)

    @field_validator("content")
    @classmethod
    def content_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 500:
            raise ValueError("must be 500 characters or fewer")
        return v


# ── Full response ───────────────────────────────────────────────────


class LinkedOrderBrief(BaseModel):
    """Brief flight-order reference for the operation response."""

    id: int
    status: int

    model_config = ConfigDict(from_attributes=True)


class OperationResponse(BaseModel):
    """Full flight operation response including audit trail and comments."""

    id: int
    order_number: Optional[str] = None
    short_description: Optional[str] = None
    route_coordinates: Optional[list] = None
    route_km: Optional[int] = None
    proposed_date_earliest: Optional[datetime.date] = None
    proposed_date_latest: Optional[datetime.date] = None
    planned_date_earliest: Optional[datetime.date] = None
    planned_date_latest: Optional[datetime.date] = None
    activity_types: Optional[list[str]] = None
    additional_info: Optional[str] = None
    status: int
    contact_emails: Optional[list[str]] = None
    post_realization_notes: Optional[str] = None
    created_at: Optional[datetime.datetime] = None
    created_by_email: str
    audit_logs: list[AuditLogEntry] = []
    comments: list[CommentEntry] = []
    linked_orders: list[LinkedOrderBrief] = []

    model_config = ConfigDict(from_attributes=True)


class OperationListItem(BaseModel):
    """Lightweight operation item for list endpoint (no audit/comments)."""

    id: int
    order_number: Optional[str] = None
    short_description: Optional[str] = None
    activity_types: Optional[list[str]] = None
    proposed_date_earliest: Optional[datetime.date] = None
    proposed_date_latest: Optional[datetime.date] = None
    planned_date_earliest: Optional[datetime.date] = None
    planned_date_latest: Optional[datetime.date] = None
    status: int
    route_km: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
