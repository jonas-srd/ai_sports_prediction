import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createWidgetBillingPortalSession,
  updateWidgetStripeCancellation,
  updateWidgetStripeScheduleCancellation
} from "@/lib/widget-billing";
import { getWidgetDb } from "@/lib/widget-db";
import { readWidgetCustomerSession } from "@/lib/widget-customer-session";
import {
  createWidgetApiKey,
  decryptWidgetApiKey,
  encryptWidgetApiKey,
  getWidgetApiKeyPreview,
  hashWidgetApiKey
} from "@/lib/widget-api-keys";
import { getWidgetPlanRules, type WidgetPlan } from "@/lib/widget-plans";

export const runtime = "nodejs";

type CustomerRow = {
  api_key_ciphertext: string | null;
  api_key_enabled: boolean;
  api_key_preview: string | null;
  billing_email: string | null;
  cancel_at_period_end: boolean;
  cancellation_effective_at_utc: Date | null;
  current_period_ends_at_utc: Date | null;
  domain: string;
  email: string;
  id: string;
  legal_company_name: string | null;
  minimum_term_ends_at_utc: Date | null;
  monthly_limit: number;
  plan: WidgetPlan;
  publication_name: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_schedule_id: string | null;
};

export async function GET(request: NextRequest) {
  const authenticated = await getCustomer(request);
  if ("response" in authenticated) return authenticated.response;
  const { customer, db } = authenticated;
  const [domains, usage, daily, invoices] = await Promise.all([
    db.query<{ domain: string; id: string; is_primary: boolean }>(`
      select id, domain, is_primary from widget_customer_domains
      where customer_id = $1 order by is_primary desc, created_at_utc
    `, [customer.id]),
    db.query<{ last_request_at_utc: Date | null; request_count: string }>(`
      select request_count::text, last_request_at_utc from widget_usage_monthly
      where customer_id = $1 and month_start = date_trunc('month', now())::date
    `, [customer.id]),
    db.query<{ request_count: string; usage_date: Date }>(`
      select usage_date, sum(request_count)::text as request_count from widget_usage_daily
      where customer_id = $1 and usage_date >= current_date - 29
      group by usage_date order by usage_date
    `, [customer.id]),
    db.query<{
      amount_due: number | null;
      amount_paid: number | null;
      created_at_utc: Date;
      currency: string | null;
      hosted_invoice_url: string | null;
      invoice_number: string | null;
      invoice_pdf_url: string | null;
      status: string;
      stripe_invoice_id: string;
    }>(`
      select stripe_invoice_id, invoice_number, status, currency, amount_due, amount_paid,
             hosted_invoice_url, invoice_pdf_url, created_at_utc
      from widget_invoices where customer_id = $1 order by created_at_utc desc limit 24
    `, [customer.id])
  ]);
  const used = Number(usage.rows[0]?.request_count ?? 0);
  const rules = getWidgetPlanRules(customer.plan);
  let apiKey: string | null = null;
  if (customer.api_key_ciphertext) {
    try { apiKey = decryptWidgetApiKey(customer.api_key_ciphertext); } catch { apiKey = null; }
  }
  return NextResponse.json({
    account: {
      apiKey,
      apiKeyEnabled: customer.api_key_enabled,
      apiKeyPreview: customer.api_key_preview,
      billingEmail: customer.billing_email,
      cancelAtPeriodEnd: customer.cancel_at_period_end,
      cancellationEffectiveAt: toIso(customer.cancellation_effective_at_utc),
      currentPeriodEndsAt: toIso(customer.current_period_ends_at_utc),
      dailyUsage: daily.rows.map((row) => ({ date: toIso(row.usage_date), requests: Number(row.request_count) })),
      domainLimit: rules.domainLimit,
      domains: domains.rows,
      email: customer.email,
      invoices: invoices.rows,
      legalCompanyName: customer.legal_company_name,
      minimumTermEndsAt: toIso(customer.minimum_term_ends_at_utc),
      monthlyLimit: customer.monthly_limit,
      plan: customer.plan,
      publicationName: customer.publication_name,
      status: customer.status,
      usagePercent: customer.monthly_limit ? Math.min(100, Math.round(used / customer.monthly_limit * 100)) : 0,
      usedRequests: used
    }
  }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const authenticated = await getCustomer(request);
  if ("response" in authenticated) return authenticated.response;
  const { customer, db } = authenticated;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = String(body?.action ?? "");

  try {
    if (action === "rotate_key") {
      const apiKey = createWidgetApiKey();
      await db.query(`
        update widget_customers set api_key_hash = $2, api_key_ciphertext = $3,
          api_key_preview = $4, api_key_enabled = true, updated_at_utc = now()
        where id = $1
      `, [customer.id, hashWidgetApiKey(apiKey), encryptWidgetApiKey(apiKey), getWidgetApiKeyPreview(apiKey)]);
      return NextResponse.json({ apiKey, apiKeyPreview: getWidgetApiKeyPreview(apiKey), ok: true });
    }

    if (action === "add_domain") {
      const domain = normalizeDomain(body?.domain);
      if (!domain) return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
      const count = await db.query<{ count: string }>(`
        select count(*)::text as count from widget_customer_domains where customer_id = $1
      `, [customer.id]);
      if (Number(count.rows[0]?.count ?? 0) >= getWidgetPlanRules(customer.plan).domainLimit) {
        return NextResponse.json({ error: "domain_limit_reached" }, { status: 409 });
      }
      await db.query(`
        insert into widget_customer_domains (id, customer_id, domain, is_primary)
        values ($1, $2, $3, false) on conflict (customer_id, domain) do nothing
      `, [randomUUID(), customer.id, domain]);
      return NextResponse.json({ ok: true });
    }

    if (action === "remove_domain") {
      const domainId = String(body?.domainId ?? "");
      const count = await db.query<{ count: string }>(`
        select count(*)::text as count from widget_customer_domains where customer_id = $1
      `, [customer.id]);
      if (!domainId || Number(count.rows[0]?.count ?? 0) <= 1) {
        return NextResponse.json({ error: "at_least_one_domain_required" }, { status: 409 });
      }
      await db.query(`delete from widget_customer_domains where id = $1 and customer_id = $2 and is_primary = false`, [domainId, customer.id]);
      return NextResponse.json({ ok: true });
    }

    if (action === "billing_portal") {
      if (!customer.stripe_customer_id) return NextResponse.json({ error: "stripe_customer_missing" }, { status: 409 });
      const locale = body?.locale === "de" ? "de" : "en";
      const configuredOrigin = process.env.PUBLIC_SITE_URL?.trim();
      const origin = configuredOrigin && /^https:\/\//i.test(configuredOrigin)
        ? new URL(configuredOrigin).origin
        : request.nextUrl.origin;
      const returnUrl = `${origin}${locale === "de" ? "/de/widgets/account" : "/widgets/account"}`;
      return NextResponse.json({ ok: true, url: await createWidgetBillingPortalSession(customer.stripe_customer_id, returnUrl) });
    }

    if (action === "cancel_subscription" || action === "resume_subscription") {
      if (!customer.stripe_subscription_id) return NextResponse.json({ error: "stripe_subscription_missing" }, { status: 409 });
      const cancel = action === "cancel_subscription";
      const cancellationAt = cancel ? getPermittedCancellationDate(customer) : null;
      const scheduleHandled = customer.plan !== "enterprise" && await updateWidgetStripeScheduleCancellation({
        cancellationAt,
        plan: customer.plan,
        scheduleId: customer.stripe_subscription_schedule_id
      });
      if (!scheduleHandled) await updateWidgetStripeCancellation(customer.stripe_subscription_id, cancellationAt);
      await db.query(`
        update widget_customers set cancel_at_period_end = $2,
          cancellation_requested_at_utc = case when $2 then now() else null end,
          cancellation_effective_at_utc = $3, updated_at_utc = now()
        where id = $1
      `, [customer.id, cancel, cancellationAt]);
      return NextResponse.json({ cancellationAt: toIso(cancellationAt), ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error) {
    console.error("Widget customer self-service action failed", error);
    return NextResponse.json({ error: "account_action_failed" }, { status: 503 });
  }
}

async function getCustomer(request: NextRequest): Promise<
  | { customer: CustomerRow; db: ReturnType<typeof getWidgetDb> }
  | { response: NextResponse }
> {
  const session = readWidgetCustomerSession(request);
  if (!session) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const db = getWidgetDb();
  const result = await db.query<CustomerRow>(`
    select id, email, publication_name, domain, plan, status, monthly_limit,
      api_key_ciphertext, api_key_preview, api_key_enabled, stripe_customer_id,
      stripe_subscription_id, stripe_subscription_schedule_id, billing_email, legal_company_name,
      minimum_term_ends_at_utc, current_period_ends_at_utc,
      cancel_at_period_end, cancellation_effective_at_utc
    from widget_customers where id = $1 and lower(email) = lower($2) limit 1
  `, [session.customerId, session.email]);
  const customer = result.rows[0];
  if (!customer) return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  return { customer, db };
}

function getPermittedCancellationDate(customer: CustomerRow): Date {
  const now = Date.now();
  if (customer.minimum_term_ends_at_utc && customer.minimum_term_ends_at_utc.getTime() > now) {
    return customer.minimum_term_ends_at_utc;
  }
  if (customer.current_period_ends_at_utc && customer.current_period_ends_at_utc.getTime() > now) {
    return customer.current_period_ends_at_utc;
  }
  return new Date();
}

function normalizeDomain(value: unknown): string | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;
  try {
    const hostname = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
    return hostname.includes(".") || hostname === "localhost" ? hostname : null;
  } catch {
    return null;
  }
}

function toIso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}
