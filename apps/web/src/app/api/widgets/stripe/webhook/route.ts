import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendGa4Purchase } from "@ai-sports-prediction/db";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import {
  configureAnnualToMonthlySchedule,
  retrieveWidgetStripeSubscription,
  type WidgetBillingInterval,
  verifyWidgetStripeWebhook
} from "@/lib/widget-billing";
import { getWidgetDb } from "@/lib/widget-db";
import {
  createWidgetApiKey,
  encryptWidgetApiKey,
  getWidgetApiKeyPreview,
  hashWidgetApiKey
} from "@/lib/widget-api-keys";
import { getWidgetPlanRules } from "@/lib/widget-plans";

export const runtime = "nodejs";

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

type WidgetLeadBillingRow = {
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_country: string | null;
  billing_email: string | null;
  billing_interval: WidgetBillingInterval | null;
  billing_postal_code: string | null;
  billing_state: string | null;
  billing_tax_id: string | null;
  business_confirmed_at_utc: Date | string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contract_snapshot: Record<string, unknown> | null;
  dpa_accepted_at_utc: Date | string | null;
  dpa_version: string | null;
  domain: string;
  electronic_invoice_accepted_at_utc: Date | string | null;
  email: string;
  id: string;
  locale: "de" | "en";
  minimum_term_ends_at_utc: Date | string | null;
  legal_company_name: string | null;
  phone: string | null;
  privacy_acknowledged_at_utc: Date | string | null;
  privacy_version: string | null;
  publication_name: string;
  requested_plan: WidgetAccessPlan;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
  tax_id_validated_at_utc: Date | string | null;
  tax_id_validation_status: string | null;
  widget_terms_accepted_at_utc: Date | string | null;
  widget_terms_version: string | null;
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWidgetStripeWebhook(rawBody, request.headers.get("stripe-signature"))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as StripeEvent;
  if (!event.id || !event.type || !event.data?.object) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const db = getWidgetDb();
  const claimed = await db.query<{ stripe_event_id: string }>(`
    insert into widget_billing_events (stripe_event_id, event_type)
    values ($1, $2)
    on conflict (stripe_event_id) do nothing
    returning stripe_event_id
  `, [event.id, event.type]);
  if (claimed.rows.length === 0) return NextResponse.json({ ok: true, repeated: true });

  try {
    await handleStripeEvent(event.type, event.data.object);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await db.query(`delete from widget_billing_events where stripe_event_id = $1`, [event.id]).catch(() => undefined);
    console.error("Widget Stripe webhook failed", event.type, error);
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}

async function handleStripeEvent(type: string, object: Record<string, unknown>) {
  if (type === "checkout.session.completed" || type === "checkout.session.async_payment_succeeded") {
    await recordCompletedCheckout(object);
    return;
  }

  if (type === "invoice.paid") {
    const subscriptionId = getInvoiceSubscriptionId(object);
    if (subscriptionId) {
      const leadId = await activatePaidWidgetSubscription(subscriptionId);
      await upsertWidgetInvoice(object, "paid");
      if (leadId) await recordPurchaseEvent(leadId, object);
      if (leadId) await sendWidgetInvoiceEmailOnce(leadId, object);
    }
    return;
  }

  if (type === "invoice.finalized") {
    await upsertWidgetInvoice(object, "open");
    const subscriptionId = getInvoiceSubscriptionId(object);
    const leadId = subscriptionId ? await findLeadIdBySubscription(subscriptionId) : null;
    if (leadId) await sendWidgetInvoiceEmailOnce(leadId, object);
    return;
  }

  if (type === "invoice.finalization_failed") {
    await upsertWidgetInvoice(object, "finalization_failed");
    const subscriptionId = getInvoiceSubscriptionId(object);
    if (subscriptionId) await setWidgetCustomerStatus(subscriptionId, "past_due");
    console.error("WIDGET_INVOICE_FINALIZATION_FAILURE", getStripeId(object.id));
    return;
  }

  if (type === "invoice.payment_failed") {
    await upsertWidgetInvoice(object, "open");
    const subscriptionId = getInvoiceSubscriptionId(object);
    if (subscriptionId) {
      await setWidgetCustomerStatus(subscriptionId, "past_due");
      await queuePaymentFailureAutomation(subscriptionId, object);
    }
    return;
  }

  if (type === "customer.subscription.deleted") {
    const subscriptionId = getStripeId(object.id);
    if (subscriptionId) await setWidgetCustomerStatus(subscriptionId, "canceled");
    return;
  }

  if (type === "customer.subscription.updated") {
    const subscriptionId = getStripeId(object.id);
    const stripeStatus = String(object.status ?? "");
    if (!subscriptionId) return;
    await syncWidgetSubscriptionDetails(subscriptionId, object);
    if (stripeStatus === "active" || stripeStatus === "trialing") await setWidgetCustomerStatus(subscriptionId, "active");
    else if (stripeStatus === "past_due") await setWidgetCustomerStatus(subscriptionId, "past_due");
    else if (stripeStatus === "canceled" || stripeStatus === "unpaid" || stripeStatus === "incomplete_expired") await setWidgetCustomerStatus(subscriptionId, "inactive");
  }
}

async function recordCompletedCheckout(session: Record<string, unknown>) {
  const metadata = getMetadata(session.metadata);
  const leadId = getStripeId(session.client_reference_id) || metadata.lead_id;
  const subscriptionId = getStripeId(session.subscription);
  const customerId = getStripeId(session.customer);
  const checkoutSessionId = getStripeId(session.id);
  if (!leadId) return;

  let scheduleId: string | null = null;
  if (subscriptionId && metadata.billing_interval === "annual" && isDirectPlan(metadata.plan)) {
    scheduleId = await configureAnnualToMonthlySchedule(subscriptionId, metadata.plan);
  }

  const updated = await getWidgetDb().query<{ id: string }>(`
    update widget_leads
    set status = 'qualified', stripe_checkout_session_id = coalesce($2, stripe_checkout_session_id),
        stripe_customer_id = coalesce($3, stripe_customer_id),
        stripe_subscription_id = coalesce($4, stripe_subscription_id),
        stripe_subscription_schedule_id = coalesce($5, stripe_subscription_schedule_id),
        updated_at_utc = now()
    where id = $1 and status = 'new'
    returning id
  `, [leadId, checkoutSessionId, customerId, subscriptionId, scheduleId]);
  if (updated.rows[0]) {
    await sendWidgetContractConfirmationEmail(leadId).catch((error) => {
      console.error("Widget contract confirmation failed", error);
    });
  }
}

async function activatePaidWidgetSubscription(subscriptionId: string) {
  const subscription = await retrieveWidgetStripeSubscription(subscriptionId);
  const metadata = getMetadata(subscription.metadata);
  const leadId = metadata.lead_id;
  if (!leadId) return null;

  const leadResult = await getWidgetDb().query<WidgetLeadBillingRow>(`
    select id, email, publication_name, domain, requested_plan, locale, status, billing_interval,
           minimum_term_ends_at_utc, stripe_checkout_session_id, stripe_customer_id,
           stripe_subscription_id, stripe_subscription_schedule_id, contact_first_name,
           contact_last_name, phone, legal_company_name, billing_email, billing_address_line1,
           billing_address_line2, billing_postal_code, billing_city, billing_state,
           billing_country, billing_tax_id, widget_terms_version, widget_terms_accepted_at_utc,
           privacy_version, privacy_acknowledged_at_utc, dpa_version, dpa_accepted_at_utc,
           business_confirmed_at_utc, electronic_invoice_accepted_at_utc, contract_snapshot,
           tax_id_validation_status, tax_id_validated_at_utc
    from widget_leads
    where id = $1
    limit 1
  `, [leadId]);
  const lead = leadResult.rows[0];
  if (!lead || !isDirectPlan(lead.requested_plan)) return null;

  const customerId = getStripeId(subscription.customer) || lead.stripe_customer_id;
  let scheduleId = getStripeId(subscription.schedule) || lead.stripe_subscription_schedule_id;
  if (lead.billing_interval === "annual" && !scheduleId) {
    scheduleId = await configureAnnualToMonthlySchedule(subscriptionId, lead.requested_plan);
  }

  const existing = await getWidgetDb().query<{ id: string }>(`
    select id from widget_customers
    where stripe_subscription_id = $1 or lower(email) = lower($2)
    limit 1
  `, [subscriptionId, lead.email]);

  if (existing.rows[0]) {
    await getWidgetDb().query(`
      update widget_customers
      set status = 'active', plan = $2, domain = $3, billing_interval = $4,
          minimum_term_ends_at_utc = $5, stripe_customer_id = coalesce($6, stripe_customer_id),
          stripe_subscription_id = $7, stripe_subscription_schedule_id = coalesce($8, stripe_subscription_schedule_id),
          stripe_checkout_session_id = coalesce($9, stripe_checkout_session_id), cancel_at_period_end = false,
          contact_first_name = $10, contact_last_name = $11, phone = $12,
          legal_company_name = $13, billing_email = $14, billing_address_line1 = $15,
          billing_address_line2 = $16, billing_postal_code = $17, billing_city = $18,
          billing_state = $19, billing_country = $20, billing_tax_id = $21,
          widget_terms_version = $22, widget_terms_accepted_at_utc = $23,
          privacy_version = $24, privacy_acknowledged_at_utc = $25,
          dpa_version = $26, dpa_accepted_at_utc = $27,
          business_confirmed_at_utc = $28, electronic_invoice_accepted_at_utc = $29,
          contract_snapshot = $30::jsonb, tax_id_validation_status = $31,
          tax_id_validated_at_utc = $32,
          updated_at_utc = now()
      where id = $1
    `, [existing.rows[0].id, lead.requested_plan, lead.domain, lead.billing_interval,
      lead.minimum_term_ends_at_utc, customerId, subscriptionId, scheduleId, lead.stripe_checkout_session_id,
      lead.contact_first_name, lead.contact_last_name, lead.phone, lead.legal_company_name,
      lead.billing_email, lead.billing_address_line1, lead.billing_address_line2,
      lead.billing_postal_code, lead.billing_city, lead.billing_state, lead.billing_country,
      lead.billing_tax_id, lead.widget_terms_version, lead.widget_terms_accepted_at_utc,
      lead.privacy_version, lead.privacy_acknowledged_at_utc, lead.dpa_version,
      lead.dpa_accepted_at_utc, lead.business_confirmed_at_utc,
      lead.electronic_invoice_accepted_at_utc, JSON.stringify(lead.contract_snapshot),
      lead.tax_id_validation_status, lead.tax_id_validated_at_utc]);
    if (lead.status !== "won") {
      const replacementApiKey = createWidgetApiKey();
      await getWidgetDb().query(`
        update widget_customers
        set api_key_hash = $2, api_key_ciphertext = $3, api_key_preview = $4,
            api_key_enabled = true, updated_at_utc = now()
        where id = $1
      `, [
        existing.rows[0].id,
        hashWidgetApiKey(replacementApiKey),
        encryptWidgetApiKey(replacementApiKey),
        getWidgetApiKeyPreview(replacementApiKey)
      ]);
      await ensureWidgetCustomerDomain(existing.rows[0].id, lead.domain);
      await sendWidgetAccessEmail({ apiKey: replacementApiKey, lead });
      await markLeadWon(lead.id, existing.rows[0].id);
    }
    await syncWidgetSubscriptionDetails(subscriptionId, subscription as Record<string, unknown>);
    return lead.id;
  }

  const apiKey = createWidgetApiKey();
  const apiKeyHash = hashWidgetApiKey(apiKey);
  const customerRecordId = randomUUID();
  await getWidgetDb().query(`
    insert into widget_customers (
      id, email, publication_name, domain, plan, status, api_key_hash, monthly_limit,
      billing_interval, minimum_term_ends_at_utc, stripe_customer_id, stripe_subscription_id,
      stripe_subscription_schedule_id, stripe_checkout_session_id, contact_first_name,
      contact_last_name, phone, legal_company_name, billing_email, billing_address_line1,
      billing_address_line2, billing_postal_code, billing_city, billing_state, billing_country,
      billing_tax_id, widget_terms_version, widget_terms_accepted_at_utc, privacy_version,
      privacy_acknowledged_at_utc, dpa_version, dpa_accepted_at_utc,
      business_confirmed_at_utc, electronic_invoice_accepted_at_utc, contract_snapshot,
      tax_id_validation_status, tax_id_validated_at_utc, api_key_ciphertext,
      api_key_preview, api_key_enabled
    ) values ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27,
      $28, $29, $30, $31, $32, $33, $34::jsonb, $35, $36, $37, $38, true)
  `, [customerRecordId, lead.email, lead.publication_name, lead.domain, lead.requested_plan,
    apiKeyHash, getWidgetPlanRules(lead.requested_plan).monthlyRequestLimit, lead.billing_interval,
    lead.minimum_term_ends_at_utc, customerId, subscriptionId, scheduleId, lead.stripe_checkout_session_id,
    lead.contact_first_name, lead.contact_last_name, lead.phone, lead.legal_company_name,
    lead.billing_email, lead.billing_address_line1, lead.billing_address_line2,
    lead.billing_postal_code, lead.billing_city, lead.billing_state, lead.billing_country,
    lead.billing_tax_id, lead.widget_terms_version, lead.widget_terms_accepted_at_utc,
    lead.privacy_version, lead.privacy_acknowledged_at_utc, lead.dpa_version,
    lead.dpa_accepted_at_utc, lead.business_confirmed_at_utc,
    lead.electronic_invoice_accepted_at_utc, JSON.stringify(lead.contract_snapshot),
    lead.tax_id_validation_status, lead.tax_id_validated_at_utc,
    encryptWidgetApiKey(apiKey), getWidgetApiKeyPreview(apiKey)]);
  await ensureWidgetCustomerDomain(customerRecordId, lead.domain);
  await syncWidgetSubscriptionDetails(subscriptionId, subscription as Record<string, unknown>);
  await sendWidgetAccessEmail({ apiKey, lead });
  await markLeadWon(lead.id, customerRecordId);
  return lead.id;
}

async function markLeadWon(leadId: string, customerId: string) {
  await getWidgetDb().query(`
    update widget_leads
    set status = 'won', pipeline_stage = 'active', customer_id = $2,
        next_follow_up_at_utc = null, updated_at_utc = now()
    where id = $1
  `, [leadId, customerId]);
  await getWidgetDb().query(`
    insert into widget_revenue_events (
      id, idempotency_key, event_name, lead_id, customer_id, source
    ) values ($1, $2, 'customer_activated', $3, $4, 'stripe_webhook')
    on conflict (idempotency_key) do nothing
  `, [randomUUID(), `customer_activated:${customerId}`, leadId, customerId]);
}

async function recordPurchaseEvent(leadId: string, invoice: Record<string, unknown>) {
  const invoiceId = getStripeId(invoice.id);
  if (!invoiceId) return;
  const inserted = await getWidgetDb().query<{
    amount_cents: number | null;
    currency: string | null;
    id: string;
    lead_id: string | null;
    payload: Record<string, unknown>;
    plan: string | null;
  }>(`
    insert into widget_revenue_events (
      id, idempotency_key, event_name, lead_id, customer_id, plan,
      amount_cents, currency, source, payload
    )
    select $1, $2, 'purchase', l.id, l.customer_id, l.requested_plan,
      $3, $4, 'stripe_webhook',
      jsonb_build_object('invoiceId', $5::text) || coalesce((
        select event.payload from widget_revenue_events event
        where event.lead_id = l.id and event.event_name = 'begin_checkout'
        order by event.happened_at_utc desc limit 1
      ), '{}'::jsonb)
    from widget_leads l where l.id = $6
    on conflict (idempotency_key) do nothing
    returning id, lead_id, plan, amount_cents, currency, payload
  `, [
    randomUUID(),
    `purchase:${invoiceId}`,
    nullableInteger(invoice.amount_paid),
    String(invoice.currency ?? "eur").toUpperCase(),
    invoiceId,
    leadId
  ]);
  if (inserted.rows[0]) {
    await deliverPurchaseAnalytics(inserted.rows[0]).catch((error) => {
      console.error("GA4 purchase delivery failed", error);
    });
  }
}

async function deliverPurchaseAnalytics(event: {
  amount_cents: number | null;
  currency: string | null;
  id: string;
  lead_id: string | null;
  payload: Record<string, unknown>;
  plan: string | null;
}) {
  const invoiceId = String(event.payload.invoiceId ?? "");
  const analyticsConsent = event.payload.analyticsConsent === true;
  try {
    const result = await sendGa4Purchase({
      analyticsConsent,
      clientId: typeof event.payload.analyticsClientId === "string" ? event.payload.analyticsClientId : null,
      currency: event.currency || "EUR",
      plan: event.plan || "widget",
      transactionId: invoiceId,
      userId: event.lead_id || event.id,
      valueCents: event.amount_cents ?? 0
    });
    if (result.sent) {
      await updatePurchaseAnalyticsStatus(event.id, "sent", null, true);
    } else if (result.reason === "analytics_consent_missing") {
      await updatePurchaseAnalyticsStatus(event.id, "skipped", result.reason, false);
    } else {
      await updatePurchaseAnalyticsStatus(event.id, "pending", result.reason ?? "ga4_not_configured", false);
    }
  } catch (error) {
    await updatePurchaseAnalyticsStatus(
      event.id,
      "failed",
      error instanceof Error ? error.message : String(error),
      true
    );
    throw error;
  }
}

async function updatePurchaseAnalyticsStatus(
  eventId: string,
  status: "failed" | "pending" | "sent" | "skipped",
  error: string | null,
  attempted: boolean
) {
  await getWidgetDb().query(`
    update widget_revenue_events
    set analytics_delivery_status = $2,
        analytics_delivery_attempts = analytics_delivery_attempts + case when $4 then 1 else 0 end,
        analytics_delivered_at_utc = case when $2 = 'sent' then now() else analytics_delivered_at_utc end,
        analytics_last_error = $3
    where id = $1
  `, [eventId, status, error, attempted]);
}

async function queuePaymentFailureAutomation(subscriptionId: string, invoice: Record<string, unknown>) {
  const invoiceId = getStripeId(invoice.id) ?? subscriptionId;
  await getWidgetDb().query(`
    insert into widget_automation_events (
      id, dedupe_key, event_type, customer_id, payload
    )
    select $1, $2, 'payment_failed', id, $3::jsonb
    from widget_customers where stripe_subscription_id = $4
    on conflict (dedupe_key) do nothing
  `, [
    randomUUID(),
    `payment_failed:${invoiceId}`,
    JSON.stringify({
      invoiceId: getStripeId(invoice.id),
      nextPaymentAttempt: invoice.next_payment_attempt ?? null
    }),
    subscriptionId
  ]);
}

async function setWidgetCustomerStatus(subscriptionId: string, status: "active" | "canceled" | "inactive" | "past_due") {
  await getWidgetDb().query(`
    update widget_customers
    set status = $2, updated_at_utc = now()
    where stripe_subscription_id = $1
  `, [subscriptionId, status]);
}

async function ensureWidgetCustomerDomain(customerId: string, domain: string) {
  await getWidgetDb().query(`
    insert into widget_customer_domains (id, customer_id, domain, is_primary)
    values ($1, $2, lower($3), true)
    on conflict (customer_id, domain) do nothing
  `, [randomUUID(), customerId, domain]);
}

async function findLeadIdBySubscription(subscriptionId: string): Promise<string | null> {
  const result = await getWidgetDb().query<{ id: string }>(`
    select id from widget_leads
    where stripe_subscription_id = $1
    order by created_at_utc desc
    limit 1
  `, [subscriptionId]);
  return result.rows[0]?.id ?? null;
}

async function syncWidgetSubscriptionDetails(subscriptionId: string, subscription: Record<string, unknown>) {
  const currentPeriodEnd = unixSecondsToDate(subscription.current_period_end);
  const cancelAt = unixSecondsToDate(subscription.cancel_at);
  const canceledAt = unixSecondsToDate(subscription.canceled_at);
  await getWidgetDb().query(`
    update widget_customers
    set current_period_ends_at_utc = coalesce($2, current_period_ends_at_utc),
        cancel_at_period_end = ($3 or $4::timestamptz is not null),
        cancellation_requested_at_utc = case when $3 or $4::timestamptz is not null then coalesce(cancellation_requested_at_utc, now()) else null end,
        cancellation_effective_at_utc = case when $3 then coalesce($2, cancellation_effective_at_utc) else $4 end,
        canceled_at_utc = coalesce($5, canceled_at_utc),
        updated_at_utc = now()
    where stripe_subscription_id = $1
  `, [
    subscriptionId,
    currentPeriodEnd,
    subscription.cancel_at_period_end === true,
    cancelAt,
    canceledAt
  ]);
}

async function upsertWidgetInvoice(invoice: Record<string, unknown>, fallbackStatus: string) {
  const invoiceId = getStripeId(invoice.id);
  if (!invoiceId) return;
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  await getWidgetDb().query(`
    insert into widget_invoices (
      stripe_invoice_id, customer_id, stripe_subscription_id, invoice_number, status,
      currency, amount_due, amount_paid, hosted_invoice_url, invoice_pdf_url,
      period_start_utc, period_end_utc
    )
    select $1, id, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
    from widget_customers
    where stripe_subscription_id = $2
    on conflict (stripe_invoice_id) do update set
      customer_id = excluded.customer_id,
      invoice_number = excluded.invoice_number,
      status = excluded.status,
      amount_due = excluded.amount_due,
      amount_paid = excluded.amount_paid,
      hosted_invoice_url = excluded.hosted_invoice_url,
      invoice_pdf_url = excluded.invoice_pdf_url,
      period_start_utc = excluded.period_start_utc,
      period_end_utc = excluded.period_end_utc,
      updated_at_utc = now()
  `, [
    invoiceId,
    subscriptionId,
    String(invoice.number ?? "").trim() || null,
    String(invoice.status ?? fallbackStatus),
    String(invoice.currency ?? "").toUpperCase() || null,
    nullableInteger(invoice.amount_due),
    nullableInteger(invoice.amount_paid),
    safeHttpsUrl(invoice.hosted_invoice_url),
    safeHttpsUrl(invoice.invoice_pdf),
    unixSecondsToDate(invoice.period_start),
    unixSecondsToDate(invoice.period_end)
  ]);
}

async function sendWidgetAccessEmail({ apiKey, lead }: { apiKey: string; lead: WidgetLeadBillingRow }) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error("Widget access email not sent: configure RESEND_API_KEY and WIDGET_ACCESS_FROM_EMAIL");
    return;
  }

  const isGerman = lead.locale === "de";
  const subject = isGerman ? "Dein AI Sports Prediction Widget-Zugang" : "Your AI Sports Prediction widget access";
  const minimumTerm = formatDate(lead.minimum_term_ends_at_utc, lead.locale);
  const html = isGerman
    ? `<h1>Widget-Zugang aktiviert</h1><p>Dein bezahlter ${escapeHtml(lead.requested_plan)}-Tarif ist aktiv.</p><p><strong>Publisher-Key:</strong></p><pre>${escapeHtml(apiKey)}</pre><p>Freigegebene Domain: ${escapeHtml(lead.domain)}</p><p>Mindestlaufzeit bis ${escapeHtml(minimumTerm)}. Danach verlängert sich der Vertrag monatlich und ist monatlich kündbar.</p><p>Builder: <a href="https://www.ai-sports-prediction.net/de/widgets">Widgets öffnen</a></p>`
    : `<h1>Widget access activated</h1><p>Your paid ${escapeHtml(lead.requested_plan)} plan is active.</p><p><strong>Publisher key:</strong></p><pre>${escapeHtml(apiKey)}</pre><p>Approved domain: ${escapeHtml(lead.domain)}</p><p>Minimum term through ${escapeHtml(minimumTerm)}. Afterwards, the contract renews monthly and can be cancelled monthly.</p><p>Builder: <a href="https://www.ai-sports-prediction.net/widgets">Open widgets</a></p>`;

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, html, subject, to: [lead.email] }),
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) throw new Error(`widget_access_email_failed_${response.status}`);
}

