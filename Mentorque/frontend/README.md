# Mentorque — Availability Tracker Frontend

React 18 + Vite + Tailwind frontend for the mentoring call scheduling
platform. Talks to the backend in `../backend`.

## Setup

```bash
npm install
cp .env.example .env   # set VITE_API_URL to your backend URL
npm run dev             # http://localhost:5173
```

## What changed from the original repo

- Removed OAuth/SSO entirely: `Welcome.jsx`, `SSO.jsx`, and self-registration
  (`Register.jsx`, `/auth/register`) are gone. `Login.jsx` is now a plain
  email/password form with a remember-me option; accounts are seeded by the
  backend, not self-registered.
- Removed the Google Calendar "connect" flow from `AdminSettings.jsx` —
  meetings now take a plain meeting-link URL the admin pastes in.
- Fixed the admin scheduling form to actually match the backend's booking
  contract (`userId`/`mentorId`/ISO `startTime`/`endTime`/`callType`
  instead of the old date/time-string/timezone shape that didn't line up
  with the API).
- Added `RecommendationDashboard.jsx` — pick a user + call type, get the
  AI-ranked top 3 mentors with reasoning and confidence, check real
  availability overlap, and book directly from a recommended slot.
- Added `ManageProfiles.jsx` — admin editor for mentor/user descriptions and
  tags (the inputs the recommendation engine matches on), plus
  mentor-specific fields (company, domain, big-tech flag, experience,
  communication score).

## Pages

| Route | Role | Purpose |
|---|---|---|
| `/login` | — | Sign in |
| `/availability` | USER | Set weekly recurring availability |
| `/mentor` | MENTOR | Set weekly recurring availability |
| `/admin` | ADMIN | Dashboard: view user+mentor availability side by side, common times, schedule/manage meetings |
| `/admin/recommendations` | ADMIN | AI mentor matching for a user + call type |
| `/admin/profiles` | ADMIN | Edit tags/descriptions/profile fields |
| `/admin/schedules` | ADMIN | Team-wide schedule view |
| `/admin/settings` | ADMIN | Account info |

## Notes

- No TypeScript, shadcn/ui, or React Query in this codebase — it's the
  original JS/Tailwind stack, extended in place rather than rewritten, per
  the assignment's "maintain compatibility with the existing repo"
  evaluation criterion.
- `npx vite build` passes cleanly; run it after further changes to catch
  stale imports early.
