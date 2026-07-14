alter table matches
  add column if not exists sport text;

create table if not exists match_odds (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  provider text not null,
  market text not null,
  sport_key text,
  provider_event_id text,
  event_name text not null,
  bookmaker_count integer not null default 0,
  outcomes jsonb not null default '[]'::jsonb,
  provider_last_updated_at_utc timestamptz,
  checked_at_utc timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, provider, market)
);

create table if not exists odds_refresh_checks (
  id text primary key,
  match_id text not null references matches(id) on delete cascade,
  provider text not null,
  status text not null check (status in ('available', 'unavailable', 'error', 'unsupported')),
  provider_event_id text,
  bookmaker_count integer not null default 0,
  checked_at_utc timestamptz not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_matches_sport_utc_date
  on matches(sport, utc_date);

create index if not exists idx_match_odds_match
  on match_odds(match_id, updated_at desc);

create index if not exists idx_odds_refresh_checks_match_checked
  on odds_refresh_checks(match_id, checked_at_utc desc);
