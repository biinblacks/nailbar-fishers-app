# Target architecture

One product, three deployable pieces during the migration, converging on Next.js + Supabase.

```
┌──────────────────────────────── Vercel ────────────────────────────────┐
│  web/  (Next.js App Router, TypeScript, Tailwind)                      │
│   /login /signup            Supabase Auth (email + password, SSR)      │
│   /app/new                  onboarding → create_salon() RPC            │
│   /app/[slug]/…             per-salon dashboard (RLS-scoped)           │
│   /s/[slug]/…   (Phase 2)   public storefront + booking per salon      │
│   /s/[slug]/chat (Phase 2)  AI receptionist widget / embed             │
│   /app/[slug]/interpreter (Phase 3)  Bee Interpreter                   │
│   /api/…  route handlers    AI, webhooks, cron (Phases 2–5)            │
└────────────────────────────────────────────────────────────────────────┘
                 │ anon key + user JWT (RLS)          │ service role (server only)
                 ▼                                    ▼
┌──────────────────────────── Supabase ─────────────────────────────────┐
│  Postgres: salons, salon_members, profiles + every tenant table with   │
│  salon_id; RLS via is_salon_member() / has_salon_role()                │
│  Auth: email/password now; magic link + Google later                   │
│  Storage (Phase 2): logos, staff photos, gallery                       │
│  Edge Functions / pg_cron (Phase 4): reminders, review requests, etc.  │
└────────────────────────────────────────────────────────────────────────┘
                 ▲
                 │ service role, x-salon-slug header
┌────────────── Render (kept during migration) ──────────────────────────┐
│  server/  Express API — chat, bookings, public salon data, legacy admin│
│  client/  Vite SPA — the existing Fishers storefront + admin           │
└────────────────────────────────────────────────────────────────────────┘
```

## Multi-tenancy model

- `salons` is the tenant. `slug` is the public identifier (`/app/nail-bar`, `/s/nail-bar`).
- `salon_members (salon_id, user_id, role)` links Supabase Auth users to salons.
  Roles: `owner` (billing, delete, members), `admin` (settings, everything else), `staff`
  (calendar + customers; cannot change salon settings).
- Every business table carries `salon_id` and a `members manage <table>` RLS policy:
  `using (is_salon_member(salon_id))`. Storefront tables keep a public `select` on active rows.
- `create_salon(name, slug, …)` is a `security definer` RPC that atomically creates the salon,
  the owner membership, and default business hours.
- Server-side code in `web/` uses the **anon key + the user's session**, so RLS is the
  authorization layer. The **service role key never ships to `web/`** until a route handler
  needs it (AI chat for anonymous visitors in Phase 2), and then only inside route handlers.
- The Express API resolves the tenant per request (`x-salon-slug` header → `?salon=` query →
  `DEFAULT_SALON_SLUG`), caches the salon row for 60 s, and requires `salon_members` membership
  for `/api/admin/*`.

## Module map (final state)

| Module | Tables | Surfaces |
| --- | --- | --- |
| Salon profile | `salons`, `business_hours`, `salon_policies` | `/app/[slug]/settings` |
| Services | `service_categories`, `services` | `/app/[slug]/services` |
| Staff | `staff` (optionally linked to `auth.users` via `user_id`) | `/app/[slug]/staff` |
| Customers | `customers` (notes, tags, birthday, opt-in, last visit) | `/app/[slug]/customers` |
| Booking | `appointments` (+ `duration_minutes`, `source`, conflict checks) | `/app/[slug]/appointments`, `/s/[slug]/book` |
| AI receptionist | `faqs`, `promotions`, `ai_knowledge`, `chat_conversations`, `chat_messages` | `/s/[slug]/chat`, embed, `/app/[slug]/inbox` |
| Bee Interpreter | `interpreter_sessions`, `interpreter_turns`, `quick_phrases` | `/app/[slug]/interpreter` |
| Automation | `automation_rules`, `automation_jobs`, `message_log` | `/app/[slug]/automations`, pg_cron/Edge Function |
| AI marketing | `campaigns`, `campaign_assets`, `scheduled_posts` | `/app/[slug]/marketing` |
| Billing | `subscriptions` (Stripe) | `/app/[slug]/billing` |

## Conventions in `web/`

- **Server Components** read data directly through `lib/supabase/server.ts`.
- **Server Actions** (`actions/*.ts`) validate with zod (`lib/validation.ts`), call
  `requireSalonAccess(slug)` first, write through RLS, then `revalidatePath`.
- Forms are client components using `useActionState`; the shared `ActionState` shape carries
  `error`, `fieldErrors`, `success`.
- Routing is `/app/[slug]/<module>[/new|/[id]]`. Every page calls `requireSalonAccess`, which
  returns 404 (not 403) for salons the user cannot access so slugs are not enumerable.
- Styling reuses the storefront's `blush`/`gold` palette and component classes
  (`btn-primary`, `input-field`, `glass-card`) from `client/`.
