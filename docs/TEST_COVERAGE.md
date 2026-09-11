# Test coverage analysis (September 2026)

Where the test suite stands today, what it actually protects, and the areas worth investing
in next — ordered by what a failure would cost the business.

Measured on branch `claude/test-coverage-analysis-k7el1r` with
`vitest run --coverage` (v8 provider) over `web/{lib,actions,app/api,middleware.ts}`,
excluding the generated `lib/database.types.ts`.

## Current state

| | |
| --- | --- |
| Unit tests | 6 files, 41 tests (`web/tests`), ~180 lines |
| End-to-end tests | 1 file, 10 tests (`web/e2e/smoke.spec.ts`) |
| **Line coverage (web)** | **7.58 %** |
| Tests in `client/` (44 source files) | none — no test runner installed |
| Tests in `server/` (20 source files) | none — no test runner installed |
| Database tests (69 RLS policies, 13 `SECURITY DEFINER` functions) | none |
| Coverage reporting | not configured (`@vitest/coverage-v8` is not a dependency) |

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, both builds and the
Playwright smoke suite on every PR. The pipeline is healthy; it is the suite underneath it
that is thin.

### What is genuinely well covered

The pure, dependency-free functions are tested carefully and the tests are good — they
assert behaviour, not implementation:

| Module | Lines | Notes |
| --- | --- | --- |
| `lib/messaging/templates.ts` | 98 % | placeholder rendering, en/vi |
| `lib/voice/twiml.ts` | 96 % | XML escaping, markdown stripping, sentence-boundary truncation |
| `lib/availability.ts` | 92 % | slot maths, buffers, lead time, per-technician busy blocks |
| `lib/billing/plans.ts` | 91 % | plan fallback, price-id mapping, unlimited sentinel |
| `lib/time.ts` | 91 % | timezone conversion, send windows, birthdays |
| `lib/webhooks/verify.ts` | 82 % | Twilio HMAC + Svix signature verification |

### The shape of the gap

The split is categorical, not random. **Every module that touches Supabase, `fetch`, or a
Next `Request`/`Response` sits at 0 %.** There is not a single test double in the
repository — no mocked Supabase client, no stubbed `fetch`, no constructed `Request`. The
suite can only reach code that takes plain values and returns plain values.

At 0 %: all 16 files in `actions/`, all 17 API route handlers, `middleware.ts`,
`lib/booking.ts`, `lib/salon.ts`, `lib/billing/limits.ts`, `lib/billing/stripe.ts`,
`lib/automations/*`, `lib/inbox/sms.ts`, `lib/ai/*`, `lib/marketing/*`,
`lib/interpreter/*`, `lib/media.ts`, `lib/rate-limit.ts`, `lib/custom-domain.ts`,
`lib/storefront.ts`, `lib/action-state.ts`, `lib/audit.ts`.

## The one enabler that unblocks most of this

Before the individual items below: the reason the untested set looks the way it does is
that there is no way to construct a Supabase client in a test. A small chainable fake in
`web/tests/helpers/fake-db.ts` — `from().select().eq().maybeSingle()` returning canned rows
and recording the writes it was asked to make — is perhaps 120 lines and is a prerequisite
for priorities 1, 4, 5, 6, 7 and 8. It is the highest-leverage thing in this document.

Route handlers need no such helper: `POST(new NextRequest(url, { … }))` can be called
directly, which makes priority 3 the cheapest item on the list.

---

## Priority 1 — tenant isolation and money

### 1. Multi-tenant authorization (`lib/salon.ts` + `actions/*`, 0 %)

This is the most serious gap. The platform is multi-tenant and `requireSalonAccess` is the
only thing standing between a member of salon A and salon B's customers, appointments and
message logs. Of 65 exported server actions, 59 call it, 6 are public by design
(`createSalonAction`, `acceptInviteAction`, `submitPublicBookingAction` and the three auth
actions), and 16 additionally gate on `canManageSalon`. None of that is asserted anywhere.

Two tests, in order of value:

- **A structural test** that reads every `actions/*.ts`, finds each exported action, and
  asserts it either calls `requireSalonAccess` or appears in an explicit, commented
  allowlist of public actions. This is ~30 lines and it catches the regression that
  actually happens: someone adds action 66 and forgets the check. No fake database needed.
