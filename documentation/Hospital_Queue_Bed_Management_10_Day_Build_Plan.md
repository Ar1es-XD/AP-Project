# Hospital Queue & Bed Management System — 10-Day Build Plan (Redistributed AP-Aligned Plan)

**Team Size:** 3 Members  
**Work Distribution Principle:** **Strictly Equal 33.3% / 33.3% / 33.3% Share** across HTML, CSS, JavaScript (React + Node.js), and Python (FastAPI + Analytics)  
**Timeline:** Phase 1 Foundation: Sat 24 Oct – Mon 2 Nov 2026 [COMPLETED] · Active Execution: Tue 3 Nov – Tue 10 Nov 2026

---

## 1. Domain Ownership & Equal-Share Verification Matrix

Each teammate owns one operational domain end-to-end (database, API, UI, and automated tests) **and receives an equal, balanced share across all 4 foundational technologies**:

| Teammate | Operational Domain | HTML (Markup & Accessibility) | CSS (Tokens, Layouts & Motion) | JavaScript (React UI & Node API) | Python (FastAPI & Analytics) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Person A**<br>**Ishika** | **Beds & Admissions** | Semantic Ward grid, bed card templates (`BedCard.jsx`), admission/transfer/discharge modal dialogs | `beds.css`: Ward auto-fitting CSS grid, bed status badges, modal transition keyframes | `useBedManagement` hook, `bed.controller.js`, `bed.service.js`, `withTransaction()` with `SELECT ... FOR UPDATE SKIP LOCKED` | `bed_analytics.py`: Bed turnover & Average Length of Stay (ALOS) modeling, ward depletion forecast, Pytest suite |
| **Person B**<br>**Aarpan** | **OPD Queue & Wait-Time Analytics** | Doctor calling console, public waiting-room kiosk layout (tokens only, zero PHI), digital token slip | `queue.css`: High-contrast public TV theme (WCAG AAA), active token pulse animation, audio wave visualization | `useQueue` & `usePolling` hooks, `queue.controller.js`, `queue.service.js`, atomic token sequence generator | `queue_engine.py`: Multi-server ($M/M/c$) Erlang-C wait-time math, dynamic priority aging offsets, Pytest suite |
| **Person C**<br>**Chinmaya** | **Platform, Auth & Regional View** | App shell (`header`, `nav`, sidebar drawer), login & lockout alert banners, patient intake form, city comparison tiles | `tokens.css`, `layout.css`, `forms.css`: Root design tokens, responsive app shell, accessible inputs, login shake animation | `useAuth` hook, Express 9-stage middleware pipeline (`app.js`), `auth.controller.js` (Argon2id + JWT), `patient.controller.js`, idempotency replay | `city_analytics.py`: City Healthcare Strain Index (HSI), optimal referral recommendation routing, Pytest suite |

---

## 2. Technology Layer Partitioning & Deliverables

### 2.1. Python (`analytics/` Microservice — 3 Engines)
* **Person A: Ishika (`analytics/core/bed_analytics.py`, `routers/bed_router.py`)**:
  * Log-normal Average Length of Stay (ALOS) modeling.
  * Ward depletion and time-to-zero bed exhaustion forecasting.
  * `POST /analytics/beds/forecast`, `POST /analytics/beds/turnover`.
  * Pytest suite: `analytics/tests/test_bed_analytics.py`.
* **Person B: Aarpan (`analytics/core/queue_engine.py`, `routers/queue_router.py`)**:
  * Multi-server ($M/M/c$) Erlang-C queue wait-time mathematical formulas.
  * Dynamic triage priority aging offsets preventing starvation.
  * `POST /analytics/queue/estimate`, `POST /analytics/queue/saturation`.
  * Pytest suite: `analytics/tests/test_queue_engine.py`.
* **Person C: Chinmaya (`analytics/core/city_analytics.py`, `routers/city_router.py`, `main.py`)**:
  * Multi-factor Regional Healthcare Strain Index (HSI) algorithm.
  * Optimal inter-hospital patient referral routing algorithm.
  * Microservice app assembly, shared secret authentication middleware (`x-analytics-secret`), and `/health` route.
  * Pytest suite: `analytics/tests/test_city_analytics.py`.

### 2.2. HTML & Semantic Structure (React JSX)
* **Person A: Ishika**: Ward floorplan grid, bed cards, admission/transfer/discharge `<dialog>` markup, housekeeping checklists.
* **Person B: Aarpan**: Doctor calling console tables, public TV waiting-room display (tokens only, zero PHI), token pass slips.
* **Person C: Chinmaya**: Global app shell (`<header>`, `<nav>`, drawer), accessible login & lockout banners, patient intake & UHID search forms, city capacity tiles.

