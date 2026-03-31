"""Pydantic v2 schemas for CrewMember endpoints — PRD 6.2."""

import datetime
import re

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


VALID_ROLES = ["Pilot", "Obserwator", "Mechanik", "Operator"]

# PRD email validation: letters, digits, ., _, %, +, - before @;
# at least two groups of letters separated by . after @.
EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")


class CrewMemberCreate(BaseModel):
    """Schema for creating a crew member."""

    first_name: str
    last_name: str
    email: str
    weight: int
    role: str
    pilot_license_number: str | None = None
    pilot_license_expiry: datetime.date | None = None
    training_expiry: datetime.date

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        if not EMAIL_RE.match(v):
            raise ValueError("must be a valid email address")
        return v

    @field_validator("weight")
    @classmethod
    def weight_valid(cls, v: int) -> int:
        if v < 30 or v > 200:
            raise ValueError("must be between 30 and 200")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"must be one of: {', '.join(VALID_ROLES)}")
        return v

    @field_validator("pilot_license_number")
    @classmethod
    def pilot_license_number_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @model_validator(mode="after")
    def pilot_fields_required_for_pilot(self) -> "CrewMemberCreate":
        if self.role == "Pilot":
            if not self.pilot_license_number:
                raise ValueError(
                    "pilot_license_number is required when role is 'Pilot'"
                )
            if self.pilot_license_expiry is None:
                raise ValueError(
                    "pilot_license_expiry is required when role is 'Pilot'"
                )
        return self


class CrewMemberUpdate(BaseModel):
    """Schema for updating a crew member — all fields optional."""

    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    weight: int | None = None
    role: str | None = None
    pilot_license_number: str | None = None
    pilot_license_expiry: datetime.date | None = None
    training_expiry: datetime.date | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        if not EMAIL_RE.match(v):
            raise ValueError("must be a valid email address")
        return v

    @field_validator("weight")
    @classmethod
    def weight_valid(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 30 or v > 200:
            raise ValueError("must be between 30 and 200")
        return v

    @field_validator("role")
    @classmethod
    def role_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_ROLES:
            raise ValueError(f"must be one of: {', '.join(VALID_ROLES)}")
        return v

    @field_validator("pilot_license_number")
    @classmethod
    def pilot_license_number_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) > 30:
            raise ValueError("must be 30 characters or fewer")
        return v

    @model_validator(mode="after")
    def pilot_fields_required_for_pilot(self) -> "CrewMemberUpdate":
        if self.role == "Pilot":
            if not self.pilot_license_number:
                raise ValueError(
                    "pilot_license_number is required when role is 'Pilot'"
                )
            if self.pilot_license_expiry is None:
                raise ValueError(
                    "pilot_license_expiry is required when role is 'Pilot'"
                )
        return self


class CrewMemberResponse(BaseModel):
    """Schema for crew member data in API responses."""

    id: int
    first_name: str
    last_name: str
    email: str
    weight: int
    role: str
    pilot_license_number: str | None
    pilot_license_expiry: datetime.date | None
    training_expiry: datetime.date

    model_config = ConfigDict(from_attributes=True)
