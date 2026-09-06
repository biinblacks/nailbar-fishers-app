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
