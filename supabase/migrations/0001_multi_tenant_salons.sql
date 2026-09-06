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
