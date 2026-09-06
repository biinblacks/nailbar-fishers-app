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
