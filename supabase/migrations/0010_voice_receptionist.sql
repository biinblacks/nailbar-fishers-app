-- ============================================================================
-- Migration 0010 — Phone AI receptionist (Twilio Voice)
-- Run AFTER 0009_function_hardening.sql. Idempotent.
--
-- A guest calls the salon's Twilio number; Twilio transcribes each utterance
-- and posts it to /api/webhooks/twilio/voice/turn, which replies with TwiML
-- spoken back to the caller. Conversations reuse chat_conversations with
-- channel = 'voice', so the inbox shows calls next to web chats and texts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-salon voice settings. Off by default: a salon that has not opted in
--    keeps sending callers to whatever its carrier already does.
-- ----------------------------------------------------------------------------
alter table salons add column if not exists voice_ai_enabled boolean not null default false;

-- The Twilio number that receives calls. Usually the same as sms_number, but
-- kept separate so a salon can run voice and texts on different numbers.
alter table salons add column if not exists voice_number text;
create unique index if not exists salons_voice_number_idx on salons (voice_number) where voice_number is not null;

-- Spoken greeting. Null falls back to a generated one built from the salon name.
alter table salons add column if not exists voice_greeting text;

-- Where "let me get someone for you" transfers to. Null falls back to salons.phone.
alter table salons add column if not exists voice_forward_number text;

-- Primary language for speech recognition and the spoken voice.
alter table salons add column if not exists voice_language text not null default 'en'
  check (voice_language in ('en', 'vi'));

-- Text the caller a recap (booking confirmation or the booking link) afterwards.
alter table salons add column if not exists voice_sms_followup boolean not null default true;

-- How many turns before the AI gives up and offers a human. Guards against a
-- caller and the AI talking past each other while the meter runs.
alter table salons add column if not exists voice_max_turns smallint not null default 20
  check (voice_max_turns between 1 and 100);

-- ----------------------------------------------------------------------------
-- 2. Call log: one row per call, linked to the conversation holding the turns.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_status') then
    create type call_status as enum ('in_progress', 'completed', 'forwarded', 'failed', 'no_answer');
  end if;
  if not exists (select 1 from pg_type where typname = 'call_outcome') then
    create type call_outcome as enum ('answered', 'booked', 'handoff', 'abandoned');
  end if;
end $$;

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salons(id) on delete cascade,
  conversation_id uuid references chat_conversations(id) on delete set null,
  appointment_id uuid references appointments(id) on delete set null,
  call_sid text not null unique,
  from_number text,
  to_number text,
  status call_status not null default 'in_progress',
  outcome call_outcome,
  turn_count integer not null default 0,
  duration_seconds integer,
  language text not null default 'en',
  forwarded_to text,
  error text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_call_logs_salon on call_logs (salon_id, started_at desc);
create index if not exists idx_call_logs_conversation on call_logs (conversation_id);

alter table call_logs enable row level security;
drop policy if exists "members read call_logs" on call_logs;
create policy "members read call_logs" on call_logs
  for select using (is_salon_member(salon_id));
-- Writes come from the Twilio webhooks with the service role.

-- ----------------------------------------------------------------------------
-- 3. Count answered calls toward the monthly AI usage the plan limits.
-- ----------------------------------------------------------------------------
-- Postgres cannot widen a function's OUT columns in place, so drop first.
drop function if exists public.salon_monthly_usage(uuid);
create function public.salon_monthly_usage(p_salon_id uuid)
returns table (ai_messages bigint, sms_sent bigint, emails_sent bigint, active_staff bigint, calls_answered bigint)
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
    (select count(*) from staff where salon_id = p_salon_id and is_active),
    (select count(*) from call_logs where salon_id = p_salon_id and created_at >= date_trunc('month', now()));
$$;
revoke all on function public.salon_monthly_usage(uuid) from public, anon;
grant execute on function public.salon_monthly_usage(uuid) to authenticated, service_role;
