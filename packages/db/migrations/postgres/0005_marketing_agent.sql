create table if not exists marketing_campaigns (
  id text primary key,
  prediction_id text not null references predictions(id) on delete cascade,
  match_id text not null references matches(id) on delete cascade,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'publishing', 'published', 'partially_published', 'failed')),
  campaign_data jsonb not null default '{}'::jsonb,
  model_id text,
  provider_response_id text,
  approved_by text,
  approved_at_utc timestamptz,
  published_at_utc timestamptz,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  unique (prediction_id)
);

create table if not exists marketing_posts (
  id text primary key,
  campaign_id text not null references marketing_campaigns(id) on delete cascade,
  platform text not null
    check (platform in ('instagram_feed', 'instagram_story', 'x', 'reddit')),
  target text not null default '',
  title text,
  body text not null,
  asset_path text,
  asset_url text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'publishing', 'published', 'failed', 'skipped')),
  approved_by text,
  approved_at_utc timestamptz,
  provider_post_id text,
  provider_post_url text,
  error_message text,
  published_at_utc timestamptz,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  unique (campaign_id, platform, target)
);

create index if not exists marketing_campaigns_review_idx
  on marketing_campaigns (status, created_at_utc);

create index if not exists marketing_posts_publish_idx
  on marketing_posts (status, platform, created_at_utc);

create or replace function enforce_marketing_publish_gate()
returns trigger
language plpgsql
as $$
declare
  campaign_status text;
  campaign_approved_by text;
  campaign_approved_at timestamptz;
begin
  if new.status in ('publishing', 'published') then
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

drop trigger if exists marketing_post_publish_gate on marketing_posts;
create trigger marketing_post_publish_gate
before insert or update on marketing_posts
for each row execute function enforce_marketing_publish_gate();

create or replace function touch_marketing_campaign()
returns trigger
language plpgsql
as $$
begin
  new.updated_at_utc := now();
  return new;
end;
$$;

drop trigger if exists marketing_campaign_touch on marketing_campaigns;
create trigger marketing_campaign_touch
before update on marketing_campaigns
for each row execute function touch_marketing_campaign();
