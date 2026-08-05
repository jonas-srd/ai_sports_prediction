alter table predictions
  add column if not exists model_version text,
  add column if not exists prompt_text text,
  add column if not exists input_context jsonb,
  add column if not exists provider_response_id text,
  add column if not exists latency_ms integer,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists cost_usd double precision,
  add column if not exists generated_at_utc timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists match_data_snapshots (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  provider text not null,
  source_match_id text,
  snapshot_type text not null,
  -- observed_at_utc is the first time this exact payload was seen. Repeated
  -- provider responses only advance last_observed_at_utc.
  observed_at_utc timestamptz not null,
  last_observed_at_utc timestamptz not null,
  event_time_utc timestamptz,
  raw_payload jsonb not null,
  normalized_payload jsonb,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (match_id, provider, snapshot_type, content_hash)
);

create index if not exists match_data_snapshots_match_observed_idx
  on match_data_snapshots (match_id, last_observed_at_utc desc);

create index if not exists match_data_snapshots_source_idx
  on match_data_snapshots (provider, source_match_id, last_observed_at_utc desc);

create table if not exists prediction_revisions (
  id text primary key,
  prediction_id text not null references predictions(id) on delete cascade,
  match_id text not null references matches(id) on delete cascade,
  model_id text not null references models(id) on delete cascade,
  model_version text,
  predicted_home integer not null,
  predicted_away integer not null,
  confidence double precision,
  reason text,
  prompt_text text,
  input_context jsonb,
  raw_response jsonb not null,
  provider_response_id text,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  cost_usd double precision,
  generated_at_utc timestamptz not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

-- Retrying the database write for the same provider response is harmless, but
-- a genuinely new model call is retained even when it returns identical text.
create unique index if not exists prediction_revisions_provider_response_idx
  on prediction_revisions (prediction_id, provider_response_id)
  where provider_response_id is not null;

create index if not exists prediction_revisions_match_generated_idx
  on prediction_revisions (match_id, generated_at_utc desc);

create index if not exists prediction_revisions_model_generated_idx
  on prediction_revisions (model_id, generated_at_utc desc);
