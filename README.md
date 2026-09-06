# Nail Bar — Nail Salon SaaS

A multi-tenant platform for nail salons: AI receptionist, online booking, customer CRM,
and (coming) Vietnamese ⇄ English interpreter, automations, and AI marketing.

Docs: [`docs/AUDIT.md`](docs/AUDIT.md) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) ·
[`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md)

## Repository layout

```
.
├── web/        Next.js 15 (App Router) SaaS dashboard  ← Phase 1, the future of the product
│   ├── app/
│   │   ├── (auth)/ login, signup, forgot-password
│   │   ├── app/[slug]/  dashboard: appointments, customers, interpreter, automations, marketing, billing, services, staff, inbox, receptionist, gallery, settings
│   │   ├── s/[slug]/    public storefront, /book, /book/[id], /chat (iframe embed), /review
│   │   └── api/         /api/chat, /api/salons/[slug]/availability, /api/interpreter/*, /api/cron/{automations,publish}, /api/webhooks/stripe
│   ├── actions/    server actions (zod-validated; dashboard ones are RLS-scoped)
│   ├── components/ ui/, forms/, app/ (dashboard shell), storefront/, booking/, chat/
│   └── lib/        supabase clients, availability engine, booking, ai/ (providers + receptionist)
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
3. `supabase/migrations/0002_receptionist_and_booking.sql`
4. `supabase/migrations/0003_invites_and_media.sql` (team invites, gallery, `salon-media` storage bucket)
5. `supabase/migrations/0004_interpreter.sql` (Bee Interpreter sessions + quick phrases)
6. `supabase/migrations/0005_automations.sql` (automation rules, job queue, message log)
7. `supabase/migrations/0006_marketing.sql` (campaigns, assets, scheduled posts, Meta connection)
8. `supabase/migrations/0007_billing_and_hardening.sql` (Stripe subscriptions, audit log, custom domains, usage)
9. `supabase/seed.sql` (optional demo salon `nail-bar`)

Upgrading an existing install: run steps 2–8 only. After changing the schema, regenerate
`web/lib/database.types.ts` (see `web/scripts/gen-types.md`). It creates the `nail-bar` salon from your
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
SUPABASE_SERVICE_ROLE_KEY=...      # server-only: public booking + AI chat
AI_PROVIDER=gemini                 # or "anthropic"
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
# ANTHROPIC_API_KEY=... ANTHROPIC_MODEL=claude-opus-5
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

## 6. Storefront, booking and AI receptionist (Phase 2)

Every salon gets, with no extra setup:

- `/s/<slug>` — public page: menu, team, hours, map, FAQs, promotions, floating AI chat.
- `/s/<slug>/book` — online booking with real availability (business hours, service
  duration, technician conflicts, lead time, booking window, buffer). Requests land as
  `pending` appointments in the dashboard.
- `/s/<slug>/chat` — transparent iframe embed for any other website (snippet shown in
  Dashboard → AI Receptionist).
- `POST /api/chat` — the receptionist rebuilds its knowledge from live data on every
  message and can check availability, book (as `source = 'ai'`), and flag a human.
  Gemini is the default provider; set `AI_PROVIDER=anthropic` to use Claude.
- Dashboard → Inbox shows every conversation; → AI Receptionist edits knowledge, FAQs,
  policies, promotions, and booking rules.
- Dashboard → Settings → Team invites teammates by email (owner / admin / staff). New
  accounts receive a Supabase Auth invitation; existing accounts get a link to share.
- Dashboard → Settings (logo), Staff (photos) and Gallery upload images to the public
  `salon-media` bucket; storage policies only let salon members write under their own
  salon folder.

The Express API keeps serving the legacy Vite storefront until you cut the domain over to
`/s/<slug>`.

## 7. Bee Interpreter (Phase 3)

Dashboard → Interpreter opens a two-person console: the technician side (Vietnamese by
default) and the guest side (English by default). Tap a mic or type; the message is
translated for the other person, read aloud with the device's voice, and saved to the
conversation history. Quick phrases cover the usual salon flow with one tap and never
call the model. Speech recognition uses the browser's Web Speech API; browsers without it
record audio and transcribe it server-side with Gemini (needs `GEMINI_API_KEY`).
Translation goes through the same provider setting as the AI receptionist.

## 8. Automations (Phase 4)

Dashboard → Automations lists six rules per salon, all off by default: reminders 24 h and
2 h before, review request after a completed visit, next-day follow-up for first-time
guests, comeback nudge after 35 days, birthday treat 3 days early. Each rule has an
English and a Vietnamese template (guests get the language on their profile), a channel
(SMS via Twilio or email via Resend), timing, and a sending window in the salon timezone.

The worker at `/api/cron/automations` plans and sends messages; `web/vercel.json` runs it
every 15 minutes on Vercel Cron with `CRON_SECRET`. Any scheduler can call it with
`Authorization: Bearer <CRON_SECRET>`. Set `MESSAGING_DRY_RUN=true` to log instead of
send. Cancelled or rescheduled appointments drop their pending reminders automatically,
and guests who opt out only receive appointment reminders.

## 9. AI marketing (Phase 5)

Dashboard → Marketing → New campaign: describe the goal, pick platforms, tone, languages,
a featured service and a promotion. The AI returns a content pack (captions, promo copy,
hashtags, SMS, email, image and video prompts) in English and Vietnamese. Edit, favorite,
copy, regenerate, and schedule posts. Connect a Facebook Page (Page ID + long-lived Page
token, optional Instagram business account) to auto-publish through the Meta Graph API;
otherwise scheduled posts surface as "ready to post" reminders. `/api/cron/publish` runs
every 15 minutes.

## 10. Billing and hardening (Phase 6)

- Plans: Starter (free), Pro, Premium — limits in `web/lib/billing/plans.ts`. Stripe
  Checkout and Customer Portal from Dashboard → Billing; the webhook at
  `/api/webhooks/stripe` mirrors subscriptions into `salon_subscriptions` and keeps
  `salons.plan` in sync. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`.
- Limits enforced: active technicians, AI replies per month, SMS per month, marketing
  generations per month.
- Audit log (Billing page), security headers, optional Upstash Redis rate limiting,
  custom domains (`salons.custom_domain` → add the domain to Vercel, the middleware
  rewrites it to `/s/<slug>`), Vitest unit tests (`npm test`), GitHub Actions CI.

## 11. Deployment

- **web** → Vercel, root directory `web`, framework Next.js, env vars from `web/.env.example`.
- **client** → Vercel, root directory `client` (unchanged), plus `VITE_SALON_SLUG`.
- **server** → Render/Railway/Fly, root `server`, `npm run build` / `npm start`, add
  `DEFAULT_SALON_SLUG`.

## 12. Security notes

- Service role key is used only by `server/` (never in `web/` or `client/`).
- Anonymous access is read-only and limited to active storefront content; chat transcripts,
  customers, and appointments require salon membership.
- Salons a user cannot access return 404 in the dashboard, so slugs cannot be enumerated.
