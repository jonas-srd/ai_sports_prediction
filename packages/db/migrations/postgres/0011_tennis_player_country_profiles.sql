create table if not exists tennis_player_country_profiles (
  normalized_name text primary key,
  canonical_name text not null,
  country_code text not null check (country_code ~ '^[a-z]{2}$'),
  verified_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists tennis_player_country_profiles_country_idx
  on tennis_player_country_profiles (country_code);
