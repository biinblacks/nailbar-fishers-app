-- ============================================================================
-- AI Nail Salon Receptionist SaaS — Supabase Schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- salon_profile: single-row table with core salon identity/contact info
-- ----------------------------------------------------------------------------
create table if not exists salon_profile (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nail Bar',
  address text not null default '8970 E 96TH ST FISHERS IN 46037',
  phone text not null default '(317) 555-0182',
  email text not null default 'hello@luxenailbar.com',
  parking_info text default 'Free parking available directly in front of the salon and in the shared plaza lot.',
  google_review_link text default 'https://g.page/r/example-review-link/review',
  google_map_link text default 'https://maps.google.com/?q=8970+E+96th+St+Fishers+IN+46037',
  instagram_link text,
  facebook_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- business_hours: one row per day of week (0 = Sunday ... 6 = Saturday)
-- ----------------------------------------------------------------------------
create table if not exists business_hours (
  id uuid primary key default gen_random_uuid(),
  day_of_week smallint not null unique check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- service_categories & services
-- ----------------------------------------------------------------------------
create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references service_categories(id) on delete set null,
  name text not null,
  description text,
  price_cents integer not null,
  price_label text, -- e.g. "starts at $65" for variable pricing
  duration_minutes integer not null default 45,
  is_active boolean not null default true,
  display_order integer not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- staff / technicians
-- ----------------------------------------------------------------------------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text default 'Nail Technician',
  bio text,
  photo_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- policies & faq & promotions (flexible knowledge-base tables)
-- ----------------------------------------------------------------------------
create table if not exists salon_policies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ai_knowledge: freeform key/value knowledge chunks editable by admin,
-- injected into the Gemini system prompt alongside structured tables above.
-- ----------------------------------------------------------------------------
create table if not exists ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  preferred_language text default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (phone)
);

-- ----------------------------------------------------------------------------
-- appointments
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
  end if;
end $$;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  staff_id uuid references staff(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  appointment_date date not null,
  appointment_time time not null,
  notes text,
  status appointment_status not null default 'pending',
  review_requested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_appointments_date on appointments (appointment_date, appointment_time);
create index if not exists idx_appointments_status on appointments (status);

-- ----------------------------------------------------------------------------
-- chat_conversations & chat_messages: context memory + admin visibility
-- ----------------------------------------------------------------------------
create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  customer_name text,
  customer_phone text,
  language text not null default 'en',
  needs_human boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'chat_role') then
    create type chat_role as enum ('user', 'assistant', 'system');
  end if;
end $$;

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role chat_role not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_conversation on chat_messages (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- admin_users: dashboard authentication (backed by Supabase Auth uid)
-- ----------------------------------------------------------------------------
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table salon_profile enable row level security;
alter table business_hours enable row level security;
alter table service_categories enable row level security;
alter table services enable row level security;
alter table staff enable row level security;
alter table salon_policies enable row level security;
alter table faqs enable row level security;
alter table promotions enable row level security;
alter table ai_knowledge enable row level security;
alter table customers enable row level security;
alter table appointments enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table admin_users enable row level security;

-- Public (anon) read access for storefront/knowledge-base content
drop policy if exists "public read salon_profile" on salon_profile;
create policy "public read salon_profile" on salon_profile for select using (true);
drop policy if exists "public read business_hours" on business_hours;
create policy "public read business_hours" on business_hours for select using (true);
drop policy if exists "public read service_categories" on service_categories;
create policy "public read service_categories" on service_categories for select using (true);
drop policy if exists "public read services" on services;
create policy "public read services" on services for select using (is_active = true);
drop policy if exists "public read staff" on staff;
create policy "public read staff" on staff for select using (is_active = true);
drop policy if exists "public read salon_policies" on salon_policies;
create policy "public read salon_policies" on salon_policies for select using (true);
drop policy if exists "public read faqs" on faqs;
create policy "public read faqs" on faqs for select using (is_active = true);
drop policy if exists "public read promotions" on promotions;
create policy "public read promotions" on promotions for select using (is_active = true);
drop policy if exists "public read ai_knowledge" on ai_knowledge;
create policy "public read ai_knowledge" on ai_knowledge for select using (is_active = true);

-- Public insert for booking/chat (writes are otherwise done via server using the service role key)
drop policy if exists "public insert customers" on customers;
create policy "public insert customers" on customers for insert with check (true);
drop policy if exists "public insert appointments" on appointments;
create policy "public insert appointments" on appointments for insert with check (true);
drop policy if exists "public insert chat_conversations" on chat_conversations;
create policy "public insert chat_conversations" on chat_conversations for insert with check (true);
drop policy if exists "public insert chat_messages" on chat_messages;
create policy "public insert chat_messages" on chat_messages for insert with check (true);
drop policy if exists "public read own chat_conversations" on chat_conversations;
create policy "public read own chat_conversations" on chat_conversations for select using (true);
drop policy if exists "public read own chat_messages" on chat_messages;
create policy "public read own chat_messages" on chat_messages for select using (true);

-- Admin (authenticated) full access — all tables
drop policy if exists "admin full access salon_profile" on salon_profile;
create policy "admin full access salon_profile" on salon_profile for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access business_hours" on business_hours;
create policy "admin full access business_hours" on business_hours for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access service_categories" on service_categories;
create policy "admin full access service_categories" on service_categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access services" on services;
create policy "admin full access services" on services for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access staff" on staff;
create policy "admin full access staff" on staff for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access salon_policies" on salon_policies;
create policy "admin full access salon_policies" on salon_policies for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access faqs" on faqs;
create policy "admin full access faqs" on faqs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access promotions" on promotions;
create policy "admin full access promotions" on promotions for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access ai_knowledge" on ai_knowledge;
create policy "admin full access ai_knowledge" on ai_knowledge for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access customers" on customers;
create policy "admin full access customers" on customers for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access appointments" on appointments;
create policy "admin full access appointments" on appointments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access chat_conversations" on chat_conversations;
create policy "admin full access chat_conversations" on chat_conversations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin full access chat_messages" on chat_messages;
create policy "admin full access chat_messages" on chat_messages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "admin read own row admin_users" on admin_users;
create policy "admin read own row admin_users" on admin_users for select using (auth.uid() = id);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'salon_profile','business_hours','services','staff','salon_policies',
      'faqs','promotions','ai_knowledge','customers','appointments','chat_conversations'
    ])
  loop
    execute format('drop trigger if exists trg_set_updated_at on %I;', t);
    execute format('create trigger trg_set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;
