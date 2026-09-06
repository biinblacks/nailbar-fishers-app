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
