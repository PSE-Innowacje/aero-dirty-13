"""OperationAuditLog SQLAlchemy model — audit trail for flight operations."""

from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OperationAuditLog(Base):
    """Tracks field-level changes on FlightOperation records."""

    __tablename__ = "operation_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flight_operations.id"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str | None] = mapped_column(String(500), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
    changed_by_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    # Relationships
    operation: Mapped["FlightOperation"] = relationship(  # noqa: F821
        "FlightOperation", back_populates="audit_logs"
    )
    changed_by: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<AuditLog op={self.operation_id} field={self.field_name}>"
