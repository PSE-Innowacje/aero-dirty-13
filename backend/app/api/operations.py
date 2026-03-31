"""Flight Operations CRUD, KML upload, status transitions, audit trail, comments — PRD 6.5."""

from __future__ import annotations

import datetime
import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.models.flight_operation import FlightOperation
from app.models.operation_audit_log import OperationAuditLog
from app.models.operation_comment import OperationComment
from app.models.user import User
from app.schemas.flight_operation import (
    AuditLogEntry,
    CommentCreate,
    CommentEntry,
    ConfirmRequest,
    OperationCreate,
    OperationListItem,
    OperationResponse,
    OperationUpdate,
)

logger = logging.getLogger("aero")

router = APIRouter(prefix="/api/operations", tags=["operations"])

# ── Role dependency aliases ─────────────────────────────────────────

PlannerOrSupervisor = Annotated[
    User, Depends(require_role("Osoba planująca", "Osoba nadzorująca"))
]
SupervisorOnly = Annotated[User, Depends(require_role("Osoba nadzorująca"))]
PlannerOnly = Annotated[User, Depends(require_role("Osoba planująca"))]
AnyAuthenticated = Annotated[User, Depends(get_current_user)]

# Fields Planner cannot modify (only Supervisor can set these via confirm)
PLANNER_LOCKED_FIELDS = {"planned_date_earliest", "planned_date_latest"}

# Updatable fields for audit tracking
AUDITABLE_FIELDS = {
    "order_number",
    "short_description",
    "activity_types",
    "additional_info",
    "contact_emails",
    "proposed_date_earliest",
    "proposed_date_latest",
    "planned_date_earliest",
    "planned_date_latest",
    "post_realization_notes",
}


# ── KML Parsing Utility ────────────────────────────────────────────


def _extract_coords_from_geometry(geometry: Any) -> list[list[float]]:
    """Extract [lat, lon] coordinate pairs from a shapely geometry.

    KML coordinates are (longitude, latitude, altitude) — we swap to [lat, lon]
    for storage and Leaflet compatibility.

    Handles: Point, LineString, LinearRing, Polygon, MultiPoint,
    MultiLineString, MultiPolygon, GeometryCollection.
    """
    coords: list[list[float]] = []
    geom_type = geometry.geom_type

    if geom_type == "Point":
        raw = list(geometry.coords)
        if raw:
            c = raw[0]
            coords.append([c[1], c[0]])  # swap lon,lat → lat,lon
    elif geom_type in ("LineString", "LinearRing"):
        for c in geometry.coords:
            coords.append([c[1], c[0]])
    elif geom_type == "Polygon":
        # Use exterior ring
        for c in geometry.exterior.coords:
            coords.append([c[1], c[0]])
    elif geom_type in (
        "MultiPoint",
        "MultiLineString",
        "MultiPolygon",
        "GeometryCollection",
    ):
        for sub_geom in geometry.geoms:
            coords.extend(_extract_coords_from_geometry(sub_geom))
    return coords


def _extract_placemarks(features: list) -> list:
    """Recursively extract Placemark features from Documents/Folders."""
    from fastkml.features import Placemark

    placemarks: list = []
    for feature in features:
        if isinstance(feature, Placemark):
            placemarks.append(feature)
        elif hasattr(feature, "features") and feature.features:
            placemarks.extend(_extract_placemarks(feature.features))
    return placemarks


def parse_kml(kml_bytes: bytes) -> tuple[list[list[float]], float]:
    """Parse KML bytes and return (coordinates, total_km).

    Returns:
        tuple of (list of [lat, lon] pairs, total distance in km)

    Raises:
        ValueError: if the KML cannot be parsed or contains no geometry
    """
    from fastkml import KML
    from geopy.distance import geodesic

    try:
        kml_str = kml_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("KML file must be valid UTF-8")

    try:
        k = KML.from_string(kml_str)
    except Exception as exc:
        raise ValueError(f"Invalid KML file: {exc}")

    # Recursively extract all Placemarks from Document/Folder structure
    all_coords: list[list[float]] = []
    placemarks = _extract_placemarks(k.features)

    for pm in placemarks:
        if pm.geometry is not None:
            all_coords.extend(_extract_coords_from_geometry(pm.geometry))

    if not all_coords:
        raise ValueError("KML file contains no geometry coordinates")

    # Calculate route distance
    total_km = 0.0
    try:
        for i in range(len(all_coords) - 1):
            dist = geodesic(all_coords[i], all_coords[i + 1]).km
            total_km += dist
    except Exception:
        # Fallback: return 0 km if geodesic calculation fails
        total_km = 0.0

    return all_coords, total_km


# ── Audit helper ────────────────────────────────────────────────────


def _create_audit_entries(
    operation_id: int,
    changed_by_id: int,
    changes: dict[str, tuple[Any, Any]],
    db: AsyncSession,
) -> None:
    """Write one OperationAuditLog row per changed field."""
    for field_name, (old_val, new_val) in changes.items():
        entry = OperationAuditLog(
            operation_id=operation_id,
            field_name=field_name,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
            changed_by_id=changed_by_id,
        )
        db.add(entry)


