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
