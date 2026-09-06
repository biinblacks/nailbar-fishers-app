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

## Phase 3 — Bee Interpreter (this branch) ✅

Built new — no prior code existed.

- [x] `supabase/migrations/0004_interpreter.sql`: `interpreter_sessions`, `interpreter_turns`
      (trigger keeps turn count + auto title), `quick_phrases` with 30 built-in nail-salon
      phrases (global rows are read-only; each salon adds its own), membership RLS.
- [x] Two-person console at `/app/[slug]/interpreter`: technician side and guest side,
      each with push-to-talk and a text box; languages vi / en / es / zh / ko, swappable.
      Every utterance is translated for the other side, read aloud, and saved.
- [x] Speech-to-text: browser Web Speech API first (Chrome, Safari, Edge); MediaRecorder +
      Gemini audio transcription (`POST /api/interpreter/transcribe`) as the fallback.
- [x] Translation: `POST /api/interpreter/translate` through the same provider abstraction as
      the receptionist (Gemini default, Claude optional) with a nail-salon glossary and
      Vietnamese salon register (chị/anh/em).
- [x] Text-to-speech: device voices via `speechSynthesis`, best available voice per
      language, per-message replay, mute toggle.
- [x] Quick phrases bar (tap = instant, no model call) + `/app/[slug]/interpreter/phrases`
      to manage the salon's own phrases.
- [x] History: `/app/[slug]/interpreter/history` and transcript pages; link a conversation
      to a customer profile; delete.
- Later (Phase 6): hosted natural Vietnamese TTS voices, streaming translation, offline
      phrase packs.

## Phase 4 — Automation (this branch) ✅

- [x] `supabase/migrations/0005_automations.sql`: `automation_rules` (bilingual templates,
      channel, offsets, sending window), `automation_jobs` queue with dedupe keys,
      `message_log`; trigger cancels pending reminders when an appointment is cancelled,
      no-show or rescheduled; `ensure_automation_rules()` seeds six default rules per salon
      (also called from `create_salon()`).
- [x] Rule types with defaults (all off until the owner enables them): reminder 24 h and 2 h
      before; review request 2 h after completion; new-guest follow-up next day;
      comeback after 35 days with nothing booked (max once a month); birthday treat 3 days
      before.
- [x] Worker `web/lib/automations/`: planner (idempotent) + sender (quiet hours in the salon
      timezone, opt-out respected for marketing types, per-guest language, retries, full
      log). `GET/POST /api/cron/automations` protected by `CRON_SECRET`; `web/vercel.json`
      schedules it every 15 minutes. "Run automations now" button for manual runs.
- [x] Channels: SMS via Twilio REST, email via Resend, `MESSAGING_DRY_RUN=true` for testing.
- [x] Dashboard `/app/[slug]/automations`: edit each rule (EN/VI templates with
      placeholders, channel, timing, sending window), queued messages with cancel, recent
      sends with status/errors, delivery + scheduler status.
- Later (Phase 6): per-salon sending numbers, two-way SMS replies into the inbox,
      delivery webhooks from Twilio/Resend.

## Phase 5 — AI Marketing (this branch) ✅

- [x] `supabase/migrations/0006_marketing.sql`: `campaigns`, `campaign_assets` (versioned
      generations, favorites), `scheduled_posts` (auto/manual, retries), `salon_integrations`
      (Facebook Page token, owners/admins only), membership RLS.
- [x] Generator `web/lib/marketing/generate.ts`: one brief → strict-JSON content pack per
      language (3 captions, promo copy, hashtags, SMS, email subject+body) plus image and
      video prompts, using salon menu/promotions as grounding; same provider abstraction as
      the receptionist.
- [x] Dashboard `/app/[slug]/marketing`: campaigns, regenerate rounds, inline edit, favorites,
      copy buttons, schedule posts (salon timezone), "ready to post" reminders, Facebook Page
      connection.
- [x] Publisher `web/lib/marketing/publisher.ts` + `/api/cron/publish` (every 15 min):
      Facebook feed/photo posts and Instagram image posts through the Meta Graph API when a
      Page is connected; manual posts flip to "ready" for copy-and-post.
- Later: OAuth-based Meta login instead of pasting a token; TikTok publishing; AI image
      generation from the image prompt.

## Phase 6 — SaaS hardening (this branch) ✅ first pass

- [x] `supabase/migrations/0007_billing_and_hardening.sql`: `salon_subscriptions` mirrored
      from Stripe (trigger keeps `salons.plan` in sync), 14-day trial rows for every salon,
      `audit_log`, `salons.custom_domain`, `salon_monthly_usage()`.
- [x] Billing: plan catalogue (`web/lib/billing/plans.ts` — Starter free, Pro $79, Premium
      $149 with limits), Stripe Checkout + Customer Portal, webhook at `/api/webhooks/stripe`,
      `/app/[slug]/billing` with usage meters and plan cards.
- [x] Plan limits enforced: active technicians (staff create), AI receptionist replies
      (chat API answers with a polite fallback), SMS per month (sender skips), marketing
      generations per month.
- [x] Hardening: audit log on settings/team/customer-delete/billing/integrations, security
      headers (frame-deny except the chat embed, HSTS, referrer, permissions), Upstash Redis
      rate limiting when configured (in-memory fallback), custom domains rewritten to
      `/s/[slug]` in middleware, Vitest unit tests (`web/tests`), GitHub Actions CI
      (typecheck, lint, tests, builds).
- [ ] Still to do: Playwright smoke tests against a Supabase branch, Twilio/Resend delivery
      webhooks, two-way SMS into the inbox, backups policy documentation for the Supabase
      project, retiring `client/` + `server/` after cut-over.
