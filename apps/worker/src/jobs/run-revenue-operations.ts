import { randomUUID } from "node:crypto";
import { sendGa4Purchase, type PostgresDb } from "@ai-sports-prediction/db";

type PendingEvent = {
  billing_interval: "annual" | "monthly" | null;
  customer_id: string | null;
  dedupe_key: string;
  email: string | null;
  event_type: string;
  id: string;
  lead_id: string | null;
  locale: "de" | "en";
  payload: Record<string, unknown>;
  plan: string | null;
  publication_name: string | null;
};

export async function runRevenueOperations(db: PostgresDb) {
  const analyticsDelivered = await deliverPendingPurchaseAnalytics(db);
  if (!readBoolean(process.env.REVENUE_AUTOMATION_ENABLED ?? "1")) {
    return { analyticsDelivered, queued: 0, sent: 0 };
  }
  await queueAbandonedCheckouts(db);
  await queueEnterpriseFollowUps(db);
  await queueMissingOnboarding(db);
  await queueUsageSignals(db);
  await queueDomainFailureSignals(db);
  const sent = await deliverPendingEvents(db);
  return { analyticsDelivered, sent };
}

async function deliverPendingPurchaseAnalytics(db: PostgresDb) {
  const result = await db.query<{
    amount_cents: number | null;
    currency: string | null;
    id: string;
    lead_id: string | null;
    payload: Record<string, unknown>;
    plan: string | null;
  }>(`
    select id, lead_id, plan, amount_cents, currency, payload
    from widget_revenue_events
    where event_name = 'purchase'
      and analytics_delivery_status in ('pending', 'failed')
      and analytics_delivery_attempts < 10
    order by happened_at_utc
    limit 100
  `);
  let delivered = 0;
  for (const event of result.rows) {
    const analyticsConsent = event.payload.analyticsConsent === true;
    try {
      const delivery = await sendGa4Purchase({
        analyticsConsent,
        clientId: typeof event.payload.analyticsClientId === "string" ? event.payload.analyticsClientId : null,
        currency: event.currency || "EUR",
        plan: event.plan || "widget",
        transactionId: String(event.payload.invoiceId ?? event.id),
        userId: event.lead_id || event.id,
        valueCents: event.amount_cents ?? 0
      });
      if (delivery.sent) {
        await updateAnalyticsDelivery(db, event.id, "sent", null, true);
        delivered += 1;
      } else if (delivery.reason === "analytics_consent_missing") {
        await updateAnalyticsDelivery(db, event.id, "skipped", delivery.reason, false);
      } else {
        await updateAnalyticsDelivery(db, event.id, "pending", delivery.reason ?? "ga4_not_configured", false);
      }
    } catch (error) {
      await updateAnalyticsDelivery(
        db,
        event.id,
        "failed",
        error instanceof Error ? error.message : String(error),
        true
      );
    }
  }
  return delivered;
}

async function updateAnalyticsDelivery(
  db: PostgresDb,
  eventId: string,
  status: "failed" | "pending" | "sent" | "skipped",
  error: string | null,
  attempted: boolean
) {
  await db.query(`
    update widget_revenue_events
    set analytics_delivery_status = $2,
        analytics_delivery_attempts = analytics_delivery_attempts + case when $4 then 1 else 0 end,
        analytics_delivered_at_utc = case when $2 = 'sent' then now() else analytics_delivered_at_utc end,
        analytics_last_error = $3
    where id = $1
  `, [eventId, status, error, attempted]);
}

async function queueAbandonedCheckouts(db: PostgresDb) {
  const candidates = await db.query<{ id: string }>(`
    update widget_leads
    set checkout_abandoned_at_utc = coalesce(checkout_abandoned_at_utc, now()),
        next_follow_up_at_utc = now(), updated_at_utc = now()
    where pipeline_stage = 'checkout' and checkout_started_at_utc <= now() - interval '24 hours'
      and abandoned_reminder_sent_at_utc is null and customer_id is null
    returning id
  `);
  for (const row of candidates.rows) {
    await insertEvent(db, `abandoned_checkout:${row.id}`, "abandoned_checkout", row.id, null);
    await db.query(`
      insert into widget_revenue_events (
        id, idempotency_key, event_name, lead_id, plan, source
      )
      select $1, $2, 'checkout_abandoned', id, requested_plan, 'revenue_worker'
      from widget_leads where id = $3 on conflict (idempotency_key) do nothing
    `, [randomUUID(), `checkout_abandoned:${row.id}`, row.id]);
  }
}

async function queueEnterpriseFollowUps(db: PostgresDb) {
  const leads = await db.query<{ id: string }>(`
    select id from widget_leads
    where requested_plan = 'enterprise' and pipeline_stage = 'new'
      and (next_follow_up_at_utc is null or next_follow_up_at_utc <= now())
  `);
  const day = new Date().toISOString().slice(0, 10);
  for (const row of leads.rows) {
    await insertEvent(db, `enterprise_follow_up:${row.id}:${day}`, "enterprise_follow_up", row.id, null);
  }
}

