alter table widget_leads
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists phone text,
  add column if not exists legal_company_name text,
  add column if not exists billing_email text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_country text,
  add column if not exists billing_tax_id text;

alter table widget_customers
  add column if not exists contact_first_name text,
  add column if not exists contact_last_name text,
  add column if not exists phone text,
  add column if not exists legal_company_name text,
  add column if not exists billing_email text,
  add column if not exists billing_address_line1 text,
  add column if not exists billing_address_line2 text,
  add column if not exists billing_postal_code text,
  add column if not exists billing_city text,
  add column if not exists billing_state text,
  add column if not exists billing_country text,
  add column if not exists billing_tax_id text;

create index if not exists widget_leads_billing_email_idx
  on widget_leads (lower(billing_email));
