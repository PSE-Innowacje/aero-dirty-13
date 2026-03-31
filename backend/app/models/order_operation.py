"""M:N association tables for FlightOrder ↔ FlightOperation and FlightOrder ↔ CrewMember."""

from sqlalchemy import Column, ForeignKey, Integer, Table

from app.core.database import Base

order_operations = Table(
    "order_operations",
    Base.metadata,
    Column("order_id", Integer, ForeignKey("flight_orders.id"), primary_key=True),
    Column("operation_id", Integer, ForeignKey("flight_operations.id"), primary_key=True),
)

order_crew = Table(
    "order_crew",
    Base.metadata,
    Column("order_id", Integer, ForeignKey("flight_orders.id"), primary_key=True),
    Column("crew_member_id", Integer, ForeignKey("crew_members.id"), primary_key=True),
)
