"""Pydantic v2 schemas for Helicopter endpoints — PRD 6.1."""

import datetime

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.core.sanitize import strip_html


VALID_STATUSES = ["aktywny", "nieaktywny"]


class HelicopterCreate(BaseModel):
    """Schema for creating a helicopter."""

    registration_number: str
    helicopter_type: str
    description: str | None = None
    max_crew: int
    max_payload_weight: int
    status: str
    inspection_date: datetime.date | None = None
    range_km: int

    @field_validator("registration_number")
    @classmethod
    def registration_number_valid(cls, v: str) -> str:
        v = v.strip()
        v = strip_html(v)
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @field_validator("helicopter_type")
    @classmethod
    def helicopter_type_valid(cls, v: str) -> str:
        v = v.strip()
        v = strip_html(v)
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        v = strip_html(v)
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("max_crew")
    @classmethod
    def max_crew_valid(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("must be between 1 and 10")
        return v

    @field_validator("max_payload_weight")
    @classmethod
    def max_payload_weight_valid(cls, v: int) -> int:
        if v < 1 or v > 1000:
            raise ValueError("must be between 1 and 1000")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"must be one of: {', '.join(VALID_STATUSES)}")
        return v

    @field_validator("range_km")
    @classmethod
    def range_km_valid(cls, v: int) -> int:
        if v < 1 or v > 1000:
            raise ValueError("must be between 1 and 1000")
        return v

    @model_validator(mode="after")
    def inspection_date_required_when_active(self) -> "HelicopterCreate":
        if self.status == "aktywny" and self.inspection_date is None:
            raise ValueError(
                "inspection_date is required when status is 'aktywny'"
            )
        return self


class HelicopterUpdate(BaseModel):
    """Schema for updating a helicopter — all fields optional."""

    registration_number: str | None = None
    helicopter_type: str | None = None
    description: str | None = None
    max_crew: int | None = None
    max_payload_weight: int | None = None
    status: str | None = None
    inspection_date: datetime.date | None = None
    range_km: int | None = None

    @field_validator("registration_number")
    @classmethod
    def registration_number_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        v = strip_html(v)
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @field_validator("helicopter_type")
    @classmethod
    def helicopter_type_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        v = strip_html(v)
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        v = strip_html(v)
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("max_crew")
    @classmethod
    def max_crew_valid(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 10:
            raise ValueError("must be between 1 and 10")
        return v

    @field_validator("max_payload_weight")
    @classmethod
    def max_payload_weight_valid(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 1000:
            raise ValueError("must be between 1 and 1000")
        return v

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_STATUSES:
            raise ValueError(f"must be one of: {', '.join(VALID_STATUSES)}")
        return v

    @field_validator("range_km")
    @classmethod
    def range_km_valid(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 1 or v > 1000:
            raise ValueError("must be between 1 and 1000")
        return v

    @model_validator(mode="after")
    def inspection_date_required_when_active(self) -> "HelicopterUpdate":
        if self.status == "aktywny" and self.inspection_date is None:
            raise ValueError(
                "inspection_date is required when status is 'aktywny'"
            )
        return self


class HelicopterResponse(BaseModel):
    """Schema for helicopter data in API responses."""

    id: int
    registration_number: str
    helicopter_type: str
    description: str | None
    max_crew: int
    max_payload_weight: int
    status: str
    inspection_date: datetime.date | None
    range_km: int

    model_config = ConfigDict(from_attributes=True)
