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
