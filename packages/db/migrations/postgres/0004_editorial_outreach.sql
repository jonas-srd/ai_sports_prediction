create table if not exists editorial_prospects (
  id text primary key,
  publication_name text not null,
  domain text not null unique,
  website_url text not null,
  country text,
  language text,
  source_query text,
  source_url text,
  summary text,
  fit_score integer not null default 0 check (fit_score between 0 and 100),
  fit_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'discovered'
    check (status in ('discovered', 'pending_review', 'qualified', 'rejected')),
  consent_status text not null default 'unknown'
    check (consent_status in ('unknown', 'explicit_consent', 'existing_customer_exception', 'declined')),
  consent_evidence text,
  consent_recorded_at_utc timestamptz,
  suppressed_at_utc timestamptz,
  discovered_at_utc timestamptz not null default now(),
  researched_at_utc timestamptz,
  updated_at_utc timestamptz not null default now()
);

create table if not exists editorial_contacts (
  id text primary key,
  prospect_id text not null references editorial_prospects(id) on delete cascade,
  kind text not null check (kind in ('generic_email', 'contact_form')),
  value text not null,
  role text,
  source_url text not null,
  is_role_address boolean not null default false,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now(),
  unique (prospect_id, kind, value)
);

create table if not exists editorial_outreach_drafts (
  id text primary key,
  prospect_id text not null references editorial_prospects(id) on delete cascade,
  contact_id text references editorial_contacts(id) on delete set null,
  subject text not null,
  text_body text not null,
  html_body text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'sending', 'sent', 'failed')),
  model_id text,
  provider_response_id text,
  approved_by text,
  approved_at_utc timestamptz,
  sent_at_utc timestamptz,
  provider_message_id text,
  error_message text,
  created_at_utc timestamptz not null default now(),
  updated_at_utc timestamptz not null default now()
);

create index if not exists editorial_prospects_review_idx
  on editorial_prospects (status, fit_score desc);

create index if not exists editorial_outreach_drafts_review_idx
  on editorial_outreach_drafts (status, created_at_utc);

create or replace function enforce_editorial_outreach_send_gate()
returns trigger
language plpgsql
as $$
declare
  prospect_consent_status text;
  prospect_consent_evidence text;
  prospect_suppressed_at timestamptz;
  must_check boolean := false;
begin
  if new.status = 'sending' then
    must_check := true;
  elsif new.status = 'sent' then
    if tg_op = 'INSERT' then
      must_check := true;
    elsif old.status <> 'sending' then
      must_check := true;
    end if;
  end if;

  if must_check then
    select consent_status, consent_evidence, suppressed_at_utc
      into prospect_consent_status, prospect_consent_evidence, prospect_suppressed_at
    from editorial_prospects
    where id = new.prospect_id;

    if prospect_suppressed_at is not null then
      raise exception 'Editorial outreach is blocked: prospect is suppressed.';
    end if;

    if prospect_consent_status not in ('explicit_consent', 'existing_customer_exception')
      or nullif(trim(prospect_consent_evidence), '') is null then
      raise exception 'Editorial outreach is blocked: documented consent or the existing-customer exception is required.';
    end if;

    if new.approved_at_utc is null or nullif(trim(new.approved_by), '') is null then
      raise exception 'Editorial outreach is blocked: human approval is required.';
    end if;
  end if;

  new.updated_at_utc := now();
  return new;
end;
$$;

drop trigger if exists editorial_outreach_send_gate on editorial_outreach_drafts;
create trigger editorial_outreach_send_gate
before insert or update on editorial_outreach_drafts
for each row execute function enforce_editorial_outreach_send_gate();
