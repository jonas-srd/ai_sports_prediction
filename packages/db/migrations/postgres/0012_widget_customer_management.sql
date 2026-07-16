alter table widget_customers
  add column if not exists api_key_ciphertext text,
  add column if not exists api_key_preview text,
  add column if not exists api_key_enabled boolean not null default true,
  add column if not exists current_period_ends_at_utc timestamptz,
  add column if not exists cancellation_requested_at_utc timestamptz,
  add column if not exists cancellation_effective_at_utc timestamptz,
  add column if not exists canceled_at_utc timestamptz;

create table if not exists widget_customer_domains (
  id text primary key,
  customer_id text not null references widget_customers(id) on delete cascade,
  domain text not null,
  is_primary boolean not null default false,
  created_at_utc timestamptz not null default now(),
  unique (customer_id, domain)
);

insert into widget_customer_domains (id, customer_id, domain, is_primary)
select md5(id || ':' || lower(domain)), id, lower(domain), true
from widget_customers
where nullif(trim(domain), '') is not null
on conflict (customer_id, domain) do nothing;

create index if not exists widget_customer_domains_customer_idx
  on widget_customer_domains (customer_id, created_at_utc);

create table if not exists widget_usage_monthly (
  customer_id text not null references widget_customers(id) on delete cascade,
  month_start date not null,
  request_count bigint not null default 0 check (request_count >= 0),
  last_request_at_utc timestamptz,
  primary key (customer_id, month_start)
);

create table if not exists widget_usage_daily (
  customer_id text not null references widget_customers(id) on delete cascade,
  usage_date date not null,
  endpoint text not null check (endpoint in ('matches', 'predictions')),
  widget_type text not null,
  request_count bigint not null default 0 check (request_count >= 0),
  primary key (customer_id, usage_date, endpoint, widget_type)
);

create index if not exists widget_usage_daily_customer_idx
  on widget_usage_daily (customer_id, usage_date desc);

create table if not exists widget_invoices (
  stripe_invoice_id text primary key,
  customer_id text references widget_customers(id) on delete set null,
  stripe_subscription_id text,
  invoice_number text,
  status text not null,
  currency text,
  amount_due integer,
  amount_paid integer,
  hosted_invoice_url text,
  invoice_pdf_url text,
  period_start_utc timestamptz,
  period_end_utc timestamptz,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists widget_invoices_customer_idx
  on widget_invoices (customer_id, created_at_utc desc);
