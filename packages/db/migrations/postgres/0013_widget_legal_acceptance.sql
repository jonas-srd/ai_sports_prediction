alter table widget_leads
  add column if not exists widget_terms_version text,
  add column if not exists widget_terms_accepted_at_utc timestamptz,
  add column if not exists privacy_version text,
  add column if not exists privacy_acknowledged_at_utc timestamptz,
  add column if not exists dpa_version text,
  add column if not exists dpa_accepted_at_utc timestamptz,
  add column if not exists business_confirmed_at_utc timestamptz,
  add column if not exists electronic_invoice_accepted_at_utc timestamptz,
  add column if not exists contract_snapshot jsonb,
  add column if not exists tax_id_validation_status text,
  add column if not exists tax_id_validated_at_utc timestamptz;

alter table widget_customers
  add column if not exists widget_terms_version text,
  add column if not exists widget_terms_accepted_at_utc timestamptz,
  add column if not exists privacy_version text,
  add column if not exists privacy_acknowledged_at_utc timestamptz,
  add column if not exists dpa_version text,
  add column if not exists dpa_accepted_at_utc timestamptz,
  add column if not exists business_confirmed_at_utc timestamptz,
  add column if not exists electronic_invoice_accepted_at_utc timestamptz,
  add column if not exists contract_snapshot jsonb,
  add column if not exists tax_id_validation_status text,
  add column if not exists tax_id_validated_at_utc timestamptz;

create index if not exists widget_leads_terms_acceptance_idx
  on widget_leads (widget_terms_version, widget_terms_accepted_at_utc);

alter table widget_invoices
  add column if not exists delivery_sent_at_utc timestamptz,
  add column if not exists delivery_error text;
