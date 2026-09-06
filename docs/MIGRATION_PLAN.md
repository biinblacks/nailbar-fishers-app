# Phased migration plan

Guiding rules: nothing that works today is deleted; each phase ships independently; the
Fishers salon keeps running on the Vite storefront + Express API until the Next.js
equivalents reach parity.

## Phase 1 — Foundation (this branch) ✅

**Goal:** real authentication, tenant isolation, and the core salon records in a new
Next.js dashboard, without breaking the current site.

- [x] `supabase/migrations/0001_multi_tenant_salons.sql`: `salons`, `salon_members`,
      `profiles`, `salon_id` on every table, per-salon uniques, membership RLS,
      `create_salon()` RPC, removal of the public chat-transcript and "any authenticated
      user is admin" policies. Validated on Postgres 16 for both fresh installs and
      upgrades of the existing single-salon data (legacy admins become owners of `nail-bar`).
- [x] `server/`: tenant middleware (`x-salon-slug` → `?salon=` → `DEFAULT_SALON_SLUG`),
      membership check in `requireAdmin`, every query scoped by `salon_id`.
- [x] `client/`: sends `x-salon-slug` when `VITE_SALON_SLUG` is set; otherwise unchanged.
- [x] `web/` (Next.js 15, App Router): sign up / sign in / password reset, onboarding,
      salon switcher, dashboard, salon profile + business hours, services + categories,
      staff, customers (search, notes, tags, history), appointments (list by day, filters,
      create/edit, inline status, technician conflict check, auto-linking customers).
- [ ] **Deploy checklist** (needs your Supabase project):
  1. Run `supabase/schema.sql` (fresh) then `supabase/migrations/0001_multi_tenant_salons.sql`,
     then optionally `supabase/seed.sql`.
  2. Set `DEFAULT_SALON_SLUG=nail-bar` on the Express host.
  3. Create a Vercel project with root directory `web`, env vars from `web/.env.example`.
  4. In Supabase Auth → URL configuration, add `https://<web-domain>/auth/callback`.

## Phase 2 — Booking + AI receptionist on Next.js (this branch) ✅

**Goal:** every salon gets a public storefront, availability-aware online booking, and the
AI receptionist inside the Next.js app, so `client/` + `server/` are no longer required for
new salons.

- [x] `supabase/migrations/0002_receptionist_and_booking.sql`: booking rules and AI settings
      on `salons`; `customer_id`, `channel`, `last_message_at`, `message_count`,
      `resolved_at` on `chat_conversations` (kept fresh by trigger); `conversation_id` on
      `appointments`.
- [x] Public storefront `/s/[slug]` (hero, promotions, menu by category, team, hours + map,
      FAQs) and `/s/[slug]/review`.
- [x] Availability engine `web/lib/availability.ts` (business hours, service duration,
      slot interval, lead time, booking window, buffer, technician conflicts, chair
      capacity for "any technician") + `GET /api/salons/[slug]/availability`.
- [x] Public booking `/s/[slug]/book` → server action re-validates the slot → pending
      appointment (`source = 'online'`) → `/s/[slug]/book/[id]` confirmation.
- [x] AI receptionist port: `web/lib/ai/receptionist.ts` rebuilds the knowledge prompt from
      live data on every message (same content as the Express version) and adds three
      tools: `check_availability`, `book_appointment` (`source = 'ai'`, linked to the
      conversation), `request_human_handoff`. Provider abstraction: Gemini by default
      (`GEMINI_API_KEY`), Claude via `AI_PROVIDER=anthropic`.
- [x] `POST /api/chat` (anonymous, IP + session rate limits), chat widget on the storefront,
      iframe embed at `/s/[slug]/chat`.
- [x] Dashboard: `/app/[slug]/inbox` (+ transcript view, needs-human / resolved flags,
      appointments booked from the chat) and `/app/[slug]/receptionist` (AI + booking
      settings, knowledge, FAQs, policies, promotions, embed snippet).
