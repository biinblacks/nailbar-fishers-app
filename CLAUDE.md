# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Nail Bar — an AI nail salon receptionist SaaS: a marketing site, a Gemini-powered chat
receptionist, Supabase-backed online booking, an admin dashboard, and Google review automation.

## Commands

This is an npm workspaces monorepo (`client`, `server`). Run all commands from the repo root
unless noted.

```bash
npm install                 # installs both workspaces

npm run dev                  # client (5173) + server (4000) concurrently
npm run dev:client           # client only (Vite)
npm run dev:server           # server only (tsx watch, hot reload)

npm run build                # builds client then server
npm run build:client
npm run build:server
npm start                    # runs built server (server/dist/index.js)

npm run lint                 # client eslint only (no server lint script)
npm run typecheck            # tsc -b --noEmit (client) + tsc --noEmit (server)
```

There are no automated tests in this repo (no test runner, no `*.test.*`/`*.spec.*` files).
Verify changes via `npm run typecheck`, `npm run lint`, and manual exercise of the affected
flow (`npm run dev` and the browser, or `curl` against the Express routes).

Env files: copy `server/.env.example` → `server/.env` and `client/.env.example` → `client/.env`
before running `dev`. The server (`server/src/config/env.ts`) throws at startup if
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, or `GEMINI_API_KEY` are missing.

## Architecture

### Monorepo layout

- `client/` — React 18 + Vite + TypeScript + Tailwind + React Router. Deployed to Vercel
  (`client/vercel.json` rewrites all routes to `index.html` for the SPA).
- `server/` — Express + TypeScript API, deployed as a long-running Node process (not
  serverless) because it holds rate limiters and does per-request Supabase queries.
- `supabase/schema.sql` — full Postgres schema + RLS policies; `seed.sql` — starter data.
  Run schema then seed manually in the Supabase SQL editor; there is no migration tooling.

### Server request flow

Routes (`server/src/routes/*.routes.ts`) → controllers (`*.controller.ts`, thin: zod-validate
input, call a service, shape the response) → services (`*.service.ts`, all Supabase/Gemini
logic) → `config/supabase.ts` (service-role client, bypasses RLS) / `config/gemini.ts`.

- `errorHandler`/`asyncHandler`/`ApiError` (`middleware/error.middleware.ts`) are the uniform
  error path — controllers throw `ApiError(status, message)` and never write error responses
  directly.
- `requireAdmin` (`middleware/auth.middleware.ts`) verifies the Supabase session JWT and is
  mounted once on the whole `/api/admin` router (`adminRouter.use(requireAdmin)`), not per-route.
- Four route groups: `/api/chat` and `/api/bookings` (rate-limited — 30/min and 20/min
  respectively, to bound Gemini cost and booking spam), `/api/salon` (public read-only
  storefront data), `/api/admin` (auth-gated CRUD for the dashboard).

### AI receptionist (the core feature)

`services/knowledge.service.ts` → `buildKnowledgeBaseContext()` queries every knowledge table
in Supabase (salon profile, hours, services, staff, policies, promos, FAQs, freeform
`ai_knowledge`) **fresh on every chat request** and formats it into one text blob. This is
injected into the Gemini system prompt in `services/ai.service.ts`, so admin edits in the
dashboard take effect on the very next message with no redeploy or cache invalidation needed.
Never have the model answer from anything other than this injected context — that's the
product's "never invent info" guarantee.

`ai.service.ts` also: gets-or-creates a `chat_conversations` row per `sessionId`, replays the
last 20 `chat_messages` as Gemini history for short-term memory, and runs
`detectHandoff()` (keyword match, English + Vietnamese) to flag `needs_human` on the
conversation for the admin Messages view.

To swap Gemini for another provider: only `config/gemini.ts` and `ai.service.ts` need to
change (keep the `systemPrompt` + `history` + `message` shape) — routes, controllers, and the
knowledge builder are provider-agnostic. See README.md for details.

### Data model (`supabase/schema.sql`)

Key tables: `salon_profile`, `business_hours`, `service_categories`/`services`, `staff`,
`salon_policies`, `faqs`, `promotions`, `ai_knowledge`, `customers`, `appointments`,
`chat_conversations`/`chat_messages`, `admin_users`. RLS is enabled on every table: anon/public
access is read-only for storefront content and insert-only for `appointments`/chat; all
mutation elsewhere requires the service-role key (server-side only) or `requireAdmin`.

Booking flow: `/booking` → `POST /api/bookings` (`booking.service.ts`) creates an
`appointments` row with `status = 'pending'` → redirect to `/booking/confirmation/:id`. Admins
transition status via the dashboard; setting `completed` sets `review_requested = true`,
intended to drive an external SMS/email flow to `/review?name=...` (not implemented in-app —
see README section 7).

### Client structure

- `context/AuthContext.tsx` — Supabase Auth session state, used by `ProtectedRoute` to gate all
  `/admin/*` pages (see `App.tsx` route table).
- `context/ChatContext.tsx` — chat widget session/message state, independent of admin auth.
- `lib/api.ts` — single typed fetch client. `request()` is the base helper;
  `adminRequest()` wraps it and attaches the Supabase JWT via `authHeader()`. All server calls
  go through `salonApi` / `chatApi` / `bookingApi` / `adminApi` in this file — don't call
  `fetch` directly from components.
- `lib/supabaseClient.ts` — browser Supabase client (anon key only).
- Route-level pages live in `pages/` (including `pages/admin/*`); reusable UI is split under
  `components/{layout,home,chat,booking,admin,ui}` by feature area, not by type.
- `pages/EmbedChatPage.tsx` is mounted outside `PublicLayout` — it's meant to be iframed
  standalone (e.g. embedded on an external site), so don't add the navbar/footer/chat-launcher
  wrapper to it.

## Conventions

- Server imports use explicit `.js` extensions on relative paths (ESM + `moduleResolution:
  Bundler`), e.g. `import { env } from "./config/env.js"` even though the source file is
  `env.ts`.
- Both `client` and `server` tsconfigs run with `strict`, `noUnusedLocals`, and
  `noUnusedParameters` — unused args must be prefixed `_` (also enforced by the client eslint
  rule `argsIgnorePattern: "^_"`).
- Request bodies on the server are validated with `zod` schemas in the controller before
  reaching the service layer (see `booking.controller.ts` for the pattern).
