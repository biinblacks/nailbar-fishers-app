# Nail Bar — Nail Salon SaaS

A multi-tenant platform for nail salons: AI receptionist, online booking, customer CRM,
and (coming) Vietnamese ⇄ English interpreter, automations, and AI marketing.

Docs: [`docs/AUDIT.md`](docs/AUDIT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md)

## Repository layout

```
.
├── web/        Next.js 15 (App Router) SaaS dashboard  ← Phase 1, the future of the product
│   ├── app/        routes: /login /signup /app/new /app/[slug]/{appointments,customers,services,staff,settings}
│   ├── actions/    server actions (zod-validated, RLS-scoped)
│   ├── components/ ui/, forms/, app/ (sidebar, nav)
│   └── lib/        supabase clients, types, validation, formatting, salon access helpers
├── client/     Vite + React storefront, booking page, AI chat widget, legacy admin (kept)
├── server/     Express API: /api/chat, /api/bookings, /api/salon, /api/admin (tenant-aware)
├── supabase/
│   ├── schema.sql                     base schema (single-salon v1)
│   ├── migrations/0001_multi_tenant_salons.sql   multi-tenant upgrade (run after schema.sql)
│   ├── seed.sql                       demo data for the "nail-bar" salon
│   └── dedupe_and_harden.sql          legacy one-off cleanup (superseded by 0001)
├── scripts/ping.mjs                   keep-alive for the Render-hosted API
└── docs/                              audit, architecture, migration plan
```

`web/` has its own `package-lock.json` and is built standalone (Vercel root directory =
`web`). `client/` and `server/` are npm workspaces of the root.

## 1. Database (Supabase)

Run in the SQL editor, in order:

1. `supabase/schema.sql`
2. `supabase/migrations/0001_multi_tenant_salons.sql`
3. `supabase/seed.sql` (optional demo salon `nail-bar`)

Upgrading an existing install: run step 2 only. It creates the `nail-bar` salon from your
current `salon_profile` row, backfills `salon_id` everywhere, and turns every `admin_users`
row into an **owner** of that salon. It is idempotent.

Auth → URL configuration: add `https://<your-web-domain>/auth/callback` (and
`http://localhost:3000/auth/callback` for local dev) to the redirect allow-list.

## 2. Environment variables

**web/.env.local** (from `web/.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**server/.env** (from `server/.env.example`)
```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
DEFAULT_SALON_SLUG=nail-bar
```

**client/.env** (from `client/.env.example`)
```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SALON_SLUG=nail-bar        # optional; API falls back to DEFAULT_SALON_SLUG
```

## 3. Run locally

```bash
npm install            # client + server workspaces
npm run install:web    # web/ (standalone lockfile)

npm run dev:web        # Next.js dashboard  → http://localhost:3000
npm run dev            # Vite storefront (5173) + Express API (4000)
```

Checks: `npm run typecheck`, `npm run lint`, `npm run build` (client + server),
`npm run build:web`.

## 4. First login

1. Open `http://localhost:3000/signup`, create an account (confirm the email if
   confirmations are enabled in Supabase).
2. You land on `/app/new` — create your salon. The URL slug becomes `/app/<slug>`.
3. Add services, technicians, and customers; book appointments from the dashboard.

Existing admins of the Fishers salon: sign in with the same email/password at
`/login`; you are already an owner of `/app/nail-bar` after the migration.

## 5. How tenancy works

- `salons` is the tenant; `salon_members` gives users `owner` / `admin` / `staff` roles.
- Every table has `salon_id`. Row Level Security policies allow access only when
  `is_salon_member(salon_id)`; the dashboard uses the anon key + the user's session, so the
  database enforces isolation.
- The Express API picks the salon from the `x-salon-slug` header, `?salon=` query, or
  `DEFAULT_SALON_SLUG`, and checks membership for `/api/admin/*`.

## 6. AI receptionist (current)

Unchanged in behaviour: `POST /api/chat` rebuilds the system prompt from the salon's live
data on every message (`server/src/services/knowledge.service.ts`), now scoped to one
salon. Transcripts are visible to salon members only. Phase 2 moves this into Next.js route
handlers and adds availability-aware booking.

## 7. Deployment

- **web** → Vercel, root directory `web`, framework Next.js, env vars from `web/.env.example`.
- **client** → Vercel, root directory `client` (unchanged), plus `VITE_SALON_SLUG`.
- **server** → Render/Railway/Fly, root `server`, `npm run build` / `npm start`, add
  `DEFAULT_SALON_SLUG`.

## 8. Security notes

- Service role key is used only by `server/` (never in `web/` or `client/`).
- Anonymous access is read-only and limited to active storefront content; chat transcripts,
  customers, and appointments require salon membership.
- Salons a user cannot access return 404 in the dashboard, so slugs cannot be enumerated.