async function sendWidgetContractConfirmationEmail(leadId: string) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error("Widget contract confirmation not sent: configure RESEND_API_KEY and WIDGET_ACCESS_FROM_EMAIL");
    return;
  }
  const result = await getWidgetDb().query<{
    billing_interval: WidgetBillingInterval | null;
    email: string;
    locale: "de" | "en";
    minimum_term_ends_at_utc: Date | string | null;
    requested_plan: WidgetAccessPlan;
    widget_terms_version: string | null;
    dpa_version: string | null;
  }>(`
    select email, locale, requested_plan, billing_interval, minimum_term_ends_at_utc,
           widget_terms_version, dpa_version
    from widget_leads where id = $1 limit 1
  `, [leadId]);
  const lead = result.rows[0];
  if (!lead || !isDirectPlan(lead.requested_plan)) return;

  const isGerman = lead.locale === "de";
  const base = isGerman ? "https://www.ai-sports-prediction.net/de" : "https://www.ai-sports-prediction.net";
  const minimumTerm = formatDate(lead.minimum_term_ends_at_utc, lead.locale);
  const subject = isGerman ? "Bestätigung deiner Widget-Bestellung" : "Confirmation of your widget order";
  const html = isGerman
    ? `<h1>Bestellung bestätigt</h1><p>Tarif: <strong>${escapeHtml(lead.requested_plan)}</strong><br>Abrechnung: ${escapeHtml(lead.billing_interval)}<br>Mindestlaufzeit bis: ${escapeHtml(minimumTerm)}</p><p>Danach verlängert sich der Vertrag jeweils um einen Monat und ist monatlich kündbar. Die Freischaltung erfolgt nach bestätigter Zahlung.</p><p><a href="${base}/widget-terms">Widget-Lizenzbedingungen ${escapeHtml(lead.widget_terms_version)}</a> · <a href="${base}/data-processing">AVV ${escapeHtml(lead.dpa_version)}</a> · <a href="${base}/privacy">Datenschutz</a></p>`
    : `<h1>Order confirmed</h1><p>Plan: <strong>${escapeHtml(lead.requested_plan)}</strong><br>Billing: ${escapeHtml(lead.billing_interval)}<br>Minimum term through: ${escapeHtml(minimumTerm)}</p><p>Afterwards, the contract renews one month at a time and can be cancelled monthly. Access is enabled after payment confirmation.</p><p><a href="${base}/widget-terms">Widget terms ${escapeHtml(lead.widget_terms_version)}</a> · <a href="${base}/data-processing">DPA ${escapeHtml(lead.dpa_version)}</a> · <a href="${base}/privacy">Privacy</a></p>`;
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, html, subject, to: [lead.email] }),
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) throw new Error(`widget_contract_email_failed_${response.status}`);
}

