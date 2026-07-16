import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";
import { updateWidgetStripeCancellation, updateWidgetStripeScheduleCancellation } from "@/lib/widget-billing";
import { getWidgetDb } from "@/lib/widget-db";
import {
  createWidgetApiKey,
  decryptWidgetApiKey,
  encryptWidgetApiKey,
  getWidgetApiKeyPreview,
  hashWidgetApiKey
} from "@/lib/widget-api-keys";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import { getWidgetPlanRules } from "@/lib/widget-plans";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const db = getWidgetDb();
    const customersResult = await db.query<{
      access_expires_at_utc: Date | null;
      api_key_ciphertext: string | null;
      api_key_enabled: boolean;
      api_key_preview: string | null;
      billing_email: string | null;
      billing_interval: string | null;
      cancel_at_period_end: boolean;
      cancellation_requested_at_utc: Date | null;
      cancellation_effective_at_utc: Date | null;
      created_at_utc: Date;
      current_period_ends_at_utc: Date | null;
      dpa_accepted_at_utc: Date | null;
      dpa_version: string | null;
      domain: string;
      email: string;
      id: string;
      last_request_at_utc: Date | null;
      legal_company_name: string | null;
      minimum_term_ends_at_utc: Date | null;
      monthly_limit: number;
      plan: WidgetAccessPlan;
      publication_name: string;
      privacy_acknowledged_at_utc: Date | null;
      privacy_version: string | null;
      request_count: string;
      status: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      stripe_subscription_schedule_id: string | null;
      widget_terms_accepted_at_utc: Date | null;
      widget_terms_version: string | null;
    }>(`
      select c.id, c.email, c.publication_name, c.domain, c.plan, c.status,
             c.monthly_limit, c.access_expires_at_utc, c.billing_interval,
             c.minimum_term_ends_at_utc, c.current_period_ends_at_utc,
             c.cancel_at_period_end, c.cancellation_requested_at_utc,
             c.cancellation_effective_at_utc,
             c.stripe_customer_id, c.stripe_subscription_id, c.legal_company_name,
             c.billing_email, c.api_key_enabled, c.api_key_preview,
             c.widget_terms_version, c.widget_terms_accepted_at_utc,
             c.privacy_version, c.privacy_acknowledged_at_utc,
             c.dpa_version, c.dpa_accepted_at_utc,
             c.api_key_ciphertext, c.created_at_utc,
             coalesce(u.request_count, 0)::text as request_count,
             u.last_request_at_utc
      from widget_customers c
      left join widget_usage_monthly u
        on u.customer_id = c.id and u.month_start = date_trunc('month', now())::date
      order by (c.status = 'active') desc, c.created_at_utc desc
    `);
    const customerIds = customersResult.rows.map((row) => row.id);
    const [domainsResult, invoicesResult, dailyResult] = await Promise.all([
      db.query<{ customer_id: string; domain: string; id: string; is_primary: boolean }>(`
        select id, customer_id, domain, is_primary
        from widget_customer_domains
        where customer_id = any($1::text[])
        order by is_primary desc, created_at_utc
      `, [customerIds]),
      db.query<{
        amount_due: number | null;
        amount_paid: number | null;
        created_at_utc: Date;
        currency: string | null;
        customer_id: string;
        hosted_invoice_url: string | null;
        invoice_number: string | null;
        invoice_pdf_url: string | null;
        status: string;
        stripe_invoice_id: string;
      }>(`
        select stripe_invoice_id, customer_id, invoice_number, status, currency,
               amount_due, amount_paid, hosted_invoice_url, invoice_pdf_url, created_at_utc
        from widget_invoices
        where customer_id = any($1::text[])
        order by created_at_utc desc
      `, [customerIds]),
      db.query<{ customer_id: string; request_count: string; usage_date: Date }>(`
        select customer_id, usage_date, sum(request_count)::text as request_count
        from widget_usage_daily
        where customer_id = any($1::text[]) and usage_date >= current_date - 29
        group by customer_id, usage_date
        order by usage_date
      `, [customerIds])
    ]);

    const customers = customersResult.rows.map((row) => ({
      accessExpiresAt: toIso(row.access_expires_at_utc),
      apiKeyEnabled: row.api_key_enabled,
      apiKeyPreview: row.api_key_preview ?? "Nur als Hash gespeichert",
      apiKeyRevealable: Boolean(row.api_key_ciphertext),
      billingEmail: row.billing_email,
      billingInterval: row.billing_interval,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      cancellationRequestedAt: toIso(row.cancellation_requested_at_utc),
      cancellationEffectiveAt: toIso(row.cancellation_effective_at_utc),
      createdAt: toIso(row.created_at_utc),
      currentPeriodEndsAt: toIso(row.current_period_ends_at_utc),
      domainLimit: getWidgetPlanRules(row.plan).domainLimit,
      domains: domainsResult.rows.filter((domain) => domain.customer_id === row.id),
      dpaAcceptedAt: toIso(row.dpa_accepted_at_utc),
      dpaVersion: row.dpa_version,
      email: row.email,
      id: row.id,
      invoices: invoicesResult.rows.filter((invoice) => invoice.customer_id === row.id).slice(0, 12),
      legalCompanyName: row.legal_company_name,
      minimumTermEndsAt: toIso(row.minimum_term_ends_at_utc),
      monthlyLimit: row.monthly_limit,
      plan: row.plan,
      publicationName: row.publication_name,
      privacyAcknowledgedAt: toIso(row.privacy_acknowledged_at_utc),
      privacyVersion: row.privacy_version,
      status: row.status,
      stripeConfigured: Boolean(row.stripe_customer_id && row.stripe_subscription_id),
      widgetTermsAcceptedAt: toIso(row.widget_terms_accepted_at_utc),
      widgetTermsVersion: row.widget_terms_version,
      usage: {
        daily: dailyResult.rows.filter((entry) => entry.customer_id === row.id).map((entry) => ({
          count: Number(entry.request_count),
          date: String(entry.usage_date).slice(0, 10)
        })),
        lastRequestAt: toIso(row.last_request_at_utc),
        monthCount: Number(row.request_count)
      }
    }));

    return NextResponse.json({
      customers,
      generatedAt: new Date().toISOString(),
      summary: {
        active: customers.filter((customer) => customer.status === "active").length,
        canceling: customers.filter((customer) => customer.cancelAtPeriodEnd).length,
        monthlyRequests: customers.reduce((sum, customer) => sum + customer.usage.monthCount, 0),
        pastDue: customers.filter((customer) => customer.status === "past_due").length,
        total: customers.length
      }
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Widget customer management load failed", error);
    return NextResponse.json({ error: "customer_management_unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const customerId = normalizeText(body?.customerId);
  const action = normalizeText(body?.action);
  if (!customerId || !action) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const db = getWidgetDb();
    const result = await db.query<{
      api_key_ciphertext: string | null;
      current_period_ends_at_utc: Date | null;
      minimum_term_ends_at_utc: Date | null;
      monthly_limit: number;
      plan: WidgetAccessPlan;
      stripe_subscription_id: string | null;
      stripe_subscription_schedule_id: string | null;
    }>(`
      select plan, monthly_limit, api_key_ciphertext, minimum_term_ends_at_utc,
             current_period_ends_at_utc,
             stripe_subscription_id, stripe_subscription_schedule_id
      from widget_customers where id = $1 limit 1
    `, [customerId]);
    const customer = result.rows[0];
    if (!customer) return NextResponse.json({ error: "customer_not_found" }, { status: 404 });

    if (action === "reveal_key") {
      if (!customer.api_key_ciphertext) {
        return NextResponse.json({ error: "key_not_revealable" }, { status: 409 });
      }
      return NextResponse.json({ apiKey: decryptWidgetApiKey(customer.api_key_ciphertext), ok: true });
    }
    if (action === "rotate_key") {
      const apiKey = createWidgetApiKey();
      await db.query(`
        update widget_customers
        set api_key_hash = $2, api_key_ciphertext = $3, api_key_preview = $4,
            api_key_enabled = true, updated_at_utc = now()
        where id = $1
      `, [customerId, hashWidgetApiKey(apiKey), encryptWidgetApiKey(apiKey), getWidgetApiKeyPreview(apiKey)]);
      return NextResponse.json({ apiKey, ok: true });
    }
    if (action === "set_key_enabled") {
      await db.query(`update widget_customers set api_key_enabled = $2, updated_at_utc = now() where id = $1`, [
        customerId,
        body?.enabled === true
      ]);
      return NextResponse.json({ ok: true });
    }
    if (action === "set_monthly_limit") {
      const monthlyLimit = Math.floor(Number(body?.monthlyLimit));
      if (!Number.isFinite(monthlyLimit) || monthlyLimit < 1 || monthlyLimit > 100_000_000) {
        return NextResponse.json({ error: "invalid_monthly_limit" }, { status: 400 });
      }
      await db.query(`update widget_customers set monthly_limit = $2, updated_at_utc = now() where id = $1`, [
        customerId,
        monthlyLimit
      ]);
      return NextResponse.json({ ok: true });
    }
    if (action === "add_domain") {
      const domain = normalizeDomain(body?.domain);
      if (!domain) return NextResponse.json({ error: "invalid_domain" }, { status: 400 });
      const count = await db.query<{ count: string }>(
        `select count(*)::text as count from widget_customer_domains where customer_id = $1`,
        [customerId]
      );
      if (Number(count.rows[0]?.count ?? 0) >= getWidgetPlanRules(customer.plan).domainLimit) {
        return NextResponse.json({ error: "domain_limit_reached" }, { status: 409 });
      }
      await db.query(`
        insert into widget_customer_domains (id, customer_id, domain, is_primary)
        values ($1, $2, $3, false)
        on conflict (customer_id, domain) do nothing
      `, [randomUUID(), customerId, domain]);
      return NextResponse.json({ ok: true });
    }
    if (action === "remove_domain") {
      const domainId = normalizeText(body?.domainId);
      const count = await db.query<{ count: string }>(
        `select count(*)::text as count from widget_customer_domains where customer_id = $1`,
        [customerId]
      );
      if (!domainId || Number(count.rows[0]?.count ?? 0) <= 1) {
        return NextResponse.json({ error: "at_least_one_domain_required" }, { status: 409 });
      }
      await db.query(`delete from widget_customer_domains where id = $1 and customer_id = $2`, [domainId, customerId]);
      return NextResponse.json({ ok: true });
    }
    if (action === "cancel_subscription" || action === "resume_subscription") {
      if (!customer.stripe_subscription_id) {
        return NextResponse.json({ error: "stripe_subscription_missing" }, { status: 409 });
      }
      const cancel = action === "cancel_subscription";
      const minimumTermEnd = customer.minimum_term_ends_at_utc;
      const cancellationAt = cancel
        ? minimumTermEnd && minimumTermEnd.getTime() > Date.now()
          ? minimumTermEnd
          : customer.current_period_ends_at_utc && customer.current_period_ends_at_utc.getTime() > Date.now()
            ? customer.current_period_ends_at_utc
            : new Date()
        : null;
      const scheduleHandled = customer.plan !== "enterprise" && await updateWidgetStripeScheduleCancellation({
        cancellationAt,
        plan: customer.plan,
        scheduleId: customer.stripe_subscription_schedule_id
      });
      if (!scheduleHandled) await updateWidgetStripeCancellation(customer.stripe_subscription_id, cancellationAt);
      await db.query(`
        update widget_customers
        set cancel_at_period_end = $2,
            cancellation_requested_at_utc = case when $2 then now() else null end,
            cancellation_effective_at_utc = $3,
            updated_at_utc = now()
        where id = $1
      `, [customerId, cancel, cancellationAt]);
      return NextResponse.json({ cancellationAt: toIso(cancellationAt), ok: true });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (error) {
    console.error("Widget customer management action failed", error);
    return NextResponse.json({ error: "customer_action_failed" }, { status: 503 });
  }
}

function normalizeDomain(value: unknown) {
  const raw = normalizeText(value).toLowerCase();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    const hostname = url.hostname.replace(/^www\./, "");
    return hostname.includes(".") || hostname === "localhost" ? hostname : null;
  } catch {
    return null;
  }
}

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toIso(value: Date | null) {
  return value ? new Date(value).toISOString() : null;
}
