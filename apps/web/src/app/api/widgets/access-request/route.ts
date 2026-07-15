import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getWidgetDb } from "@/lib/widget-db";
import type { WidgetAccessPlan } from "@/lib/widget-access";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  if (normalizeText(body.company)) return NextResponse.json({ ok: true });

  const email = normalizeText(body.email).toLowerCase();
  const publicationName = normalizeText(body.publicationName);
  const websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
  const domain = websiteUrl ? new URL(websiteUrl).hostname.toLowerCase().replace(/^www\./, "") : "";
  const plan = normalizePlan(body.plan);
  const consent = body.consent === true;
  const locale = body.locale === "de" ? "de" : "en";

  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (publicationName.length < 2 || publicationName.length > 120) return NextResponse.json({ error: "invalid_publication" }, { status: 400 });
  if (!websiteUrl || !domain) return NextResponse.json({ error: "invalid_website" }, { status: 400 });
  if (!plan) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  if (!consent) return NextResponse.json({ error: "consent_required" }, { status: 400 });

  const db = getWidgetDb();
  const ipHash = hashIp(getClientIp(request));
  const intent = plan === "enterprise" ? "sales" : "purchase";
  const consentText = locale === "de"
    ? "Anfrage für einen kostenpflichtigen Widget-Zugang und Zustimmung zur Kontaktaufnahme."
    : "Request for paid widget access and consent to be contacted.";

  try {
    if (ipHash) {
      const recent = await db.query<{ count: string }>(`
        select count(*)::text as count
        from widget_leads
        where ip_hash = $1 and created_at_utc > now() - interval '24 hours'
      `, [ipHash]);
      if (Number(recent.rows[0]?.count ?? 0) >= 3) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
    }

    await db.query(`
      insert into widget_leads (
        id, email, publication_name, website_url, domain, requested_plan, intent,
        locale, status, source, ip_hash, user_agent, consent_text
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'new', 'widgets-pricing', $9, $10, $11)
    `, [
      randomUUID(), email, publicationName, websiteUrl, domain, plan, intent, locale,
      ipHash, normalizeNullableText(request.headers.get("user-agent")), consentText
    ]);

    return NextResponse.json({ intent, ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Widget access request failed", error);
    return NextResponse.json({ error: "widget_request_unavailable" }, { status: 503 });
  }
}

function normalizePlan(value: unknown): WidgetAccessPlan | null {
  return value === "starter" || value === "growth" || value === "enterprise" ? value : null;
}

function normalizeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text || null;
}

function normalizeWebsiteUrl(value: unknown): string | null {
  const raw = normalizeText(value);
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function getClientIp(request: NextRequest): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("cf-connecting-ip")
    || null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.WIDGET_LEAD_IP_HASH_SALT ?? process.env.NEWSLETTER_IP_HASH_SALT ?? "ai-sports-widget-lead";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