async function sendWidgetInvoiceEmail(leadId: string, invoice: Record<string, unknown>) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error("Widget invoice email not sent: configure RESEND_API_KEY and WIDGET_ACCESS_FROM_EMAIL");
    throw new Error("widget_invoice_email_not_configured");
  }

  const result = await getWidgetDb().query<{
    billing_email: string | null;
    email: string;
    legal_company_name: string | null;
    locale: "de" | "en";
  }>(`
    select billing_email, email, legal_company_name, locale
    from widget_leads
    where id = $1
    limit 1
  `, [leadId]);
  const lead = result.rows[0];
  if (!lead) return;

  const hostedUrl = safeHttpsUrl(invoice.hosted_invoice_url);
  const pdfUrl = safeHttpsUrl(invoice.invoice_pdf);
  const invoiceNumber = String(invoice.number ?? "").trim() || "-";
  const amount = formatInvoiceAmount(invoice.amount_paid, invoice.currency, lead.locale);
  const isGerman = lead.locale === "de";
  const subject = isGerman ? `Rechnung ${invoiceNumber} · AI Sports Prediction` : `Invoice ${invoiceNumber} · AI Sports Prediction`;
  const links = [
    hostedUrl ? `<a href="${escapeHtml(hostedUrl)}">${isGerman ? "Rechnung ansehen" : "View invoice"}</a>` : "",
    pdfUrl ? `<a href="${escapeHtml(pdfUrl)}">${isGerman ? "PDF herunterladen" : "Download PDF"}</a>` : ""
  ].filter(Boolean).join(" · ");
  const html = isGerman
    ? `<h1>Deine Rechnung</h1><p>Hallo ${escapeHtml(lead.legal_company_name || "")},</p><p>die Zahlung über ${escapeHtml(amount)} wurde bestätigt. Deine Rechnung <strong>${escapeHtml(invoiceNumber)}</strong> steht bereit.</p><p>${links}</p><p>Diese E-Mail wurde automatisch an die im Checkout angegebene Rechnungsadresse gesendet.</p>`
    : `<h1>Your invoice</h1><p>Hello ${escapeHtml(lead.legal_company_name || "")},</p><p>The payment of ${escapeHtml(amount)} was confirmed. Invoice <strong>${escapeHtml(invoiceNumber)}</strong> is ready.</p><p>${links}</p><p>This email was sent automatically to the billing email entered during checkout.</p>`;

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, html, subject, to: [lead.billing_email || lead.email] }),
    headers: { authorization: `Bearer ${resendKey}`, "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) throw new Error(`widget_invoice_email_failed_${response.status}`);
}