# ── Response serializers ────────────────────────────────────────────


def _serialize_operation(op: FlightOperation) -> dict:
    """Convert FlightOperation ORM object to OperationResponse-compatible dict."""
    return {
        "id": op.id,
        "order_number": op.order_number,
        "short_description": op.short_description,
        "route_coordinates": op.route_coordinates,
        "route_km": op.route_km,
        "proposed_date_earliest": op.proposed_date_earliest,
        "proposed_date_latest": op.proposed_date_latest,
        "planned_date_earliest": op.planned_date_earliest,
        "planned_date_latest": op.planned_date_latest,
        "activity_types": op.activity_types,
        "additional_info": op.additional_info,
        "status": op.status,
        "contact_emails": op.contact_emails,
        "post_realization_notes": op.post_realization_notes,
        "created_at": op.created_at,
        "created_by_email": op.created_by.email,
        "audit_logs": [
            AuditLogEntry(
                id=log.id,
                field_name=log.field_name,
                old_value=log.old_value,
                new_value=log.new_value,
                changed_at=log.changed_at,
                changed_by_email=log.changed_by.email,
            )
            for log in (op.audit_logs or [])
        ],
        "comments": [
            CommentEntry(
                id=c.id,
                content=c.content,
                created_at=c.created_at,
                author_email=c.author.email,
                author_name=f"{c.author.first_name} {c.author.last_name}",
            )
            for c in (op.comments or [])
        ],
        "linked_orders": [
            {"id": o.id, "status": o.status}
            for o in (op.flight_orders or [])
        ],
    }


# ── Endpoints ───────────────────────────────────────────────────────


@router.get("", response_model=list[OperationListItem])
async def list_operations(
    _user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
    op_status: int | None = None,
) -> list[dict]:
    """List operations, optionally filtered by status. All authenticated roles."""
    query = select(FlightOperation).order_by(FlightOperation.planned_date_earliest.asc().nullslast(), FlightOperation.id.desc())
    if op_status is not None:
        query = query.where(FlightOperation.status == op_status)
    result = await db.execute(query)
    ops = result.scalars().all()
    return [
        {
            "id": op.id,
            "order_number": op.order_number,
            "short_description": op.short_description,
            "activity_types": op.activity_types,
            "proposed_date_earliest": op.proposed_date_earliest,
            "proposed_date_latest": op.proposed_date_latest,
            "planned_date_earliest": op.planned_date_earliest,
            "planned_date_latest": op.planned_date_latest,
            "status": op.status,
            "route_km": op.route_km,
        }
        for op in ops
    ]


@router.post("", response_model=OperationResponse, status_code=status.HTTP_201_CREATED)
async def create_operation(
    body: OperationCreate,
    current_user: PlannerOrSupervisor,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Create a new flight operation. Planner + Supervisor only."""
    operation = FlightOperation(
        **body.model_dump(),
        status=1,
        created_by_id=current_user.id,
    )
    db.add(operation)
    await db.flush()
    await db.refresh(operation)
    logger.info(
        "Operation #%d created by %s (role=%s)",
        operation.id,
        current_user.email,
        current_user.system_role,
    )
    return _serialize_operation(operation)


@router.get("/{operation_id}", response_model=OperationResponse)
async def get_operation(
    operation_id: int,
    _user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Get operation detail with audit logs and comments. All roles."""
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )
    return _serialize_operation(op)


