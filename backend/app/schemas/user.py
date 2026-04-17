"""Pydantic v2 schemas for User endpoints and JWT tokens."""

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.sanitize import strip_html
from app.schemas.crew_member import EMAIL_RE

VALID_ROLES = [
    "Administrator",
    "Osoba planująca",
    "Osoba nadzorująca",
    "Pilot",
]


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    first_name: str
    last_name: str
    email: str
    password: str
    system_role: str

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        v = strip_html(v)
        if not v:
            raise ValueError("must not be empty")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        v = v.strip()
        if not v or not EMAIL_RE.match(v):
            raise ValueError("must be a valid email address")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("must be at least 6 characters")
        return v

    @field_validator("system_role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"must be one of: {', '.join(VALID_ROLES)}")
        return v


class UserUpdate(BaseModel):
    """Schema for updating an existing user — all fields optional."""

    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    password: str | None = None
    current_password: str | None = None
    system_role: str | None = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        v = strip_html(v)
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
        if not v or not EMAIL_RE.match(v):
            raise ValueError("must be a valid email address")
        if len(v) > 100:
            raise ValueError("must be 100 characters or fewer")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if len(v) < 6:
            raise ValueError("must be at least 6 characters")
        return v

    @field_validator("system_role")
    @classmethod
    def role_must_be_valid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in VALID_ROLES:
            raise ValueError(f"must be one of: {', '.join(VALID_ROLES)}")
        return v


class UserResponse(BaseModel):
    """Schema for user data in API responses — no password."""

    id: int
    first_name: str
    last_name: str
    email: str
    system_role: str

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    """Login request body."""

    email: str
    password: str
