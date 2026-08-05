create table if not exists tennis_ranking_snapshots (
  tour text primary key check (tour in ('ATP')),
  source_url text not null,
  fetched_at_utc timestamptz not null,
  rows jsonb not null check (jsonb_typeof(rows) = 'array'),
  row_count integer not null check (row_count >= 10),
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);
