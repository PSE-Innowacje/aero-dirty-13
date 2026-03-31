"""Seed the database with demo data on first startup."""

import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.crew_member import CrewMember
from app.models.flight_operation import FlightOperation
from app.models.flight_order import FlightOrder
from app.models.helicopter import Helicopter
from app.models.landing_site import LandingSite
from app.models.order_operation import order_crew, order_operations
from app.models.user import User

logger = logging.getLogger("aero")


async def init_db(db: AsyncSession) -> None:
    """Create demo seed data if no users exist."""
    result = await db.execute(select(User).limit(1))
    existing = result.scalars().first()

    if existing is not None:
        logger.info("Users already exist — skipping seed data")
        return

    # ── Users (4 total: 1 per role) ─────────────────────────────────
    admin = User(
        first_name="Admin",
        last_name="System",
        email="admin@aero.local",
        hashed_password=get_password_hash("admin123"),
        system_role="Administrator",
    )
    planner = User(
        first_name="Jan",
        last_name="Kowalski",
        email="planner@aero.local",
        hashed_password=get_password_hash("planner123"),
        system_role="Osoba planująca",
    )
    supervisor = User(
        first_name="Anna",
        last_name="Nowak",
        email="supervisor@aero.local",
        hashed_password=get_password_hash("supervisor123"),
        system_role="Osoba nadzorująca",
    )
    pilot_user = User(
        first_name="Marek",
        last_name="Wiśniewski",
        email="pilot@aero.local",
        hashed_password=get_password_hash("pilot123"),
        system_role="Pilot",
    )
    db.add_all([admin, planner, supervisor, pilot_user])
    await db.flush()  # assign IDs

    # ── Helicopters (3) ─────────────────────────────────────────────
    heli1 = Helicopter(
        registration_number="SP-HEL1",
        helicopter_type="Robinson R44",
        description="Lekki śmigłowiec patrolowy",
        max_crew=3,
        max_payload_weight=400,
        status="aktywny",
        inspection_date=date(2027, 6, 15),
        range_km=500,
    )
    heli2 = Helicopter(
        registration_number="SP-HEL2",
        helicopter_type="Airbus H125",
        description="Wielozadaniowy śmigłowiec inspekcyjny",
        max_crew=5,
        max_payload_weight=800,
        status="aktywny",
        inspection_date=date(2027, 3, 20),
        range_km=650,
    )
    heli3 = Helicopter(
        registration_number="SP-HEL3",
        helicopter_type="Bell 407",
        description="Śmigłowiec — przegląd przeterminowany",
        max_crew=4,
        max_payload_weight=600,
        status="nieaktywny",
        inspection_date=date(2025, 1, 10),
        range_km=550,
    )
    db.add_all([heli1, heli2, heli3])
    await db.flush()

    # ── Crew Members (5) ────────────────────────────────────────────
    crew_marek = CrewMember(
        first_name="Marek",
        last_name="Wiśniewski",
        email="pilot@aero.local",
        weight=82,
        role="Pilot",
        pilot_license_number="PL-PILOT-001",
        pilot_license_expiry=date(2027, 12, 31),
        training_expiry=date(2027, 6, 30),
    )
    crew_tomasz = CrewMember(
        first_name="Tomasz",
        last_name="Zieliński",
        email="crew1@aero.local",
        weight=75,
        role="Mechanik",
        training_expiry=date(2027, 8, 15),
    )
    crew_katarzyna = CrewMember(
        first_name="Katarzyna",
        last_name="Dąbrowska",
        email="crew2@aero.local",
        weight=65,
        role="Operator",
        training_expiry=date(2027, 9, 20),
    )
    crew_piotr = CrewMember(
        first_name="Piotr",
        last_name="Lewandowski",
        email="crew3@aero.local",
        weight=90,
        role="Obserwator",
        training_expiry=date(2027, 7, 10),
    )
    crew_robert = CrewMember(
        first_name="Robert",
        last_name="Kamiński",
        email="crew4@aero.local",
        weight=78,
        role="Pilot",
        pilot_license_number="PL-PILOT-002",
        pilot_license_expiry=date(2027, 11, 30),
        training_expiry=date(2027, 5, 15),
    )
    db.add_all([crew_marek, crew_tomasz, crew_katarzyna, crew_piotr, crew_robert])
    await db.flush()

    # ── Landing Sites (4) ───────────────────────────────────────────
    site_waw = LandingSite(
        name="Warszawa-Okęcie", latitude=52.1657, longitude=20.9671
    )
    site_krk = LandingSite(
        name="Kraków-Balice", latitude=50.0777, longitude=19.7848
    )
    site_wro = LandingSite(
        name="Wrocław-Strachowice", latitude=51.1027, longitude=16.8858
    )
    site_gdn = LandingSite(
        name="Gdańsk-Rębiechowo", latitude=54.3776, longitude=18.4662
    )
    db.add_all([site_waw, site_krk, site_wro, site_gdn])
    await db.flush()

    # ── Flight Operations (4) ───────────────────────────────────────
    op1 = FlightOperation(
        short_description="Inspekcja linii 400kV Warszawa-Radom",
        route_coordinates=[
            [52.23, 21.01],
            [52.10, 20.95],
            [51.75, 21.15],
            [51.40, 21.15],
        ],
        route_km=120,
        proposed_date_earliest=date(2026, 4, 10),
        proposed_date_latest=date(2026, 4, 20),
        planned_date_earliest=date(2026, 4, 12),
        planned_date_latest=date(2026, 4, 14),
        activity_types=["oględziny wizualne", "zdjęcia"],
        status=3,  # Potwierdzona
        created_by_id=planner.id,
    )
    op2 = FlightOperation(
        short_description="Skan 3D trasy Kraków-Tarnów",
        route_coordinates=[
            [50.06, 19.94],
            [50.05, 20.20],
            [50.03, 20.50],
            [50.01, 20.99],
        ],
        route_km=85,
        proposed_date_earliest=date(2026, 4, 15),
        proposed_date_latest=date(2026, 4, 25),
        planned_date_earliest=date(2026, 4, 15),
        planned_date_latest=date(2026, 4, 17),
        activity_types=["skan 3D"],
        status=3,  # Potwierdzona (will be updated to 4 after order2)
        created_by_id=planner.id,
    )
    op3 = FlightOperation(
        short_description="Patrolowanie linii Wrocław-Opole",
        route_coordinates=[
            [51.10, 17.03],
            [51.05, 17.30],
            [50.95, 17.60],
            [50.67, 17.92],
        ],
        route_km=95,
        proposed_date_earliest=date(2026, 5, 1),
        activity_types=["patrolowanie"],
        status=1,  # Wprowadzona
        created_by_id=planner.id,
    )
    op4 = FlightOperation(
        short_description="Lokalizacja awarii Gdańsk-Elbląg",
        route_coordinates=[
            [54.35, 18.60],
            [54.20, 19.00],
            [54.17, 19.40],
        ],
        route_km=65,
        planned_date_earliest=date(2026, 3, 1),
        planned_date_latest=date(2026, 3, 5),
        activity_types=["lokalizacja awarii"],
        status=6,  # Zrealizowana w całości
        created_by_id=planner.id,
        post_realization_notes="Awaria zlokalizowana w km 42. Naprawa zakończona.",
    )
    db.add_all([op1, op2, op3, op4])
    await db.flush()

    # ── Flight Orders (2) with M:N associations ─────────────────────
    order1 = FlightOrder(
        planned_start_datetime=datetime(2026, 4, 12, 8, 0, tzinfo=timezone.utc),
        planned_end_datetime=datetime(2026, 4, 12, 14, 0, tzinfo=timezone.utc),
        pilot_id=crew_marek.id,
        status=1,  # Wprowadzone
        helicopter_id=heli1.id,
        crew_weight=157,  # Marek(82) + Tomasz(75)
        start_landing_site_id=site_waw.id,
        end_landing_site_id=site_krk.id,
        estimated_route_km=120,
        created_by_id=pilot_user.id,
    )
    order2 = FlightOrder(
        planned_start_datetime=datetime(2026, 4, 15, 7, 0, tzinfo=timezone.utc),
        planned_end_datetime=datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc),
        pilot_id=crew_marek.id,
        status=4,  # Zaakceptowane
        helicopter_id=heli2.id,
        crew_weight=237,  # Marek(82) + Katarzyna(65) + Piotr(90)
        start_landing_site_id=site_krk.id,
        end_landing_site_id=site_wro.id,
        estimated_route_km=85,
        created_by_id=pilot_user.id,
    )
    db.add_all([order1, order2])
    await db.flush()

    # ── M:N: order ↔ operations ─────────────────────────────────────
    await db.execute(
        order_operations.insert().values(order_id=order1.id, operation_id=op1.id)
    )
    await db.execute(
        order_operations.insert().values(order_id=order2.id, operation_id=op2.id)
    )

    # ── M:N: order ↔ crew members ───────────────────────────────────
    await db.execute(
        order_crew.insert().values(order_id=order1.id, crew_member_id=crew_marek.id)
    )
    await db.execute(
        order_crew.insert().values(order_id=order1.id, crew_member_id=crew_tomasz.id)
    )
    await db.execute(
        order_crew.insert().values(order_id=order2.id, crew_member_id=crew_marek.id)
    )
    await db.execute(
        order_crew.insert().values(
            order_id=order2.id, crew_member_id=crew_katarzyna.id
        )
    )
    await db.execute(
        order_crew.insert().values(order_id=order2.id, crew_member_id=crew_piotr.id)
    )

    # ── Cascade consistency: Op2 → status 4 (Zaplanowana) ──────────
    # Order2 is at status=4 (Zaakceptowane), so its linked operation
    # should reflect the cascade: Potwierdzona(3) → Zaplanowana(4).
    op2.status = 4

    await db.commit()

    logger.info(
        "Seed data created: 4 users, 3 helicopters, 5 crew members, "
        "4 landing sites, 4 operations, 2 orders"
    )
