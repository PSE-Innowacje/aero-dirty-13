"""Flight Orders CRUD, safety validations, status transitions, cascades — PRD 6.6."""

from __future__ import annotations

import datetime
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.crew_member import CrewMember
from app.models.flight_operation import FlightOperation
from app.models.flight_order import FlightOrder
from app.models.helicopter import Helicopter
from app.models.landing_site import LandingSite
from app.models.user import User
from app.schemas.flight_order import (
    CrewMemberBrief,
    FlightOrderCreate,
    FlightOrderListItem,
    FlightOrderResponse,
    FlightOrderUpdate,
    OperationBrief,
)

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/orders", tags=["orders"])

# ── Role dependency aliases ─────────────────────────────────────────

PilotOnly = Annotated[User, Depends(require_role("Pilot"))]
PilotOrSupervisor = Annotated[
    User, Depends(require_role("Pilot", "Osoba nadzorująca"))
]
SupervisorOnly = Annotated[User, Depends(require_role("Osoba nadzorująca"))]
AnyAuthenticated = Annotated[User, Depends(get_current_user)]


# ── Helpers ─────────────────────────────────────────────────────────


async def _get_pilot_crew_member(user: User, db: AsyncSession) -> CrewMember:
    """Look up the CrewMember record that matches the logged-in pilot's email."""
    result = await db.execute(
        select(CrewMember).where(
            CrewMember.email == user.email, CrewMember.role == "Pilot"
        )
    )
    crew = result.scalars().first()
    if crew is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No crew member profile found for logged-in pilot",
        )
    return crew


def _validate_safety(
    helicopter: Helicopter,
    pilot_crew: CrewMember,
    crew_members: list[CrewMember],
    flight_date: datetime.date,
    estimated_route_km: int | None,
) -> list[str]:
    """Run 5 safety validations and return all error messages (empty = pass)."""
    errors: list[str] = []

    # Check 1: Helicopter inspection
    if helicopter.inspection_date is not None and helicopter.inspection_date < flight_date:
        errors.append("Helicopter inspection expired")

    # Check 2: Pilot license expiry
    if pilot_crew.pilot_license_expiry is not None and pilot_crew.pilot_license_expiry < flight_date:
        errors.append("Pilot license expired")

    # Check 3: Crew training expiry
    for cm in crew_members:
        if cm.training_expiry is not None and cm.training_expiry < flight_date:
            errors.append(
                f"Crew member {cm.first_name} {cm.last_name} training expired"
            )

    # Check 4: Crew weight vs max payload
    total_weight = pilot_crew.weight + sum(cm.weight for cm in crew_members)
    if total_weight > helicopter.max_payload_weight:
        errors.append("Crew weight exceeds max payload")

    # Check 5: Route distance vs helicopter range
    if estimated_route_km is not None and estimated_route_km > helicopter.range_km:
        errors.append("Route distance exceeds helicopter range")

    return errors


def _serialize_order(order: FlightOrder) -> dict:
    """Convert FlightOrder ORM object to FlightOrderResponse-compatible dict."""
    return {
        "id": order.id,
        "planned_start_datetime": order.planned_start_datetime,
        "planned_end_datetime": order.planned_end_datetime,
        "pilot_id": order.pilot_id,
        "pilot_name": f"{order.pilot.first_name} {order.pilot.last_name}",
        "status": order.status,
        "helicopter_id": order.helicopter_id,
        "helicopter_registration": order.helicopter.registration_number,
        "crew_weight": order.crew_weight,
        "start_landing_site_id": order.start_landing_site_id,
        "start_landing_site_name": order.start_landing_site.name,
        "end_landing_site_id": order.end_landing_site_id,
        "end_landing_site_name": order.end_landing_site.name,
        "estimated_route_km": order.estimated_route_km,
        "actual_start_datetime": order.actual_start_datetime,
        "actual_end_datetime": order.actual_end_datetime,
        "created_by_id": order.created_by_id,
        "created_by_email": order.created_by.email,
        "created_at": order.created_at,
        "crew_members": [
            CrewMemberBrief(
                id=cm.id,
                name=f"{cm.first_name} {cm.last_name}",
                weight=cm.weight,
            )
            for cm in (order.crew_members or [])
        ],
        "operations": [
            OperationBrief(
                id=op.id,
                short_description=op.short_description,
                status=op.status,
            )
            for op in (order.operations or [])
        ],
    }


