"""CrewMember SQLAlchemy model — crew management per PRD 6.2."""

from sqlalchemy import Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CrewMember(Base):
    """Crew member entity for crew management."""

    __tablename__ = "crew_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    weight: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    pilot_license_number: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )
    pilot_license_expiry: Mapped[str | None] = mapped_column(Date, nullable=True)
    training_expiry: Mapped[str] = mapped_column(Date, nullable=False)

    def __repr__(self) -> str:
        return f"<CrewMember {self.email} ({self.role})>"
