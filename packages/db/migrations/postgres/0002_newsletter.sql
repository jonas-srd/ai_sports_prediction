create table if not exists newsletter_subscribers (
  id text primary key,
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'bounced')),
  locale text,
  source text,
  consent_text text not null,
  consented_at_utc timestamptz not null default now(),
  unsubscribed_at_utc timestamptz,
  unsubscribe_token text not null unique,
  ip_hash text,
  user_agent text,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists newsletter_subscribers_status_idx
  on newsletter_subscribers (status);

create table if not exists newsletter_campaigns (
  id text primary key,
  subject text not null,
  preview_text text,
  html_body text not null,
  text_body text,
  status text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'sent', 'failed')),
  provider text,
  created_at_utc timestamptz not null default now(),
  sent_at_utc timestamptz
);

create table if not exists newsletter_campaign_recipients (
  id text primary key,
  campaign_id text not null references newsletter_campaigns(id) on delete cascade,
  subscriber_id text not null references newsletter_subscribers(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  sent_at_utc timestamptz,
  created_at_utc timestamptz not null default now(),
  unique (campaign_id, subscriber_id)
);

create index if not exists newsletter_campaign_recipients_campaign_idx
  on newsletter_campaign_recipients (campaign_id, status);
