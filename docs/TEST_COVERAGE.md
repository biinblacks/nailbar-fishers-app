# Test coverage: where we stand and what to test next

Snapshot taken on branch `claude/test-coverage-analysis-ubousd`, commit `429c443`.

## How this was measured

```bash
npm ci --prefix web
npm --prefix web test                     # 41 tests, 6 files, all green, 0.8s
npx vitest run --coverage.enabled --coverage.provider=v8 --coverage.all \
  --coverage.include='lib/**/*.ts' --coverage.include='actions/**/*.ts' \
  --coverage.include='app/api/**/*.ts' --coverage.exclude='lib/database.types.ts'
```

`@vitest/coverage-v8` is not a dependency yet, so it was installed ad hoc for the
measurement. Nothing in the repo produces a coverage number today.

## The numbers

| Area | Lines covered | % |
| --- | --- | --- |
| `web/lib/**` | 364 / 2,436 | **14.9 %** |
| `web/actions/**` (16 server actions) | 0 / 1,658 | **0 %** |
| `web/app/api/**` (15 route handlers) | 0 / 695 | **0 %** |
| **Total (excl. generated `database.types.ts`)** | **364 / 4,789** | **7.6 %** |

Ignore the 66.98 % branch figure v8 reports: a file with zero executed lines
contributes "100 % of 0 branches", so the aggregate flatters us.

Eight modules carry all of the coverage:

| Module | Lines | Note |
| --- | --- | --- |
| `lib/messaging/templates.ts` | 97.8 % | |
| `lib/voice/twiml.ts` | 96.0 % | |
| `lib/availability.ts` | 92.5 % | the strongest suite in the repo |
| `lib/billing/plans.ts` | 91.5 % | |
| `lib/time.ts` | 90.8 % | |
| `lib/webhooks/verify.ts` | 81.6 % | gap is `publicUrlFor` — see area 4 |
| `lib/format.ts` | 46.3 % | `slugify`, `todayInTimezone`, `addDays`, `initials` untested |
| `lib/messaging/providers.ts` | 26.3 % | only `toE164` |

Beyond `web/`: `client/` (2,628 lines of React) and `server/` (the Express API,
4 controllers + 3 services) have **no tests and no test runner configured at all**.

E2E adds a thin but real layer: 10 Playwright specs cover the signed-out journeys,
the auth redirect boundary, `X-Frame-Options`, and four API rejection paths — run
against a deliberately dead Supabase, so no signed-in or data-touching path is exercised.

## The shape of the gap

The tested modules are exactly the ones that are pure functions over plain data.
Everything that talks to Supabase, Stripe, Twilio or an AI provider is at 0 %.
That is not a discipline problem — it is a missing seam. There is no fake Supabase
client in the repo, so there is currently no way to test a query-shaped module at all.

The good news is that the seam is already half-built. These modules take their
database client as a parameter and can be tested today with nothing but a fake:

- `planJobsForSalon(db, salon, rules, now)`
- `sendDueJobs(db, now, siteUrl, salonId?)`
- `routeInboundSms(db, sms)` / `sendConversationReply(db, reply)`
- `syncSubscription(db, stripeSubscription)`
- everything in `lib/voice/call.ts`
- `publishDuePosts(db, now)`

These call `createAdminClient()` internally and would need either `vi.mock` or a
small refactor to an optional `db` argument (preferred, to match the modules above):
`lib/booking.ts`, `lib/storefront.ts`, `lib/billing/limits.ts`, `lib/ai/receptionist.ts`.

## Proposed areas, most valuable first

Ranked by blast radius × how cheap the test is to write.

### 1. Automation planner and sender — `lib/automations/*` (402 lines, 0 %)

This is the code that sends real SMS and email to real customers, on a Vercel cron
every 15 minutes. A defect here is not a broken page; it is a duplicate 2 a.m. text
to every customer in the database, or a reminder that silently never goes out.

Untested decisions worth pinning down:

