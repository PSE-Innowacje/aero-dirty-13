"""LandingSite SQLAlchemy model — landing site management per PRD 6.3."""

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LandingSite(Base):
    """Landing site entity for site management."""

    __tablename__ = "landing_sites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    def __repr__(self) -> str:
        return f"<LandingSite {self.name} ({self.latitude}, {self.longitude})>"
