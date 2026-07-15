create table if not exists widget_customers (
  id text primary key,
  email text not null,
  publication_name text not null,
  domain text not null,
  plan text not null check (plan in ('starter', 'growth', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'inactive')),
  api_key_hash text not null unique,
  monthly_limit integer not null check (monthly_limit > 0),
  access_expires_at_utc timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create unique index if not exists widget_customers_email_unique_idx
  on widget_customers (lower(email));

create unique index if not exists widget_customers_domain_unique_idx
  on widget_customers (lower(domain));

create index if not exists widget_customers_status_idx
  on widget_customers (status, access_expires_at_utc);

create table if not exists widget_leads (
  id text primary key,
  email text not null,
  publication_name text not null,
  website_url text not null,
  domain text not null,
  requested_plan text not null check (requested_plan in ('starter', 'growth', 'enterprise')),
  intent text not null check (intent in ('purchase', 'sales')),
  locale text not null default 'en' check (locale in ('en', 'de')),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  source text not null default 'widgets-pricing',
  ip_hash text,
  user_agent text,
  consent_text text not null,
  customer_id text references widget_customers(id) on delete set null,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists widget_leads_created_idx
  on widget_leads (created_at_utc desc);

create index if not exists widget_leads_email_idx
  on widget_leads (lower(email));
