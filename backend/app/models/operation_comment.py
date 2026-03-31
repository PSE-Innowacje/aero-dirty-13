"""OperationComment SQLAlchemy model — append-only comments on flight operations."""

from __future__ import annotations

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OperationComment(Base):
    """Append-only comment attached to a FlightOperation."""

    __tablename__ = "operation_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    operation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flight_operations.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )

    # Relationships
    operation: Mapped["FlightOperation"] = relationship(  # noqa: F821
        "FlightOperation", back_populates="comments"
    )
    author: Mapped["User"] = relationship("User", lazy="selectin")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Comment op={self.operation_id} by={self.author_id}>"
