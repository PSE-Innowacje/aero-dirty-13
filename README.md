# 🚁 AERO — Flight Operations Management System

A web application for managing helicopter flight operations — planning aerial inspections with KML-based routes, assembling flight orders with safety validations, and tracking the full execution lifecycle. Built as a complete, spec-accurate implementation of a flight operations PRD.

![Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![Stack](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
![Stack](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Stack](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Stack](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Test Accounts](#test-accounts)
- [Seed Data](#seed-data)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Role-Based Access Control](#role-based-access-control)
- [Flight Operation Lifecycle](#flight-operation-lifecycle)
- [Flight Order Lifecycle](#flight-order-lifecycle)
- [Safety Validations](#safety-validations)
- [Internationalization](#internationalization)
- [Environment Variables](#environment-variables)
- [Development](#development)

---

## Features

- **Four user roles** with full RBAC: Administrator, Planner, Supervisor, Pilot
- **Helicopter fleet management** — registration, inspection dates, range, crew capacity
- **Crew member management** — weight, licenses, training expiry, conditional pilot fields
- **Landing site management** — name + coordinates, displayed on maps
- **Flight operations** — 7-status lifecycle, KML file upload with route visualization on OpenStreetMap, automatic km calculation
- **Flight orders** — multi-operation selection, helicopter + crew assignment, 5 safety validations blocking save, settlement cascade
- **Interactive maps** — OpenStreetMap tiles via Leaflet, operation routes + order overview maps with landing sites
- **Audit trail** — field-level change history on operations (old value → new value, timestamp, user)
- **Polish/English i18n** — full translation with language switcher, persisted preference
- **Dark aviation-themed sidebar**, light content area, colored status badges
- **Docker Compose** — single command to run the entire stack

---

## Architecture

```
┌─────────────┐
│   Browser    │
└──────┬──────┘
       │ :80
┌──────▼──────┐
│    nginx    │  reverse proxy
│  (alpine)   │
└──┬───────┬──┘
   │       │
   │ /api  │ /*
   ▼       ▼
┌──────┐ ┌──────────┐
│ Fast │ │  React   │
│ API  │ │  (Vite)  │
│:8000 │ │  :80     │
└──┬───┘ └──────────┘
   │
   ▼
┌──────────┐
│PostgreSQL│
│  16      │
│ :5432    │
└──────────┘
```

**Four Docker services:**

| Service | Image | Role |
|---------|-------|------|
| `db` | `postgres:16-alpine` | Data persistence, health-checked |
| `backend` | `python:3.12-slim` | REST API, JWT auth, KML parsing, business logic |
| `frontend` | `node:20-alpine` → `nginx:alpine` | Multi-stage build: Vite SPA served by nginx |
| `nginx` | `nginx:alpine` | Reverse proxy: `/api/*` → backend, `/*` → frontend |

**Request flow:**
1. Browser hits `http://localhost` (port 80)
2. nginx routes `/api/*` to the FastAPI backend on port 8000
3. All other paths serve the React SPA (with `try_files` fallback to `index.html` for client-side routing)

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Python 3.12** | Runtime |
| **FastAPI 0.115** | REST API framework |
| **SQLAlchemy 2.x** (async) | ORM with asyncpg driver |
| **Alembic** | Database migrations |
| **Pydantic v2** | Request/response validation |
| **python-jose** | JWT token creation & verification |
| **passlib + bcrypt** | Password hashing |
| **fastkml** | KML file parsing (route extraction) |
| **geopy** | Distance calculation between coordinates |
| **uvicorn** | ASGI server with hot-reload |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **shadcn/ui** | UI component library (Button, Card, Dialog, Table, Select, etc.) |
| **TanStack React Query** | Server state management, cache, auto-refetch |
| **React Router v6** | Client-side routing with auth guards |
| **react-leaflet** | OpenStreetMap map rendering |
| **react-i18next** | Internationalization (PL/EN) |
| **Lucide React** | Icon library |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Container orchestration (4 services) |
| **PostgreSQL 16** | Relational database |
| **nginx** | Reverse proxy & static file serving |

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run

```bash
# 1. Clone the repository
git clone <repo-url>
cd AERO_PSE

# 2. Copy environment file
cp .env.example .env

# 3. Start all services
docker compose up --build
```

The application will be available at **http://localhost**.

On first startup, the database is automatically seeded with demo data (users, helicopters, crew, landing sites, operations, and orders).

### Stop

```bash
docker compose down

# To also remove the database volume (full reset):
docker compose down -v
```

After `docker compose down -v`, the next `docker compose up` re-creates the database and re-seeds all demo data from scratch.

---

## Test Accounts

All accounts are created automatically on first startup:

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `admin@aero.local` | `admin123` | Administrator | Full admin CRUD (helicopters, crew, landing sites, users). Read-only for operations and orders. |
| `planner@aero.local` | `planner123` | Osoba planująca | Create/edit flight operations. Can resign operations (status → 7). |
| `supervisor@aero.local` | `supervisor123` | Osoba nadzorująca | Confirm/reject operations, accept/reject orders. Read-only admin data. |
| `pilot@aero.local` | `pilot123` | Pilot | Create flight orders, settle operations. Read-only admin and operations data. |

---

## Seed Data

The application seeds the following demo data on first startup (empty database):

| Entity | Count | Details |
|--------|-------|---------|
| **Users** | 4 | One per role (see Test Accounts above) |
| **Helicopters** | 3 | SP-HEL1 (R44, active), SP-HEL2 (H125, active), SP-HEL3 (Bell 407, inactive — expired inspection) |
| **Crew Members** | 5 | 2 Pilots (with licenses), 1 Mechanic, 1 Operator, 1 Observer |
| **Landing Sites** | 4 | Warszawa-Okęcie, Kraków-Balice, Wrocław-Strachowice, Gdańsk-Rębiechowo |
| **Flight Operations** | 4 | Status 1 (Introduced), 3 (Confirmed), 4 (Scheduled), 6 (Completed) |
| **Flight Orders** | 2 | Status 1 (Introduced) with 1 operation, Status 4 (Accepted) with 1 operation and 3 crew members |

Seed data only runs when the `users` table is empty. Restarting with an existing database skips seeding.

---

## Project Structure

```
AERO_PSE/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/               # Database migrations
│   ├── alembic.ini
│   └── app/
│       ├── main.py            # FastAPI app factory, lifespan, router mounting
│       ├── core/
│       │   ├── config.py      # Pydantic Settings (DATABASE_URL, SECRET_KEY, etc.)
│       │   ├── database.py    # Async engine, session maker, Base
│       │   ├── init_db.py     # Seed data (runs on first startup)
│       │   └── security.py    # JWT create/verify, password hash/verify
│       ├── api/
│       │   ├── auth.py        # POST /api/auth/login, GET /api/auth/me
│       │   ├── deps.py        # get_current_user, role_required() dependency
│       │   ├── users.py       # User CRUD (admin only)
│       │   ├── helicopters.py # Helicopter CRUD
│       │   ├── crew_members.py# Crew member CRUD
│       │   ├── landing_sites.py# Landing site CRUD
│       │   ├── operations.py  # Flight operations + KML upload + status transitions
│       │   └── orders.py      # Flight orders + safety validations + settlement
│       ├── models/
│       │   ├── user.py
│       │   ├── helicopter.py
│       │   ├── crew_member.py
│       │   ├── landing_site.py
│       │   ├── flight_operation.py
│       │   ├── flight_order.py
│       │   ├── order_operation.py  # M:N association tables
│       │   └── operation_audit_log.py
│       └── schemas/           # Pydantic request/response schemas
│           ├── user.py
│           ├── helicopter.py
│           ├── crew_member.py
│           ├── landing_site.py
│           ├── flight_operation.py
│           └── flight_order.py
├── frontend/
│   ├── Dockerfile             # Multi-stage: node build → nginx serve
│   ├── nginx.conf             # SPA fallback (try_files → index.html)
│   ├── package.json
│   └── src/
│       ├── main.tsx           # Entry point, providers
│       ├── App.tsx            # Router with auth guards
│       ├── i18n.ts            # i18next configuration
│       ├── lib/
│       │   ├── api.ts         # Fetch wrapper with JWT interceptor
│       │   └── auth.tsx       # AuthContext (login, logout, token storage)
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx   # Sidebar + content area shell
│       │   │   └── AppSidebar.tsx  # Dark sidebar with role-filtered menu
│       │   ├── maps/
│       │   │   ├── OperationMap.tsx # Single operation route on map
│       │   │   └── OrderMap.tsx     # Order overview: landing sites + operation routes
│       │   ├── ProtectedRoute.tsx   # Auth guard wrapper
│       │   └── ui/                  # shadcn/ui components
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── users/          # UserListPage, UserFormPage
│       │   ├── helicopters/    # HelicopterListPage, HelicopterFormPage
│       │   ├── crew/           # CrewListPage, CrewFormPage
│       │   ├── landing-sites/  # LandingSiteListPage, LandingSiteFormPage
│       │   ├── operations/     # OperationListPage, OperationFormPage
│       │   └── orders/         # OrderListPage, OrderFormPage
│       └── locales/
│           ├── pl.json         # Polish translations (primary)
│           └── en.json         # English translations (complete)
├── nginx/
│   └── default.conf           # Reverse proxy config
├── docker-compose.yml
├── .env.example
└── AERO PRD.md                # Product Requirements Document
```

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login with email + password, returns JWT |
| `GET` | `/api/auth/me` | Get current user from token |

### Users (Admin only)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `GET` | `/api/users/{id}` | Get user by ID |
| `PUT` | `/api/users/{id}` | Update user |
| `DELETE` | `/api/users/{id}` | Delete user (cannot delete self) |

### Helicopters
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/helicopters` | List helicopters |
| `POST` | `/api/helicopters` | Create helicopter |
| `GET` | `/api/helicopters/{id}` | Get helicopter |
| `PUT` | `/api/helicopters/{id}` | Update helicopter |
| `DELETE` | `/api/helicopters/{id}` | Delete helicopter |

### Crew Members
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/crew-members` | List crew members |
| `POST` | `/api/crew-members` | Create crew member |
| `GET` | `/api/crew-members/{id}` | Get crew member |
| `PUT` | `/api/crew-members/{id}` | Update crew member |
| `DELETE` | `/api/crew-members/{id}` | Delete crew member |

### Landing Sites
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/landing-sites` | List landing sites |
| `POST` | `/api/landing-sites` | Create landing site |
| `GET` | `/api/landing-sites/{id}` | Get landing site |
| `PUT` | `/api/landing-sites/{id}` | Update landing site |
| `DELETE` | `/api/landing-sites/{id}` | Delete landing site |

### Flight Operations
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/operations` | List operations (filterable by `op_status`) |
| `POST` | `/api/operations` | Create operation |
| `GET` | `/api/operations/{id}` | Get operation (includes audit trail) |
| `PUT` | `/api/operations/{id}` | Update operation (role-based field restrictions) |
| `DELETE` | `/api/operations/{id}` | Delete operation |
| `POST` | `/api/operations/{id}/confirm` | Supervisor: confirm (1→3), requires planned dates |
| `POST` | `/api/operations/{id}/reject` | Supervisor: reject (1→2) |
| `POST` | `/api/operations/{id}/resign` | Planner: resign (1/3/4→7) |
| `POST` | `/api/operations/{id}/kml` | Upload KML file, parse route, calculate km |

### Flight Orders
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/orders` | List orders |
| `POST` | `/api/orders` | Create order (runs 5 safety validations) |
| `GET` | `/api/orders/{id}` | Get order (includes linked operations + crew) |
| `PUT` | `/api/orders/{id}` | Update order |
| `POST` | `/api/orders/{id}/submit` | Pilot: submit for approval (1→2) |
| `POST` | `/api/orders/{id}/accept` | Supervisor: accept (2→4) |
| `POST` | `/api/orders/{id}/reject` | Supervisor: reject (2→3) |
| `POST` | `/api/orders/{id}/complete-partial` | Pilot: partial completion (4→5), cascades to operations |
| `POST` | `/api/orders/{id}/complete-full` | Pilot: full completion (4→6), cascades to operations |
| `POST` | `/api/orders/{id}/not-completed` | Pilot: not completed (4→7), operations revert to 3 |

### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{"status": "ok"}` |

---

## Role-Based Access Control

Based on PRD section 7.2:

| Section | Administrator | Osoba planująca | Osoba nadzorująca | Pilot |
|---------|:---:|:---:|:---:|:---:|
| **Administracja** (Helicopters, Crew, Landing Sites, Users) | ✏️ Full CRUD | 🚫 Hidden | 👁️ Read-only | 👁️ Read-only |
| **Planowanie operacji** (Operations) | 👁️ Read-only | ✏️ Create/Edit | ✏️ Create/Edit | 👁️ Read-only |
| **Zlecenia na lot** (Orders) | 👁️ Read-only | 🚫 Hidden | ✏️ Edit | ✏️ Create/Edit |

Menu items are **hidden entirely** for roles without access (not greyed out). Read-only access shows list pages without create/edit buttons.

---

## Flight Operation Lifecycle

```
    ┌─────────────┐
    │ 1. Introduced│
    └──┬───────┬──┘
       │       │
  Supervisor  Planner
  confirms    resigns
       │       │
       ▼       ▼
┌──────────┐ ┌──────────┐
│3. Confirmed│ │7. Resigned│
└──┬───────┘ └──────────┘
   │                ▲
   │ Order created  │ Planner resigns
   ▼                │
┌──────────┐────────┘
│4. Scheduled│
└──┬──┬──┬─┘
   │  │  │
   │  │  └─── Not completed ──► 3. Confirmed
   │  └────── Partial ────────► 5. Partially completed
   └───────── Full ───────────► 6. Fully completed

  Supervisor can also: 1 → 2 (Reject)
```

---

## Flight Order Lifecycle

```
┌──────────────┐
│ 1. Introduced │
└──────┬───────┘
       │ Pilot submits
       ▼
┌──────────────┐
│ 2. Submitted  │
└──┬────────┬──┘
   │        │
 Accept    Reject
   │        │
   ▼        ▼
┌────────┐ ┌──────────┐
│4. Accepted│ │3. Rejected│
└─┬──┬──┬┘ └──────────┘
  │  │  │
  │  │  └── Not completed ──► 7. Not completed (ops → 3)
  │  └───── Partial ────────► 5. Partial (ops → 5)
  └──────── Full ───────────► 6. Full (ops → 6)
```

---

## Safety Validations

When saving a flight order, the system checks **5 constraints** and blocks the save if any fail:

| # | Validation | Condition |
|---|-----------|-----------|
| 1 | **Helicopter inspection** | Helicopter must have a valid inspection on the planned flight date |
| 2 | **Pilot license** | Pilot must have a valid license on the planned flight date |
| 3 | **Crew training** | All crew members must have valid training on the planned flight date |
| 4 | **Crew weight** | Total crew weight (pilot + members) must not exceed helicopter max payload |
| 5 | **Route range** | Estimated route length must not exceed helicopter range without landing |

Each failed validation returns a specific warning message to the user.

---

## Internationalization

The application supports **Polish** (primary) and **English** with a language switcher in the sidebar footer.

- Translation files: `frontend/src/locales/pl.json` and `en.json`
- Language preference persisted to `localStorage`
- All UI text uses `t()` translation keys — no hardcoded strings
- Status labels, form labels, validation messages, menu items — all translated
- RBAC uses stable `id` fields, not translated labels (immune to language switching)

---

## Environment Variables

Copy `.env.example` to `.env` before first run:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `aero` | Database name |
| `POSTGRES_USER` | `aero` | Database user |
| `POSTGRES_PASSWORD` | `change_me` | Database password |
| `DATABASE_URL` | `postgresql+asyncpg://aero:change_me@db:5432/aero` | SQLAlchemy async connection string |
| `SECRET_KEY` | `change-me-in-production` | JWT signing secret |
| `BACKEND_CORS_ORIGINS` | `["http://localhost","http://localhost:3000"]` | Allowed CORS origins (JSON array) |

---

## Development

### Hot-reload (backend)

The backend container mounts `./backend:/app` as a volume and runs uvicorn with `--reload`. Code changes are reflected immediately without rebuilding.

### Rebuild frontend

The frontend is a multi-stage Docker build (Vite → nginx). After changing frontend code:

```bash
docker compose up --build frontend
```

### Reset database

```bash
docker compose down -v
docker compose up --build
```

This drops the database volume and re-seeds all demo data on next startup.

### Direct API testing

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aero.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Use token for authenticated requests
curl -s http://localhost/api/users \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Health check (no auth required)
curl http://localhost/api/health
```

---

## License

This project was built for a hackathon challenge. See `AERO PRD.md` for the full product requirements document.
