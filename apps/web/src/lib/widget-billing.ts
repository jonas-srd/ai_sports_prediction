import { createHmac, timingSafeEqual } from "node:crypto";
import type { WidgetAccessPlan } from "@/lib/widget-access";
import { WIDGET_DPA_VERSION, WIDGET_TERMS_VERSION } from "@/lib/widget-legal-versions";
import { getWidgetSellerDetails, isWidgetDirectSalesLegallyConfigured } from "@/lib/widget-sales-config";

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

const EU_VAT_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
  "GR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK"
]);

export function parseWidgetBillingInterval(value: unknown): WidgetBillingInterval {
  return value === "annual" ? "annual" : "monthly";
}

export function getWidgetStripePriceId(plan: Exclude<WidgetAccessPlan, "enterprise">, interval: WidgetBillingInterval): string | null {
  return process.env[priceEnvByPlan[plan][interval]]?.trim() || null;
}

export function isWidgetCheckoutConfigured(plan: Exclude<WidgetAccessPlan, "enterprise">, interval: WidgetBillingInterval): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim()
    && getWidgetStripePriceId(plan, interval)
    && isWidgetDirectSalesLegallyConfigured()
  );
}

export function getMinimumTermEnd(from = new Date()): Date {
  const result = new Date(from);
  result.setUTCFullYear(result.getUTCFullYear() + 1);
  return result;
}

export async function createWidgetStripeCustomer(input: StripeCustomerInput): Promise<string> {
  const taxMode = getWidgetSellerDetails().taxMode;
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
    "invoice_settings[custom_fields][0][name]": "Publisher domain",
    "invoice_settings[custom_fields][0][value]": input.domain,
    "metadata[lead_id]": input.leadId,
    "metadata[access_email]": input.accessEmail,
    "metadata[contact_name]": input.contactName,
    "metadata[domain]": input.domain
  });
  if (taxMode === "standard") params.set("tax[validate_location]", "immediately");
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
  if (EU_VAT_COUNTRIES.has(normalized)) return "eu_vat";
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
  const taxMode = getWidgetSellerDetails().taxMode;
  if (!taxMode) throw new Error("widget_tax_mode_missing");
  await assertWidgetStripePrice(priceId, input.plan, input.billingInterval, taxMode);
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
    "automatic_tax[enabled]": taxMode === "standard" ? "true" : "false",
    "custom_text[submit][message]": contractText,
    "metadata[lead_id]": input.leadId,
    "metadata[plan]": input.plan,
    "metadata[billing_interval]": input.billingInterval,
    "metadata[domain]": input.domain,
    "metadata[publication_name]": input.publicationName,
    "metadata[locale]": input.locale,
    "metadata[business_customer]": "true",
    "metadata[widget_terms_version]": WIDGET_TERMS_VERSION,
    "metadata[dpa_version]": WIDGET_DPA_VERSION,
    "metadata[tax_mode]": taxMode,
    "metadata[minimum_term_ends_at]": minimumTermEnd.toISOString(),
    "subscription_data[metadata][lead_id]": input.leadId,
    "subscription_data[metadata][plan]": input.plan,
    "subscription_data[metadata][billing_interval]": input.billingInterval,
    "subscription_data[metadata][domain]": input.domain,
    "subscription_data[metadata][publication_name]": input.publicationName,
    "subscription_data[metadata][locale]": input.locale,
    "subscription_data[metadata][business_customer]": "true",
    "subscription_data[metadata][widget_terms_version]": WIDGET_TERMS_VERSION,
    "subscription_data[metadata][dpa_version]": WIDGET_DPA_VERSION,
    "subscription_data[metadata][tax_mode]": taxMode,
    "subscription_data[metadata][minimum_term_ends_at]": minimumTermEnd.toISOString()
  });
  const session = await widgetStripeRequest<{ id?: string; url?: string }>("/v1/checkout/sessions", params);
  if (!session.id || !session.url) throw new Error("widget_checkout_session_invalid");
  return { id: session.id, url: session.url };
}

async function assertWidgetStripePrice(
  priceId: string,
  plan: Exclude<WidgetAccessPlan, "enterprise">,
  billingInterval: WidgetBillingInterval,
  taxMode: "small_business" | "standard"
): Promise<void> {
  const price = await widgetStripeRequest<{
    active?: boolean;
    currency?: string;
    recurring?: { interval?: string; interval_count?: number };
    tax_behavior?: string;
    unit_amount?: number;
  }>(`/v1/prices/${encodeURIComponent(priceId)}`, undefined, "GET");
  const expectedAmount = plan === "starter"
    ? (billingInterval === "annual" ? 53_900 : 4_900)
    : (billingInterval === "annual" ? 163_900 : 14_900);
  const expectedInterval = billingInterval === "annual" ? "year" : "month";
  if (
    price.active !== true
    || price.currency?.toLowerCase() !== "eur"
    || price.unit_amount !== expectedAmount
    || price.recurring?.interval !== expectedInterval
    || Number(price.recurring.interval_count ?? 1) !== 1
  ) {
    throw new Error("widget_checkout_price_configuration_mismatch");
  }
  if (taxMode === "standard" && price.tax_behavior !== "exclusive") {
    throw new Error("widget_checkout_price_tax_behavior_must_be_exclusive");
  }
}