### 2.3. CSS Stylesheets & Design Tokens
* **Person A: Ishika (`web/src/styles/beds.css`)**: Ward CSS grid layout, bed occupancy status badges, modal backdrop blur and `@keyframes slideUp` transitions.
* **Person B: Aarpan (`web/src/styles/queue.css`)**: High-contrast dark public TV theme (WCAG AAA), emergency flash pulse, audio visualizer wave indicator.
* **Person C: Chinmaya (`web/src/styles/tokens.css`, `layout.css`, `forms.css`)**: Root design tokens (`:root`), responsive app shell layout, floating input labels, login error `@keyframes shake`.

### 2.4. JavaScript (Full-Stack: React + Node.js)
* **Person A: Ishika**: `useBedManagement.js` hook, bed allocation handlers, `bed.controller.js`, `bed.service.js`, concurrency row-locking with `SELECT ... FOR UPDATE SKIP LOCKED`.
* **Person B: Aarpan**: `useQueue.js`, `usePolling.js` real-time hook, `queue.controller.js`, `queue.service.js`, atomic token counter, compare-and-swap status transitions.
* **Person C: Chinmaya**: `useAuth.jsx`, route guards (`RequireAuth`, `RequireRole`), Express 9-stage pipeline (`app.js`, `server.js`), `auth.controller.js` (Argon2id + JWT), `patient.controller.js` (UHID generation), `city.controller.js`, idempotency replay middleware.

---

## 3. Production-Grade Hospital Requirements

| Requirement | Architectural Solution | Owner | Status |
| :--- | :--- | :--- | :--- |
| **Identity & Access** | `app_user`, Argon2id hashing, 5-attempt atomic lockout, JWT signing (15-min expiry, hospital scope), route guards. | Person C | Schema done; Auth routes pending |
| **Real Authorization** | Every query scoped by hospital; API runs as non-owner `api_user` with RLS; city dashboard reads aggregate view through `city_reader`. | Person C | Migration `004` pending |
| **Audit Completeness** | Append-only `audit_log` with before/after JSONB snapshots written on admit, transfer, discharge, queue call, and referral; DML revoked. | Person C (helper), All | Schema done; Helper pending |
| **Patient Identity** | UUID IDs, unique UHID per hospital, date of birth, duplicate check warning, merge pointer cycle prevention. | Person C | Schema done; Routes pending |
| **Bed Integrity** | `bed_assignment` history, composite FKs, status transition triggers, reservation expiry sweeper. | Person A | Migration `002` completed |
| **Safe Retries & Concurrency**| `Idempotency-Key` pre-claim replay; atomic token counters; compare-and-swap status updates; raw row locks (`SKIP LOCKED`). | Person C (idempotency), Person A (beds), Person B (queue) | Schema done; Middlewares pending |
| **Fair Queueing** | Defined priority levels, priority aging formula so low priority is never starved, audited emergency flag, "symptoms worse" escalation. | Person B | Migration `003` ready; Service pending |
| **Honest Wait Estimates** | Live doctor count $c$; FastAPI computes Erlang-C range estimate; Node client falls back gracefully if Python service is down. | Person B (service), Person C (client) | Pending |
| **Privacy & DPDP** | Waiting-room display shows tokens only; zero PHI in logs or URLs; masked contact numbers. | Person B, Person C | Pino redaction planned |
| **Migrations & CI** | All SQL migrations via `node-pg-migrate` with `prisma db pull`; GitHub Actions runs fresh Postgres 16 and all tests on each PR. | Person C | CI operational; `001`, `002` completed |

---

## 4. Day-by-Day Execution Timeline

### Phase 1 — Foundation (Days 1–2) [COMPLETED]
* **Milestone**: End of Day 1: Migrations apply cleanly on fresh Postgres in CI. End of Day 2: Login works, seed data populates, and staff users only see their own hospital's rows.