async def _get_order_or_404(order_id: int, db: AsyncSession) -> FlightOrder:
    """Fetch a FlightOrder by id or raise 404."""
    result = await db.execute(
        select(FlightOrder).where(FlightOrder.id == order_id)
    )
    order = result.scalars().first()
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found",
        )
    return order


async def _validate_fk_entities(
    body: FlightOrderCreate | FlightOrderUpdate,
    db: AsyncSession,
    *,
    is_update: bool = False,
) -> tuple[
    Helicopter | None,
    list[CrewMember],
    list[FlightOperation],
    LandingSite | None,
    LandingSite | None,
]:
    """Validate that all FK-referenced entities exist. Returns resolved objects."""
    helicopter = None
    crew_members: list[CrewMember] = []
    operations: list[FlightOperation] = []
    start_site = None
    end_site = None

    helicopter_id = body.helicopter_id
    if helicopter_id is not None:
        result = await db.execute(
            select(Helicopter).where(Helicopter.id == helicopter_id)
        )
        helicopter = result.scalars().first()
        if helicopter is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Helicopter {helicopter_id} not found",
            )

    crew_member_ids = getattr(body, "crew_member_ids", None)
    if crew_member_ids is not None:
        for cid in crew_member_ids:
            result = await db.execute(
                select(CrewMember).where(CrewMember.id == cid)
            )
            cm = result.scalars().first()
            if cm is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Crew member {cid} not found",
                )
            crew_members.append(cm)

    operation_ids = getattr(body, "operation_ids", None)
    if operation_ids is not None:
        for oid in operation_ids:
            result = await db.execute(
                select(FlightOperation).where(FlightOperation.id == oid)
            )
            op = result.scalars().first()
            if op is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Operation {oid} not found",
                )
            if not is_update and op.status != 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Operation {oid} is not in status 3 (confirmed), current status: {op.status}",
                )
            operations.append(op)

    start_id = getattr(body, "start_landing_site_id", None)
    if start_id is not None:
        result = await db.execute(
            select(LandingSite).where(LandingSite.id == start_id)
        )
        start_site = result.scalars().first()
        if start_site is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Start landing site {start_id} not found",
            )

    end_id = getattr(body, "end_landing_site_id", None)
    if end_id is not None:
        result = await db.execute(
            select(LandingSite).where(LandingSite.id == end_id)
        )
        end_site = result.scalars().first()
        if end_site is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"End landing site {end_id} not found",
            )

    return helicopter, crew_members, operations, start_site, end_site


def _check_status_transition(
    order: FlightOrder, expected_status: int, action_name: str
) -> None:
    """Raise 400 if the order is not in the expected status."""
    if order.status != expected_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot {action_name}: order is in status {order.status}, must be {expected_status}",
        )


# ── Endpoints ───────────────────────────────────────────────────────


@router.get("", response_model=list[FlightOrderListItem])
async def list_orders(
    _user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
    order_status: int | None = None,
) -> list[dict]:
    """List orders filtered by status. Default: status=2 (submitted) per PRD 6.6.g."""
    effective_status = order_status if order_status is not None else 2
    query = (
        select(FlightOrder)
        .where(FlightOrder.status == effective_status)
        .order_by(FlightOrder.planned_start_datetime.asc())
    )
    result = await db.execute(query)
    orders = result.scalars().all()
    return [
        {
            "id": o.id,
            "planned_start_datetime": o.planned_start_datetime,
            "helicopter_registration": o.helicopter.registration_number,
            "pilot_name": f"{o.pilot.first_name} {o.pilot.last_name}",
            "status": o.status,
        }
        for o in orders
    ]


