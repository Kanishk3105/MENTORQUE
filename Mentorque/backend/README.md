# Mentorque — Availability Tracker Backend

Node.js / Express / Prisma / PostgreSQL API for the mentoring call scheduling
platform. Simplified per the assignment brief: single-secret JWT auth (no
OAuth/SSO), no self-registration (accounts are seeded), admin-only booking.

## Stack

- Node.js + Express (ESM)
- PostgreSQL (Neon or Supabase both work — it's just a Postgres connection string) via Prisma
- JWT auth (`jsonwebtoken` + `bcryptjs`)
- AI recommendation pipeline: HuggingFace embeddings (vectorless — cosine
  similarity computed in JS, no pgvector required) → OpenAI or Gemini for
  final ranked reasoning, with deterministic offline fallbacks if no API
  keys are configured

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma generate
npx prisma db push     # creates tables from schema.prisma
npm run db:seed        # 1 admin, 5 mentors, 10 users, call types, tags
npm run dev            # http://localhost:5001
```

`db push` is used instead of `migrate dev` for simplicity in this
assignment; swap to `prisma migrate dev` if you want tracked migration
files for a real deployment.

## Environment variables

Only what's actually needed (see `.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Neon/Supabase/local) |
| `JWT_SECRET` | yes | Single secret, no more dual-secret SSO verification |
| `JWT_EXPIRES_IN` | no | Default `7d` |
| `PORT` | no | Default `5001` |
| `FRONTEND_URL` | no | CORS allow-list, comma-separated for multiple origins |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | no | Used by the seed script |
| `SEED_PASSWORD` | no | Password for all seeded mentors/users |
| `HF_API_KEY` / `HF_EMBEDDING_MODEL` | no | HuggingFace embeddings for the recommendation engine; falls back to a deterministic hashed embedding if unset |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | no | Primary LLM for recommendation reasoning |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | no | Fallback LLM if OpenAI fails/unset |

All Google OAuth, Supabase, and `MAIN_SITE_JWT_SECRET` variables from the
original repo have been removed entirely, per the assignment brief.

## Auth

- `POST /api/auth/login` — `{ email, password, rememberMe }` → `{ user, token }`
- `GET /api/auth/me` — current user (Bearer token)
- No `/api/auth/register` — accounts are provisioned by an admin
  (`POST /api/admin/create-user`) or via the seed script.

Roles: `USER`, `MENTOR`, `ADMIN`. `requireRole()` middleware enforces RBAC
on every admin route.

## Core flow

- **Users & Mentors**: log in, set their own recurring weekly availability
  (a template of day/hour slots + per-week exceptions). Neither can book
  calls.
- **Admin**: manages mentor/user tags & descriptions, requests AI
  recommendations for a user + call type, checks real availability overlap
  with a candidate mentor, and books/cancels/reschedules meetings.

## Key API endpoints

```
POST   /api/admin/create-user                 create a seeded USER/MENTOR account
GET    /api/admin/users | /mentors             list, with tags/profile fields
PATCH  /api/admin/users/:id/profile            admin edits description/tags/profile
GET    /api/admin/tags                         list all tags
GET    /api/admin/call-types                   list the 3 call types + weights
GET    /api/admin/availability/:userId         weekly grid for a user/mentor
GET    /api/admin/overlap/:userId/:mentorId    real computed overlap (merged ranges)
POST   /api/admin/recommendations              { userId, callType } -> top 3 + reasoning
GET    /api/admin/recommendations/:userId      recommendation history
POST   /api/admin/meetings                     book (double-booking blocked)
POST   /api/admin/meetings/:id/cancel
POST   /api/admin/meetings/:id/reschedule
GET    /api/admin/analytics                    counts + upcoming + by call type
```

## Recommendation engine

1. **Retrieval (vectorless RAG)**: the user's description is embedded (HF
   API if `HF_API_KEY` is set, otherwise a deterministic hashed embedding),
   compared via cosine similarity against cached mentor-description
   embeddings, and the top 8 candidates are shortlisted. No vector database
   or pgvector extension required — embeddings are plain JSON float arrays
   on the `User` row.
2. **Ranking**: the shortlist + call-type priority weights are sent to
   OpenAI (or Gemini as fallback) with a strict JSON response format,
   asking for the top 3 with a score, confidence, and 1-2 sentence
   reasoning. If neither key is configured, a transparent deterministic
   weighted-scoring fallback produces the same shape of result so the
   feature always works.
3. Call-type weighting (editable per-row in the `CallType.weights` JSON
   column): Resume Revamp favors Big Tech mentors, Job Market Guidance
   favors high communication scores, Mock Interview favors same-domain
   mentors.

## Availability & overlap

Availability is a recurring weekly template (`AvailabilityTemplate`) plus
per-week overrides (`AvailabilityException`) — not a table of one-off rows.
`services/overlap.js` walks both parties' effective weekly grids across the
requested date range and intersects by `(date, startTime)`, merging
contiguous matching hours into human-readable ranges. Double-booking is
prevented at meeting-creation time by checking for any existing
`SCHEDULED` meeting overlapping the requested window for either party.

## Seed data

`npm run db:seed` creates 1 admin, 5 mentors, and 10 users with realistic
names, descriptions, tags, mentor profile fields (company, domain,
big-tech flag, years of experience, communication score), and a recurring
weekly availability pattern for each — so recommendations and overlap
checks work immediately without any manual data entry.
