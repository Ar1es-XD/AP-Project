# Hospital Patient Queue, Bed Availability & Admission Management System

A production-shaped, real-time hospital operations platform designed to solve overcrowding in outpatient (OPD) waiting rooms and eliminate chaotic, delayed bed allocations during inpatient admissions. The system manages daily patient queues, provides live bed tracking with race-condition-free concurrency locks, and offers a regional dashboard for cross-hospital capacity coordination.

Built for the **Advanced Programming (AP)** curriculum by a **team of three**, strictly dividing all development work equally across **HTML, CSS, JavaScript (React + Node.js), and Python (FastAPI + Analytics)**.

---

## 1. System Architecture

The platform uses a hybrid dual-backend architecture:
* **Frontend:** React + JavaScript + CSS3 + Semantic HTML5 with accessible components.
* **Core API:** Node.js (Express 5) with Prisma ORM for type-safe CRUD operations, raw `pg` for row-level concurrency locks (`SELECT ... FOR UPDATE SKIP LOCKED`), and an in-process `EventEmitter` bus.
* **Analytics Microservice:** Python 3 + FastAPI running compute-heavy statistical modeling (Bed turnover & ALOS prediction, multi-server Erlang-C wait-time estimation, and regional healthcare strain optimization).
* **Database:** Supabase PostgreSQL with strict Row Level Security (RLS), custom enums, and `node-pg-migrate` version-controlled migrations.

```
                     ┌─────────────────────────────────────────┐
                     │          React + Vite Frontend          │
                     │  (Wards, Calling Console, Auth, Shell)  │
                     └────────────────────┬────────────────────┘
                                          │ HTTP / REST
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │       Node.js / Express 5 API           │
                     │  (Auth, Patients, Wards, Queues, City)  │
                     └───────┬─────────────────────────┬───────┘
         Prisma + Raw pg Pool│                         │ Internal HTTP + Shared Secret
                             ▼                         ▼
┌──────────────────────────────────────┐     ┌───────────────────────────────────┐
│        Supabase PostgreSQL           │     │    Python + FastAPI Analytics     │
│  (ACID Transactions, RLS, Indexes)   │     │ (Erlang-C, ALOS, Strain Optimizer)│
└──────────────────────────────────────┘     └───────────────────────────────────┘
```

---

## 2. Team & Equal Work Distribution (33.3% Share per Teammate)

To satisfy academic rubric requirements, every teammate owns one operational domain end-to-end and contributes an equal share across all 4 core technologies:

| Member | Operational Domain | HTML (Markup) | CSS (Styling) | JavaScript (Full-Stack) | Python (Analytics & Models) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Person A**<br>**Ishika** | **Beds & Inpatient Admissions** | Semantic Ward grid, bed card templates (`BedCard.jsx`), admission/transfer/discharge modal dialogs | `beds.css`: Ward auto-fitting CSS grid, bed status badges, modal transition keyframes | `useBedManagement` hook, `bed.controller.js`, `bed.service.js`, `withTransaction()` with `SELECT ... FOR UPDATE SKIP LOCKED` | `bed_analytics.py`: Bed turnover & Average Length of Stay (ALOS) modeling, ward depletion forecast, Pytest suite |
| **Person B**<br>**Aarpan** | **OPD Queue & Wait-Time Analytics** | Doctor calling console, public waiting-room kiosk layout (tokens only, zero PHI), digital token slip | `queue.css`: High-contrast public TV theme (WCAG AAA), active token pulse animation, audio wave visualization | `useQueue` & `usePolling` hooks, `queue.controller.js`, `queue.service.js`, atomic token sequence generator | `queue_engine.py`: Multi-server ($M/M/c$) Erlang-C wait-time math, dynamic priority aging offsets, Pytest suite |
| **Person C**<br>**Chinmaya** | **Platform, Auth & Regional View** | App shell (`header`, `nav`, sidebar drawer), login & lockout alert banners, patient intake form, city comparison tiles | `tokens.css`, `layout.css`, `forms.css`: Root design tokens, responsive app shell, accessible inputs, login shake animation | `useAuth` hook, Express 9-stage middleware pipeline (`app.js`), `auth.controller.js` (Argon2id + JWT), `patient.controller.js`, idempotency replay | `city_analytics.py`: City Healthcare Strain Index (HSI), optimal referral recommendation routing, Pytest suite |

> 📄 For the detailed line-by-line file breakdown and commit audit standards, refer to [Equal Work Distribution Matrix](documentation/EQUAL_WORK_DISTRIBUTION.md).

---

## 3. Repository Structure

