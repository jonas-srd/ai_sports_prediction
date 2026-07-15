import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import {
  configureAnnualToMonthlySchedule,
  retrieveWidgetStripeSubscription,
  type WidgetBillingInterval,
  verifyWidgetStripeWebhook
} from "@/lib/widget-billing";
import { getWidgetDb } from "@/lib/widget-db";

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
  contact_first_name: string | null;
  contact_last_name: string | null;
  domain: string;
  email: string;
  id: string;
  locale: "de" | "en";
  minimum_term_ends_at_utc: Date | string | null;
  legal_company_name: string | null;
  phone: string | null;
  publication_name: string;
  requested_plan: WidgetAccessPlan;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
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
      if (leadId) await sendWidgetInvoiceEmail(leadId, object);
    }
    return;
  }

  if (type === "invoice.payment_failed") {
    const subscriptionId = getInvoiceSubscriptionId(object);
    if (subscriptionId) await setWidgetCustomerStatus(subscriptionId, "past_due");
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

  await getWidgetDb().query(`
    update widget_leads
    set status = 'qualified', stripe_checkout_session_id = coalesce($2, stripe_checkout_session_id),
        stripe_customer_id = coalesce($3, stripe_customer_id),
        stripe_subscription_id = coalesce($4, stripe_subscription_id),
        stripe_subscription_schedule_id = coalesce($5, stripe_subscription_schedule_id),
        updated_at_utc = now()
    where id = $1
  `, [leadId, checkoutSessionId, customerId, subscriptionId, scheduleId]);
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
           billing_country, billing_tax_id
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
          updated_at_utc = now()
      where id = $1
    `, [existing.rows[0].id, lead.requested_plan, lead.domain, lead.billing_interval,
      lead.minimum_term_ends_at_utc, customerId, subscriptionId, scheduleId, lead.stripe_checkout_session_id,
      lead.contact_first_name, lead.contact_last_name, lead.phone, lead.legal_company_name,
      lead.billing_email, lead.billing_address_line1, lead.billing_address_line2,
      lead.billing_postal_code, lead.billing_city, lead.billing_state, lead.billing_country,
      lead.billing_tax_id]);
    if (lead.status !== "won") {
      const replacementApiKey = createWidgetApiKey();
      await getWidgetDb().query(`
        update widget_customers set api_key_hash = $2, updated_at_utc = now() where id = $1
      `, [existing.rows[0].id, hashWidgetApiKey(replacementApiKey)]);
      await sendWidgetAccessEmail({ apiKey: replacementApiKey, lead });
      await markLeadWon(lead.id, existing.rows[0].id);
    }
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
      billing_tax_id
    ) values ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
  `, [customerRecordId, lead.email, lead.publication_name, lead.domain, lead.requested_plan,
    apiKeyHash, lead.requested_plan === "growth" ? 250000 : 50000, lead.billing_interval,
    lead.minimum_term_ends_at_utc, customerId, subscriptionId, scheduleId, lead.stripe_checkout_session_id,
    lead.contact_first_name, lead.contact_last_name, lead.phone, lead.legal_company_name,
    lead.billing_email, lead.billing_address_line1, lead.billing_address_line2,
    lead.billing_postal_code, lead.billing_city, lead.billing_state, lead.billing_country,
    lead.billing_tax_id]);
  await sendWidgetAccessEmail({ apiKey, lead });
  await markLeadWon(lead.id, customerRecordId);
  return lead.id;
}

async function markLeadWon(leadId: string, customerId: string) {
  await getWidgetDb().query(`
    update widget_leads
    set status = 'won', customer_id = $2, updated_at_utc = now()
    where id = $1
  `, [leadId, customerId]);
}

async function setWidgetCustomerStatus(subscriptionId: string, status: "active" | "canceled" | "inactive" | "past_due") {
  await getWidgetDb().query(`
    update widget_customers
    set status = $2, updated_at_utc = now()
    where stripe_subscription_id = $1
  `, [subscriptionId, status]);
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

async function sendWidgetInvoiceEmail(leadId: string, invoice: Record<string, unknown>) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!resendKey || !from) {
    console.error("Widget invoice email not sent: configure RESEND_API_KEY and WIDGET_ACCESS_FROM_EMAIL");
    return;
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

function createWidgetApiKey(): string {
  return `asp_live_${randomBytes(24).toString("base64url")}`;
}

function hashWidgetApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character] ?? character));
}