| Day | Person A: Ishika (Beds) | Person B: Aarpan (Queue) | Person C: Chinmaya (Platform & Auth) |
| :--- | :--- | :--- | :--- |
| **Day 1**<br>Sat 24 Oct [COMPLETED] | **`[COMPLETED]`** `002_ward_bed_assignment.sql`<br>**`[COMPLETED]`** `tokens.css`<br>**`[COMPLETED]`** `Badge.jsx`, `Modal.jsx`, `Table.jsx` | **`[COMPLETED]`** Repo structure alignment<br>**`[COMPLETED]`** `003_queue_core.sql`<br>• Shared API client + `usePolling` hook<br>• FastAPI skeleton (`/health`) | **`[COMPLETED]`** Repo init & `api/package.json`<br>**`[COMPLETED]`** `001_identity_core.sql`<br>**`[COMPLETED]`** CI workflow (`ci.yml`)<br>**`[COMPLETED]`** Proposal overhaul<br>• Express skeleton (`app.js`, `server.js`) |
| **Day 2**<br>Sun 25 Oct – Mon 2 Nov [COMPLETED] | • Bed Prisma model & relations<br>• Bed routes (`GET /beds`, status updates)<br>• Bed state-machine helper<br>• Bed seed generator | • Queue Prisma model & relations<br>• `POST /queue/join` with atomic counter<br>• `GET /queue/:id`<br>• Priority levels defined in API | • Auth routes: login & register (Argon2id)<br>• Account lockout (5 attempts) & JWT signing<br>• RBAC & hospital-scoping middleware<br>• Patient routes with UHID & duplicate check<br>• Master seed runner (`prisma/seed.js`) |

---

### Phase 2 — Core Backend & Analytics (Days 3–5 morning)
* **Milestone**: End of Day 5 Morning: Backend checkpoint. CI is green, cross-authorization penetration tests pass, and API contract `backend-v1` is frozen.

| Day | Person A: Ishika (Beds) | Person B: Aarpan (Queue) | Person C: Chinmaya (Platform & Auth) |
| :--- | :--- | :--- | :--- |
| **Day 3**<br>Tue 3 Nov | • `admitPatient`, `discharge`, `transfer` routes with `FOR UPDATE SKIP LOCKED`<br>• `withTransaction()` integration<br>• Concurrency test (20 requests vs 5 beds) in CI | • `call-next` route with priority aging<br>• Compare-and-swap transitions (`WHERE status = 'WAITING'`)<br>• No-show / hold logic<br>• Audited emergency flag & queue unit tests | • Idempotency middleware on admit, join, referral<br>• Migration `004_roles_and_rls.sql`<br>• Switch API to non-owner `api_user` role<br>• Enable RLS on `patient`, `admission`, `queue_entry`<br>• Cross-hospital authorization tests |
| **Day 4**<br>Wed 4 Nov | • Waitlist table & auto-assign logic<br>• Housekeeping routes (`CLEANING` $\to$ `AVAILABLE`)<br>• Reservation-expiry sweeper<br>• Bed analytics engine (`analytics/bed_analytics.py`) & Pytest suite | • Erlang-C mathematical formula in FastAPI (`analytics/queue_engine.py`)<br>• `POST /estimate` returning wait range<br>• Live `doctor_session` counter<br>• Queue analytics Pytest suite (`tests/test_queue_engine.py`) | • `city_reader` role + aggregate view `v_hospital_capacity`<br>• Referral routes with expiry<br>• City strain & load-balancing engine (`analytics/city_analytics.py`) & Pytest suite<br>• Node $\to$ FastAPI client with timeout & fallback |
| **Day 5 AM**<br>Thu 5 Nov | **Backend Checkpoint (All Together)**:<br>Try to break teammate's authorization: cross-hospital reads, unauthenticated mutations, replayed idempotency requests. Fix findings, tag `backend-v1`. | | |

---

### Phase 3 — Frontend Integration (Days 5 afternoon–7)
* **Milestone**: End of Day 7: Full patient journey operable in the browser: intake $\to$ queue $\to$ consult $\to$ bed allocation $\to$ discharge $\to$ housekeeping.

| Day | Person A: Ishika (Beds) | Person B: Aarpan (Queue) | Person C: Chinmaya (Platform & Auth) |
| :--- | :--- | :--- | :--- |
| **Day 5 PM**<br>Thu 5 Nov | • Ward bed map screen + `beds.css`<br>• Live occupancy indicators (color + text) | • Staff queue board + `queue.css`<br>• Calling controls | • React App shell, router, route guards<br>• Login screen with lockout feedback |
| **Day 6**<br>Fri 6 Nov | • Admit, discharge, and transfer modals<br>• Bed reservation countdown timer | • Doctor calling console<br>• Patient token screen<br>• Waiting-room display (tokens only, no PHI)<br>• "Symptoms worse" button | • Patient registration form with duplicate modal<br>• Patient consent notice page<br>• User and role admin screens |
| **Day 7**<br>Sat 7 Nov | • Housekeeping sanitation board<br>• Bed waitlist view<br>• Mobile-responsive bed layout | • Queue stats widget<br>• Priority aging indicator<br>• Stale-data indicator | • City capacity dashboard (aggregates with timestamp)<br>• Inter-hospital referral UI<br>• Audit-log viewer screen |

