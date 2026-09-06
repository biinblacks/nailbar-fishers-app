# Repository audit (September 2026)

Snapshot of the codebase as it stood at commit `116bacf` (before the SaaS work began), what
works, what is reusable, and what is broken or unfinished.

## What the repo is

A single-salon marketing site + AI receptionist + online booking + admin dashboard for
"Nail Bar" in Fishers, IN.

| Area | Location | Stack |
| --- | --- | --- |
| Storefront + admin SPA | `client/` | React 18, Vite 5, TypeScript, Tailwind 3, React Router 6 |
| API | `server/` | Node, Express 4, TypeScript, zod, helmet, express-rate-limit |
| Database | `supabase/schema.sql`, `seed.sql`, `dedupe_and_harden.sql` | Supabase Postgres + RLS + Auth |
| AI | `server/src/services/ai.service.ts`, `knowledge.service.ts` | Google Gemini (`@google/generative-ai`) |
| Hosting | `client/vercel.json`, `scripts/ping.mjs` | Vercel (client), Render (server, kept warm by a cron ping) |

## What already works

Verified by installing, type-checking, linting and building both workspaces. Both compile
cleanly; only two non-blocking lint warnings existed (fixed in this branch).

- **Public storefront** (`client/src/pages/HomePage.tsx` + `components/home/*`): hero,
  services grid (live from the API), gallery, testimonials, contact with Google Maps embed.
- **Online booking** (`/booking` → `POST /api/bookings` → `/booking/confirmation/:id`):
  service picker, date + time slots, contact form, confirmation card. Server upserts the
  customer by phone and creates a `pending` appointment.
- **AI receptionist chat** (`ChatWidget`, `ChatContext`, `POST /api/chat`): persistent
  session id in `localStorage`, transcript stored in `chat_conversations` /
  `chat_messages`, system prompt rebuilt on every message from live Supabase data
  (profile, hours, services, staff, policies, FAQs, promotions, freeform `ai_knowledge`),
  Vietnamese/English auto-detection via prompt, human-handoff keyword detection.
- **Embeddable chat** (`/embed/chat`): transparent iframe mode for third-party sites.
- **Admin dashboard** (`/admin/*`, Supabase email/password auth, JWT verified server-side):
  appointments list + status changes, services CRUD, business hours, staff CRUD,
  AI knowledge CRUD, chat transcript viewer.
- **Review request page** (`/review?name=`): thank-you page with Google review CTA.
- **Ops**: health endpoint, CORS, helmet, rate limits on chat and booking, keep-alive ping.

## Reusable "Bee Interpreter" code

**There is none.** No file, branch, commit, or other repository accessible to this session
contains interpreter, translation, speech-to-text, or text-to-speech code. The only
language-related pieces are:

- the `preferred_language` column on `customers` and `language` on `chat_conversations`;
- the Vietnamese handoff keywords and the "reply in Vietnamese if the guest writes in
  Vietnamese" instruction inside `ai.service.ts` / the seeded `ai_knowledge.multilingual` row;
- the chat UI (`ChatWidget`, `ChatMessage`, `ChatContext`) and the conversation persistence
  pattern, which are a good starting point for the two-person conversation view.

Bee Interpreter therefore has to be built new in Phase 3 (see `docs/MIGRATION_PLAN.md`). If
it lives in another repository, tell me which one and it can be folded in.

## Existing Supabase / database code

- `supabase/schema.sql`: 14 tables, `appointment_status` and `chat_role` enums, RLS enabled
  everywhere, `set_updated_at` trigger. Single-tenant: no `salon_id` anywhere,
  `salon_profile` is a one-row table, `admin_users` maps Supabase Auth users to "admin".
- `supabase/seed.sql`: demo data for the Fishers salon.
- `supabase/dedupe_and_harden.sql`: one-off cleanup that adds global unique constraints
  (e.g. one service name across the whole database) — incompatible with multi-tenancy.
- `server/src/config/supabase.ts`: service-role client (bypasses RLS) used for all server
  reads/writes. `client/src/lib/supabaseClient.ts`: anon client used only for auth.
- Live Supabase projects on the account: `chat bot` (created July 1, 2026, matches this app's
  timeline) is **paused/INACTIVE**; `mashmix` and `hd-clearance-monitor` belong to other
  projects. Nothing was changed on any live project.

## Broken, risky, or unfinished

1. **Security — any authenticated user is an admin.** Every table's write policy was
   `auth.role() = 'authenticated'`, and `requireAdmin` only checked for a valid session, not
   `admin_users`. Anyone who signed up through the anon key could edit everything.
2. **Security — public read of chat transcripts.** `chat_conversations` / `chat_messages`
   had `select using (true)` for anon. Customer conversations were readable by anyone with
   the anon key. Also anon `insert` on customers/appointments/chat was open (the app never
   used it; the API writes with the service role).
3. **Not multi-tenant.** No `salon_id`; global unique constraints on phone, service name,
   staff name, day-of-week, etc.
4. **Hard-coded salon data in the UI.** `Hero`, `Contact`, `Footer`, `ChatWidget` (phone
   number), `ReviewPage` (Google review link), `index.html` (title/meta), and
   `DateTimePicker` (fixed 9:30–18:30 slots regardless of business hours).
5. **Booking has no availability logic.** No conflict/overlap check, no staff selection in
   the form (the API accepts `staffId` but the UI never sends it), no closed-day check.
6. **Automations are placeholders.** "Review requested" is just a boolean flag; no
   reminders, no review request sending, nothing scheduled.
7. **No tests, no CI.** Only `tsc`/`eslint`.
8. **Minor:** `admin_users.role` unused; `services.image_url` / `staff.photo_url` unused;
   `client/tsconfig.tsbuildinfo` committed; README says the DB email is `luxenailbar.com`.

Items 1–3 are fixed by `supabase/migrations/0001_multi_tenant_salons.sql` and the tenant-aware
Express changes in this branch. Items 4–6 are addressed progressively in Phases 1–2.
