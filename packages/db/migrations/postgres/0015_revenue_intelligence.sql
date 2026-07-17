alter table widget_revenue_events
  add column if not exists analytics_delivery_status text not null default 'pending'
    check (analytics_delivery_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists analytics_delivery_attempts integer not null default 0,
  add column if not exists analytics_delivered_at_utc timestamptz,
  add column if not exists analytics_last_error text;

create index if not exists widget_revenue_events_analytics_delivery_idx
  on widget_revenue_events (analytics_delivery_status, happened_at_utc)
  where event_name = 'purchase';

create table if not exists widget_acquisition_costs (
  id text primary key,
  period_start date not null,
  source text not null,
  country text not null default 'ALL',
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'EUR',
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  unique (period_start, source, country)
);

create index if not exists widget_acquisition_costs_period_idx
  on widget_acquisition_costs (period_start desc, source, country);
