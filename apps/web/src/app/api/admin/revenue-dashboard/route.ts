import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";
import { monthlyRecurringRevenueCents, percentage, type RevenueCustomer } from "@/lib/revenue-metrics";
import { getWidgetDb } from "@/lib/widget-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const db = getWidgetDb();
    const [customers, funnel, revenue, trend, breakdown, costs, risk, analytics] = await Promise.all([
      db.query<RevenueCustomer & { created_at_utc: Date; original_plan: string | null }>(`
        select c.plan, c.status, c.billing_interval, c.created_at_utc,
          (select l.requested_plan from widget_leads l where l.customer_id = c.id order by l.created_at_utc limit 1) as original_plan
        from widget_customers c
      `),
      db.query<{
        activations_30d: string; checkouts_30d: string; leads_30d: string; purchases_30d: string;
      }>(`
        select
          count(distinct lead_id) filter (where event_name = 'lead_created' and happened_at_utc >= now() - interval '30 days')::text as leads_30d,
          count(distinct lead_id) filter (where event_name = 'begin_checkout' and happened_at_utc >= now() - interval '30 days')::text as checkouts_30d,
          count(distinct lead_id) filter (where event_name = 'purchase' and happened_at_utc >= now() - interval '30 days')::text as purchases_30d,
          count(distinct customer_id) filter (where event_name = 'customer_activated' and happened_at_utc >= now() - interval '30 days')::text as activations_30d
        from widget_revenue_events
      `),
      db.query<{ customers: string; revenue_30d: string; revenue_total: string }>(`
        select
          coalesce(sum(amount_cents) filter (where event_name = 'purchase'), 0)::text as revenue_total,
          coalesce(sum(amount_cents) filter (where event_name = 'purchase' and happened_at_utc >= now() - interval '30 days'), 0)::text as revenue_30d,
          count(distinct customer_id) filter (where event_name = 'purchase')::text as customers
        from widget_revenue_events
      `),
      db.query<{ month: string; purchases: string; revenue_cents: string }>(`
        select to_char(date_trunc('month', happened_at_utc), 'YYYY-MM') as month,
          count(*)::text as purchases, coalesce(sum(amount_cents), 0)::text as revenue_cents
        from widget_revenue_events
        where event_name = 'purchase' and happened_at_utc >= date_trunc('month', now()) - interval '11 months'
        group by date_trunc('month', happened_at_utc)
        order by date_trunc('month', happened_at_utc)
      `),
      db.query<{ country: string; customers: string; purchases: string; revenue_cents: string; source: string }>(`
        select coalesce(nullif(l.source, ''), 'direct') as source,
          coalesce(nullif(l.billing_country, ''), '—') as country,
          count(*)::text as purchases, count(distinct e.customer_id)::text as customers,
          coalesce(sum(e.amount_cents), 0)::text as revenue_cents
        from widget_revenue_events e
        join widget_leads l on l.id = e.lead_id
        where e.event_name = 'purchase'
        group by coalesce(nullif(l.source, ''), 'direct'), coalesce(nullif(l.billing_country, ''), '—')
        order by sum(e.amount_cents) desc nulls last
        limit 40
      `),
      db.query<{ amount_cents: number; country: string; currency: string; id: string; period_start: Date; source: string }>(`
        select id, period_start, source, country, amount_cents, currency
        from widget_acquisition_costs order by period_start desc, source limit 100
      `),
      db.query<{ canceled_30d: string; payment_failures_30d: string; pending_cancellations: string }>(`
        select
          (select count(*) from widget_customers where coalesce(canceled_at_utc, cancellation_requested_at_utc) >= now() - interval '30 days')::text as canceled_30d,
          (select count(*) from widget_automation_events where event_type = 'payment_failed' and created_at_utc >= now() - interval '30 days')::text as payment_failures_30d,
          (select count(*) from widget_customers where cancel_at_period_end = true and status in ('active', 'past_due'))::text as pending_cancellations
      `),
      db.query<{ count: string; status: string }>(`
        select analytics_delivery_status as status, count(*)::text as count
        from widget_revenue_events where event_name = 'purchase'
        group by analytics_delivery_status
      `)
    ]);

    const customerRows = customers.rows;
    const activeCustomers = customerRows.filter((row) => row.status === "active").length;
    const atRiskCustomers = customerRows.filter((row) => row.status === "past_due").length;
    const enterpriseCustomers = customerRows.filter((row) => row.status === "active" && row.plan === "enterprise").length;
    const starterToGrowthUpgrades = customerRows.filter((row) => row.status === "active" && row.plan === "growth" && row.original_plan === "starter").length;
    const mrrCents = monthlyRecurringRevenueCents(customerRows);
    const f = funnel.rows[0];
    const r = revenue.rows[0];
    const riskRow = risk.rows[0];
    const checkouts30d = Number(f?.checkouts_30d ?? 0);
    const purchases30d = Number(f?.purchases_30d ?? 0);
    const canceled30d = Number(riskRow?.canceled_30d ?? 0);
    const totalRevenue = Number(r?.revenue_total ?? 0);
    const payingCustomers = Number(r?.customers ?? 0);
    const acquisitionCost90d = costs.rows
      .filter((row) => new Date(row.period_start) >= new Date(Date.now() - 90 * 86_400_000))
      .reduce((sum, row) => sum + Number(row.amount_cents), 0);
    const newCustomers90d = customerRows.filter((row) => new Date(row.created_at_utc) >= new Date(Date.now() - 90 * 86_400_000)).length;

    return NextResponse.json({
      analytics: {
        configured: Boolean(process.env.GA4_API_SECRET && (process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID)),
        delivery: Object.fromEntries(analytics.rows.map((row) => [row.status, Number(row.count)]))
      },
      breakdown: breakdown.rows.map((row) => ({ ...row, customers: Number(row.customers), purchases: Number(row.purchases), revenueCents: Number(row.revenue_cents) })),
      costs: costs.rows.map((row) => ({ ...row, amountCents: Number(row.amount_cents), periodStart: new Date(row.period_start).toISOString().slice(0, 10) })),
      funnel: {
        activations: Number(f?.activations_30d ?? 0),
        checkouts: checkouts30d,
        leads: Number(f?.leads_30d ?? 0),
        purchases: purchases30d
      },
      overview: {
        activeCustomers,
        arrCents: mrrCents * 12,
        atRiskCustomers,
        averageCustomerValueCents: payingCustomers ? Math.round(totalRevenue / payingCustomers) : 0,
        cac90dCents: newCustomers90d ? Math.round(acquisitionCost90d / newCustomers90d) : null,
        checkoutConversion30d: percentage(purchases30d, checkouts30d),
        churn30d: percentage(canceled30d, activeCustomers + canceled30d),
        enterpriseCustomers,
        mrrCents,
        paymentFailures30d: Number(riskRow?.payment_failures_30d ?? 0),
        pendingCancellations: Number(riskRow?.pending_cancellations ?? 0),
        revenue30dCents: Number(r?.revenue_30d ?? 0),
        revenueTotalCents: totalRevenue,
        starterToGrowthUpgrades
      },
      trend: trend.rows.map((row) => ({ month: row.month, purchases: Number(row.purchases), revenueCents: Number(row.revenue_cents) }))
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Revenue dashboard could not be loaded", error);
    return NextResponse.json({ error: "revenue_dashboard_unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const periodStart = String(body?.periodStart ?? "");
  const source = String(body?.source ?? "").trim().toLowerCase().slice(0, 120);
  const country = String(body?.country ?? "ALL").trim().toUpperCase().slice(0, 3) || "ALL";
  const amountCents = Math.round(Number(body?.amountCents));
  if (!/^\d{4}-\d{2}-01$/.test(periodStart) || !source || !Number.isFinite(amountCents) || amountCents < 0) {
    return NextResponse.json({ error: "invalid_acquisition_cost" }, { status: 400 });
  }
  await getWidgetDb().query(`
    insert into widget_acquisition_costs (id, period_start, source, country, amount_cents, currency)
    values ($1, $2::date, $3, $4, $5, 'EUR')
    on conflict (period_start, source, country) do update set
      amount_cents = excluded.amount_cents, updated_at_utc = now()
  `, [randomUUID(), periodStart, source, country, amountCents]);
  return NextResponse.json({ ok: true });
}