- **Dedupe keys.** `reminder:<appt>:<rule>:<date>T<time>`, `comeback:<customer>:<month>`,
  `birthday:<customer>:<year>`, `followup:<customer>`. The planner is explicitly
  designed to be re-run constantly and rely on `onConflict: dedupe_key`. Nothing
  asserts the key changes when an appointment is rescheduled (it must) and stays
  stable when the planner simply runs twice (it must).
- **Quiet hours.** `clampToSendWindow` is tested; the sender branch that defers a
  job and rewrites `scheduled_for` instead of sending is not.
- **Marketing opt-out.** `isMarketing = job.type !== "appointment_reminder"` — the
  single line that decides whether a customer who opted out still gets texted.
- **Plan SMS quota**, cached per salon in `smsQuota`.
- **Failure handling.** `MessagingNotConfigured` parks the job by forcing
  `attempts: 3`; a normal error retries until 3 then fails. Both paths write a
  `message_log` row.
- **Planner edge cases.** Reminder more than an hour late is skipped; the
  new-customer follow-up fires only on a customer's *first* completed visit
  (`count !== 1` → skip); a customer with an upcoming appointment gets no comeback text.

Effort: medium — needs the fake client (see "Enabling work"), then the tests are
table-driven and fast. This is the single best return in the repo.

### 2. Billing — `lib/billing/stripe.ts` + `lib/billing/limits.ts` (162 lines, 0 %)

`syncSubscription` is the only writer of `salon_subscriptions`, and that table
decides every salon's entitlements. Worth asserting:

- `mapStatus` for each Stripe status, including `incomplete_expired → canceled`
  and the `?? "incomplete"` fallback for an unknown status.
- A non-live status (`canceled`, `unpaid`, `paused`) forces `plan: "starter"` —
  i.e. cancelling actually downgrades.
- The `salon_id` metadata branch upserts by salon; the no-metadata branch updates
  by `stripe_customer_id`. Getting this backwards writes one salon's plan onto another.
- `current_period_end` / `trial_end` seconds → ISO conversion, and `null` when absent.
- `checkLimit` mapping each `LimitKind` to the right usage counter and the right
  plan limit — four `kind === …` ternaries in a row, easy to transpose, and a
  transposition would gate AI replies on the SMS counter.
- `getUsage` treating a missing subscription row as an active starter plan.

`syncSubscription` already takes `db`, so it is testable as soon as the fake exists.
Effort: small-to-medium.

### 3. Multi-tenant authorization (`lib/salon.ts`, 16 action modules, 40 RLS policies)

This is a multi-tenant SaaS and **nothing anywhere asserts tenant isolation**.
There is no test that a non-member gets `notFound()` from `requireSalonAccess`,
that a signed-out visitor is redirected, or that passing another salon's UUID into
an action is rejected.

Two specific things a test would settle:

- **Role escalation.** `actions/team.ts` contains
  `if (parsed.data.role === "owner" && role !== "owner") return { error: … }`.
  That one line is what stops an admin from minting owners. It has never run in a test.
- **What a `staff` role may do.** Only 6 of 16 action modules call `canManageSalon`;
  the other 10 rely on membership alone. The RLS policies for `services`, `staff`,
  `customers`, `appointments` and friends are generated by a loop in
  `0001_multi_tenant_salons.sql` that checks `is_salon_member(salon_id)` only — no
  role. So today a `staff` member can delete services and customers. That may well
  be intended for a small salon, but nothing states it either way. A test turns the
  current behaviour into a decision.

Effort: the guard-level tests are small once actions are callable; RLS itself needs
a real Postgres (pgTAP against `supabase db reset`, or a seeded integration project).
Recommend starting with the guards and adding one RLS smoke suite later.

### 4. Twilio webhook plumbing — `app/api/webhooks/twilio/**` + `publicUrlFor`