@router.put("/{operation_id}", response_model=OperationResponse)
async def update_operation(
    operation_id: int,
    body: OperationUpdate,
    current_user: PlannerOrSupervisor,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Update a flight operation with field-level audit trail.

    Planner cannot modify planned_date_earliest/latest (those are set via confirm).
    """
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    # PRD 6.5.d — Planner can edit only in statuses 1,2,3,4,5
    if current_user.system_role == "Osoba planująca" and op.status not in {1, 2, 3, 4, 5}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Osoba planująca cannot edit operation in status {op.status}",
        )

    update_data = body.model_dump(exclude_unset=True)

    # Planner cannot modify locked fields — silently strip them
    if current_user.system_role == "Osoba planująca":
        for field in PLANNER_LOCKED_FIELDS:
            update_data.pop(field, None)

    # Compute diffs and create audit entries
    changes: dict[str, tuple[Any, Any]] = {}
    for field, new_val in update_data.items():
        if field not in AUDITABLE_FIELDS:
            continue
        old_val = getattr(op, field, None)
        # Normalize for comparison (dates, lists, etc.)
        old_str = str(old_val) if old_val is not None else None
        new_str = str(new_val) if new_val is not None else None
        if old_str != new_str:
            changes[field] = (old_val, new_val)

    # Apply changes
    for field, new_val in update_data.items():
        setattr(op, field, new_val)

    # Write audit log entries in same transaction
    _create_audit_entries(op.id, current_user.id, changes, db)

    await db.flush()
    await db.refresh(op)
    logger.info(
        "Operation #%d updated by %s — %d field(s) changed",
        op.id,
        current_user.email,
        len(changes),
    )
    return _serialize_operation(op)


@router.post("/{operation_id}/kml", response_model=OperationResponse)
async def upload_kml(
    operation_id: int,
    file: UploadFile,
    current_user: PlannerOrSupervisor,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Upload and parse a KML file for the operation. Planner + Supervisor."""
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    # PRD 6.5.d — Planner can edit only in statuses 1,2,3,4,5
    if current_user.system_role == "Osoba planująca" and op.status not in {1, 2, 3, 4, 5}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Osoba planująca cannot modify operation in status {op.status}",
        )

    # Read file bytes
    try:
        kml_bytes = await file.read()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read file",
        )

    if not kml_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )

    # Parse KML
    try:
        coordinates, total_km = parse_kml(kml_bytes)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    # Audit entries for KML upload
    changes: dict[str, tuple[Any, Any]] = {}
    if op.route_coordinates != coordinates:
        changes["route_coordinates"] = (op.route_coordinates, "KML uploaded")
    old_km = op.route_km
    new_km = round(total_km)
    if old_km != new_km:
        changes["route_km"] = (old_km, new_km)
    changes["kml_data"] = (
        "present" if op.kml_data else None,
        "uploaded",
    )

    # Apply
    op.kml_data = kml_bytes
    op.route_coordinates = coordinates
    op.route_km = new_km

    _create_audit_entries(op.id, current_user.id, changes, db)

    await db.flush()
    await db.refresh(op)
    logger.info(
        "Operation #%d KML uploaded by %s — %d coords, %d km",
        op.id,
        current_user.email,
        len(coordinates),
        new_km,
    )
    return _serialize_operation(op)


@router.post("/{operation_id}/confirm", response_model=OperationResponse)
async def confirm_operation(
    operation_id: int,
    body: ConfirmRequest,
    current_user: SupervisorOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Confirm an operation (status 1→3). Supervisor only.

    Must provide planned_date_earliest and planned_date_latest.
    """
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    if op.status != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm: operation is in status {op.status}, must be 1 (Wprowadzona)",
        )

    changes: dict[str, tuple[Any, Any]] = {
        "status": (1, 3),
        "planned_date_earliest": (op.planned_date_earliest, body.planned_date_earliest),
        "planned_date_latest": (op.planned_date_latest, body.planned_date_latest),
    }

    op.status = 3
    op.planned_date_earliest = body.planned_date_earliest
    op.planned_date_latest = body.planned_date_latest

    _create_audit_entries(op.id, current_user.id, changes, db)

    await db.flush()
    await db.refresh(op)
    logger.info(
        "Operation #%d confirmed by %s (1→3, dates: %s — %s)",
        op.id,
        current_user.email,
        body.planned_date_earliest,
        body.planned_date_latest,
    )
    return _serialize_operation(op)


@router.post("/{operation_id}/reject", response_model=OperationResponse)
async def reject_operation(
    operation_id: int,
    current_user: SupervisorOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Reject an operation (status 1→2). Supervisor only."""
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    if op.status != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject: operation is in status {op.status}, must be 1 (Wprowadzona)",
        )

    changes: dict[str, tuple[Any, Any]] = {"status": (1, 2)}
    op.status = 2

    _create_audit_entries(op.id, current_user.id, changes, db)

    await db.flush()
    await db.refresh(op)
    logger.info("Operation #%d rejected by %s (1→2)", op.id, current_user.email)
    return _serialize_operation(op)


@router.post("/{operation_id}/resign", response_model=OperationResponse)
async def resign_operation(
    operation_id: int,
    current_user: PlannerOnly,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Resign from an operation (1/3/4→7). Planner only."""
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    allowed_from = {1, 3, 4}
    if op.status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot resign: operation is in status {op.status}, must be one of {sorted(allowed_from)}",
        )

    changes: dict[str, tuple[Any, Any]] = {"status": (op.status, 7)}
    op.status = 7

    _create_audit_entries(op.id, current_user.id, changes, db)

    await db.flush()
    await db.refresh(op)
    logger.info("Operation #%d resigned by %s (%d→7)", op.id, current_user.email, changes["status"][0])
    return _serialize_operation(op)


@router.post("/{operation_id}/comments", response_model=CommentEntry, status_code=status.HTTP_201_CREATED)
async def add_comment(
    operation_id: int,
    body: CommentCreate,
    current_user: AnyAuthenticated,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Add a comment to an operation. Any authenticated user."""
    result = await db.execute(
        select(FlightOperation).where(FlightOperation.id == operation_id)
    )
    op = result.scalars().first()
    if op is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Operation {operation_id} not found",
        )

    comment = OperationComment(
        operation_id=operation_id,
        content=body.content,
        author_id=current_user.id,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    logger.info(
        "Comment #%d added to operation #%d by %s",
        comment.id,
        operation_id,
        current_user.email,
    )
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at,
        "author_email": current_user.email,
        "author_name": f"{current_user.first_name} {current_user.last_name}",
    }
