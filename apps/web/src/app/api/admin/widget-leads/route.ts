import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";
import { getWidgetDb } from "@/lib/widget-db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const db = getWidgetDb();
    const [leads, summary] = await Promise.all([
      db.query<{
        billing_interval: string | null;
        checkout_abandoned_at_utc: Date | null;
        checkout_started_at_utc: Date | null;
        created_at_utc: Date;
        domain: string;
        email: string;
        id: string;
        last_contacted_at_utc: Date | null;
        next_follow_up_at_utc: Date | null;
        outreach_name: string | null;
        outreach_status: string | null;
        pipeline_stage: string;
        priority_score: number;
        publication_name: string;
        requested_plan: string;
        status: string;
      }>(`
        select l.id, l.email, l.publication_name, l.domain, l.requested_plan,
          l.billing_interval, l.status, l.pipeline_stage, l.priority_score,
          l.checkout_started_at_utc, l.checkout_abandoned_at_utc,
          l.last_contacted_at_utc, l.next_follow_up_at_utc, l.created_at_utc,
          p.publication_name as outreach_name, p.status as outreach_status
        from widget_leads l
        left join editorial_prospects p on p.id = l.outreach_prospect_id
        order by
          (l.next_follow_up_at_utc is not null and l.next_follow_up_at_utc <= now()) desc,
          l.priority_score desc, l.created_at_utc desc
        limit 300
      `),
      db.query<{ count: string; pipeline_stage: string }>(`
        select pipeline_stage, count(*)::text as count from widget_leads group by pipeline_stage
      `)
    ]);
    return NextResponse.json({
      leads: leads.rows.map((lead) => ({
        ...lead,
        checkout_abandoned_at_utc: toIso(lead.checkout_abandoned_at_utc),
        checkout_started_at_utc: toIso(lead.checkout_started_at_utc),
        created_at_utc: toIso(lead.created_at_utc),
        last_contacted_at_utc: toIso(lead.last_contacted_at_utc),
        next_follow_up_at_utc: toIso(lead.next_follow_up_at_utc)
      })),
      summary: Object.fromEntries(summary.rows.map((row) => [row.pipeline_stage, Number(row.count)]))
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("Widget leads could not be loaded", error);
    return NextResponse.json({ error: "lead_cockpit_unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const leadId = String(body?.leadId ?? "");
  const stage = String(body?.stage ?? "");
  if (!leadId || !["new", "contacted", "checkout", "paid", "active", "lost"].includes(stage)) {
    return NextResponse.json({ error: "invalid_lead_update" }, { status: 400 });
  }
  const followUpHours = Number(body?.followUpHours ?? (stage === "contacted" ? 72 : 0));
  await getWidgetDb().query(`
    update widget_leads
    set pipeline_stage = $2,
      status = case
        when $2 = 'contacted' then 'contacted'
        when $2 in ('checkout', 'paid') then 'qualified'
        when $2 = 'active' then 'won'
        when $2 = 'lost' then 'lost'
        else status
      end,
      last_contacted_at_utc = case when $2 = 'contacted' then now() else last_contacted_at_utc end,
      next_follow_up_at_utc = case when $3 > 0 then now() + ($3 * interval '1 hour') else null end,
      updated_at_utc = now()
    where id = $1
  `, [leadId, stage, Number.isFinite(followUpHours) ? Math.min(Math.max(followUpHours, 0), 24 * 90) : 0]);
  return NextResponse.json({ ok: true });
}

function toIso(value: Date | null) {
  return value ? new Date(value).toISOString() : null;
}