- **Unit tests on `requireSalonAccess` itself** with a fake client: signed out → redirects
  to `/login?next=…`; salon missing → `notFound()`; user is not a member → `notFound()`
  (not a 403 — slug enumeration is deliberately prevented here, and that intent should be
  pinned down); member → returns the right role. Plus `canManageSalon` for each of the
  three roles.

Also worth pinning: `inviteMemberAction` refuses to let an admin invite an owner
(`actions/team.ts:33`). That is a privilege-escalation boundary sitting in an untested file.

### 2. Row-level security policies (0 %)

69 RLS policies and 13 `SECURITY DEFINER` functions across ten migrations, with no test of
any kind. RLS is the last line of defence — the application checks above it are the first,
and both are currently unverified.

pgTAP against a local `supabase start`, asserting that a member of salon A cannot
`select`/`update`/`delete` salon B's rows in `customers`, `appointments`, `chat_messages`,
`message_log` and `call_logs`, and that each `SECURITY DEFINER` function has a pinned
`search_path` (`0009_function_hardening.sql` suggests this was already a concern once).
This can run in CI in a separate job against a Supabase container.

### 3. Webhook route guards (`app/api/webhooks/**`, 0 %)

The signature-verification *helpers* are well tested. The routes that call them are not, so
nothing asserts the helpers are actually wired in. Each of these is a handful of lines:

- `/api/webhooks/twilio/voice/turn`, `/voice`, `/voice/status`, `/inbound`, `/status` →
  403 on a bad or missing `x-twilio-signature`, 503 when `TWILIO_AUTH_TOKEN` is unset.
- `/api/webhooks/stripe` → 400 on a missing `stripe-signature`.
- `/api/cron/automations` and `/api/cron/publish` → 401 on a wrong bearer token, 503 when
  `CRON_SECRET` is unset, and — importantly — that the `x-cron-secret` fallback header is
  compared against the same secret.

These routes can start phone calls that cost money and reach real customers, which the
code comments acknowledge. The guards deserve tests that fail loudly if someone reorders
the early returns.

A related, security-relevant blind spot inside an otherwise well-covered file:
`publicUrlFor` (`lib/webhooks/verify.ts:51-57`) is the only uncovered function there, and
it decides *which URL* the Twilio signature is validated against by trusting
`x-forwarded-host` / `x-forwarded-proto`. Worth a test that documents the intended
behaviour explicitly.

### 4. `lib/booking.ts` — `createPublicBooking` (184 lines, 0 %)

The availability *engine* is well tested; the code that decides whether to actually write an
appointment row is not tested at all. This is the highest-consequence untested business
logic in the product — double-bookings are a direct operational cost to the salon.

Branches that need pinning: online booking disabled → `BookingError("disabled")`; a service
belonging to a different salon → `"service"`; a staff id not in the active set → `"staff"`;
a requested time that is no longer in `computeSlots` → `"unavailable"` vs `"closed"`;
auto-assignment picking `slot.freeStaffIds[0]` when the guest has no preference; existing
customer matched by phone is updated rather than duplicated. Also `getPublicAppointment`,
which guards against id enumeration with a uuid regex and a salon-id match.

### 5. Plan limits and Stripe sync (`lib/billing/limits.ts`, `lib/billing/stripe.ts`, 0 %)

`checkLimit` selects both the usage counter and the limit through parallel ternary chains
(`limits.ts:53-54`) — a transposition there silently bills the wrong quota, in either
direction. `getUsage` treats a *missing* subscription row as an active starter plan and
counts only `trialing`/`active`/`past_due` as active; both are policy decisions worth
freezing in a test. `syncSubscription` is the write path from Stripe into
`salon_subscriptions` and is entirely unverified.

---

## Priority 2 — the automation and messaging pipeline

### 6. `lib/automations/planner.ts` (196 lines, 0 %)

The `dedupe_key` scheme *is* the idempotency story — the file's own comment says the planner
can run as often as you like. Nothing tests that claim. Running the planner twice over the
same fixture should produce byte-identical dedupe keys.

Per-rule branches worth covering: reminders more than an hour past their intended send time
are dropped; appointments already started are skipped; `comeback_reminder` excludes
customers with an upcoming appointment; `birthday_promo` fires only when
`daysUntilBirthday === interval_days`; `new_customer_followup` fires only on a customer's
*first* completed visit.

