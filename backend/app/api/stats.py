"""Stats endpoint for dashboard aggregations."""

import datetime
import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.helicopter import Helicopter
from app.models.crew_member import CrewMember
from app.models.flight_operation import FlightOperation
from app.models.flight_order import FlightOrder
from app.models.user import User

router = APIRouter(prefix="/api/stats", tags=["stats"])
logger = logging.getLogger("aero.stats")

AnyAuthenticated = Annotated[User, Depends(get_current_user)]


@router.get("")
async def get_stats(
    _user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Return aggregated dashboard statistics."""
    today = datetime.date.today()
    threshold = today + datetime.timedelta(days=30)

    # ── Helicopters ────────────────────────────────────────────────
    heli_result = await db.execute(select(Helicopter))
    helicopters = heli_result.scalars().all()
    active = sum(1 for h in helicopters if h.status == "aktywny")
    inactive = len(helicopters) - active
    inspections_expiring = sum(
        1
        for h in helicopters
        if h.status == "aktywny"
        and h.inspection_date is not None
        and h.inspection_date <= threshold
    )

    # ── Crew ───────────────────────────────────────────────────────
    crew_result = await db.execute(select(CrewMember))
    crew = crew_result.scalars().all()
    by_role: dict[str, int] = {}
    licenses_expiring = 0
    training_expiring = 0
    for c in crew:
        by_role[c.role] = by_role.get(c.role, 0) + 1
        if (
            c.role == "Pilot"
            and c.pilot_license_expiry is not None
            and c.pilot_license_expiry <= threshold
        ):
            licenses_expiring += 1
        if c.training_expiry is not None and c.training_expiry <= threshold:
            training_expiring += 1

    # ── Operations by status ───────────────────────────────────────
    ops_result = await db.execute(
        select(FlightOperation.status, func.count()).group_by(FlightOperation.status)
    )
    ops_by_status = {row[0]: row[1] for row in ops_result.all()}
    ops_total = sum(ops_by_status.values())

    # ── Orders by status ───────────────────────────────────────────
    orders_result = await db.execute(
        select(FlightOrder.status, func.count()).group_by(FlightOrder.status)
    )
    orders_by_status = {row[0]: row[1] for row in orders_result.all()}
    orders_total = sum(orders_by_status.values())

    # ── Safety alerts ──────────────────────────────────────────────
    safety_alerts: list[dict] = []
    for h in helicopters:
        if h.status == "aktywny" and h.inspection_date is not None:
            if h.inspection_date < today:
                safety_alerts.append(
                    {
                        "type": "helicopter_inspection",
                        "entity": h.registration_number,
                        "expiry_date": str(h.inspection_date),
                        "severity": "expired",
                    }
                )
            elif h.inspection_date <= threshold:
                safety_alerts.append(
                    {
                        "type": "helicopter_inspection",
                        "entity": h.registration_number,
                        "expiry_date": str(h.inspection_date),
                        "severity": "expiring",
                    }
                )
    for c in crew:
        if c.role == "Pilot" and c.pilot_license_expiry is not None:
            if c.pilot_license_expiry < today:
                safety_alerts.append(
                    {
                        "type": "pilot_license",
                        "entity": f"{c.first_name} {c.last_name}",
                        "expiry_date": str(c.pilot_license_expiry),
                        "severity": "expired",
                    }
                )
            elif c.pilot_license_expiry <= threshold:
                safety_alerts.append(
                    {
                        "type": "pilot_license",
                        "entity": f"{c.first_name} {c.last_name}",
                        "expiry_date": str(c.pilot_license_expiry),
                        "severity": "expiring",
                    }
                )
        if c.training_expiry is not None:
            if c.training_expiry < today:
                safety_alerts.append(
                    {
                        "type": "training",
                        "entity": f"{c.first_name} {c.last_name}",
                        "expiry_date": str(c.training_expiry),
                        "severity": "expired",
                    }
                )
            elif c.training_expiry <= threshold:
                safety_alerts.append(
                    {
                        "type": "training",
                        "entity": f"{c.first_name} {c.last_name}",
                        "expiry_date": str(c.training_expiry),
                        "severity": "expiring",
                    }
                )

    # Sort alerts: expired first, then expiring; within each group by date
    safety_alerts.sort(
        key=lambda a: (0 if a["severity"] == "expired" else 1, a["expiry_date"])
    )

    # ── Recent operations (last 5) ────────────────────────────────
    recent_ops_result = await db.execute(
        select(FlightOperation).order_by(FlightOperation.id.desc()).limit(5)
    )
    recent_ops = recent_ops_result.scalars().all()
    recent_operations = [
        {
            "id": op.id,
            "order_number": op.order_number,
            "status": op.status,
            "planned_date_earliest": (
                str(op.planned_date_earliest) if op.planned_date_earliest else None
            ),
            "short_description": op.short_description,
        }
        for op in recent_ops
    ]

    return {
        "helicopters": {
            "total": len(helicopters),
            "active": active,
            "inactive": inactive,
            "inspections_expiring_30d": inspections_expiring,
        },
        "crew": {
            "total": len(crew),
            "by_role": by_role,
            "licenses_expiring_30d": licenses_expiring,
            "training_expiring_30d": training_expiring,
        },
        "operations": {
            "total": ops_total,
            "by_status": ops_by_status,
        },
        "orders": {
            "total": orders_total,
            "by_status": orders_by_status,
        },
        "safety_alerts": safety_alerts[:10],
        "recent_operations": recent_operations,
    }
