# Mentorque — Mentoring Call Scheduling Platform

A production-shaped mentoring call scheduling platform with role-based
access control, recurring availability management, real overlap detection,
and an AI-powered mentor recommendation engine. Built by extending two
existing repositories (`backend/`, `frontend/`) rather than a ground-up
rewrite, per the assignment's "maintain compatibility with the existing
codebase" evaluation criterion.

## Overview

Admins manage a roster of mentors and users, each with tags and a
free-text description. When a user is ready for a mentoring call, an admin
picks a call type (Resume Revamp, Job Market Guidance, or Mock Interview)
and the recommendation engine returns the top 3 best-fit mentors with
reasoning and a confidence score. The admin checks real availability
overlap between the user and a candidate mentor and books the call — users
and mentors never book for themselves, they only manage their own weekly
availability.

## Architecture

```
┌──────────────┐        REST/JSON        ┌──────────────┐        SQL        ┌─────────────┐
│   Frontend    │ ──────────────────────▶ │   Backend     │ ─────────────────▶ │  PostgreSQL  │
│ React + Vite  │ ◀────────────────────── │ Express + JWT │ ◀───────────────── │ (Neon/       │
│ (nginx-served │                         │   + Prisma    │                    │  Supabase/   │
│  in Docker)   │                         └──────┬───────┘                    │  local)      │
└──────────────┘                                 │                            └─────────────┘
                                                  │ optional, all fall back
                                                  ▼ gracefully with no key
                                   ┌─────────────────────────────┐
                                   │ HuggingFace (embeddings)     │
                                   │ OpenAI / Gemini (reasoning)  │
                                   └─────────────────────────────┘
```

- **Auth**: single-secret JWT, `bcrypt` password hashing, role middleware
  (`USER` / `MENTOR` / `ADMIN`). No OAuth, no self-registration — accounts
  are seeded.
- **Availability**: a recurring weekly template (`AvailabilityTemplate`)
  plus per-week exceptions (`AvailabilityException`), not a table of
  one-off rows — so a mentor sets their schedule once and it repeats.
- **Overlap**: `services/overlap.js` materializes both parties' effective
  weekly grids across a date range and intersects them, merging contiguous
  matching hours into human-readable ranges.
- **Recommendations**: a two-stage vectorless RAG pipeline —
  embedding-based retrieval (`services/embeddings.js`, DB-free and unit
  tested) narrows the mentor pool, then an LLM (or a transparent
  deterministic fallback) ranks and explains the top 3.
- **Analytics**: `services/analytics.js` aggregates totals, weekly
  activity, booking trends, call-type distribution, and mentor utilization
  for the admin dashboard (Recharts) and CSV export.

## Features

- Role-based access control (User / Mentor / Admin) with protected routes
  on both frontend and backend
- Recurring weekly availability with per-week overrides, timezone display
  (GMT/IST), and a drag-to-toggle grid
- Real multi-slot availability overlap computation (not just a single
  window check)
- Double-booking prevention at meeting-creation time
- AI mentor recommendations: top 3 ranked mentors with reasoning and a
  confidence score, call-type-aware (Big Tech / communication / domain
  weighting)
- Admin-managed mentor & user tags and descriptions
- Meeting scheduling, cancellation, and rescheduling, with a manually
  pasted meeting link (no calendar integration — intentionally simplified)
- Analytics dashboard: KPI cards, weekly activity, booking trends,
  call-type distribution, mentor utilization — all Recharts
- CSV export for users, mentors, bookings, and recommendations
- Toasts, skeleton loaders, empty states, and a top-level error boundary
- Route-level code splitting (admin-only pages, including the
  Recharts-heavy analytics page, are lazy-loaded)

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Recharts, Luxon |
| Backend | Node.js, Express (ESM), Prisma ORM |
| Database | PostgreSQL (Neon, Supabase, or local — just a connection string) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| AI | HuggingFace (embeddings) → OpenAI or Gemini (reasoning), both optional |
| Testing | Node's built-in test runner (`node:test`) — no extra dependency |
| Linting | ESLint (flat config) on both frontend and backend |
| CI/CD | GitHub Actions — install, lint, build, test, live-DB smoke test |
| Containerization | Docker + Docker Compose (Postgres + backend + nginx-served frontend) |

## Folder structure

```
.
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # data model
│   │   └── migrations/
│   ├── src/
│   │   ├── controllers/         # request handlers
│   │   ├── routes/              # Express routers
│   │   ├── middleware/          # auth, error handling
│   │   ├── services/            # overlap, recommendation, embeddings, analytics
│   │   ├── scripts/seed.js      # 1 admin, 5 mentors, 10 users
│   │   └── utils/               # time helpers, CSV serializer
│   ├── tests/                   # node:test unit tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/                # route-level screens
│   │   ├── components/           # shared UI (Layout, modals, skeletons, toasts)
│   │   ├── context/               # Auth + Toast providers
│   │   ├── api/                   # thin fetch wrappers per resource
│   │   └── utils/                 # timezone/date helpers
│   └── Dockerfile
├── docker-compose.yml            # one-command local stack
└── .github/workflows/ci.yml      # CI pipeline
```

## Database schema

Key models (see `backend/prisma/schema.prisma` for the full definition):

- **User** — single table for all three roles (`role: USER | MENTOR |
  ADMIN`); carries auth fields plus matching-relevant profile fields
  (`description`, `tags`, `company`, `isBigTech`, `domain`,
  `yearsExperience`, `communicationScore`, cached `embedding`)
