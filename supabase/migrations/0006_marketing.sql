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
