alter table widget_customers
  add column if not exists billing_interval text,
  add column if not exists minimum_term_ends_at_utc timestamptz,
  add column if not exists monthly_renewal_started_at_utc timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists stripe_subscription_schedule_id text,
  add column if not exists stripe_checkout_session_id text;

alter table widget_leads
  add column if not exists billing_interval text,
  add column if not exists minimum_term_ends_at_utc timestamptz,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_schedule_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'widget_customers_billing_interval_check') then
    alter table widget_customers
      add constraint widget_customers_billing_interval_check
      check (billing_interval is null or billing_interval in ('monthly', 'annual'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'widget_leads_billing_interval_check') then
    alter table widget_leads
      add constraint widget_leads_billing_interval_check
      check (billing_interval is null or billing_interval in ('monthly', 'annual'));
  end if;
end $$;

create unique index if not exists widget_customers_stripe_subscription_unique_idx
  on widget_customers (stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index if not exists widget_customers_stripe_checkout_unique_idx
  on widget_customers (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists widget_leads_stripe_checkout_unique_idx
  on widget_leads (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists widget_billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  processed_at_utc timestamptz not null default now()
);