### 7. `lib/automations/sender.ts` (161 lines, 0 %)

Every branch here either texts a customer at 3 a.m. or fails to text them at all:

- quiet hours → the job is rescheduled to `clampToSendWindow`, not sent (`deferred`);
- `marketing_opt_in === false` → skipped for marketing types but **not** for
  `appointment_reminder` (that distinction is a compliance decision and should be a test);
- the per-salon SMS quota is checked once and cached in `smsQuota`;
- `MessagingNotConfigured` parks the job at `attempts: 3` instead of retrying forever,
  while an ordinary failure retries until `attempts >= 3` then becomes `failed`.

### 8. `lib/inbox/sms.ts` (156 lines, 0 %)

Inbound routing: matching the salon by the number that was texted, reusing the open
`sms:<from>` thread rather than creating a second conversation, linking the customer by
phone, and setting `needs_human`. `sendConversationReply` returns an error rather than
throwing when there is no number to reply to — a path a form renders directly.

### 9. `lib/messaging/providers.ts` (26 %)

`toE164` is tested; the two functions that talk to the outside world are not. With a mocked
`fetch`: a non-2xx Twilio response surfaces the provider's message, `MESSAGING_DRY_RUN`
short-circuits before any network call, and `StatusCallback` is attached only when
`NEXT_PUBLIC_SITE_URL` is `https://`.

---

## Priority 3 — breadth and infrastructure

### 10. No component tests at all

34 form components plus `BookingWizard`, `ChatWidget` and `InterpreterConsole`, none
covered. `jsdom` + `@testing-library/react` would be a new dependency but a small one. The
two worth starting with are `BookingWizard` (multi-step state, the piece a customer
actually touches) and one representative `useActionState` form, to pin how `fieldErrors`
from `fromZodError` reach the user.

### 11. The `client/` and `server/` workspaces are completely untested

Both are in the root `workspaces` array and both build in CI, but neither has a test runner.
`server/src/middleware/auth.middleware.ts` and `tenant.middleware.ts` are unverified
authorization code. Before investing here, though, settle the question `docs/AUDIT.md`
raises: these look like the pre-SaaS single-salon stack that `web/` replaced. If they are
legacy, marking them so (or removing them) is worth more than testing them — and either way
it should be an explicit decision rather than an omission.

### 12. End-to-end tests only ever exercise the signed-out app

By design: `playwright.config.ts` points Supabase at a closed port so every call fails fast.
That is a sound trick for running without secrets, and it does cover routing, middleware,
the auth boundary and security headers. But it means the dashboard, the booking wizard
happy path and the storefront have no end-to-end coverage whatsoever. Seeding a local
Supabase in CI (the `supabase/seed.sql` already exists) would unlock a signed-in journey and
a complete book-an-appointment flow — the two paths where a regression is most visible to a
paying salon.

### 13. No coverage measurement in CI

Add `@vitest/coverage-v8`, a `test:coverage` script, and a `coverage.thresholds` floor set
just below wherever the number lands after the first round of work, so it can only ratchet
upward. Without this, the 7.58 % above is a one-off measurement rather than something the
team can hold a line on.

### 14. Small gaps inside otherwise-covered files

- `lib/availability.ts:93-95` — the `catch` fallback in `nowInTimezone` for an invalid
  timezone string. A salon with a bad timezone silently falls back to UTC.
- `lib/availability.ts:168-171` — `upcomingDates`, which the AI receptionist uses to offer
  dates to a caller.
- `lib/format.ts` (46 %) — `slugify` (the Vietnamese diacritic and `đ` handling is exactly
  the kind of thing that regresses), `initials`, `minutesToTime`, `addDays`.
- `lib/messaging/templates.ts:33` — the Vietnamese date format branch.

---

## Suggested first pull request

Roughly a day's work, and it moves the needle where it matters most:

1. `tests/helpers/fake-db.ts` — the chainable Supabase double (unblocks everything else).
2. The structural actions-authz test (item 1) — cheapest high-value test in this document.
3. Webhook and cron route guards (item 3) — no fake database needed.
4. `createPublicBooking` error paths (item 4).
5. `@vitest/coverage-v8` plus a `test:coverage` script and a threshold floor in CI (item 13).

RLS/pgTAP (item 2) is the natural second PR, since it needs a Supabase service container in
CI and is independent of everything above.