The phone line is the product's most visible surface, and the whole flow hinges on
one untested function. `publicUrlFor` (`lib/webhooks/verify.ts:51-57`, the only
uncovered part of an otherwise 82 %-covered security module) rebuilds the URL that
Twilio signed, honouring `x-forwarded-host` / `x-forwarded-proto`. If it is wrong
behind Vercel's proxy, *every* signature check fails, every webhook returns 403,
and the salon's phone and SMS both go dead — with no error anyone would notice
until a customer complains. It takes a plain `Request` and needs no mocking at all.

Also worth covering, all cheap:

- `verifiedForm`: 503 with no auth token, 400 on an unparseable body, 403 on a bad
  signature, and the happy path.
- `callbackUrl`: prefers `NEXT_PUBLIC_SITE_URL` only when it is `https://`, else
  derives the origin from the request.
- `isFarewell` in `voice/turn/route.ts` — pure, and currently unexported and untested.
  It has a deliberate 40-character guard so "…okay bye" ends the call but a long
  sentence containing "bye" does not. Extract it to `lib/voice/` and test it.
- The silence counter carried in the `?silent=` query param: nudge once, transfer
  on the second silence.
- `recordTurn`'s sticky outcome — `booked` and `handoff` must not be downgraded to
  `answered` by a later turn. That is exactly the kind of rule that a refactor
  quietly breaks.

Effort: small. Highest value-per-line in the report.

### 5. Public route handlers — `app/api/**` (695 lines, 0 %)

Playwright covers four rejection paths; nothing covers what happens on success or
on the interesting failures. Route handlers are ordinary functions — import `POST`
and hand it a `NextRequest`.

- `/api/chat`: per-IP 429 (with `Retry-After`), per-session daily 429, 400 on a bad
  body, 404 unknown salon, 503 when AI is off, and the quota-reached branch that
  returns **200 with a friendly message** rather than an error.
- `/api/cron/automations` and `/api/cron/publish`: identical auth guards, copy-pasted.
  Assert 503 with no `CRON_SECRET`, 401 on a wrong one, and that both the
  `Authorization: Bearer` and `x-cron-secret` forms are accepted.
- `/api/webhooks/stripe`: 400 with no signature, 400 on an invalid one, and that
  `checkout.session.completed` retrieves the subscription before syncing.
- `/api/salons/[slug]/availability`: the UUID and date validation, 404 for a service
  belonging to a different salon (a tenant-isolation check that lives in a route).

Effort: medium — needs module mocks for the Supabase/AI imports.

### 6. Inbound SMS routing — `lib/inbox/sms.ts` (156 lines, 0 %)

Takes `db` already, so it is testable immediately. Cover: matching a salon by the
number texted (including the `toE164` normalisation on both ends), reusing an open
thread for a repeat texter vs creating one, linking an existing customer by phone
and back-filling `customer_id` on an existing conversation, and `sendConversationReply`
refusing a conversation with no number and clearing `needs_human` after a reply.

### 7. The booking write path — `lib/booking.ts` (184 lines, 0 %)

`lib/availability.ts` is our best-tested module at 92 %, but the code that *uses* it
is at zero. `createPublicBooking` re-checks availability server-side — that check is
the only thing standing between a stale browser tab and a double-booked chair. Each
`BookingError` code (`disabled`, `service`, `staff`, `closed`, `unavailable`,
`invalid`) is a distinct user-visible outcome, and the auto-assign rule
(`input.staffId ?? slot.freeStaffIds[0]`) and the "existing customer by phone gets
updated, not duplicated" rule both deserve a test.

### 8. Input validation and form plumbing — `lib/validation.ts`, `lib/action-state.ts` (167 lines, 0 %)

The cheapest wins in the repo: both are pure, dependency-free, and 0 %.
`validation.ts` holds every zod schema at the server-action boundary — `slugSchema`
(what a salon can name itself), the seven-entry `businessHoursSchema`, the price and
duration bounds. `action-state.ts` holds `friendlyDbError`, which pattern-matches
Postgres errors into user-facing copy and will happily leak a raw DB error through
its fallthrough, plus the `str`/`num`/`bool` FormData coercions every action depends on.

