import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getWidgetDb } from "@/lib/widget-db";
import { getWidgetCustomerSessionSecret } from "@/lib/widget-customer-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { email?: unknown; locale?: unknown } | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const locale = body?.locale === "de" ? "de" : "en";
  const generic = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !getWidgetCustomerSessionSecret()) return generic;

  try {
    const db = getWidgetDb();
    const result = await db.query<{ id: string }>(`
      select id from widget_customers
      where lower(email) = lower($1) and status in ('active', 'past_due')
      limit 1
    `, [email]);
    const customer = result.rows[0];
    if (!customer) return generic;

    const recent = await db.query<{ count: string }>(`
      select count(*)::text as count from widget_customer_login_tokens
      where customer_id = $1 and created_at_utc > now() - interval '15 minutes'
    `, [customer.id]);
    if (Number(recent.rows[0]?.count ?? 0) >= 3) return generic;

    const token = randomBytes(32).toString("base64url");
    await db.query(`
      insert into widget_customer_login_tokens (id, customer_id, token_hash, expires_at_utc, ip_hash)
      values ($1, $2, $3, now() + interval '20 minutes', $4)
    `, [randomUUID(), customer.id, hash(token), hashIp(request)]);
    await sendLoginEmail(email, token, locale, request.nextUrl.origin);
  } catch (error) {
    console.error("Widget customer login request failed", error);
  }
  return generic;
}

async function sendLoginEmail(email: string, token: string, locale: "de" | "en", requestOrigin: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.WIDGET_ACCESS_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error("widget_customer_login_email_not_configured");
  const configuredOrigin = process.env.PUBLIC_SITE_URL?.trim();
  const origin = configuredOrigin && /^https:\/\//i.test(configuredOrigin) ? new URL(configuredOrigin).origin : requestOrigin;
  const url = `${origin}/api/widgets/account/auth/verify?token=${encodeURIComponent(token)}&locale=${locale}`;
  const german = locale === "de";
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      to: [email],
      subject: german ? "Anmeldung zu Ihrem Widget-Kundenkonto" : "Sign in to your widget customer account",
      text: german
        ? `Öffnen Sie diesen sicheren Link innerhalb von 20 Minuten:\n\n${url}\n\nFalls Sie die Anmeldung nicht angefordert haben, können Sie diese E-Mail ignorieren.`
        : `Open this secure link within 20 minutes:\n\n${url}\n\nIf you did not request this sign-in, you can ignore this email.`
    }),
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    method: "POST"
  });
  if (!response.ok) throw new Error(`widget_customer_login_email_failed_${response.status}`);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashIp(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || "unknown";
  return hash(`${process.env.WIDGET_LEAD_IP_HASH_SALT ?? "widget-login"}:${ip}`);
}