async function sendWidgetInvoiceEmailOnce(leadId: string, invoice: Record<string, unknown>) {
  const invoiceId = getStripeId(invoice.id);
  if (!invoiceId) return;
  const claimed = await getWidgetDb().query<{ stripe_invoice_id: string }>(`
    update widget_invoices
    set delivery_sent_at_utc = now(), delivery_error = null, updated_at_utc = now()
    where stripe_invoice_id = $1 and delivery_sent_at_utc is null
    returning stripe_invoice_id
  `, [invoiceId]);
  if (!claimed.rows[0]) return;
  try {
    await sendWidgetInvoiceEmail(leadId, invoice);
  } catch (error) {
    await getWidgetDb().query(`
      update widget_invoices
      set delivery_sent_at_utc = null, delivery_error = $2, updated_at_utc = now()
      where stripe_invoice_id = $1
    `, [invoiceId, error instanceof Error ? error.message : String(error)]).catch(() => undefined);
    throw error;
  }
}

function getInvoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  return getStripeId(invoice.subscription)
    || getStripeId((invoice.parent as Record<string, unknown> | undefined)?.subscription_details &&
      ((invoice.parent as Record<string, unknown>).subscription_details as Record<string, unknown>).subscription);
}

function getMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry ?? "")]));
}

function getStripeId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return (value as { id: string }).id;
  return null;
}

function isDirectPlan(value: unknown): value is "starter" | "growth" {
  return value === "starter" || value === "growth";
}

function formatDate(value: Date | string | null, locale: "de" | "en"): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(value));
}

function formatInvoiceAmount(value: unknown, currency: unknown, locale: "de" | "en"): string {
  const amount = Number(value);
  const normalizedCurrency = String(currency ?? "EUR").toUpperCase();
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    currency: normalizedCurrency,
    style: "currency"
  }).format(amount / 100);
}

function safeHttpsUrl(value: unknown): string | null {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function unixSecondsToDate(value: unknown) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000) : null;
}

function nullableInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character] ?? character));
}