Write these first — they cost an afternoon and need no infrastructure.

### 9. `lib/format.ts` gaps (46 %)

Same category. `slugify` is the one that matters: it generates salon URLs, strips
Vietnamese diacritics and maps `đ → d`, and a collision or a malformed slug is a
404 on a paying customer's storefront. `todayInTimezone`, `addDays` and `initials`
are a handful of lines each.

### 10. AI provider layer — `lib/ai/*` (596 lines, 0 %)

`generateReceptionistReply` is too big to test end to end, but its `execute()` tool
dispatcher is worth isolating: unknown service name, invalid date, a `BookingError`
surfaced back to the model as `{ error, code }`, and the handoff flag. Also worth
testing that the provider's `maxToolRounds: 4` ceiling actually terminates, and that
a thrown provider error yields the "call us at <phone>" fallback rather than a 500 —
that fallback is the difference between a bad answer and a dead chat widget.

### 11. Decide about `client/` and `server/`

Zero tests, zero infrastructure, ~5,000 lines, and per `README.md` the Express API
is still serving the legacy Vite storefront until the domain is cut over. This is a
product decision, not a testing one: if they are weeks from deletion, freeze them and
spend nothing; if the cutover has no date, they need at least a smoke test on the
`/api/chat` and `/api/bookings` controllers. Either answer is fine — drifting without
one is not.

## Enabling work

Three things unblock most of the above.

**A fake Supabase client** (`web/tests/fakes/supabase.ts`). A chainable stub whose
`from(table)` returns canned rows and records writes. The query builder is uniform
enough (`.select().eq().in().gte().order().limit().maybeSingle()`) that ~80 lines
covers every call site in the repo:

```ts
const db = fakeDb({
  appointments: [{ id: "a1", appointment_date: "2026-09-08", /* … */ }],
  automation_rules: [reminderRule],
});
await planJobsForSalon(db, salon, [reminderRule], new Date("2026-09-07T12:00:00Z"));
expect(db.upserts("automation_jobs")[0].dedupe_key).toBe("reminder:a1:r1:2026-09-08T10:00");
```

**An optional `db` parameter** on `lib/booking.ts`, `lib/storefront.ts`,
`lib/billing/limits.ts` and `lib/ai/receptionist.ts`, defaulting to
`createAdminClient()`. Small diff, and it brings them in line with the modules that
already do this instead of scattering `vi.mock` across the suite.

**Coverage in CI.** Add `@vitest/coverage-v8`, a `test:coverage` script, and a step in
`.github/workflows/ci.yml`. Start the threshold at today's number so it cannot regress,
and raise it as areas land. A ratchet is more useful here than a target.

## What not to bother with

- **UI components.** 40-odd presentational components in `web/components/ui` and
  `web/components/app`. Playwright already proves the pages render; unit-testing
  `Badge.tsx` buys nothing.
- **`lib/database.types.ts`** — 2,211 generated lines, correctly excluded above.
- **Thin Supabase wrappers** — `lib/supabase/{client,server,admin}.ts` are
  constructor calls.
- **Chasing a coverage percentage.** Areas 1–4 are maybe 1,500 lines; taking them
  from 0 % to solid moves the headline number by roughly 25 points and removes most
  of the real risk. The remaining thousands of lines of CRUD actions are not where
  the bodies are buried.

## Suggested order

1. Areas 8 and 9 — pure functions, no infrastructure, immediate (half a day).
2. Area 4 — `publicUrlFor`, `isFarewell`, `verifiedForm`, `recordTurn` (a day).
3. The fake Supabase client, then area 1 — the automation engine (two to three days).
4. Area 2 — billing sync and limits (a day, once the fake exists).
5. Coverage ratchet in CI, at whatever the number is by then.
6. Areas 3, 5, 6, 7 as capacity allows; take the area-3 role decision to the team first.
