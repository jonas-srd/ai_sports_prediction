import { createHmac, timingSafeEqual } from "node:crypto";
import type { WidgetAccessPlan } from "@/lib/widget-access";

export type WidgetBillingInterval = "monthly" | "annual";

type CheckoutInput = {
  billingInterval: WidgetBillingInterval;
  customerId: string;
  domain: string;
  leadId: string;
  locale: "de" | "en";
  origin: string;
  plan: Exclude<WidgetAccessPlan, "enterprise">;
  publicationName: string;
};

type StripeCustomerInput = {
  accessEmail: string;
  addressLine1: string;
  addressLine2: string | null;
  billingEmail: string;
  city: string;
  contactName: string;
  country: string;
  domain: string;
  leadId: string;
  legalCompanyName: string;
  locale: "de" | "en";
  phone: string | null;
  postalCode: string;
  state: string;
  taxId: string | null;
};

const priceEnvByPlan: Record<Exclude<WidgetAccessPlan, "enterprise">, Record<WidgetBillingInterval, string>> = {
  starter: {
    monthly: "STRIPE_PRICE_STARTER_MONTHLY",
    annual: "STRIPE_PRICE_STARTER_ANNUAL"
  },
  growth: {
    monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
    annual: "STRIPE_PRICE_GROWTH_ANNUAL"
  }
};

export function parseWidgetBillingInterval(value: unknown): WidgetBillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function getWidgetStripePriceId(plan: Exclude<WidgetAccessPlan, "enterprise">, interval: WidgetBillingInterval): string | null {
  return process.env[priceEnvByPlan[plan][interval]]?.trim() || null;
}

export function isWidgetCheckoutConfigured(plan: Exclude<WidgetAccessPlan, "enterprise">, interval: WidgetBillingInterval): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && getWidgetStripePriceId(plan, interval));
}

export function getMinimumTermEnd(from = new Date()): Date {
  const result = new Date(from);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result;
}

export async function createWidgetStripeCustomer(input: StripeCustomerInput): Promise<string> {
  const params = new URLSearchParams({
    name: input.legalCompanyName,
    email: input.billingEmail,
    description: `${input.legalCompanyName} · AI Sports Prediction widgets`,
    "address[line1]": input.addressLine1,
    "address[city]": input.city,
    "address[postal_code]": input.postalCode,
    "address[state]": input.state,
    "address[country]": input.country,
    "preferred_locales[0]": input.locale,
    "tax[validate_location]": "immediately",
    "invoice_settings[custom_fields][0][name]": "Publisher domain",
    "invoice_settings[custom_fields][0][value]": input.domain,
    "metadata[lead_id]": input.leadId,
    "metadata[access_email]": input.accessEmail,
    "metadata[contact_name]": input.contactName,
    "metadata[domain]": input.domain
  });
  if (input.phone) params.set("phone", input.phone);
  if (input.addressLine2) params.set("address[line2]", input.addressLine2);
  if (input.taxId) {
    const taxIdType = getStripeTaxIdType(input.country);
    if (!taxIdType) throw new Error("widget_tax_id_country_not_supported");
    params.set("tax_id_data[0][type]", taxIdType);
    params.set("tax_id_data[0][value]", input.taxId);
  }

  const customer = await widgetStripeRequest<{ id?: string }>("/v1/customers", params);
  if (!customer.id) throw new Error("widget_stripe_customer_invalid");
  return customer.id;
}

