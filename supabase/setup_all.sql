-- ============================================================================
-- Nail Salon SaaS — toàn bộ cấu trúc database trong một file.
--
-- CÁCH DÙNG: mở Supabase → SQL Editor → New query → dán hết file này → Run.
-- Chạy một lần là xong. Chạy lại nhiều lần cũng an toàn (không tạo trùng).
--
-- File này gồm: schema gốc + 9 bản nâng cấp + dữ liệu mẫu tiệm Nail Bar.
-- Sinh tự động từ supabase/schema.sql, supabase/migrations/*, supabase/seed.sql
-- ============================================================================



-- ############################################################################
-- ## schema.sql
-- ############################################################################

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


-- ############################################################################
-- ## 0001_multi_tenant_salons.sql
-- ############################################################################

-- ============================================================================
-- Migration 0001 — Multi-tenant salons (Phase 1)
--
-- Run AFTER supabase/schema.sql. Safe to re-run (idempotent).
--
-- What this does:
--   1. Adds the tenant tables: salons, salon_members, profiles.
--   2. Adds salon_id to every per-salon table and backfills it from the
--      legacy single-row salon_profile (creating a default salon if needed).
--   3. Converts global unique constraints into per-salon unique constraints.
--   4. Replaces the "any authenticated user can edit everything" RLS policies
--      with membership-scoped policies, and removes the public read policy on
--      chat transcripts.
--   5. Adds helper functions + the create_salon() RPC used by onboarding.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tenant tables
-- ----------------------------------------------------------------------------
create table if not exists salons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  name text not null,
  address text,
  phone text,
  email text,
  timezone text not null default 'America/Indiana/Indianapolis',
  parking_info text,
  google_review_link text,
  google_map_link text,
  instagram_link text,
  facebook_link text,
  logo_url text,
  plan text not null default 'starter',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'salon_role') then
    create type salon_role as enum ('owner', 'admin', 'staff');
  end if;
end $$;

create table if not exists salon_members (
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role salon_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (salon_id, user_id)
);
create index if not exists idx_salon_members_user on salon_members (user_id);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep profiles in sync with auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for users that already exist
insert into profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.email
from auth.users u
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Membership helper functions (security definer => no RLS recursion)
-- ----------------------------------------------------------------------------
create or replace function public.is_salon_member(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from salon_members
    where salon_id = p_salon_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_salon_role(p_salon_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from salon_members
    where salon_id = p_salon_id
      and user_id = auth.uid()
      and role::text = any (p_roles)
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Add salon_id to per-salon tables
-- ----------------------------------------------------------------------------
alter table business_hours     add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table service_categories add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table services           add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table staff              add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table salon_policies     add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table faqs               add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table promotions         add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table ai_knowledge       add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table customers          add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table appointments       add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table chat_conversations add column if not exists salon_id uuid references salons(id) on delete cascade;
alter table salon_profile      add column if not exists salon_id uuid references salons(id) on delete cascade;

-- Phase 1 field additions
alter table staff add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table staff add column if not exists phone text;
alter table staff add column if not exists email text;
alter table staff add column if not exists color text default '#ec4d7d';

alter table customers add column if not exists notes text;
alter table customers add column if not exists birthday date;
alter table customers add column if not exists tags text[] not null default '{}';
alter table customers add column if not exists last_visit_at timestamptz;
alter table customers add column if not exists marketing_opt_in boolean not null default true;

alter table appointments add column if not exists duration_minutes integer;
alter table appointments add column if not exists source text not null default 'online';
alter table appointments add column if not exists created_by uuid references auth.users(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 4. Backfill: create a default salon from the legacy salon_profile row
-- ----------------------------------------------------------------------------
do $$
declare
  v_salon_id uuid;
  v_profile salon_profile%rowtype;
  v_has_legacy boolean;
begin
  select exists (select 1 from salon_profile)
      or exists (select 1 from services where salon_id is null)
      or exists (select 1 from appointments where salon_id is null)
      or exists (select 1 from admin_users)
  into v_has_legacy;

  if not v_has_legacy then
    return;
  end if;

  select * into v_profile from salon_profile order by created_at asc limit 1;

  select id into v_salon_id from salons where slug = 'nail-bar';
  if v_salon_id is null then
    insert into salons (slug, name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
    values (
      'nail-bar',
      coalesce(v_profile.name, 'Nail Bar'),
      v_profile.address,
      v_profile.phone,
      v_profile.email,
      v_profile.parking_info,
      v_profile.google_review_link,
      v_profile.google_map_link,
      v_profile.instagram_link,
      v_profile.facebook_link
    )
    returning id into v_salon_id;
  end if;

  update salon_profile      set salon_id = v_salon_id where salon_id is null;
  update business_hours     set salon_id = v_salon_id where salon_id is null;
  update service_categories set salon_id = v_salon_id where salon_id is null;
  update services           set salon_id = v_salon_id where salon_id is null;
  update staff              set salon_id = v_salon_id where salon_id is null;
  update salon_policies     set salon_id = v_salon_id where salon_id is null;
  update faqs               set salon_id = v_salon_id where salon_id is null;
  update promotions         set salon_id = v_salon_id where salon_id is null;
  update ai_knowledge       set salon_id = v_salon_id where salon_id is null;
  update customers          set salon_id = v_salon_id where salon_id is null;
  update appointments       set salon_id = v_salon_id where salon_id is null;
  update chat_conversations set salon_id = v_salon_id where salon_id is null;

  -- Legacy admins become owners of the default salon
  insert into salon_members (salon_id, user_id, role)
  select v_salon_id, id, 'owner'::salon_role from admin_users
  on conflict do nothing;
end $$;

-- Now that everything is backfilled, enforce the tenant column.
alter table business_hours     alter column salon_id set not null;
alter table service_categories alter column salon_id set not null;
alter table services           alter column salon_id set not null;
alter table staff              alter column salon_id set not null;
alter table salon_policies     alter column salon_id set not null;
alter table faqs               alter column salon_id set not null;
alter table promotions         alter column salon_id set not null;
alter table ai_knowledge       alter column salon_id set not null;
alter table customers          alter column salon_id set not null;
alter table appointments       alter column salon_id set not null;
alter table chat_conversations alter column salon_id set not null;

-- ----------------------------------------------------------------------------
-- 5. Per-salon unique constraints + indexes
-- ----------------------------------------------------------------------------
alter table business_hours drop constraint if exists business_hours_day_of_week_key;
alter table business_hours drop constraint if exists business_hours_salon_day_key;
alter table business_hours add constraint business_hours_salon_day_key unique (salon_id, day_of_week);

alter table customers drop constraint if exists customers_phone_key;
alter table customers drop constraint if exists customers_salon_phone_key;
alter table customers add constraint customers_salon_phone_key unique (salon_id, phone);

-- Constraints that dedupe_and_harden.sql may have added
alter table service_categories drop constraint if exists service_categories_name_key;
alter table services           drop constraint if exists services_name_key;
alter table staff              drop constraint if exists staff_full_name_key;
alter table salon_policies     drop constraint if exists salon_policies_title_key;
alter table faqs               drop constraint if exists faqs_question_key;
alter table promotions         drop constraint if exists promotions_title_key;
alter table ai_knowledge       drop constraint if exists ai_knowledge_topic_key;
drop index if exists salon_profile_singleton_idx;

alter table service_categories drop constraint if exists service_categories_salon_name_key;
alter table service_categories add constraint service_categories_salon_name_key unique (salon_id, name);
alter table services drop constraint if exists services_salon_name_key;
alter table services add constraint services_salon_name_key unique (salon_id, name);
alter table staff drop constraint if exists staff_salon_name_key;
alter table staff add constraint staff_salon_name_key unique (salon_id, full_name);
alter table salon_policies drop constraint if exists salon_policies_salon_title_key;
alter table salon_policies add constraint salon_policies_salon_title_key unique (salon_id, title);
alter table faqs drop constraint if exists faqs_salon_question_key;
alter table faqs add constraint faqs_salon_question_key unique (salon_id, question);
alter table promotions drop constraint if exists promotions_salon_title_key;
alter table promotions add constraint promotions_salon_title_key unique (salon_id, title);
alter table ai_knowledge drop constraint if exists ai_knowledge_salon_topic_key;
alter table ai_knowledge add constraint ai_knowledge_salon_topic_key unique (salon_id, topic);

create index if not exists idx_services_salon on services (salon_id, display_order);
create index if not exists idx_staff_salon on staff (salon_id, display_order);
create index if not exists idx_customers_salon on customers (salon_id, full_name);
create index if not exists idx_appointments_salon_date on appointments (salon_id, appointment_date, appointment_time);
create index if not exists idx_appointments_staff_date on appointments (staff_id, appointment_date);
create index if not exists idx_chat_conversations_salon on chat_conversations (salon_id, updated_at desc);
create index if not exists idx_faqs_salon on faqs (salon_id);
create index if not exists idx_promotions_salon on promotions (salon_id);
create index if not exists idx_ai_knowledge_salon on ai_knowledge (salon_id);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
-- ----------------------------------------------------------------------------
alter table salons enable row level security;
alter table salon_members enable row level security;
alter table profiles enable row level security;

-- salons
drop policy if exists "public read active salons" on salons;
create policy "public read active salons" on salons
  for select using (is_active = true or is_salon_member(id));
drop policy if exists "owners and admins update salon" on salons;
create policy "owners and admins update salon" on salons
  for update using (has_salon_role(id, array['owner','admin']))
  with check (has_salon_role(id, array['owner','admin']));
drop policy if exists "owners delete salon" on salons;
create policy "owners delete salon" on salons
  for delete using (has_salon_role(id, array['owner']));
-- inserts happen through create_salon() below

-- salon_members
drop policy if exists "members read memberships" on salon_members;
create policy "members read memberships" on salon_members
  for select using (user_id = auth.uid() or is_salon_member(salon_id));
drop policy if exists "owners and admins add members" on salon_members;
create policy "owners and admins add members" on salon_members
  for insert with check (has_salon_role(salon_id, array['owner','admin']));
drop policy if exists "owners update members" on salon_members;
create policy "owners update members" on salon_members
  for update using (has_salon_role(salon_id, array['owner']))
  with check (has_salon_role(salon_id, array['owner']));
drop policy if exists "owners remove members or self leave" on salon_members;
create policy "owners remove members or self leave" on salon_members
  for delete using (has_salon_role(salon_id, array['owner']) or user_id = auth.uid());

-- profiles
drop policy if exists "read own or teammate profiles" on profiles;
create policy "read own or teammate profiles" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from salon_members me
      join salon_members them on them.salon_id = me.salon_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Replace the legacy "any authenticated user" policies with membership policies
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'business_hours','service_categories','services','staff','salon_policies',
      'faqs','promotions','ai_knowledge','customers','appointments','chat_conversations'
    ])
  loop
    execute format('drop policy if exists "admin full access %s" on %I;', t, t);
    execute format('drop policy if exists "members manage %s" on %I;', t, t);
    execute format(
      'create policy "members manage %s" on %I for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));',
      t, t
    );
  end loop;
end $$;

-- Legacy salon_profile table: keep readable, but only members may write.
drop policy if exists "admin full access salon_profile" on salon_profile;
drop policy if exists "members manage salon_profile" on salon_profile;
create policy "members manage salon_profile" on salon_profile
  for all using (salon_id is not null and is_salon_member(salon_id))
  with check (salon_id is not null and is_salon_member(salon_id));

-- chat_messages: scoped through the parent conversation
drop policy if exists "admin full access chat_messages" on chat_messages;
drop policy if exists "members manage chat_messages" on chat_messages;
create policy "members manage chat_messages" on chat_messages
  for all using (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and is_salon_member(c.salon_id))
  )
  with check (
    exists (select 1 from chat_conversations c where c.id = chat_messages.conversation_id and is_salon_member(c.salon_id))
  );

-- Remove anonymous write access and the public chat-transcript leak.
-- The Express API writes with the service role key, so nothing public breaks.
drop policy if exists "public insert customers" on customers;
drop policy if exists "public insert appointments" on appointments;
drop policy if exists "public insert chat_conversations" on chat_conversations;
drop policy if exists "public insert chat_messages" on chat_messages;
drop policy if exists "public read own chat_conversations" on chat_conversations;
drop policy if exists "public read own chat_messages" on chat_messages;

-- ----------------------------------------------------------------------------
-- 7. Onboarding RPC: create a salon and make the caller its owner
-- ----------------------------------------------------------------------------
create or replace function public.create_salon(
  p_name text,
  p_slug text,
  p_phone text default null,
  p_address text default null,
  p_email text default null,
  p_timezone text default 'America/Indiana/Indianapolis'
)
returns salons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon salons;
  v_uid uuid := auth.uid();
  d int;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into salons (name, slug, phone, address, email, timezone, created_by)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), nullif(trim(p_email), ''), coalesce(p_timezone, 'America/Indiana/Indianapolis'), v_uid)
  returning * into v_salon;

  insert into salon_members (salon_id, user_id, role) values (v_salon.id, v_uid, 'owner');

  -- Sensible default hours: Mon-Sat 9:30-19:00, Sunday closed
  for d in 0..6 loop
    insert into business_hours (salon_id, day_of_week, open_time, close_time, is_closed)
    values (v_salon.id, d, '09:30', '19:00', d = 0)
    on conflict (salon_id, day_of_week) do nothing;
  end loop;

  return v_salon;
end;
$$;

revoke all on function public.create_salon(text, text, text, text, text, text) from public;
grant execute on function public.create_salon(text, text, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 8. updated_at triggers for the new tables
-- ----------------------------------------------------------------------------
drop trigger if exists trg_set_updated_at on salons;
create trigger trg_set_updated_at before update on salons for each row execute function set_updated_at();
drop trigger if exists trg_set_updated_at on profiles;
create trigger trg_set_updated_at before update on profiles for each row execute function set_updated_at();


-- ############################################################################
-- ## 0002_receptionist_and_booking.sql
-- ############################################################################

-- ============================================================================
-- Migration 0002 — Phase 2: online booking settings + AI receptionist inbox
-- Run AFTER 0001_multi_tenant_salons.sql. Idempotent.
-- ============================================================================

-- Per-salon booking rules used by the public booking page and the AI tools.
alter table salons add column if not exists online_booking_enabled boolean not null default true;
alter table salons add column if not exists booking_slot_minutes integer not null default 30 check (booking_slot_minutes between 5 and 120);
alter table salons add column if not exists booking_lead_minutes integer not null default 60 check (booking_lead_minutes between 0 and 10080);
alter table salons add column if not exists booking_window_days integer not null default 60 check (booking_window_days between 1 and 365);
alter table salons add column if not exists booking_buffer_minutes integer not null default 0 check (booking_buffer_minutes between 0 and 120);

-- AI receptionist settings.
alter table salons add column if not exists ai_enabled boolean not null default true;
alter table salons add column if not exists ai_greeting text;
alter table salons add column if not exists ai_can_book boolean not null default true;

-- Conversations: link to a customer, remember channel + last activity for the inbox.
alter table chat_conversations add column if not exists customer_id uuid references customers(id) on delete set null;
alter table chat_conversations add column if not exists channel text not null default 'web';
alter table chat_conversations add column if not exists last_message_at timestamptz not null default now();
alter table chat_conversations add column if not exists message_count integer not null default 0;
alter table chat_conversations add column if not exists resolved_at timestamptz;

create index if not exists idx_chat_conversations_inbox
  on chat_conversations (salon_id, needs_human, last_message_at desc);

-- Keep last_message_at / message_count fresh without an extra round-trip.
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update chat_conversations
     set last_message_at = new.created_at,
         message_count = message_count + 1,
         updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation on chat_messages;
create trigger trg_touch_conversation
  after insert on chat_messages
  for each row execute function public.touch_conversation_on_message();

-- Appointments booked by the AI or the public page carry a conversation link
-- so the inbox can show what was booked from a chat.
alter table appointments add column if not exists conversation_id uuid references chat_conversations(id) on delete set null;


-- ############################################################################
-- ## 0003_invites_and_media.sql
-- ############################################################################

-- ============================================================================
-- Migration 0003 — Phase 2 (part 2): team invitations + media storage
-- Run AFTER 0002_receptionist_and_booking.sql. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Let PostgREST join salon_members -> profiles (both key off auth.users)
-- ----------------------------------------------------------------------------
insert into profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.email
from auth.users u
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'salon_members_user_id_profiles_fkey') then
    alter table salon_members
      add constraint salon_members_user_id_profiles_fkey
      foreign key (user_id) references profiles(id) on delete cascade;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Team invitations
-- ----------------------------------------------------------------------------
create table if not exists salon_invites (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  email text not null,
  role salon_role not null default 'staff',
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_salon_invites_salon on salon_invites (salon_id, created_at desc);
create unique index if not exists salon_invites_pending_email_idx
  on salon_invites (salon_id, lower(email)) where accepted_at is null;

alter table salon_invites enable row level security;

drop policy if exists "members read invites" on salon_invites;
create policy "members read invites" on salon_invites
  for select using (is_salon_member(salon_id));
drop policy if exists "owners and admins create invites" on salon_invites;
create policy "owners and admins create invites" on salon_invites
  for insert with check (has_salon_role(salon_id, array['owner','admin']));
drop policy if exists "owners and admins delete invites" on salon_invites;
create policy "owners and admins delete invites" on salon_invites
  for delete using (has_salon_role(salon_id, array['owner','admin']));

-- Look up an invite by its secret token (works for signed-in users only, and
-- never reveals anything except what the invite page needs to show).
create or replace function public.get_salon_invite(p_token text)
returns table (salon_name text, salon_slug text, role salon_role, email text, expires_at timestamptz, accepted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.slug, i.role, i.email, i.expires_at, i.accepted_at
  from salon_invites i
  join salons s on s.id = i.salon_id
  where i.token = p_token and auth.uid() is not null;
$$;

-- Accept: the signed-in user's email must match the invite (case-insensitive).
create or replace function public.accept_salon_invite(p_token text)
returns salons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite salon_invites;
  v_salon salons;
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_invite from salon_invites where token = p_token for update;
  if v_invite.id is null then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'Invite already used' using errcode = 'P0002';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invite expired' using errcode = 'P0002';
  end if;

  select email into v_email from auth.users where id = v_uid;
  if lower(coalesce(v_email, '')) <> lower(v_invite.email) then
    raise exception 'This invite was sent to a different email address' using errcode = '42501';
  end if;

  insert into salon_members (salon_id, user_id, role)
  values (v_invite.salon_id, v_uid, v_invite.role)
  on conflict (salon_id, user_id) do update set role = excluded.role;

  update salon_invites set accepted_at = now(), accepted_by = v_uid where id = v_invite.id;

  select * into v_salon from salons where id = v_invite.salon_id;
  return v_salon;
end;
$$;

revoke all on function public.get_salon_invite(text) from public;
grant execute on function public.get_salon_invite(text) to authenticated;
revoke all on function public.accept_salon_invite(text) from public;
grant execute on function public.accept_salon_invite(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Gallery table
-- ----------------------------------------------------------------------------
create table if not exists salon_gallery (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  image_url text not null,
  storage_path text,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_salon_gallery_salon on salon_gallery (salon_id, display_order);

alter table salon_gallery enable row level security;
drop policy if exists "public read salon_gallery" on salon_gallery;
create policy "public read salon_gallery" on salon_gallery for select using (true);
drop policy if exists "members manage salon_gallery" on salon_gallery;
create policy "members manage salon_gallery" on salon_gallery
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

-- ----------------------------------------------------------------------------
-- 3. Storage bucket "salon-media": public read, members write under <salon_id>/
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('salon-media', 'salon-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read salon media" on storage.objects;
create policy "public read salon media" on storage.objects
  for select using (bucket_id = 'salon-media');

drop policy if exists "members upload salon media" on storage.objects;
create policy "members upload salon media" on storage.objects
  for insert with check (
    bucket_id = 'salon-media'
    and is_salon_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members update salon media" on storage.objects;
create policy "members update salon media" on storage.objects
  for update using (
    bucket_id = 'salon-media'
    and is_salon_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "members delete salon media" on storage.objects;
create policy "members delete salon media" on storage.objects
  for delete using (
    bucket_id = 'salon-media'
    and is_salon_member(((storage.foldername(name))[1])::uuid)
  );


-- ############################################################################
-- ## 0004_interpreter.sql
-- ############################################################################

-- ============================================================================
-- Migration 0004 — Phase 3: Bee Interpreter (Vietnamese <-> English live translation)
-- Run AFTER 0003_invites_and_media.sql. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Sessions + turns
-- ----------------------------------------------------------------------------
create table if not exists interpreter_sessions (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  started_by uuid references auth.users(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  title text,
  lang_a text not null default 'vi',   -- technician side
  lang_b text not null default 'en',   -- customer side
  turn_count integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_interpreter_sessions_salon on interpreter_sessions (salon_id, started_at desc);
create index if not exists idx_interpreter_sessions_customer on interpreter_sessions (customer_id);

create table if not exists interpreter_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references interpreter_sessions(id) on delete cascade,
  salon_id uuid not null references salons(id) on delete cascade,
  speaker text not null check (speaker in ('a', 'b')),
  source_lang text not null,
  target_lang text not null,
  source_text text not null,
  translated_text text not null,
  via text not null default 'ai' check (via in ('ai', 'phrase', 'manual')),
  created_at timestamptz not null default now()
);
create index if not exists idx_interpreter_turns_session on interpreter_turns (session_id, created_at);

create or replace function public.touch_interpreter_session()
returns trigger
language plpgsql
as $$
begin
  update interpreter_sessions
     set turn_count = turn_count + 1,
         updated_at = now(),
         title = coalesce(title, left(new.source_text, 80))
   where id = new.session_id;
  return new;
end;
$$;
drop trigger if exists trg_touch_interpreter_session on interpreter_turns;
create trigger trg_touch_interpreter_session
  after insert on interpreter_turns
  for each row execute function public.touch_interpreter_session();

drop trigger if exists trg_set_updated_at on interpreter_sessions;
create trigger trg_set_updated_at before update on interpreter_sessions for each row execute function set_updated_at();

alter table interpreter_sessions enable row level security;
alter table interpreter_turns enable row level security;

drop policy if exists "members manage interpreter_sessions" on interpreter_sessions;
create policy "members manage interpreter_sessions" on interpreter_sessions
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "members manage interpreter_turns" on interpreter_turns;
create policy "members manage interpreter_turns" on interpreter_turns
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));

-- ----------------------------------------------------------------------------
-- 2. Quick phrases: global defaults (salon_id null) + per-salon custom ones
-- ----------------------------------------------------------------------------
create table if not exists quick_phrases (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references salons(id) on delete cascade,
  category text not null,
  text_en text not null,
  text_vi text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_quick_phrases_salon on quick_phrases (salon_id, category, display_order);
create unique index if not exists quick_phrases_global_en_idx on quick_phrases (lower(text_en)) where salon_id is null;

alter table quick_phrases enable row level security;
drop policy if exists "read global and own quick_phrases" on quick_phrases;
create policy "read global and own quick_phrases" on quick_phrases
  for select using (salon_id is null or is_salon_member(salon_id));
drop policy if exists "members insert quick_phrases" on quick_phrases;
create policy "members insert quick_phrases" on quick_phrases
  for insert with check (salon_id is not null and is_salon_member(salon_id));
drop policy if exists "members update quick_phrases" on quick_phrases;
create policy "members update quick_phrases" on quick_phrases
  for update using (salon_id is not null and is_salon_member(salon_id))
  with check (salon_id is not null and is_salon_member(salon_id));
drop policy if exists "members delete quick_phrases" on quick_phrases;
create policy "members delete quick_phrases" on quick_phrases
  for delete using (salon_id is not null and is_salon_member(salon_id));

-- Default nail-salon phrases (technician side is Vietnamese, customer side English)
insert into quick_phrases (salon_id, category, text_en, text_vi, display_order) values
  (null, 'Greeting', 'Hi! Welcome. What can I do for you today?', 'Chào chị! Hôm nay chị muốn làm gì ạ?', 1),
  (null, 'Greeting', 'Do you have an appointment?', 'Chị có đặt lịch trước không ạ?', 2),
  (null, 'Greeting', 'Please have a seat, someone will be with you shortly.', 'Mời chị ngồi, sẽ có người phục vụ chị ngay ạ.', 3),
  (null, 'Greeting', 'Please pick a color.', 'Mời chị chọn màu ạ.', 4),
  (null, 'Service', 'Would you like gel, dip powder, or acrylic?', 'Chị muốn làm gel, nhúng bột hay đắp bột acrylic ạ?', 1),
  (null, 'Service', 'Would you like a manicure, a pedicure, or both?', 'Chị muốn làm tay, làm chân hay cả hai ạ?', 2),
  (null, 'Service', 'Do you want a fill or a new full set?', 'Chị muốn fill lại hay làm bộ mới ạ?', 3),
  (null, 'Service', 'Would you like to remove the old polish first?', 'Chị có muốn tháo lớp cũ trước không ạ?', 4),
  (null, 'Service', 'Do you want nail art or a design?', 'Chị có muốn vẽ móng hay làm kiểu gì không ạ?', 5),
  (null, 'Shape & length', 'What shape would you like: square, round, almond, coffin, or stiletto?', 'Chị thích dáng nào: vuông, tròn, hạnh nhân, coffin hay nhọn ạ?', 1),
  (null, 'Shape & length', 'How long would you like them? Short, medium, or long?', 'Chị muốn móng dài bao nhiêu: ngắn, vừa hay dài ạ?', 2),
  (null, 'Shape & length', 'Is this length okay?', 'Độ dài này được chưa ạ?', 3),
  (null, 'Shape & length', 'Is this shape okay?', 'Dáng này được chưa ạ?', 4),
  (null, 'Color', 'Which color would you like?', 'Chị muốn màu nào ạ?', 1),
  (null, 'Color', 'Do you like this color?', 'Chị có thích màu này không ạ?', 2),
  (null, 'Color', 'Would you like French tips, ombré, or chrome?', 'Chị có muốn kiểu Pháp, ombré hay chrome không ạ?', 3),
  (null, 'Price & time', 'That will be about $%s.', 'Giá khoảng %s đô ạ.', 1),
  (null, 'Price & time', 'It will take about %s minutes.', 'Mất khoảng %s phút ạ.', 2),
  (null, 'Price & time', 'Nail art is an extra charge.', 'Vẽ móng tính thêm phí ạ.', 3),
  (null, 'Price & time', 'The wait is about %s minutes. Is that okay?', 'Chị chờ khoảng %s phút được không ạ?', 4),
  (null, 'During service', 'Please relax your hand.', 'Chị thả lỏng tay giúp em ạ.', 1),
  (null, 'During service', 'Is the water too hot?', 'Nước có nóng quá không ạ?', 2),
  (null, 'During service', 'Does this hurt?', 'Có đau không ạ?', 3),
  (null, 'During service', 'Please put your hand in the lamp.', 'Chị để tay vào máy sấy giúp em ạ.', 4),
  (null, 'During service', 'Please be careful, it is still wet.', 'Chị cẩn thận, móng còn ướt ạ.', 5),
  (null, 'Aftercare', 'Avoid water for about an hour.', 'Chị tránh nước khoảng một tiếng ạ.', 1),
  (null, 'Aftercare', 'Come back in two to three weeks for a fill.', 'Hai đến ba tuần nữa chị quay lại fill nhé ạ.', 2),
  (null, 'Payment', 'Cash or card?', 'Chị trả tiền mặt hay thẻ ạ?', 1),
  (null, 'Payment', 'Would you like to book your next appointment?', 'Chị có muốn đặt lịch lần sau không ạ?', 2),
  (null, 'Payment', 'Thank you! See you next time.', 'Cảm ơn chị! Hẹn gặp lại ạ.', 3)
on conflict do nothing;


-- ############################################################################
-- ## 0005_automations.sql
-- ############################################################################

-- ============================================================================
-- Migration 0005 — Phase 4: Automations (reminders, review requests,
-- comeback nudges, birthday promos, new-customer follow-ups)
-- Run AFTER 0004_interpreter.sql. Idempotent.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'automation_type') then
    create type automation_type as enum (
      'appointment_reminder', 'review_request', 'comeback_reminder', 'birthday_promo', 'new_customer_followup'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'message_channel') then
    create type message_channel as enum ('sms', 'email');
  end if;
  if not exists (select 1 from pg_type where typname = 'automation_job_status') then
    create type automation_job_status as enum ('pending', 'sent', 'skipped', 'failed', 'cancelled');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 1. Rules: one row per (salon, type, offset). Templates are bilingual and use
--    {{placeholders}} rendered by web/lib/messaging/templates.ts.
-- ----------------------------------------------------------------------------
create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  type automation_type not null,
  name text not null,
  is_enabled boolean not null default false,
  channel message_channel not null default 'sms',
  -- appointment_reminder: minutes BEFORE the appointment
  -- review_request / new_customer_followup: minutes AFTER completion
  offset_minutes integer not null default 0,
  -- comeback_reminder: days since last visit; birthday_promo: days before the birthday
  interval_days integer,
  template_en text not null,
  template_vi text not null,
  send_hour_start smallint not null default 9 check (send_hour_start between 0 and 23),
  send_hour_end smallint not null default 20 check (send_hour_end between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, type, offset_minutes)
);
create index if not exists idx_automation_rules_salon on automation_rules (salon_id, type);
drop trigger if exists trg_set_updated_at on automation_rules;
create trigger trg_set_updated_at before update on automation_rules for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Jobs: the queue. dedupe_key guarantees each event is scheduled once.
-- ----------------------------------------------------------------------------
create table if not exists automation_jobs (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  rule_id uuid references automation_rules(id) on delete cascade,
  type automation_type not null,
  customer_id uuid references customers(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  channel message_channel not null,
  recipient text,
  language text not null default 'en',
  scheduled_for timestamptz not null,
  status automation_job_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  dedupe_key text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists idx_automation_jobs_due on automation_jobs (status, scheduled_for);
create index if not exists idx_automation_jobs_salon on automation_jobs (salon_id, scheduled_for desc);
create index if not exists idx_automation_jobs_customer on automation_jobs (customer_id, type, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. Message log: every attempted send (SMS/email), whatever the outcome.
-- ----------------------------------------------------------------------------
create table if not exists message_log (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  job_id uuid references automation_jobs(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  channel message_channel not null,
  recipient text not null,
  subject text,
  body text not null,
  provider text not null,
  provider_message_id text,
  status text not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_message_log_salon on message_log (salon_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. RLS: members manage rules; jobs + log are readable (and cancellable) by
--    members; the cron worker writes with the service role.
-- ----------------------------------------------------------------------------
alter table automation_rules enable row level security;
alter table automation_jobs enable row level security;
alter table message_log enable row level security;

drop policy if exists "members manage automation_rules" on automation_rules;
create policy "members manage automation_rules" on automation_rules
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "members read automation_jobs" on automation_jobs;
create policy "members read automation_jobs" on automation_jobs
  for select using (is_salon_member(salon_id));
drop policy if exists "members cancel automation_jobs" on automation_jobs;
create policy "members cancel automation_jobs" on automation_jobs
  for update using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "members read message_log" on message_log;
create policy "members read message_log" on message_log
  for select using (is_salon_member(salon_id));

-- ----------------------------------------------------------------------------
-- 5. Cancel pending reminders when an appointment is cancelled / no-show /
--    rescheduled (a new job with a new dedupe key is planned on the next run).
-- ----------------------------------------------------------------------------
create or replace function public.cancel_jobs_on_appointment_change()
returns trigger
language plpgsql
as $$
begin
  if (new.status in ('cancelled', 'no_show') and old.status is distinct from new.status)
     or new.appointment_date is distinct from old.appointment_date
     or new.appointment_time is distinct from old.appointment_time then
    update automation_jobs
       set status = 'cancelled', last_error = 'appointment changed'
     where appointment_id = new.id
       and type = 'appointment_reminder'
       and status = 'pending';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_cancel_jobs_on_appointment_change on appointments;
create trigger trg_cancel_jobs_on_appointment_change
  after update on appointments
  for each row execute function public.cancel_jobs_on_appointment_change();

-- ----------------------------------------------------------------------------
-- 6. Default rules for every salon (disabled until the owner turns them on)
-- ----------------------------------------------------------------------------
create or replace function public.ensure_automation_rules(p_salon_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into automation_rules (salon_id, type, name, channel, offset_minutes, interval_days, template_en, template_vi) values
    (p_salon_id, 'appointment_reminder', 'Reminder — day before', 'sms', 1440, null,
      'Hi {{customer_name}}, this is {{salon_name}}. Reminder: {{service}} on {{date}} at {{time}}{{technician_with}}. Reply or call {{salon_phone}} to reschedule. See you soon!',
      'Chào {{customer_name}}, {{salon_name}} nhắc bạn lịch hẹn {{service}} vào {{date}} lúc {{time}}{{technician_with}}. Cần đổi lịch, vui lòng gọi {{salon_phone}}. Hẹn gặp bạn!'),
    (p_salon_id, 'appointment_reminder', 'Reminder — 2 hours before', 'sms', 120, null,
      'See you in about 2 hours, {{customer_name}}! {{service}} at {{time}} with {{salon_name}}.',
      'Khoảng 2 tiếng nữa gặp bạn nhé, {{customer_name}}! {{service}} lúc {{time}} tại {{salon_name}}.'),
    (p_salon_id, 'review_request', 'Review request after visit', 'sms', 120, null,
      'Thank you for visiting {{salon_name}}, {{customer_name}}! If you loved your nails, a quick Google review helps us a lot: {{review_link}}',
      'Cảm ơn {{customer_name}} đã ghé {{salon_name}}! Nếu bạn hài lòng, một đánh giá Google ngắn sẽ giúp tiệm rất nhiều: {{review_link}}'),
    (p_salon_id, 'comeback_reminder', 'We miss you (after 5 weeks)', 'sms', 0, 35,
      'Hi {{customer_name}}, it has been a while! Your nails are due for some love at {{salon_name}}. Book here: {{booking_link}}',
      'Chào {{customer_name}}, lâu rồi không gặp! Đến lúc chăm móng lại tại {{salon_name}} rồi. Đặt lịch tại: {{booking_link}}'),
    (p_salon_id, 'birthday_promo', 'Birthday treat', 'sms', 0, 3,
      'Happy early birthday, {{customer_name}}! {{salon_name}} has a birthday treat waiting for you this month. Book here: {{booking_link}}',
      'Chúc mừng sinh nhật sớm, {{customer_name}}! {{salon_name}} có quà sinh nhật dành cho bạn trong tháng này. Đặt lịch tại: {{booking_link}}'),
    (p_salon_id, 'new_customer_followup', 'New guest follow-up (next day)', 'sms', 1440, null,
      'Hi {{customer_name}}, thank you for choosing {{salon_name}} for your first visit! How are your nails holding up? Reply here or call {{salon_phone}} if anything needs a touch-up.',
      'Chào {{customer_name}}, cảm ơn bạn đã chọn {{salon_name}} cho lần đầu ghé tiệm! Móng vẫn đẹp chứ? Có gì cần chỉnh, nhắn hoặc gọi {{salon_phone}} nhé.')
  on conflict (salon_id, type, offset_minutes) do nothing;
end;
$$;

-- Backfill every existing salon and hook into onboarding.
do $$
declare s record;
begin
  for s in select id from salons loop
    perform public.ensure_automation_rules(s.id);
  end loop;
end $$;

create or replace function public.create_salon(
  p_name text,
  p_slug text,
  p_phone text default null,
  p_address text default null,
  p_email text default null,
  p_timezone text default 'America/Indiana/Indianapolis'
)
returns salons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon salons;
  v_uid uuid := auth.uid();
  d int;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into salons (name, slug, phone, address, email, timezone, created_by)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), nullif(trim(p_email), ''), coalesce(p_timezone, 'America/Indiana/Indianapolis'), v_uid)
  returning * into v_salon;

  insert into salon_members (salon_id, user_id, role) values (v_salon.id, v_uid, 'owner');

  for d in 0..6 loop
    insert into business_hours (salon_id, day_of_week, open_time, close_time, is_closed)
    values (v_salon.id, d, '09:30', '19:00', d = 0)
    on conflict (salon_id, day_of_week) do nothing;
  end loop;

  perform public.ensure_automation_rules(v_salon.id);

  return v_salon;
end;
$$;

revoke all on function public.ensure_automation_rules(uuid) from public;
grant execute on function public.ensure_automation_rules(uuid) to authenticated;


-- ############################################################################
-- ## 0006_marketing.sql
-- ############################################################################

-- ============================================================================
-- Migration 0006 — Phase 5: AI marketing (campaigns, generated assets,
-- scheduled posts). Run AFTER 0005_automations.sql. Idempotent.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'campaign_status') then
    create type campaign_status as enum ('draft', 'active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'asset_kind') then
    create type asset_kind as enum ('caption', 'promo', 'image_prompt', 'video_prompt', 'hashtags', 'sms', 'email');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_platform') then
    create type post_platform as enum ('facebook', 'instagram', 'tiktok', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_status') then
    create type post_status as enum ('scheduled', 'ready', 'published', 'failed', 'cancelled');
  end if;
end $$;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null,
  goal text not null,
  platforms text[] not null default '{facebook,instagram}',
  focus_service_id uuid references services(id) on delete set null,
  promotion_id uuid references promotions(id) on delete set null,
  tone text not null default 'warm',
  languages text[] not null default '{en,vi}',
  brief text,
  status campaign_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaigns_salon on campaigns (salon_id, created_at desc);
drop trigger if exists trg_set_updated_at on campaigns;
create trigger trg_set_updated_at before update on campaigns for each row execute function set_updated_at();

create table if not exists campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  salon_id uuid not null references salons(id) on delete cascade,
  kind asset_kind not null,
  language text not null default 'en',
  title text,
  content text not null,
  is_favorite boolean not null default false,
  generation integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_campaign_assets_campaign on campaign_assets (campaign_id, kind, language);
drop trigger if exists trg_set_updated_at on campaign_assets;
create trigger trg_set_updated_at before update on campaign_assets for each row execute function set_updated_at();

create table if not exists scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  asset_id uuid references campaign_assets(id) on delete set null,
  platform post_platform not null,
  content text not null,
  image_url text,
  link_url text,
  scheduled_for timestamptz not null,
  -- auto: publish through a connected page; manual: staff copies and posts when due
  publish_mode text not null default 'manual' check (publish_mode in ('auto', 'manual')),
  status post_status not null default 'scheduled',
  attempts integer not null default 0,
  external_id text,
  error text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scheduled_posts_due on scheduled_posts (status, scheduled_for);
create index if not exists idx_scheduled_posts_salon on scheduled_posts (salon_id, scheduled_for desc);
drop trigger if exists trg_set_updated_at on scheduled_posts;
create trigger trg_set_updated_at before update on scheduled_posts for each row execute function set_updated_at();

-- Social connections (page tokens) live in their own table: owners/admins only.
create table if not exists salon_integrations (
  salon_id uuid not null references salons(id) on delete cascade,
  provider text not null check (provider in ('meta')),
  external_id text not null,          -- Facebook Page id
  display_name text,
  access_token text not null,         -- long-lived Page access token
  instagram_account_id text,          -- linked IG business account, optional
  connected_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (salon_id, provider)
);
drop trigger if exists trg_set_updated_at on salon_integrations;
create trigger trg_set_updated_at before update on salon_integrations for each row execute function set_updated_at();

alter table campaigns enable row level security;
alter table campaign_assets enable row level security;
alter table scheduled_posts enable row level security;
alter table salon_integrations enable row level security;

drop policy if exists "members manage campaigns" on campaigns;
create policy "members manage campaigns" on campaigns
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "members manage campaign_assets" on campaign_assets;
create policy "members manage campaign_assets" on campaign_assets
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "members manage scheduled_posts" on scheduled_posts;
create policy "members manage scheduled_posts" on scheduled_posts
  for all using (is_salon_member(salon_id)) with check (is_salon_member(salon_id));
drop policy if exists "owners and admins manage salon_integrations" on salon_integrations;
create policy "owners and admins manage salon_integrations" on salon_integrations
  for all using (has_salon_role(salon_id, array['owner','admin']))
  with check (has_salon_role(salon_id, array['owner','admin']));


-- ############################################################################
-- ## 0007_billing_and_hardening.sql
-- ############################################################################

-- ============================================================================
-- Migration 0007 — Phase 6: billing (Stripe subscriptions), audit log,
-- custom domains, usage counters. Run AFTER 0006_marketing.sql. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Subscriptions: one row per salon, mirrored from Stripe webhooks.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid', 'paused');
  end if;
end $$;

create table if not exists salon_subscriptions (
  salon_id uuid primary key references salons(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'starter',
  status subscription_status not null default 'trialing',
  price_id text,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_set_updated_at on salon_subscriptions;
create trigger trg_set_updated_at before update on salon_subscriptions for each row execute function set_updated_at();

alter table salon_subscriptions enable row level security;
drop policy if exists "members read subscription" on salon_subscriptions;
create policy "members read subscription" on salon_subscriptions
  for select using (is_salon_member(salon_id));
-- writes happen from the Stripe webhook with the service role

-- Every existing salon starts on a 14-day trial of the starter plan.
insert into salon_subscriptions (salon_id, plan, status, trial_end)
select id, 'starter', 'trialing', now() + interval '14 days' from salons
on conflict (salon_id) do nothing;

-- Keep salons.plan in sync for cheap reads (RLS + storefront already load salons).
create or replace function public.sync_salon_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update salons set plan = new.plan where id = new.salon_id;
  return new;
end;
$$;
drop trigger if exists trg_sync_salon_plan on salon_subscriptions;
create trigger trg_sync_salon_plan
  after insert or update of plan on salon_subscriptions
  for each row execute function public.sync_salon_plan();

-- New salons get a trial row automatically.
create or replace function public.create_salon(
  p_name text,
  p_slug text,
  p_phone text default null,
  p_address text default null,
  p_email text default null,
  p_timezone text default 'America/Indiana/Indianapolis'
)
returns salons
language plpgsql
security definer
set search_path = public
as $$
declare
  v_salon salons;
  v_uid uuid := auth.uid();
  d int;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  insert into salons (name, slug, phone, address, email, timezone, created_by)
  values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), nullif(trim(p_email), ''), coalesce(p_timezone, 'America/Indiana/Indianapolis'), v_uid)
  returning * into v_salon;

  insert into salon_members (salon_id, user_id, role) values (v_salon.id, v_uid, 'owner');

  for d in 0..6 loop
    insert into business_hours (salon_id, day_of_week, open_time, close_time, is_closed)
    values (v_salon.id, d, '09:30', '19:00', d = 0)
    on conflict (salon_id, day_of_week) do nothing;
  end loop;

  perform public.ensure_automation_rules(v_salon.id);

  insert into salon_subscriptions (salon_id, plan, status, trial_end)
  values (v_salon.id, 'starter', 'trialing', now() + interval '14 days')
  on conflict (salon_id) do nothing;

  return v_salon;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Audit log: who changed what (settings, team, billing, deletions).
-- ----------------------------------------------------------------------------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_salon on audit_log (salon_id, created_at desc);
alter table audit_log enable row level security;
drop policy if exists "owners and admins read audit_log" on audit_log;
create policy "owners and admins read audit_log" on audit_log
  for select using (has_salon_role(salon_id, array['owner','admin']));
drop policy if exists "members write audit_log" on audit_log;
create policy "members write audit_log" on audit_log
  for insert with check (is_salon_member(salon_id) and user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 3. Custom domains: one hostname per salon, resolved by the web middleware.
-- ----------------------------------------------------------------------------
alter table salons add column if not exists custom_domain text;
create unique index if not exists salons_custom_domain_idx on salons (lower(custom_domain)) where custom_domain is not null;

-- ----------------------------------------------------------------------------
-- 4. Usage counters for plan limits (cheap monthly aggregates).
-- ----------------------------------------------------------------------------
create or replace function public.salon_monthly_usage(p_salon_id uuid)
returns table (ai_messages bigint, sms_sent bigint, emails_sent bigint, active_staff bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from chat_messages m join chat_conversations c on c.id = m.conversation_id
      where c.salon_id = p_salon_id and m.role = 'assistant' and m.created_at >= date_trunc('month', now())),
    (select count(*) from message_log where salon_id = p_salon_id and channel = 'sms' and status = 'sent' and created_at >= date_trunc('month', now())),
    (select count(*) from message_log where salon_id = p_salon_id and channel = 'email' and status = 'sent' and created_at >= date_trunc('month', now())),
    (select count(*) from staff where salon_id = p_salon_id and is_active);
$$;
revoke all on function public.salon_monthly_usage(uuid) from public;
grant execute on function public.salon_monthly_usage(uuid) to authenticated, service_role;


-- ############################################################################
-- ## 0008_delivery_and_inbound.sql
-- ############################################################################

-- ============================================================================
-- Migration 0008 — delivery receipts, two-way SMS, Meta OAuth storage
-- Run AFTER 0007_billing_and_hardening.sql. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Delivery receipts on message_log (Twilio status callbacks, Resend events)
-- ----------------------------------------------------------------------------
alter table message_log add column if not exists provider_status text;
alter table message_log add column if not exists delivered_at timestamptz;
alter table message_log add column if not exists failed_at timestamptz;
alter table message_log add column if not exists direction text not null default 'outbound'
  check (direction in ('outbound', 'inbound'));
create index if not exists idx_message_log_provider_msg on message_log (provider_message_id)
  where provider_message_id is not null;

-- ----------------------------------------------------------------------------
-- 2. Per-salon SMS number so inbound texts can be routed to the right salon
-- ----------------------------------------------------------------------------
alter table salons add column if not exists sms_number text;
create unique index if not exists salons_sms_number_idx on salons (sms_number) where sms_number is not null;
-- When the AI should answer inbound texts automatically (off by default: a text
-- from a guest usually wants a person).
alter table salons add column if not exists sms_ai_autoreply boolean not null default false;

-- ----------------------------------------------------------------------------
-- 3. Conversations: allow the 'sms' channel and remember the guest's number
-- ----------------------------------------------------------------------------
alter table chat_conversations add column if not exists contact_number text;
create index if not exists idx_chat_conversations_contact
  on chat_conversations (salon_id, contact_number) where contact_number is not null;

-- Staff replies sent from the inbox are logged as assistant messages with a
-- marker so the transcript can show who wrote them.
alter table chat_messages add column if not exists sent_by uuid references auth.users(id) on delete set null;
alter table chat_messages add column if not exists channel text not null default 'web';

-- ----------------------------------------------------------------------------
-- 4. Meta OAuth: store the user token + granted scopes alongside the Page token
-- ----------------------------------------------------------------------------
alter table salon_integrations add column if not exists user_access_token text;
alter table salon_integrations add column if not exists scopes text[];
alter table salon_integrations add column if not exists connected_via text not null default 'manual'
  check (connected_via in ('manual', 'oauth'));

-- Short-lived OAuth state, verified in the callback (CSRF protection).
create table if not exists oauth_states (
  state text primary key,
  salon_id uuid not null references salons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  redirect_to text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
create index if not exists idx_oauth_states_expiry on oauth_states (expires_at);
alter table oauth_states enable row level security;
-- No policies: only the service role (the callback route) touches this table.


-- ############################################################################
-- ## 0009_function_hardening.sql
-- ############################################################################

-- ============================================================================
-- Migration 0009 — function hardening (Supabase database-linter findings)
-- Run AFTER 0008_delivery_and_inbound.sql. Idempotent.
--
--  * Pin search_path on the trigger functions so a role-level search_path
--    cannot shadow the tables they write to.
--  * Revoke EXECUTE on trigger-only functions: they are reachable at
--    /rest/v1/rpc/<name> otherwise, which is never intended.
-- ============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.touch_conversation_on_message() set search_path = public;
alter function public.touch_interpreter_session() set search_path = public;
alter function public.cancel_jobs_on_appointment_change() set search_path = public;

-- Trigger functions are called by the trigger machinery, never by a client.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.touch_conversation_on_message() from public, anon, authenticated;
revoke all on function public.touch_interpreter_session() from public, anon, authenticated;
revoke all on function public.cancel_jobs_on_appointment_change() from public, anon, authenticated;
revoke all on function public.sync_salon_plan() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Onboarding / invite RPCs are for signed-in users only. Each already derives
-- its subject from auth.uid() and raises for anon, but anon should not reach them.
--
-- is_salon_member() and has_salon_role() are deliberately left executable by
-- anon: they appear inside RLS policies on publicly readable tables
-- (salon_gallery, quick_phrases), and revoking EXECUTE turns an anon SELECT
-- into a permission error instead of an empty result.
revoke all on function public.create_salon(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_salon(text, text, text, text, text, text) to authenticated;
revoke all on function public.get_salon_invite(text) from public, anon;
grant execute on function public.get_salon_invite(text) to authenticated;
revoke all on function public.accept_salon_invite(text) from public, anon;
grant execute on function public.accept_salon_invite(text) to authenticated;
revoke all on function public.ensure_automation_rules(uuid) from public, anon;
grant execute on function public.ensure_automation_rules(uuid) to authenticated;
revoke all on function public.salon_monthly_usage(uuid) from public, anon;
grant execute on function public.salon_monthly_usage(uuid) to authenticated, service_role;

-- ############################################################################
-- ## seed.sql
-- ############################################################################

-- ============================================================================
-- Seed data for the demo salon "Nail Bar" (Fishers, IN).
-- Run after schema.sql AND migrations/0001_multi_tenant_salons.sql.
-- Safe to re-run: every insert is keyed on (salon_id, <natural key>).
-- ============================================================================

do $$
declare
  s uuid;
  cat_manicure uuid;
  cat_pedicure uuid;
  cat_enh uuid;
  cat_addon uuid;
begin
  -- Tenant -------------------------------------------------------------------
  insert into salons (slug, name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
  values (
    'nail-bar',
    'Nail Bar',
    '8970 E 96TH ST FISHERS IN 46037',
    '(317) 555-0182',
    'hello@nailbar.com',
    'Free parking is available directly in front of the salon and throughout the shared plaza lot.',
    'https://g.page/r/nailbar/review',
    'https://maps.google.com/?q=8970+E+96th+St+Fishers+IN+46037',
    'https://instagram.com/nailbar',
    'https://facebook.com/nailbar'
  )
  on conflict (slug) do nothing;

  select id into s from salons where slug = 'nail-bar';

  -- Legacy single-row profile (kept for the Vite storefront) ----------------
  if not exists (select 1 from salon_profile where salon_id = s) then
    insert into salon_profile (salon_id, name, address, phone, email, parking_info, google_review_link, google_map_link, instagram_link, facebook_link)
    select id, name, coalesce(address, ''), coalesce(phone, ''), coalesce(email, ''), parking_info, google_review_link, google_map_link, instagram_link, facebook_link
    from salons where id = s;
  end if;

  -- Hours --------------------------------------------------------------------
  insert into business_hours (salon_id, day_of_week, open_time, close_time, is_closed) values
    (s, 0, '11:00', '17:00', false),
    (s, 1, '09:30', '19:00', false),
    (s, 2, '09:30', '19:00', false),
    (s, 3, '09:30', '19:00', false),
    (s, 4, '09:30', '19:00', false),
    (s, 5, '09:30', '19:00', false),
    (s, 6, '09:30', '18:00', false)
  on conflict (salon_id, day_of_week) do nothing;

  -- Categories ---------------------------------------------------------------
  insert into service_categories (salon_id, name, display_order) values
    (s, 'Manicure', 1), (s, 'Pedicure', 2), (s, 'Enhancements', 3), (s, 'Add-Ons', 4)
  on conflict (salon_id, name) do nothing;

  select id into cat_manicure from service_categories where salon_id = s and name = 'Manicure';
  select id into cat_pedicure from service_categories where salon_id = s and name = 'Pedicure';
  select id into cat_enh      from service_categories where salon_id = s and name = 'Enhancements';
  select id into cat_addon    from service_categories where salon_id = s and name = 'Add-Ons';

  -- Services (prices in cents) ----------------------------------------------
  insert into services (salon_id, category_id, name, description, price_cents, price_label, duration_minutes, display_order) values
    (s, cat_manicure, 'Classic Manicure', 'Shape, cuticle care, massage, and polish of your choice.', 2500, null, 30, 1),
    (s, cat_manicure, 'Gel Manicure', 'Long-lasting gel polish with our signature spa treatment.', 4000, null, 40, 2),
    (s, cat_pedicure, 'Classic Pedicure', 'Soak, exfoliation, massage, and polish for tired feet.', 3500, null, 40, 1),
    (s, cat_pedicure, 'Deluxe Spa Pedicure', 'Extended massage, hot stone therapy, and premium mask.', 5500, null, 55, 2),
    (s, cat_enh, 'Gel X Full Set', 'Durable, lightweight gel extension full set, natural finish.', 6500, 'starts at $65', 75, 1),
    (s, cat_enh, 'Acrylic Full Set', 'Classic acrylic extensions, sculpted to your preferred shape.', 6000, 'starts at $60', 75, 2),
    (s, cat_enh, 'Dip Powder', 'Chip-resistant dip powder color, no UV lamp needed.', 4500, null, 45, 3),
    (s, cat_addon, 'Nail Art (per nail)', 'Custom hand-painted or 3D nail art design.', 500, 'starts at $5/nail', 10, 1),
    (s, cat_addon, 'Paraffin Wax Treatment', 'Deep moisturizing paraffin dip for hands or feet.', 1000, null, 15, 2)
  on conflict (salon_id, name) do nothing;

  -- Staff --------------------------------------------------------------------
  insert into staff (salon_id, full_name, title, bio, display_order, color) values
    (s, 'Mai Nguyen', 'Owner & Master Technician', '15+ years of experience specializing in Gel X and nail art.', 1, '#ec4d7d'),
    (s, 'Linh Tran', 'Senior Nail Technician', 'Acrylic and dip powder specialist known for flawless shaping.', 2, '#d9a533'),
    (s, 'Kim Pham', 'Nail Technician', 'Loved for relaxing pedicures and precise gel application.', 3, '#6366f1'),
    (s, 'Anna Le', 'Nail Technician', 'Nail art specialist with a passion for detailed hand-painted designs.', 4, '#10b981')
  on conflict (salon_id, full_name) do nothing;

  -- Policies -----------------------------------------------------------------
  insert into salon_policies (salon_id, title, content, display_order) values
    (s, 'Cancellation Policy', 'We kindly ask for at least 24 hours notice for cancellations or rescheduling. Late cancellations or no-shows may be subject to a fee.', 1),
    (s, 'Late Arrival', 'Please arrive on time. Arrivals more than 15 minutes late may need to be rescheduled to ensure quality service for all guests.', 2),
    (s, 'Payment', 'We accept cash, all major credit cards, and mobile payment (Apple Pay, Google Pay). Gratuity is not included in listed prices.', 3),
    (s, 'Children Policy', 'We love welcoming families, but for safety we ask that children not receiving services be supervised at all times.', 4)
  on conflict (salon_id, title) do nothing;

  -- FAQs ---------------------------------------------------------------------
  insert into faqs (salon_id, question, answer, display_order) values
    (s, 'Do you accept walk-ins?', 'Yes! Walk-ins are welcome depending on technician availability. Booking ahead is recommended for guaranteed times.', 1),
    (s, 'Do I need to bring anything?', 'Just yourself! We provide everything needed for your service. Feel free to bring reference photos for nail art.', 2),
    (s, 'Can I bring my kids?', 'Absolutely, we are a family-friendly salon. Children not receiving a service should be supervised at all times.', 3),
    (s, 'Do you offer gift cards?', 'Yes, gift cards are available for purchase in-salon and make a great gift for any occasion.', 4),
    (s, 'Is parking available?', 'Yes, free parking is available directly in front of the salon and in the shared plaza lot.', 5)
  on conflict (salon_id, question) do nothing;

  -- Promotions ---------------------------------------------------------------
  insert into promotions (salon_id, title, description, starts_at, ends_at, is_active) values
    (s, 'New Client Special', '$10 off any full set for first-time guests. Mention this offer when booking.', current_date, current_date + interval '90 days', true),
    (s, 'Refer a Friend', 'Refer a friend and you both receive $5 off your next visit.', current_date, null, true)
  on conflict (salon_id, title) do nothing;

  -- AI guidance --------------------------------------------------------------
  -- Everything create_salon() would have set up for a real signup ----------
  if to_regprocedure('public.ensure_automation_rules(uuid)') is not null then
    perform public.ensure_automation_rules(s);
  end if;

  if to_regclass('public.salon_subscriptions') is not null then
    insert into salon_subscriptions (salon_id, plan, status, trial_end)
    values (s, 'starter', 'trialing', now() + interval '14 days')
    on conflict (salon_id) do nothing;
  end if;

  insert into ai_knowledge (salon_id, topic, content) values
    (s, 'greeting_style', 'Greet guests warmly and professionally, like a friendly front-desk receptionist at a high-end salon. Keep responses short, clear, and helpful.'),
    (s, 'booking_flow', 'When a customer wants to book, ask for: desired service, preferred date/time, name, and phone number. Then direct them to the online booking page or confirm you will pass details to the front desk.'),
    (s, 'tone', 'Warm, upscale, concise. Avoid emojis except a single checkmark or star when celebrating a booking. Never be pushy.'),
    (s, 'multilingual', 'If the guest writes in Vietnamese, respond fluently in Vietnamese. Otherwise respond in English unless asked to switch language.')
  on conflict (salon_id, topic) do nothing;
end $$;