async function queueMissingOnboarding(db: PostgresDb) {
  const customers = await db.query<{ id: string }>(`
    select c.id from widget_customers c
    left join widget_usage_monthly u on u.customer_id = c.id
      and u.month_start = date_trunc('month', now())::date
    where c.status = 'active' and c.created_at_utc <= now() - interval '24 hours'
      and coalesce(u.request_count, 0) = 0
  `);
  for (const row of customers.rows) {
    await insertEvent(db, `onboarding_missing:${row.id}`, "onboarding_missing", null, row.id);
  }
}

async function queueUsageSignals(db: PostgresDb) {
  const customers = await db.query<{ id: string; plan: string; percent: number }>(`
    select c.id, c.plan, floor(u.request_count::numeric / greatest(c.monthly_limit, 1) * 100)::integer as percent
    from widget_customers c join widget_usage_monthly u on u.customer_id = c.id
    where u.month_start = date_trunc('month', now())::date and c.status = 'active'
      and u.request_count >= c.monthly_limit * 0.7
  `);
  const month = new Date().toISOString().slice(0, 7);
  for (const row of customers.rows) {
    const eventType = row.percent >= 90 ? "usage_90" : row.plan === "starter" ? "growth_upgrade" : "usage_70";
    await insertEvent(db, `${eventType}:${row.id}:${month}`, eventType, null, row.id, { percent: row.percent });
  }
}

async function queueDomainFailureSignals(db: PostgresDb) {
  const customers = await db.query<{ failures: string; id: string }>(`
    select customer_id as id, count(*)::text as failures from widget_domain_failures
    where occurred_at_utc >= now() - interval '24 hours'
    group by customer_id having count(*) >= 3
  `);
  const day = new Date().toISOString().slice(0, 10);
  for (const row of customers.rows) {
    await insertEvent(db, `domain_failures:${row.id}:${day}`, "domain_failures", null, row.id, { failures: Number(row.failures) });
  }
}

async function deliverPendingEvents(db: PostgresDb) {
  const result = await db.query<PendingEvent>(`
    select e.id, e.dedupe_key, e.event_type, e.lead_id, e.customer_id, e.payload,
      coalesce(l.email, c.email) as email,
      coalesce(l.publication_name, c.publication_name) as publication_name,
      coalesce(l.requested_plan, c.plan) as plan,
      l.billing_interval,
      coalesce(l.locale, 'en')::text as locale
    from widget_automation_events e
    left join widget_leads l on l.id = e.lead_id
    left join widget_customers c on c.id = e.customer_id
    where e.status = 'pending' order by e.created_at_utc limit 100
  `);
  let sent = 0;
  for (const event of result.rows) {
    try {
      if (event.event_type === "enterprise_follow_up") {
        await sendInternalAlert(event);
        await db.query(`update widget_leads set next_follow_up_at_utc = now() + interval '1 day', updated_at_utc = now() where id = $1`, [event.lead_id]);
      } else {
        if (!event.email) throw new Error("revenue_event_recipient_missing");
        await sendCustomerEmail(event);
        if (event.event_type === "abandoned_checkout") {
          await db.query(`
            update widget_leads set abandoned_reminder_sent_at_utc = now(),
              next_follow_up_at_utc = now() + interval '3 days', updated_at_utc = now()
            where id = $1
          `, [event.lead_id]);
        }
      }
      await db.query(`update widget_automation_events set status = 'sent', sent_at_utc = now(), updated_at_utc = now() where id = $1`, [event.id]);
      sent += 1;
    } catch (error) {
      await db.query(`
        update widget_automation_events set status = 'pending', error_message = $2, updated_at_utc = now()
        where id = $1
      `, [event.id, error instanceof Error ? error.message : String(error)]);
    }
  }
  return sent;
}

async function insertEvent(
  db: PostgresDb,
  dedupeKey: string,
  eventType: string,
  leadId: string | null,
  customerId: string | null,
  payload: Record<string, unknown> = {}
) {
  await db.query(`
    insert into widget_automation_events (
      id, dedupe_key, event_type, lead_id, customer_id, payload
    ) values ($1, $2, $3, $4, $5, $6::jsonb)
    on conflict (dedupe_key) do nothing
  `, [randomUUID(), dedupeKey, eventType, leadId, customerId, JSON.stringify(payload)]);
}

async function sendCustomerEmail(event: PendingEvent) {
  const german = event.locale === "de";
  const site = (process.env.PUBLIC_SITE_URL ?? "https://www.ai-sports-prediction.net").replace(/\/$/, "");
  const account = `${site}${german ? "/de" : ""}/widgets/account`;
  const checkout = `${site}${german ? "/de" : ""}/widgets/checkout?plan=${event.plan ?? "starter"}&billing=${event.billing_interval ?? "monthly"}`;
  const copy = getCustomerCopy(event.event_type, german, { account, checkout, percent: Number(event.payload.percent ?? 0) });
  await sendEmail([event.email!], copy.subject, copy.text);
}

