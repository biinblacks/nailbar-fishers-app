-- ============================================================================
-- One-time cleanup: removes duplicate seed rows created by re-running seed.sql,
-- then adds unique constraints so future re-runs of seed.sql are safe no-ops.
-- Safe to run multiple times.
-- ============================================================================

-- salon_profile: keep only the oldest row (singleton table)
delete from salon_profile
where id not in (
  select id from salon_profile order by created_at asc limit 1
);

-- service_categories: keep oldest per name, repoint services.category_id to the
-- surviving category before deleting the duplicates.
with ranked as (
  select id, name, row_number() over (partition by name order by created_at asc) rn
  from service_categories
),
survivors as (
  select name, id as keep_id from ranked where rn = 1
),
dupes as (
  select r.id as dupe_id, s.keep_id
  from ranked r
  join survivors s on s.name = r.name
  where r.rn > 1
)
update services
set category_id = d.keep_id
from dupes d
where services.category_id = d.dupe_id;

delete from service_categories
where id in (
  select id from (
    select id, row_number() over (partition by name order by created_at asc) rn
    from service_categories
  ) t where rn > 1
);

-- services: keep oldest per name
delete from services
where id in (
  select id from (
    select id, row_number() over (partition by name order by created_at asc) rn
    from services
  ) t where rn > 1
);

-- staff: keep oldest per full_name
delete from staff
where id in (
  select id from (
    select id, row_number() over (partition by full_name order by created_at asc) rn
    from staff
  ) t where rn > 1
);

-- salon_policies: keep oldest per title
delete from salon_policies
where id in (
  select id from (
    select id, row_number() over (partition by title order by created_at asc) rn
    from salon_policies
  ) t where rn > 1
);

-- faqs: keep oldest per question
delete from faqs
where id in (
  select id from (
    select id, row_number() over (partition by question order by created_at asc) rn
    from faqs
  ) t where rn > 1
);

-- promotions: keep oldest per title
delete from promotions
where id in (
  select id from (
    select id, row_number() over (partition by title order by created_at asc) rn
    from promotions
  ) t where rn > 1
);

-- ai_knowledge: keep oldest per topic
delete from ai_knowledge
where id in (
  select id from (
    select id, row_number() over (partition by topic order by created_at asc) rn
    from ai_knowledge
  ) t where rn > 1
);

-- ============================================================================
-- Harden with unique constraints so seed.sql's "on conflict do nothing" (once
-- updated) actually prevents future duplication.
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'service_categories_name_key') then
    alter table service_categories add constraint service_categories_name_key unique (name);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'services_name_key') then
    alter table services add constraint services_name_key unique (name);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'staff_full_name_key') then
    alter table staff add constraint staff_full_name_key unique (full_name);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'salon_policies_title_key') then
    alter table salon_policies add constraint salon_policies_title_key unique (title);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'faqs_question_key') then
    alter table faqs add constraint faqs_question_key unique (question);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'promotions_title_key') then
    alter table promotions add constraint promotions_title_key unique (title);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ai_knowledge_topic_key') then
    alter table ai_knowledge add constraint ai_knowledge_topic_key unique (topic);
  end if;
end $$;

-- salon_profile is a singleton table by convention; enforce it so
-- "on conflict do nothing" in seed.sql actually has something to conflict on.
create unique index if not exists salon_profile_singleton_idx on salon_profile ((true));
