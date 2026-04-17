"""Application configuration loaded from environment variables."""

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings sourced from .env / environment."""

    DATABASE_URL: str
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    BACKEND_CORS_ORIGINS: list[str] = [
        "https://localhost",
        "https://localhost:3000",
        "http://localhost",
        "http://localhost:3000",
    ]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DEBUG: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v


settings = Settings()  # type: ignore[call-arg]

# Warn if running with default SECRET_KEY
import logging as _logging

_cfg_logger = _logging.getLogger("aero.config")
if settings.SECRET_KEY == "dev-secret-key-change-in-production":
    _cfg_logger.warning(
        "⚠️  Running with default SECRET_KEY — set SECRET_KEY env var in production!"
    )