- [x] Team invitations (`supabase/migrations/0003_invites_and_media.sql`): `salon_invites`
      with secret tokens, `get_salon_invite()` / `accept_salon_invite()` RPCs (email must
      match the signed-in account), Supabase Auth invitation email for new accounts and a
      shareable link for existing ones, role changes and removal from Settings → Team
      (always keeps at least one owner), `/invite/[token]` acceptance page.
- [x] Supabase generated types: `web/lib/database.types.ts` (generated with postgres-meta
      from the fully migrated schema, see `web/scripts/gen-types.md`) now types every
      Supabase client, so queries, inserts, joins and RPC arguments are checked by `tsc`.
- [x] Media on Supabase Storage: public `salon-media` bucket with per-salon write policies,
      salon logo (Settings), technician photos (Staff → edit), and a gallery
      (`salon_gallery` table, Dashboard → Gallery, shown on the storefront).
- [ ] **Cut-over checklist for the Fishers salon:** run migrations 0002 and 0003; set
      `SUPABASE_SERVICE_ROLE_KEY` + `GEMINI_API_KEY` on the Vercel project for `web`; open
      `/app/nail-bar/receptionist` and review the knowledge; point the domain at
      `/s/nail-bar` once you are happy; keep `client/` + `server/` running until then.

## Phase 3 — Bee Interpreter (2 weeks)

Built new; nothing exists yet.

- Tables: `interpreter_sessions (salon_id, started_by, customer_id?, language_a, language_b)`,
  `interpreter_turns (session_id, speaker, source_lang, source_text, target_text, audio_url?)`,
  `quick_phrases (salon_id nullable for global defaults, category, text_en, text_vi)`.
- UI at `/app/[slug]/interpreter`: two-person split screen (technician side VI, customer
  side EN, swappable), push-to-talk per side, live transcript, quick-phrase bar
  (greeting, shape, length, color, price, wait time, aftercare, payment).
- Speech-to-text: Web Speech API in the browser first (free, works in Chrome/Safari);
  server route with a hosted STT model as fallback for accuracy.
- Translation: LLM route handler with a nail-salon glossary (gel-x, dip, acrylic, cuticle,
  ombré, chrome…) to keep terminology consistent; cached quick phrases skip the model.
- Text-to-speech: `speechSynthesis` first, hosted TTS later for natural Vietnamese voices.
- History: sessions saved per salon, optionally attached to a customer profile.

## Phase 4 — Automation (2 weeks)

- `automation_rules` per salon (type, enabled, offset, channel, template) with defaults:
  appointment reminder (24h + 2h), review request (2h after `completed`), comeback reminder
  (N weeks since `last_visit_at`), birthday promo, new-customer follow-up.
- `automation_jobs` queue populated by DB triggers (appointment status changes) and a daily
  `pg_cron` sweep; processed by a Supabase Edge Function or Vercel Cron route.
- Channels: SMS (Twilio) and email (Resend); every send logged in `message_log`;
  `customers.marketing_opt_in` and quiet hours respected.
- Dashboard: `/app/[slug]/automations` to toggle rules, edit templates (EN/VI), and see
  the send log.

## Phase 5 — AI Marketing (2 weeks)

- `campaigns`, `campaign_assets`, `scheduled_posts` tables.
- Generator at `/app/[slug]/marketing`: Facebook/Instagram captions, promotion copy,
  image/video prompts, using salon profile + services + promotions as context; EN/VI output.
- Scheduling architecture: `scheduled_posts` + cron publisher with provider adapters (Meta
  Graph API first); manual "copy & post" mode until the Meta app review is done.

## Phase 6 — SaaS hardening (ongoing)

- Stripe subscriptions (`plan` on `salons`), plan limits (staff count, SMS credits).
- Custom domains per salon, Supabase Storage for images, audit log, backups policy.
- Tests: Vitest for actions/validation, Playwright smoke tests for booking + auth; CI on PRs.
- Retire `client/` and `server/` once every route has a Next.js equivalent in production.