@router.post("", response_model=FlightOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: FlightOrderCreate,
    current_user: PilotOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Create a new flight order. Pilot only (PRD 7.2).

    Auto-fills pilot from user email → CrewMember match.
    Validates all FK entities, runs 5 safety checks, cascades operations 3→4.
    """
    # Auto-fill pilot
    pilot_crew = await _get_pilot_crew_member(current_user, db)

    # Validate FK entities
    helicopter, crew_members, operations, _start, _end = await _validate_fk_entities(
        body, db
    )
    assert helicopter is not None  # guaranteed by required field

    # Safety validations
    flight_date = body.planned_start_datetime.date()
    errors = _validate_safety(
        helicopter, pilot_crew, crew_members, flight_date, body.estimated_route_km
    )
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=errors,
        )

    # Calculate crew weight
    crew_weight = pilot_crew.weight + sum(cm.weight for cm in crew_members)

    # Create the order
    order = FlightOrder(
        planned_start_datetime=body.planned_start_datetime,
        planned_end_datetime=body.planned_end_datetime,
        pilot_id=pilot_crew.id,
        status=1,
        helicopter_id=body.helicopter_id,
        crew_weight=crew_weight,
        start_landing_site_id=body.start_landing_site_id,
        end_landing_site_id=body.end_landing_site_id,
        estimated_route_km=body.estimated_route_km,
        created_by_id=current_user.id,
    )
    db.add(order)
    await db.flush()

    # Eagerly load M:N collections before assignment (avoids MissingGreenlet)
    await db.refresh(order, ["operations", "crew_members"])

    # Set M:N relationships
    order.operations = list(operations)
    order.crew_members = list(crew_members)

    # Cascade operations 3→4 (confirmed → planned)
    for op in operations:
        op.status = 4
        logger.info("Operation #%d status cascaded 3→4 (order #%d created)", op.id, order.id)

    await db.flush()
    await db.refresh(order)

    logger.info(
        "Order #%d created by %s (pilot=%s, helicopter=%s, %d ops, %d crew)",
        order.id,
        current_user.email,
        pilot_crew.email,
        helicopter.registration_number,
        len(operations),
        len(crew_members),
    )
    return _serialize_order(order)


@router.get("/{order_id}", response_model=FlightOrderResponse)
async def get_order(
    order_id: int,
    _user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get order detail with all relationships. All authenticated roles."""
    order = await _get_order_or_404(order_id, db)
    return _serialize_order(order)


@router.put("/{order_id}", response_model=FlightOrderResponse)
async def update_order(
    order_id: int,
    body: FlightOrderUpdate,
    current_user: PilotOrSupervisor,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Update a flight order with re-validation of safety constraints.

    Pilot + Supervisor can edit (PRD 7.2).
    """
    order = await _get_order_or_404(order_id, db)

    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        return _serialize_order(order)

    # Validate FK entities if any references changed
    helicopter, crew_members, operations, _start, _end = await _validate_fk_entities(
        body, db, is_update=True
    )

    # Apply simple field updates
    simple_fields = [
        "planned_start_datetime",
        "planned_end_datetime",
        "helicopter_id",
        "start_landing_site_id",
        "end_landing_site_id",
        "estimated_route_km",
        "actual_start_datetime",
        "actual_end_datetime",
    ]
    for field in simple_fields:
        if field in update_data:
            setattr(order, field, update_data[field])

    # Update M:N relationships if provided (eagerly load first to avoid MissingGreenlet)
    if "crew_member_ids" in update_data or "operation_ids" in update_data:
        await db.refresh(order, ["operations", "crew_members"])
    if "crew_member_ids" in update_data:
        order.crew_members = list(crew_members)
    if "operation_ids" in update_data:
        order.operations = list(operations)

    # Re-run safety validations with current or updated values
    effective_helicopter = helicopter if helicopter is not None else order.helicopter
    effective_crew = crew_members if "crew_member_ids" in update_data else list(order.crew_members)

    # We need the pilot crew member for safety check
    pilot_crew_result = await db.execute(
        select(CrewMember).where(CrewMember.id == order.pilot_id)
    )
    pilot_crew = pilot_crew_result.scalars().first()
    assert pilot_crew is not None

    flight_date = order.planned_start_datetime
    # Handle both datetime and date types
    if hasattr(flight_date, "date"):
        flight_date = flight_date.date()

    errors = _validate_safety(
        effective_helicopter,
        pilot_crew,
        effective_crew,
        flight_date,
        order.estimated_route_km,
    )
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=errors,
        )

    # Recalculate crew weight if crew changed
    if "crew_member_ids" in update_data:
        order.crew_weight = pilot_crew.weight + sum(cm.weight for cm in effective_crew)

    await db.flush()
    await db.refresh(order)

    logger.info(
        "Order #%d updated by %s — fields: %s",
        order.id,
        current_user.email,
        list(update_data.keys()),
    )
    return _serialize_order(order)


# ── Status transition endpoints ─────────────────────────────────────


@router.post("/{order_id}/submit", response_model=FlightOrderResponse)
async def submit_order(
    order_id: int,
    current_user: PilotOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Submit order for approval (status 1→2). Pilot only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 1, "submit")

    order.status = 2
    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d submitted by %s (1→2)", order.id, current_user.email)
    return _serialize_order(order)


@router.post("/{order_id}/reject", response_model=FlightOrderResponse)
async def reject_order(
    order_id: int,
    current_user: SupervisorOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Reject an order (status 2→3). Supervisor only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 2, "reject")

    order.status = 3
    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d rejected by %s (2→3)", order.id, current_user.email)
    return _serialize_order(order)


@router.post("/{order_id}/accept", response_model=FlightOrderResponse)
async def accept_order(
    order_id: int,
    current_user: SupervisorOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Accept an order (status 2→4). Supervisor only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 2, "accept")

    order.status = 4
    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d accepted by %s (2→4)", order.id, current_user.email)
    return _serialize_order(order)


# ── Settlement endpoints with operation cascades ────────────────────


def _check_settlement_prereqs(order: FlightOrder) -> None:
    """Verify order has actual datetimes before settlement."""
    if order.actual_start_datetime is None or order.actual_end_datetime is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement requires actual_start_datetime and actual_end_datetime to be set",
        )


async def _cascade_operations_status(
    order: FlightOrder, new_op_status: int, db: AsyncSession
) -> None:
    """Set status on all operations linked to this order."""
    for op in order.operations:
        old_status = op.status
        op.status = new_op_status
        logger.info(
            "Operation #%d status cascaded %d→%d (order #%d settlement)",
            op.id,
            old_status,
            new_op_status,
            order.id,
        )


@router.post("/{order_id}/complete-partial", response_model=FlightOrderResponse)
async def complete_partial(
    order_id: int,
    current_user: PilotOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Partial completion (status 4→5). Cascades operations to status 5. Pilot only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 4, "complete-partial")
    _check_settlement_prereqs(order)

    order.status = 5
    await _cascade_operations_status(order, 5, db)

    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d partially completed by %s (4→5)", order.id, current_user.email)
    return _serialize_order(order)


@router.post("/{order_id}/complete-full", response_model=FlightOrderResponse)
async def complete_full(
    order_id: int,
    current_user: PilotOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Full completion (status 4→6). Cascades operations to status 6. Pilot only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 4, "complete-full")
    _check_settlement_prereqs(order)

    order.status = 6
    await _cascade_operations_status(order, 6, db)

    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d fully completed by %s (4→6)", order.id, current_user.email)
    return _serialize_order(order)


@router.post("/{order_id}/not-completed", response_model=FlightOrderResponse)
async def not_completed(
    order_id: int,
    current_user: PilotOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Not completed (status 4→7). Cascades operations back to status 3. Pilot only."""
    order = await _get_order_or_404(order_id, db)
    _check_status_transition(order, 4, "not-completed")
    _check_settlement_prereqs(order)

    order.status = 7
    await _cascade_operations_status(order, 3, db)

    await db.flush()
    await db.refresh(order)

    logger.info("Order #%d not completed by %s (4→7, ops→3)", order.id, current_user.email)
    return _serialize_order(order)
