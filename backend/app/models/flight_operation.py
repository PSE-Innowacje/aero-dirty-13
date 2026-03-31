"""FlightOperation SQLAlchemy model — flight operations per PRD 6.5."""

from __future__ import annotations

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class FlightOperation(Base):
    """Flight operation entity — full 7-status lifecycle."""

    __tablename__ = "flight_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    short_description: Mapped[str | None] = mapped_column(String(100), nullable=True)
    kml_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    route_coordinates: Mapped[list | None] = mapped_column(JSON, nullable=True)
    route_km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    proposed_date_earliest: Mapped[str | None] = mapped_column(Date, nullable=True)
    proposed_date_latest: Mapped[str | None] = mapped_column(Date, nullable=True)
    planned_date_earliest: Mapped[str | None] = mapped_column(Date, nullable=True)
    planned_date_latest: Mapped[str | None] = mapped_column(Date, nullable=True)
    activity_types: Mapped[list | None] = mapped_column(JSON, nullable=True)
    additional_info: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    contact_emails: Mapped[list | None] = mapped_column(JSON, nullable=True)
    post_realization_notes: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    created_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )

    # Relationships
    created_by: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821
    audit_logs: Mapped[list["OperationAuditLog"]] = relationship(  # noqa: F821
        "OperationAuditLog",
        back_populates="operation",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="OperationAuditLog.changed_at.desc()",
    )
    comments: Mapped[list["OperationComment"]] = relationship(  # noqa: F821
        "OperationComment",
        back_populates="operation",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="OperationComment.created_at.desc()",
    )
    flight_orders: Mapped[list["FlightOrder"]] = relationship(  # noqa: F821
        "FlightOrder",
        secondary="order_operations",
        back_populates="operations",
        lazy="selectin",
        viewonly=True,
    )

    def __repr__(self) -> str:
        return f"<FlightOperation #{self.id} status={self.status}>"