```text
ap-project/
├── api/                           # Core Node.js / Express 5 API
│   ├── prisma/
│   │   └── schema.prisma          # Prisma schema synchronized via db pull
│   ├── src/
│   │   ├── server.js              # HTTP server & graceful shutdown listener
│   │   ├── app.js                 # 9-stage middleware pipeline & route mounting
│   │   ├── lib/
│   │   │   ├── db.js              # pg connection pool & withTransaction() helper
│   │   │   ├── prisma.js          # Prisma Client singleton
│   │   │   ├── errors.js          # Custom HTTP error classes
│   │   │   ├── audit.js           # Append-only audit logging helper
│   │   │   └── events.js          # EventEmitter instance for domain events
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verification & claims extraction
│   │   │   ├── rbac.js            # Role-based hospital scoping guard
│   │   │   ├── idempotency.js     # Idempotency-Key deduplication & replay
│   │   │   └── error.js           # Centralized JSON error handler
│   │   ├── controllers/           # HTTP controllers (auth, patient, bed, queue, city)
│   │   ├── services/              # Business logic & database operations
│   │   └── routes/                # Express router modules
│   └── test/                      # Supertest API tests (auth, tenant isolation, concurrency)
├── analytics/                     # Python 3 + FastAPI Analytics Microservice
│   ├── main.py                    # Microservice setup, secret guard, route mounts
│   ├── requirements.txt           # fastapi, uvicorn, pydantic, pytest
│   ├── core/
│   │   ├── bed_analytics.py       # Inpatient turnover & ALOS forecasting (Ishika)
│   │   ├── queue_engine.py        # Erlang-C multi-server wait-time engine (Aarpan)
│   │   └── city_analytics.py      # Regional strain index & referral optimizer (Chinmaya)
│   ├── routers/
│   │   ├── bed_router.py          # /analytics/beds/forecast & /turnover
│   │   ├── queue_router.py        # /analytics/queue/estimate & /saturation
│   │   └── city_router.py         # /analytics/city/strain-index & /recommend-referral
│   └── tests/                     # Dedicated Pytest suites for each domain engine
├── web/                           # React + Vite Frontend
│   ├── src/
│   │   ├── styles/                # Modular stylesheets (tokens.css, layout.css, beds.css, queue.css)
│   │   ├── components/            # Reusable UI components & dialogs
│   │   ├── hooks/                 # Custom React hooks (useAuth, useBedManagement, useQueue, usePolling)
│   │   └── pages/                 # Route views (Login, WardMap, QueueBoard, PatientRegister, CityDashboard)
├── db/
│   └── migrations/                # Versioned SQL migrations (node-pg-migrate)
│       ├── 001_identity_core.sql
│       ├── 002_ward_bed_assignment.sql
│       ├── 003_queue_core.sql
│       └── 004_roles_and_rls.sql
└── documentation/                 # Technical documentation & project deliverables
    ├── EQUAL_WORK_DISTRIBUTION.md # 33.3% equal work division specifications
    ├── Hospital_Management_System_Proposal.md # Full project proposal & DFDs
    ├── Hospital_Queue_Bed_Management_10_Day_Build_Plan.md # 10-day execution timeline
    └── er_diagram.svg             # Entity-Relationship diagram
```

---

## 4. Getting Started

### 4.1. Prerequisites
* **Node.js** v20.x or higher & `npm`
* **Python** 3.10+ & `pip`
* **PostgreSQL** 16+ (or a remote Supabase instance)

### 4.2. Database Setup & Migrations
From the repository root:
1. Copy the environment configuration:
   ```bash
   cp api/.env.example api/.env
   ```
2. Configure `DATABASE_URL` in `api/.env`.
3. Install dependencies and run migrations:
   ```bash
   cd api
   npm install
   npm run migrate up
   ```
4. Synchronize Prisma models (once database connection is established):
   ```bash
   npx prisma db pull
   npx prisma generate
   ```

### 4.3. Starting the Node.js API
From the `api/` directory:
```bash
npm run dev
# Server listening on http://localhost:4000
```

### 4.4. Starting the Python Analytics Service (Phase 2)
```bash
cd analytics
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Analytics API listening on http://localhost:8000 (OpenAPI docs at http://localhost:8000/docs)
```

---

## 5. Security & Concurrency Highlights

* **Race-Condition-Free Bed Allocation:** Implements `SELECT ... FOR UPDATE SKIP LOCKED` inside explicit database transactions via `withTransaction()` to ensure simultaneous booking attempts can never double-assign a bed.
* **Argon2id Authentication & Atomic Lockout:** Passwords hashed with OWASP-recommended Argon2id. 5 consecutive failed attempts trigger an atomic 15-minute lockout directly in the SQL update.
* **Tenant Isolation:** Every operational query is scoped strictly by `hospital_id`. Staff users cannot read or modify data belonging to other hospitals.
* **Idempotency Guarantees:** Critical mutations (admission, queue join, referrals) enforce `Idempotency-Key` headers. Retried requests return cached responses without duplicate side-effects.

---

## 6. Testing & CI/CD

The repository includes automated testing verified on every pull request via **GitHub Actions** (`.github/workflows/ci.yml`):
* **API Integration Tests:** In-process Node test runner suites testing authentication, rate-limiting, and tenant isolation:
  ```bash
  cd api && npm test
  ```
* **Python Mathematical Tests (Phase 2):** Pytest suites testing Erlang-C calculations, ALOS models, and regional load-balancing.
  ```bash
  cd analytics && pytest
  ```
