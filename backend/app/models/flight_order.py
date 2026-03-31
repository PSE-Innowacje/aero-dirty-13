"""FlightOrder SQLAlchemy model — flight orders per PRD 6.6."""

from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base
from app.models.order_operation import order_crew, order_operations


class FlightOrder(Base):
    """Flight order entity — full 7-status lifecycle."""

    __tablename__ = "flight_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    planned_start_datetime: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    planned_end_datetime: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    pilot_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("crew_members.id"), nullable=False
    )
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    helicopter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("helicopters.id"), nullable=False
    )
    crew_weight: Mapped[int | None] = mapped_column(Integer, nullable=True)
    start_landing_site_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("landing_sites.id"), nullable=False
    )
    end_landing_site_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("landing_sites.id"), nullable=False
    )
    estimated_route_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_start_datetime: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_end_datetime: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )

    # ── Relationships (all lazy='selectin' for async safety) ────────
    pilot: Mapped["CrewMember"] = relationship(  # noqa: F821
        "CrewMember",
        foreign_keys=[pilot_id],
        lazy="selectin",
    )
    helicopter: Mapped["Helicopter"] = relationship(  # noqa: F821
        "Helicopter",
        lazy="selectin",
    )
    start_landing_site: Mapped["LandingSite"] = relationship(  # noqa: F821
        "LandingSite",
        foreign_keys=[start_landing_site_id],
        lazy="selectin",
    )
    end_landing_site: Mapped["LandingSite"] = relationship(  # noqa: F821
        "LandingSite",
        foreign_keys=[end_landing_site_id],
        lazy="selectin",
    )
    created_by: Mapped["User"] = relationship(  # noqa: F821
        "User",
        lazy="selectin",
    )

    # ── M:N relationships ───────────────────────────────────────────
    operations: Mapped[list["FlightOperation"]] = relationship(  # noqa: F821
        "FlightOperation",
        secondary=order_operations,
        back_populates="flight_orders",
        lazy="selectin",
    )
    crew_members: Mapped[list["CrewMember"]] = relationship(  # noqa: F821
        "CrewMember",
        secondary=order_crew,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<FlightOrder #{self.id} status={self.status}>"
