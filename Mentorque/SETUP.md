# Mentorque Mentoring Call Scheduling — Quickstart

Two folders: `backend/` (Express/Prisma API) and `frontend/` (React/Vite app).
See each folder's own README.md for full details — this is the fast path.

## 1. Database

Create a free Postgres database on [Neon](https://neon.tech) or
[Supabase](https://supabase.com) — either works, it's just a connection
string. Copy the connection string.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# edit .env: paste your DATABASE_URL, set a real JWT_SECRET
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Backend runs at `http://localhost:5001`. The seed script prints the admin
login and the shared password for all seeded mentors/users to the console.

## 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL should already point at localhost:5001
npm run dev
```

Frontend runs at `http://localhost:5173`. Sign in with the admin
credentials printed by the seed script, or any seeded mentor/user email
with the shared `SEED_PASSWORD`.

## 4. Try it end to end

1. Log in as admin.
2. **Profiles & Tags** — review/edit a mentor's description and tags.
3. As a separate step, log in as a seeded user or mentor (different
   browser/incognito) and confirm their weekly availability is already
   populated from the seed script.
4. Back as admin → **Recommendations** — pick a user and a call type
   (Resume Revamp / Job Market Guidance / Mock Interview), get the
   AI-ranked top 3 mentors with reasoning, check overlap, and book a slot.
5. **Dashboard** — see the booked meeting, or use the manual
   user+mentor+time picker with the "Common Times" table to book directly.

## What was intentionally simplified (per the assignment brief)

- No OAuth, no Supabase client SDK, no self-registration — single-secret
  JWT auth only, seeded accounts only.
- No calendar integration — meetings take a plain pasted-in link instead of
  creating real Google Calendar events.
- No pgvector dependency — the recommendation engine's embeddings are
  plain JSON float arrays compared with in-process cosine similarity
  ("vectorless RAG"), so it works on any Postgres instance.
- AI calls (HuggingFace/OpenAI/Gemini) are all optional — every path has a
  deterministic fallback so the app is fully functional with zero API keys
  configured, which matters for grading/testing without live credentials.

## What I did not get to

This was built by extending the two existing repos in place, focused on
making auth, availability, overlap, recommendations, and booking correct
end-to-end. Not done in this pass:

- Docker / docker-compose / CI
- Automated tests
- CSV export, admin analytics charts (the `/api/admin/analytics` endpoint
  exists; there's no dashboard chart consuming it yet)
- Timezone selector polish beyond the existing IST/GMT toggle

Happy to pick any of these up next if useful.
