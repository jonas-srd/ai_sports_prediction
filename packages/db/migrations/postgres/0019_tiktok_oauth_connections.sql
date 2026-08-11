create table if not exists social_connections (
  id text primary key,
  provider text not null check (provider in ('tiktok')),
  provider_user_id text not null,
  display_name text,
  avatar_url text,
  scopes text[] not null default '{}'::text[],
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  access_token_expires_at_utc timestamptz not null,
  refresh_token_expires_at_utc timestamptz not null,
  status text not null default 'connected'
    check (status in ('connected', 'refresh_failed', 'disconnected')),
  connected_by text,
  last_error text,
  connected_at_utc timestamptz not null default now(),
  disconnected_at_utc timestamptz,
  updated_at_utc timestamptz not null default now(),
  unique (provider, provider_user_id)
);

create unique index if not exists social_connections_one_active_provider_idx
  on social_connections (provider)
  where status in ('connected', 'refresh_failed');

create index if not exists social_connections_status_idx
  on social_connections (provider, status, updated_at_utc desc);

alter table if exists marketing_posts
  add column if not exists provider_status text,
  add column if not exists provider_status_payload jsonb,
  add column if not exists provider_status_updated_at_utc timestamptz;

alter table if exists marketing_posts
  drop constraint if exists marketing_posts_status_check;

alter table if exists marketing_posts
  add constraint marketing_posts_status_check
  check (status in ('pending_review', 'approved', 'rejected', 'publishing', 'published', 'uploaded_draft', 'failed', 'skipped'));

create index if not exists marketing_posts_provider_status_idx
  on marketing_posts (platform, provider_status, provider_status_updated_at_utc desc);

create or replace function enforce_marketing_publish_gate()
returns trigger
language plpgsql
as $$
declare
  campaign_status text;
  campaign_approved_by text;
  campaign_approved_at timestamptz;
begin
  if new.status in ('publishing', 'published', 'uploaded_draft') then
    select status, approved_by, approved_at_utc
      into campaign_status, campaign_approved_by, campaign_approved_at
    from marketing_campaigns
    where id = new.campaign_id;

    if campaign_status not in ('approved', 'publishing', 'published', 'partially_published')
      or campaign_approved_at is null
      or nullif(trim(campaign_approved_by), '') is null then
      raise exception 'Marketing publishing is blocked: campaign approval is required.';
    end if;

    if new.approved_at_utc is null or nullif(trim(new.approved_by), '') is null then
      raise exception 'Marketing publishing is blocked: post approval is required.';
    end if;
  end if;

  new.updated_at_utc := now();
  return new;
end;
$$;
