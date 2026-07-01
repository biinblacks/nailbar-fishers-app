# Luxe Nail Bar — AI Nail Salon Receptionist SaaS

A production-ready full-stack app for a nail salon: a luxury marketing site, a 24/7 AI
receptionist chatbot (Gemini), online booking backed by Supabase, an admin dashboard, and
Google Review automation.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + React Router
- **Backend:** Node.js + Express + TypeScript
- **Database/Auth:** Supabase (Postgres + Row Level Security + Auth)
- **AI:** Google Gemini API (`@google/generative-ai`) — swappable for OpenAI, see below
- **Deployment:** Vercel (frontend), any Node host for the API (Render, Railway, Fly.io, etc.)

## Monorepo Structure

```
.
├── client/                 # React + Vite frontend
│   └── src/
│       ├── components/     # layout, home, chat, booking, admin, ui
│       ├── pages/          # route-level pages (public + /admin/*)
│       ├── context/        # AuthContext (Supabase Auth), ChatContext (session/memory)
│       ├── lib/             # api.ts (typed fetch client), supabaseClient.ts, types.ts
├── server/                 # Express + TypeScript API
│   └── src/
│       ├── config/         # env, supabase client, gemini client
│       ├── controllers/    # request handlers
│       ├── services/       # ai.service.ts, booking.service.ts, knowledge.service.ts
│       ├── routes/         # /api/chat, /api/bookings, /api/salon, /api/admin
│       └── middleware/     # auth (Supabase JWT), error handling
└── supabase/
    ├── schema.sql          # full DB schema + RLS policies
    └── seed.sql            # starter salon data (hours, services, staff, FAQs...)
```

## 1. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql`, then `supabase/seed.sql`.
3. Create your first admin user: **Authentication → Users → Add User** (email + password).
   Then insert a matching row in `admin_users`:
   ```sql
   insert into admin_users (id, full_name, role)
   values ('<the-user-uuid-from-auth>', 'Salon Owner', 'admin');
   ```
4. Copy your **Project URL**, **anon public key**, and **service_role key** from
   Project Settings → API.

## 2. Configure Environment Variables

**server/.env** (copy from `server/.env.example`):
```
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

**client/.env** (copy from `client/.env.example`):
```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Get a Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## 3. Install & Run Locally

```bash
npm install                # installs both workspaces
npm run dev                # runs client (5173) + server (4000) concurrently
```

Or individually:
```bash
npm run dev:server
npm run dev:client
```

Visit `http://localhost:5173`. Admin dashboard: `http://localhost:5173/admin/login`.

## 4. Swapping Gemini for OpenAI

All AI logic lives in `server/src/services/ai.service.ts` and
`server/src/config/gemini.ts`. To switch providers:
1. Replace `config/gemini.ts` with an OpenAI client (`openai` npm package).
2. In `ai.service.ts`, replace the `chat.startChat()` / `sendMessage()` calls with an OpenAI
   Chat Completions call, keeping the same `systemPrompt` + `history` + `message` inputs.
3. No other file needs to change — the knowledge-base builder and routes are provider-agnostic.

## 5. AI Knowledge Base

The chatbot never invents information. On every message, the server rebuilds a system prompt
from live Supabase data (`server/src/services/knowledge.service.ts`): salon profile, hours,
services/pricing, staff, policies, promotions, FAQs, and freeform `ai_knowledge` entries.
Admins edit all of this from **Admin → AI Knowledge** / **Services** / **Hours** — changes are
reflected on the very next customer message, no redeploy needed.

## 6. Booking Flow

`/booking` → select service → date/time → contact info → submits to `POST /api/bookings` →
redirects to `/booking/confirmation/:id`. Appointments are stored in Supabase `appointments`
with status `pending`. Admins update status from the dashboard; marking an appointment
`completed` flags `review_requested = true`, intended to trigger the `/review` page (e.g. via
a follow-up SMS/email link — see "Google Review Automation" below).

## 7. Google Review Automation

`/review?name=<customer>` renders a thank-you screen with a "Leave a Google Review" button
linking to the salon's `google_review_link` (configurable in Admin → the salon profile, or
directly in `salon_profile` table). Wire this into your post-visit SMS/email flow (e.g. a
Twilio or email automation triggered when an appointment's status changes to `completed`).

## 8. Admin Dashboard Features

- **Appointments:** view all bookings, update status (pending → confirmed → completed/cancelled/no-show)
- **Services & Prices:** create/edit/deactivate/delete services
- **Business Hours:** per-day open/close time or closed toggle
- **Staff:** manage technician profiles
- **AI Knowledge:** freeform knowledge entries injected into the chatbot's context
- **Customer Messages:** browse full chat transcripts, see which conversations need human follow-up

Auth is handled by Supabase Auth (email/password). All `/api/admin/*` routes require a valid
Supabase session JWT, verified server-side in `server/src/middleware/auth.middleware.ts`.

## 9. Deployment

### Frontend (Vercel)
1. Import the repo into Vercel, set **Root Directory** to `client`.
2. Framework preset: Vite. Build command `npm run build`, output `dist`.
3. Add env vars: `VITE_API_BASE_URL` (your deployed API URL), `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`.

### Backend (Render / Railway / Fly.io / any Node host)
1. Root directory `server`. Build command `npm run build`, start command `npm start`.
2. Add env vars from `server/.env.example` (use your real Supabase + Gemini keys).
3. Set `CLIENT_ORIGIN` to your deployed frontend URL for CORS.

> The Express API is a long-running server (keeps AI chat history via Supabase, uses
> rate-limiting middleware) so it's deployed as a standalone Node service rather than as
> Vercel serverless functions. If you prefer serverless, port each router in `server/src/routes`
> into a Vercel API route (`/api/*.ts`) reusing the existing controllers/services unchanged.

## 10. Security Notes

- The Supabase **service role key** is used only on the server — never exposed to the client.
- All admin write routes require a verified Supabase session (`requireAdmin` middleware).
- Row Level Security is enabled on every table; public (anon) access is read-only for
  storefront content and insert-only for bookings/chat.
- Chat and booking endpoints are rate-limited (`express-rate-limit`) to control abuse/cost.