async function sendInternalAlert(event: PendingEvent) {
  const recipients = splitEmails(process.env.SALES_ALERT_EMAILS ?? process.env.OPS_ALERT_EMAILS);
  if (!recipients.length) throw new Error("sales_alert_recipients_missing");
  await sendEmail(
    recipients,
    `Enterprise-Lead wartet: ${event.publication_name ?? event.email}`,
    `Ein Enterprise-Lead benötigt eine Antwort.\n\nPublikation: ${event.publication_name ?? "-"}\nE-Mail: ${event.email ?? "-"}\nLead-ID: ${event.lead_id ?? "-"}\n\nIm Admin-Cockpit öffnen: ${(process.env.PUBLIC_SITE_URL ?? "https://www.ai-sports-prediction.net").replace(/\/$/, "")}/admin/leads`
  );
}

function getCustomerCopy(type: string, german: boolean, links: { account: string; checkout: string; percent: number }) {
  const de: Record<string, { subject: string; text: string }> = {
    abandoned_checkout: { subject: "Ihre Widget-Bestellung ist noch nicht abgeschlossen", text: `Sie haben den Checkout noch nicht abgeschlossen. Ihre Angaben bleiben gespeichert; Sie können hier fortfahren:\n\n${links.checkout}\n\nBei Fragen antworten Sie einfach auf diese E-Mail.` },
    onboarding_missing: { subject: "Brauchen Sie Hilfe beim ersten Widget?", text: `Ihr Widget-Zugang ist aktiv, aber es wurde noch kein Aufruf erkannt. Im Kundenkonto finden Sie API-Key, Domains und Nutzung:\n\n${links.account}\n\nDie Einbindung dauert normalerweise nur wenige Minuten.` },
    usage_70: { subject: "70 % Ihres Widget-Limits erreicht", text: `Ihre Nutzung liegt bei ${links.percent} %. Im Kundenkonto sehen Sie den aktuellen Stand:\n\n${links.account}` },
    usage_90: { subject: "90 % Ihres Widget-Limits erreicht", text: `Ihre Nutzung liegt bei ${links.percent} %. Prüfen Sie den aktuellen Stand, damit Ihre Einbindungen nicht das Limit erreichen:\n\n${links.account}` },
    growth_upgrade: { subject: "Growth passt inzwischen besser zu Ihrer Nutzung", text: `Ihr Starter-Tarif liegt bei ${links.percent} % Nutzung. Growth bietet mehr Aufrufe, Domains und Widget-Formate. Ihren aktuellen Stand sehen Sie hier:\n\n${links.account}` },
    domain_failures: { subject: "Eine Widget-Domain benötigt Aufmerksamkeit", text: `Die Domainprüfung ist mehrfach fehlgeschlagen. Prüfen Sie die erlaubten Domains und die Einbindung im Kundenkonto:\n\n${links.account}` },
    payment_failed: { subject: "Zahlung für Ihren Widget-Tarif fehlgeschlagen", text: `Stripe konnte die Zahlung nicht abschließen. Aktualisieren Sie Ihre Zahlungsmethode im Kundenkonto; Stripe führt weitere zulässige Zahlungsversuche automatisch aus:\n\n${links.account}` }
  };
  const en: Record<string, { subject: string; text: string }> = {
    abandoned_checkout: { subject: "Your widget order is not complete", text: `Your checkout is not complete yet. Continue here:\n\n${links.checkout}\n\nReply to this email if you need help.` },
    onboarding_missing: { subject: "Need help with your first widget?", text: `Your widget access is active, but no request has been detected. Find your API key, domains and usage here:\n\n${links.account}` },
    usage_70: { subject: "70% of your widget limit reached", text: `Usage is at ${links.percent}%. Review it here:\n\n${links.account}` },
    usage_90: { subject: "90% of your widget limit reached", text: `Usage is at ${links.percent}%. Review your account before embeds reach the limit:\n\n${links.account}` },
    growth_upgrade: { subject: "Growth now fits your usage better", text: `Your Starter plan is at ${links.percent}% usage. Growth adds requests, domains and formats:\n\n${links.account}` },
    domain_failures: { subject: "A widget domain needs attention", text: `Domain verification failed several times. Review allowed domains and your embed:\n\n${links.account}` },
    payment_failed: { subject: "Payment for your widget plan failed", text: `Stripe could not complete the payment. Update the payment method in your account; Stripe will run further eligible retries automatically:\n\n${links.account}` }
  };
  return (german ? de : en)[type] ?? { subject: "AI Sports Prediction Widget", text: links.account };
}

async function sendEmail(to: string[], subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("revenue_email_not_configured");
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({ from, to, subject, text }),
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) throw new Error(`revenue_email_failed_${response.status}`);
}

function splitEmails(value: string | undefined) {
  return (value ?? "").split(",").map((email) => email.trim()).filter(Boolean);
}

function readBoolean(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes((value ?? "").trim().toLowerCase());
}
