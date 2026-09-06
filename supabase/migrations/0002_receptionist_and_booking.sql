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