- **Tag** — admin-managed, many-to-many with `User`
- **CallType** — the 3 call types, each with a `weights` JSON column the
  recommendation engine reads (extensible without a code change)
- **AvailabilityTemplate** / **AvailabilityException** — recurring weekly
  pattern + per-week overrides
- **Meeting** / **MeetingParticipant** — bookings, with `status`
  (`SCHEDULED` / `CANCELLED` / `COMPLETED` / `RESCHEDULED`)
- **Recommendation** — audit log of every recommendation run, with the
  ranked results and which model produced them

## Setup

### 1. Database

Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) (free
tier, just a Postgres connection string), or run Postgres locally.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npx prisma generate
npx prisma db push
npm run db:seed             # 1 admin, 5 mentors, 10 users
npm run dev                 # http://localhost:5001
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL should point at your backend
npm run dev                 # http://localhost:5173
```

## Environment variables

**Backend** (`backend/.env.example`):

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `JWT_SECRET` | yes | — | Single secret, no OAuth/SSO |
| `JWT_EXPIRES_IN` | no | `7d` | |
| `PORT` | no | `5001` | |
| `FRONTEND_URL` | no | `http://localhost:5173` | CORS allow-list |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | no | see `.env.example` | seed script |
| `SEED_PASSWORD` | no | `password123` | shared password for seeded mentors/users |
| `HF_API_KEY` / `HF_EMBEDDING_MODEL` | no | unset → deterministic fallback | embeddings |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | no | unset → deterministic fallback | primary reasoning LLM |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | unset → deterministic fallback | fallback reasoning LLM |

**Frontend** (`frontend/.env.example`):

| Variable | Required | Default |
|---|---|---|
| `VITE_API_URL` | yes | `http://localhost:5001` |

Every AI-related variable is optional — with none set, the recommendation
engine still works end-to-end using a deterministic hashed-embedding
retrieval stage and a transparent weighted-scoring ranking stage. This
matters for grading/CI/local dev without live API credentials.

## Seed script

`npm run db:seed` (backend) creates **1 admin, 5 mentors, 10 users** with
realistic names, emails, descriptions, tags, mentor-specific fields
(company, domain, Big Tech flag, years of experience, communication
score), and a recurring weekly availability pattern for every account —
plus the 3 call types the recommendation engine matches against. It's
upsert-based, so it's safe to re-run.

## Run locally (without Docker)

See **Setup** above — `npm run dev` in each of `backend/` and `frontend/`.

## Docker

One-command startup — spins up Postgres, pushes the schema, seeds the
database, and serves the frontend behind nginx:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- Postgres: localhost:5432 (`mentorque` / `mentorque`)

Override any default via a `.env` file at the repo root (e.g.
`JWT_SECRET`, `OPENAI_API_KEY`) — `docker-compose.yml` reads all of them
with sane fallbacks so `docker compose up --build` works with zero
configuration out of the box.

## API endpoints

```
POST   /api/auth/login                          email/password -> { user, token }
GET    /api/auth/me                              current user

GET    /api/admin/users | /mentors               list, with tags/profile fields
POST   /api/admin/create-user                    provision a USER/MENTOR account
PATCH  /api/admin/users/:id/profile              edit description/tags/profile fields
GET    /api/admin/tags                           all tags
GET    /api/admin/call-types                     the 3 call types + weights

GET    /api/admin/availability/:userId           weekly availability grid
GET    /api/admin/overlap/:userId/:mentorId       computed overlap (merged ranges)

POST   /api/admin/recommendations                 { userId, callType } -> top 3 + reasoning
GET    /api/admin/recommendations/:userId          recommendation history

POST   /api/admin/meetings                         book (double-booking blocked)
POST   /api/admin/meetings/:id/cancel
POST   /api/admin/meetings/:id/reschedule
GET    /api/meetings                                role-scoped meeting list
DELETE /api/meetings/:id

GET    /api/admin/analytics                         KPIs + weekly activity + trends + distribution
GET    /api/admin/export/users.csv
GET    /api/admin/export/mentors.csv
GET    /api/admin/export/bookings.csv
GET    /api/admin/export/recommendations.csv

GET    /api/availability                            self-service weekly grid (User/Mentor)
POST   /api/availability/batch                      save a week or the recurring template

GET    /health                                       liveness check
```

## Demo credentials

After running the seed script, the console prints the exact accounts
created. Defaults (overridable via env vars):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@mentorque.dev` | `admin1234` |
| Any seeded mentor/user | see seed output, e.g. `ananya.rao@mentorque.dev` | `password123` |

## Screenshots

_Add screenshots of the login page, admin dashboard, recommendation
dashboard, and analytics dashboard here before sharing externally._

## Future improvements

- Automated integration tests against a real ephemeral database (the CI
  pipeline already smoke-tests this; a fuller Jest/Supertest suite would
  go further)
- pgvector-backed embeddings as a drop-in upgrade path for larger mentor
  pools (the current JSON-array + in-process cosine similarity approach
  is intentionally vectorless and scales fine for tens–low hundreds of
  mentors, but a real ANN index would help beyond that)
- Real calendar integration (Google Calendar / Zoom) instead of a pasted
  meeting link, if OAuth complexity is back in scope
- Mentor/user self-service rescheduling requests (currently admin-only, by
  design)
- i18n and additional timezone options beyond GMT/IST