export function getStripeTaxIdType(country: string): string | null {
  const normalized = country.trim().toUpperCase();
  const euCountries = new Set(["AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]);
  if (euCountries.has(normalized)) return "eu_vat";
  return ({
    AE: "ae_trn", AR: "ar_cuit", AU: "au_abn", BR: "br_cnpj", CA: "ca_bn",
    CH: "ch_vat", CL: "cl_tin", CO: "co_nit", GB: "gb_vat", IL: "il_vat",
    IN: "in_gst", IS: "is_vat", JP: "jp_cn", KR: "kr_brn", LI: "li_vat",
    MX: "mx_rfc", NO: "no_vat", NZ: "nz_gst", SG: "sg_gst", TR: "tr_tin",
    UA: "ua_vat", US: "us_ein", ZA: "za_vat"
  } as Record<string, string>)[normalized] ?? null;
}

export async function createWidgetCheckoutSession(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const priceId = getWidgetStripePriceId(input.plan, input.billingInterval);
  if (!priceId) throw new Error("widget_checkout_price_missing");

  const minimumTermEnd = getMinimumTermEnd();
  const contractText = input.locale === "de"
    ? "12 Monate Mindestlaufzeit. Danach verlängert sich der Vertrag automatisch um jeweils einen Monat und ist monatlich kündbar."
    : "12-month minimum term. Afterwards, the contract renews automatically one month at a time and can be cancelled monthly.";
  const checkoutPath = input.locale === "de" ? "/de/widgets/checkout" : "/widgets/checkout";
  const returnQuery = `plan=${input.plan}&billing=${input.billingInterval}`;
  const params = new URLSearchParams({
    mode: "subscription",
    locale: input.locale,
    customer: input.customerId,
    client_reference_id: input.leadId,
    success_url: `${input.origin}${checkoutPath}?${returnQuery}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}${checkoutPath}?${returnQuery}&checkout=canceled`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "payment_method_types[0]": "sepa_debit",
    billing_address_collection: "required",
    "customer_update[address]": "auto",
    "customer_update[name]": "auto",
    "tax_id_collection[enabled]": "true",
    "automatic_tax[enabled]": "true",
    "custom_text[submit][message]": contractText,
    "metadata[lead_id]": input.leadId,
    "metadata[plan]": input.plan,
    "metadata[billing_interval]": input.billingInterval,
    "metadata[domain]": input.domain,
    "metadata[publication_name]": input.publicationName,
    "metadata[locale]": input.locale,
    "metadata[business_customer]": "true",
    "metadata[minimum_term_ends_at]": minimumTermEnd.toISOString(),
    "subscription_data[metadata][lead_id]": input.leadId,
    "subscription_data[metadata][plan]": input.plan,
    "subscription_data[metadata][billing_interval]": input.billingInterval,
    "subscription_data[metadata][domain]": input.domain,
    "subscription_data[metadata][publication_name]": input.publicationName,
    "subscription_data[metadata][locale]": input.locale,
    "subscription_data[metadata][business_customer]": "true",
    "subscription_data[metadata][minimum_term_ends_at]": minimumTermEnd.toISOString()
  });
  const session = await widgetStripeRequest<{ id?: string; url?: string }>("/v1/checkout/sessions", params);
  if (!session.id || !session.url) throw new Error("widget_checkout_session_invalid");
  return { id: session.id, url: session.url };
}

export async function configureAnnualToMonthlySchedule(subscriptionId: string, plan: Exclude<WidgetAccessPlan, "enterprise">): Promise<string | null> {
  const annualPrice = getWidgetStripePriceId(plan, "annual");
  const monthlyPrice = getWidgetStripePriceId(plan, "monthly");
  if (!annualPrice || !monthlyPrice) return null;

  const subscription = await retrieveWidgetStripeSubscription(subscriptionId);
  const existingScheduleId = getStripeObjectId(subscription.schedule);
  if (existingScheduleId) return existingScheduleId;

  const schedule = await widgetStripeRequest<{
    id?: string;
    phases?: Array<{ end_date?: number; start_date?: number }>;
  }>("/v1/subscription_schedules", new URLSearchParams({ from_subscription: subscriptionId }));
  const currentPhase = schedule.phases?.[0];
  if (!schedule.id || !currentPhase?.start_date || !currentPhase.end_date) return schedule.id ?? null;

  await widgetStripeRequest(`/v1/subscription_schedules/${encodeURIComponent(schedule.id)}`, new URLSearchParams({
    end_behavior: "release",
    proration_behavior: "none",
    "phases[0][start_date]": String(currentPhase.start_date),
    "phases[0][end_date]": String(currentPhase.end_date),
    "phases[0][items][0][price]": annualPrice,
    "phases[0][items][0][quantity]": "1",
    "phases[0][proration_behavior]": "none",
    "phases[1][start_date]": String(currentPhase.end_date),
    "phases[1][duration][interval]": "month",
    "phases[1][duration][interval_count]": "1",
    "phases[1][items][0][price]": monthlyPrice,
    "phases[1][items][0][quantity]": "1",
    "phases[1][proration_behavior]": "none",
    "phases[1][metadata][renewal_mode]": "monthly_after_minimum_term"
  }));
  return schedule.id;
}

function getStripeObjectId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") return (value as { id: string }).id;
  return null;
}

export async function retrieveWidgetStripeSubscription(subscriptionId: string) {
  return widgetStripeRequest<{
    customer?: string;
    id?: string;
    metadata?: Record<string, string>;
    schedule?: string | { id?: string } | null;
    status?: string;
  }>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, undefined, "GET");
}

export function verifyWidgetStripeWebhook(payload: string, signatureHeader: string | null, toleranceSeconds = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter(Boolean);
  if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const candidate = Buffer.from(signature, "hex");
    return candidate.length === expectedBuffer.length && timingSafeEqual(candidate, expectedBuffer);
  });
}

async function widgetStripeRequest<T = Record<string, unknown>>(path: string, body?: URLSearchParams, method = "POST"): Promise<T> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("widget_checkout_not_configured");

  const response = await fetch(`https://api.stripe.com${path}`, {
    body: method === "GET" ? undefined : body,
    headers: {
      authorization: `Bearer ${secretKey}`,
      ...(method === "GET" ? {} : { "content-type": "application/x-www-form-urlencoded" })
    },
    method,
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({})) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || `stripe_request_failed_${response.status}`);
  return result;
}