export function requiresEuVatId(country: string): boolean {
  const normalized = country.trim().toUpperCase();
  return EU_VAT_COUNTRIES.has(normalized) && normalized !== "DE";
}

export async function validateEuVatId(value: string, billingCountry: string): Promise<boolean> {
  const normalized = value.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const selectedCountry = billingCountry.trim().toUpperCase();
  const expectedPrefix = selectedCountry === "GR" ? "EL" : selectedCountry;
  const suppliedPrefix = normalized.slice(0, 2);
  if (!EU_VAT_COUNTRIES.has(selectedCountry) || suppliedPrefix !== expectedPrefix || normalized.length < 4) {
    return false;
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body><urn:checkVat><urn:countryCode>${expectedPrefix}</urn:countryCode><urn:vatNumber>${normalized.slice(2)}</urn:vatNumber></urn:checkVat></soap:Body>
</soap:Envelope>`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
      body,
      headers: { "content-type": "text/xml; charset=utf-8", soapaction: "" },
      method: "POST",
      signal: controller.signal
    });
    const xml = await response.text();
    if (!response.ok || /<(?:\w+:)?Fault\b/i.test(xml)) {
      throw new Error(`vies_unavailable_${response.status}`);
    }
    return /<(?:\w+:)?valid>\s*true\s*<\/(?:\w+:)?valid>/i.test(xml);
  } finally {
    clearTimeout(timeout);
  }
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

export async function updateWidgetStripeCancellation(
  subscriptionId: string,
  cancellationAt: Date | null
) {
  const params = new URLSearchParams();
  if (!cancellationAt) {
    params.set("cancel_at_period_end", "false");
    params.set("cancel_at", "");
  } else if (cancellationAt.getTime() > Date.now()) {
    params.set("cancel_at_period_end", "false");
    params.set("cancel_at", String(Math.floor(cancellationAt.getTime() / 1000)));
  } else {
    params.set("cancel_at_period_end", "true");
  }
  return widgetStripeRequest<Record<string, unknown>>(
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    params
  );
}

export async function updateWidgetStripeScheduleCancellation(input: {
  cancellationAt: Date | null;
  plan: Exclude<WidgetAccessPlan, "enterprise">;
  scheduleId: string | null;
}): Promise<boolean> {
  if (!input.scheduleId) return false;
  const schedule = await widgetStripeRequest<{
    phases?: Array<{
      end_date?: number;
      items?: Array<{ price?: string | { id?: string }; quantity?: number }>;
      start_date?: number;
    }>;
    status?: string;
  }>(`/v1/subscription_schedules/${encodeURIComponent(input.scheduleId)}`, undefined, "GET");
  if (schedule.status !== "active" || !schedule.phases?.length) return false;

  const phases = schedule.phases
    .map((phase) => ({
      end: Number(phase.end_date),
      price: getStripeObjectId(phase.items?.[0]?.price),
      quantity: Number(phase.items?.[0]?.quantity ?? 1),
      start: Number(phase.start_date)
    }))
    .filter((phase) => phase.start > 0 && phase.end > phase.start && phase.price);
  if (!phases.length) return false;

  const params = new URLSearchParams({
    end_behavior: input.cancellationAt ? "cancel" : "release",
    proration_behavior: "none"
  });
  let effectivePhases = phases;
  if (input.cancellationAt) {
    const cancellationSeconds = Math.floor(input.cancellationAt.getTime() / 1000);
    effectivePhases = phases
      .filter((phase) => phase.start < cancellationSeconds)
      .map((phase) => ({ ...phase, end: Math.min(phase.end, cancellationSeconds) }))
      .filter((phase) => phase.end > phase.start);
  } else if (phases.length === 1) {
    const monthlyPrice = getWidgetStripePriceId(input.plan, "monthly");
    if (!monthlyPrice) throw new Error("widget_monthly_price_missing_for_schedule_resume");
    effectivePhases = [
      phases[0],
      {
        end: phases[0].end + 31 * 24 * 60 * 60,
        price: monthlyPrice,
        quantity: 1,
        start: phases[0].end
      }
    ];
  }
  if (!effectivePhases.length) return false;

  effectivePhases.forEach((phase, index) => {
    params.set(`phases[${index}][start_date]`, String(phase.start));
    if (index === 1 && !input.cancellationAt) {
      params.set(`phases[${index}][duration][interval]`, "month");
      params.set(`phases[${index}][duration][interval_count]`, "1");
    } else {
      params.set(`phases[${index}][end_date]`, String(phase.end));
    }
    params.set(`phases[${index}][items][0][price]`, phase.price!);
    params.set(`phases[${index}][items][0][quantity]`, String(phase.quantity));
    params.set(`phases[${index}][proration_behavior]`, "none");
  });
  await widgetStripeRequest(`/v1/subscription_schedules/${encodeURIComponent(input.scheduleId)}`, params);
  return true;
}

export async function createWidgetBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const params = new URLSearchParams({ customer: customerId, return_url: returnUrl });
  const configuration = process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID?.trim();
  if (configuration) params.set("configuration", configuration);
  const session = await widgetStripeRequest<{ url?: string }>("/v1/billing_portal/sessions", params);
  if (!session.url) throw new Error("widget_customer_portal_session_invalid");
  return session.url;
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
