alter table odds_refresh_checks
  add column if not exists check_type text not null default 'manual';

create index if not exists odds_refresh_checks_match_type_checked_idx
  on odds_refresh_checks (match_id, provider, check_type, checked_at_utc desc);
