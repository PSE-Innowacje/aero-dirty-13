"""Pydantic v2 schemas for LandingSite endpoints — PRD 6.3."""

from pydantic import BaseModel, ConfigDict, field_validator


class LandingSiteCreate(BaseModel):
    """Schema for creating a landing site."""

    name: str
    latitude: float
    longitude: float

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 255:
            raise ValueError("must be 255 characters or fewer")
        return v

    @field_validator("latitude")
    @classmethod
    def latitude_valid(cls, v: float) -> float:
        if v < 49.0 or v > 54.9:
            raise ValueError("must be between 49.0 and 54.9 (Poland territory)")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_valid(cls, v: float) -> float:
        if v < 14.1 or v > 24.2:
            raise ValueError("must be between 14.1 and 24.2 (Poland territory)")
        return v


class LandingSiteUpdate(BaseModel):
    """Schema for updating a landing site — all fields optional."""

    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 255:
            raise ValueError("must be 255 characters or fewer")
        return v

    @field_validator("latitude")
    @classmethod
    def latitude_valid(cls, v: float | None) -> float | None:
        if v is None:
            return v
        if v < 49.0 or v > 54.9:
            raise ValueError("must be between 49.0 and 54.9 (Poland territory)")
        return v

    @field_validator("longitude")
    @classmethod
    def longitude_valid(cls, v: float | None) -> float | None:
        if v is None:
            return v
        if v < 14.1 or v > 24.2:
            raise ValueError("must be between 14.1 and 24.2 (Poland territory)")
        return v


class LandingSiteResponse(BaseModel):
    """Schema for landing site data in API responses."""

    id: int
    name: str
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)
