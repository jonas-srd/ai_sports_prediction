import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getWidgetDb } from "@/lib/widget-db";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import {
  createWidgetCheckoutSession,
  createWidgetStripeCustomer,
  getMinimumTermEnd,
  isWidgetCheckoutConfigured,
  parseWidgetBillingInterval
} from "@/lib/widget-billing";

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
  const billingInterval = parseWidgetBillingInterval(body.billingInterval);
  const contactFirstName = normalizeText(body.contactFirstName);
  const contactLastName = normalizeText(body.contactLastName);
  const phone = normalizeText(body.phone);
  const legalCompanyName = normalizeText(body.legalCompanyName);
  const billingEmail = normalizeText(body.billingEmail).toLowerCase();
  const addressLine1 = normalizeText(body.addressLine1);
  const addressLine2 = normalizeText(body.addressLine2);
  const postalCode = normalizeText(body.postalCode);
  const city = normalizeText(body.city);
  const state = normalizeText(body.state);
  const country = normalizeText(body.country).toUpperCase();
  const taxId = normalizeText(body.taxId).toUpperCase().replace(/\s+/g, "");
  const businessCustomerAccepted = body.businessCustomerAccepted === true;
  const consent = body.consent === true;
  const contractAccepted = body.contractAccepted === true;
  const locale = body.locale === "de" ? "de" : "en";

  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (publicationName.length < 2 || publicationName.length > 120) return NextResponse.json({ error: "invalid_publication" }, { status: 400 });
  if (!websiteUrl || !domain) return NextResponse.json({ error: "invalid_website" }, { status: 400 });
  if (!plan) return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  if (contactFirstName.length < 2 || contactFirstName.length > 80) return NextResponse.json({ error: "invalid_first_name" }, { status: 400 });
  if (contactLastName.length < 2 || contactLastName.length > 80) return NextResponse.json({ error: "invalid_last_name" }, { status: 400 });
  if (phone.length > 40) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  if (legalCompanyName.length < 2 || legalCompanyName.length > 160) return NextResponse.json({ error: "invalid_legal_company" }, { status: 400 });
  if (!EMAIL_PATTERN.test(billingEmail)) return NextResponse.json({ error: "invalid_billing_email" }, { status: 400 });
  if (addressLine1.length < 3 || addressLine1.length > 160) return NextResponse.json({ error: "invalid_billing_address" }, { status: 400 });
  if (addressLine2.length > 160) return NextResponse.json({ error: "invalid_billing_address_addition" }, { status: 400 });
  if (postalCode.length < 2 || postalCode.length > 24) return NextResponse.json({ error: "invalid_postal_code" }, { status: 400 });
  if (city.length < 2 || city.length > 100) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  if (state.length < 2 || state.length > 100) return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "invalid_country" }, { status: 400 });
  if (taxId.length > 40) return NextResponse.json({ error: "invalid_tax_id" }, { status: 400 });
  if (!consent) return NextResponse.json({ error: "consent_required" }, { status: 400 });
  if (!businessCustomerAccepted) return NextResponse.json({ error: "business_customer_required" }, { status: 400 });
  if (plan !== "enterprise" && !contractAccepted) return NextResponse.json({ error: "contract_terms_required" }, { status: 400 });

  const db = getWidgetDb();
  const ipHash = hashIp(getClientIp(request));
  const intent = plan === "enterprise" ? "sales" : "purchase";
  const leadId = randomUUID();
  const minimumTermEnd = plan === "enterprise" ? null : getMinimumTermEnd();
  const consentText = locale === "de"
    ? "Hinweis zur Verarbeitung der Bestelldaten zur Kenntnis genommen. Direktkauf ausschließlich als Unternehmer im Sinne des § 14 BGB: 12 Monate Mindestlaufzeit, danach automatische monatliche Verlängerung mit monatlicher Kündigungsmöglichkeit."
    : "Order-data processing notice acknowledged. Direct purchase for business customers only within the meaning of section 14 BGB: 12-month minimum term, followed by automatic monthly renewal with monthly cancellation.";

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
        locale, status, source, ip_hash, user_agent, consent_text, billing_interval,
        minimum_term_ends_at_utc, contact_first_name, contact_last_name, phone,
        legal_company_name, billing_email, billing_address_line1, billing_address_line2,
        billing_postal_code, billing_city, billing_state, billing_country, billing_tax_id
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, 'new', 'widgets-pricing', $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
    `, [
      leadId, email, publicationName, websiteUrl, domain, plan, intent, locale,
      ipHash, normalizeNullableText(request.headers.get("user-agent")), consentText,
      plan === "enterprise" ? null : billingInterval, minimumTermEnd,
      contactFirstName, contactLastName, normalizeNullableText(phone), legalCompanyName,
      billingEmail, addressLine1, normalizeNullableText(addressLine2), postalCode, city,
      state, country, normalizeNullableText(taxId)
    ]);

    if (plan === "enterprise") {
      return NextResponse.json({ intent, ok: true }, { headers: { "cache-control": "no-store" } });
    }

    if (!isWidgetCheckoutConfigured(plan, billingInterval)) {
      return NextResponse.json({ checkoutAvailable: false, intent, ok: true }, { headers: { "cache-control": "no-store" } });
    }

    const configuredOrigin = process.env.WIDGET_CHECKOUT_ORIGIN?.trim();
    const origin = configuredOrigin && /^https?:\/\//i.test(configuredOrigin) ? new URL(configuredOrigin).origin : request.nextUrl.origin;
    const stripeCustomerId = await createWidgetStripeCustomer({
      accessEmail: email,
      addressLine1,
      addressLine2: normalizeNullableText(addressLine2),
      billingEmail,
      city,
      contactName: `${contactFirstName} ${contactLastName}`,
      country,
      domain,
      leadId,
      legalCompanyName,
      locale,
      phone: normalizeNullableText(phone),
      postalCode,
      state,
      taxId: normalizeNullableText(taxId)
    });
    await db.query(`
      update widget_leads
      set stripe_customer_id = $2, updated_at_utc = now()
      where id = $1
    `, [leadId, stripeCustomerId]);

    const checkout = await createWidgetCheckoutSession({
      billingInterval,
      customerId: stripeCustomerId,
      domain,
      leadId,
      locale,
      origin,
      plan,
      publicationName
    });
    await db.query(`
      update widget_leads
      set stripe_checkout_session_id = $2, updated_at_utc = now()
      where id = $1
    `, [leadId, checkout.id]);

    return NextResponse.json({ checkoutAvailable: true, checkoutUrl: checkout.url, intent, ok: true }, { headers: { "cache-control": "no-store" } });
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
