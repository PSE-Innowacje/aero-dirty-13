"""Helicopter SQLAlchemy model — fleet management per PRD 6.1."""

from sqlalchemy import Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Helicopter(Base):
    """Helicopter entity for fleet management."""

    __tablename__ = "helicopters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    registration_number: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    helicopter_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(100), nullable=True)
    max_crew: Mapped[int] = mapped_column(Integer, nullable=False)
    max_payload_weight: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    inspection_date: Mapped[str | None] = mapped_column(Date, nullable=True)
    range_km: Mapped[int] = mapped_column(Integer, nullable=False)

    def __repr__(self) -> str:
        return f"<Helicopter {self.registration_number} ({self.status})>"
