-- ============================================================================
-- Migration 0011 — Leads captured by the ad landing page (VSL funnel)
-- Run AFTER 0010_voice_receptionist.sql. Idempotent.
--
-- These are PLATFORM leads — salon owners who saw a Facebook ad and asked to
-- be contacted — not a tenant's own guests. They deliberately carry no
-- salon_id: no salon owns them, and no tenant should ever read them.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum ('new', 'contacted', 'booked', 'won', 'lost');
  end if;
end $$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  salon_name text,
  city text,
  note text,
  status lead_status not null default 'new',
  -- Where the click came from, so ad spend can be judged per campaign.
  source text not null default 'vsl',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  fbclid text,
  referer text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_leads_created on leads (created_at desc);
create index if not exists idx_leads_status on leads (status, created_at desc);
-- Lookup for the 24h de-duplication the submit action does: a double-tap on
-- the button must not create a second lead, but the same person coming back
-- next week should. Postgres will not index `created_at::date` (casting a
-- timestamptz to date is STABLE, not IMMUTABLE), so the window is applied in
-- the action and this index just makes that check cheap.
create index if not exists idx_leads_phone on leads (phone, created_at desc);

drop trigger if exists trg_set_updated_at on leads;
create trigger trg_set_updated_at before update on leads for each row execute function set_updated_at();

-- RLS on with NO policies: the form writes with the service role, and nothing
-- reachable by anon or a signed-in salon owner can read other people's leads.
alter table leads enable row level security;
