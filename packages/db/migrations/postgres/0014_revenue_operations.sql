alter table widget_leads
  add column if not exists pipeline_stage text not null default 'new'
    check (pipeline_stage in ('new', 'contacted', 'checkout', 'paid', 'active', 'lost')),
  add column if not exists priority_score integer not null default 0,
  add column if not exists checkout_started_at_utc timestamptz,
  add column if not exists checkout_abandoned_at_utc timestamptz,
  add column if not exists abandoned_reminder_sent_at_utc timestamptz,
  add column if not exists last_contacted_at_utc timestamptz,
  add column if not exists next_follow_up_at_utc timestamptz,
  add column if not exists outreach_prospect_id text references editorial_prospects(id) on delete set null;

create index if not exists widget_leads_pipeline_idx
  on widget_leads (pipeline_stage, priority_score desc, next_follow_up_at_utc, created_at_utc desc);

create index if not exists widget_leads_abandoned_checkout_idx
  on widget_leads (checkout_started_at_utc, abandoned_reminder_sent_at_utc)
  where pipeline_stage = 'checkout';

create table if not exists widget_customer_login_tokens (
  id text primary key,
  customer_id text not null references widget_customers(id) on delete cascade,
  token_hash text not null unique,
  expires_at_utc timestamptz not null,
  used_at_utc timestamptz,
  ip_hash text,
  created_at_utc timestamptz not null default now()
);

create index if not exists widget_customer_login_tokens_customer_idx
  on widget_customer_login_tokens (customer_id, created_at_utc desc);

create table if not exists widget_revenue_events (
  id text primary key,
  idempotency_key text not null unique,
  event_name text not null check (event_name in ('lead_created', 'begin_checkout', 'checkout_abandoned', 'purchase', 'customer_activated')),
  lead_id text references widget_leads(id) on delete set null,
  customer_id text references widget_customers(id) on delete set null,
  plan text,
  amount_cents integer,
  currency text,
  source text not null default 'server',
  payload jsonb not null default '{}'::jsonb,
  happened_at_utc timestamptz not null default now()
);

create index if not exists widget_revenue_events_happened_idx
  on widget_revenue_events (event_name, happened_at_utc desc);

create table if not exists widget_automation_events (
  id text primary key,
  dedupe_key text not null unique,
  event_type text not null check (event_type in (
    'abandoned_checkout', 'enterprise_follow_up', 'onboarding_missing',
    'usage_70', 'usage_90', 'growth_upgrade', 'domain_failures',
    'payment_failed', 'internal_alert'
  )),
  lead_id text references widget_leads(id) on delete cascade,
  customer_id text references widget_customers(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'dismissed')),
  payload jsonb not null default '{}'::jsonb,
  sent_at_utc timestamptz,
  error_message text,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists widget_automation_events_status_idx
  on widget_automation_events (status, created_at_utc);

create table if not exists widget_domain_failures (
  id text primary key,
  customer_id text not null references widget_customers(id) on delete cascade,
  attempted_domain text,
  reason text not null,
  occurred_at_utc timestamptz not null default now()
);

create index if not exists widget_domain_failures_customer_idx
  on widget_domain_failures (customer_id, occurred_at_utc desc);