---

### Phase 4 — Hardening & Freeze (Day 8)
* **Milestone**: End of Day 8: Feature freeze. Full end-to-end rehearsal from a fresh database under different user roles.

| Day | Person A: Ishika (Beds) | Person B: Aarpan (Queue) | Person C: Chinmaya (Platform & Auth) |
| :--- | :--- | :--- | :--- |
| **Day 8**<br>Sun 8 Nov | • Bed & ward admin screen<br>• Transfer edge cases (double discharge, zero beds free)<br>• Concurrency bug fixes | • k6 load test on queue join & call-next<br>• Wait-time model calibration against sample clinic data<br>• Department & doctor session admin | • Security pass: helmet headers, CORS allow-list, rate limits, no PHI in logs<br>• Playwright end-to-end automated test<br>• Backup $\to$ restore drill on clean database |

---

### Phase 5 — Testing, Documentation & Demo (Days 9–10)

| Day | Person A: Ishika (Beds) | Person B: Aarpan (Queue) | Person C: Chinmaya (Platform & Auth) |
| :--- | :--- | :--- | :--- |
| **Day 9**<br>Mon 9 Nov | • Final concurrency edge-case tests<br>• ER diagram v2 validation<br>• Written paper-fallback downtime procedure<br>• Bed integrity section of project report | • Load-test results & token-uniqueness proof<br>• Wait-time model limits & assumptions<br>• DFD 2A (Queue workflow)<br>• Analytics section of project report | • README (setup, env, migrations, roles)<br>• DFD 0, 1, 2C, 2D<br>• Threat model & privacy documentation<br>• Report assembly & demo seed dataset |
| **Day 10**<br>Tue 10 Nov | • Buffer & bug fixes<br>• Rehearse bed & admission live demo | • Buffer & bug fixes<br>• Rehearse queue & analytics live demo | • Buffer & bug fixes<br>• Presentation slides<br>• Rehearse platform, auth & city demo |

---

## 5. Scope Tiers (Cut from Bottom if Behind)

* **Must Have**: Migration-built schema, Prisma models, users/roles/auth with hospital scoping, Argon2id hashing, lockout, audit log, bed reservation with locking (`SELECT ... FOR UPDATE SKIP LOCKED`), queue join and call-next with atomic tokens, Erlang-C range estimate, bed map, queue board, token screen, automated tests in CI.
* **Should Have**: Waitlist auto-assignment, city dashboard on aggregate role, referral workflow, admin screens, audit-log viewer, duplicate-patient warning, k6 load test.
* **Could Have**: Supabase realtime (use 5-second polling instead), patient merge UI, deployment to Render/Vercel.
* **Documented, Not Built**: Full DPDP consent management program, MFA, high availability clustering, ABDM/ABHA integration, appointment scheduling, time-varying wait-time models, clinical diagnostic validation.

---

## 6. Definition of Done

* [ ] **Concurrency Guarantee**: 20 simultaneous admit requests against 5 beds produce exactly 5 admissions and 15 rejections/waitlist entries; repeating a request with the same `Idempotency-Key` and matching payload hash returns the cached response without creating a second record; reusing an `Idempotency-Key` with a differing request payload hash deterministically returns `422 Unprocessable Entity`.
* [ ] **Tenant Isolation**: A staff user at Hospital X cannot read, modify, or delete Hospital Y's patients, beds, or queues (enforced by automated test); the city viewer role reads aggregated capacity only.
* [ ] **Audit Completeness**: Every state mutation (admit, transfer, discharge, queue call, referral) writes an immutable `audit_log` row with before/after JSONB state snapshots.
* [ ] **Queue Integrity**: Queue tokens are sequential and unique per department per day; call-next respects triage priority with aging so low-priority patients are not starved.
* [ ] **Honest Wait Estimates**: Wait-time estimates are displayed as a range computed from Erlang-C using live doctor count, with an automated fallback when the analytics service is unavailable.
* [ ] **Clean CI Build**: A fresh database builds successfully from migrations in GitHub Actions CI, and all tests pass.
