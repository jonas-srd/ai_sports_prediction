create table if not exists marketing_post_metrics (
  id text primary key,
  post_id text not null references marketing_posts(id) on delete cascade,
  source text not null check (source in ('instagram', 'x', 'reddit', 'manual')),
  impressions bigint,
  reach bigint,
  clicks bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  engagement_total bigint,
  raw_metrics jsonb not null default '{}'::jsonb,
  collected_at_utc timestamptz not null default now()
);

create index if not exists marketing_post_metrics_latest_idx
  on marketing_post_metrics (post_id, collected_at_utc desc);

create table if not exists marketing_performance_reports (
  id text primary key,
  window_start_utc timestamptz not null,
  window_end_utc timestamptz not null,
  summary jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  model_id text,
  provider_response_id text,
  created_at_utc timestamptz not null default now()
);

create index if not exists marketing_performance_reports_created_idx
  on marketing_performance_reports (created_at_utc desc);
