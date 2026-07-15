import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { WidgetType } from "@/lib/widget-data";
import { getWidgetDb } from "@/lib/widget-db";

export type WidgetAccessPlan = "starter" | "growth" | "enterprise";

export type WidgetAccessCustomer = {
  allowedTypes?: WidgetType[];
  domains?: string[];
  expiresAt?: string;
  key?: string;
  keyHash?: string;
  monthlyLimit?: number;
  name?: string;
  plan?: WidgetAccessPlan;
  status?: "active" | "past_due" | "canceled" | "inactive";
};

export type WidgetAccessGrant = {
  customerName: string;
  maxLimit: number;
  plan: WidgetAccessPlan;
};

export type WidgetAccessDecision =
  | { grant: WidgetAccessGrant; ok: true }
  | { code: "missing_key" | "invalid_key" | "inactive_subscription" | "domain_not_allowed" | "feature_not_allowed" | "limit_not_allowed"; message: string; ok: false; status: 401 | 402 | 403 };

const PLAN_RULES: Record<WidgetAccessPlan, { allowedTypes: WidgetType[]; maxLimit: number }> = {
  starter: {
    allowedTypes: ["prediction-card", "match-list", "win-probability"],
    maxLimit: 3
  },
  growth: {
    allowedTypes: ["prediction-card", "match-list", "win-probability", "key-factors"],
    maxLimit: 8
  },
  enterprise: {
    allowedTypes: ["prediction-card", "match-list", "win-probability", "key-factors"],
    maxLimit: 12
  }
};

export function verifyWidgetAccess(args: {
  limit: number;
  request: NextRequest;
  type: WidgetType;
}): Promise<WidgetAccessDecision> {
  return verifyWidgetAccessAsync(args);
}

async function verifyWidgetAccessAsync(args: {
  limit: number;
  request: NextRequest;
  type: WidgetType;
}): Promise<WidgetAccessDecision> {
  const key = readWidgetApiKey(args.request);
  if (!key) {
    return deny("missing_key", 401, "A paid widget API key is required.");
  }

  const customers = readWidgetCustomers();
  const customer = customers.find((row) => matchesCustomerKey(row, key)) ?? await findDatabaseCustomer(key);
  if (!customer) {
    return deny("invalid_key", 401, "The widget API key is invalid.");
  }

  if (!isPaidCustomer(customer)) {
    return deny("inactive_subscription", 402, "The widget subscription is not active.");
  }

  if (!isDomainAllowed(customer, readPublisherOrigin(args.request))) {
    return deny("domain_not_allowed", 403, "This domain is not allowed for the widget API key.");
  }

  const plan = customer.plan ?? "starter";
  const planRules = PLAN_RULES[plan] ?? PLAN_RULES.starter;
  const allowedTypes = customer.allowedTypes?.length ? customer.allowedTypes : planRules.allowedTypes;
  if (!allowedTypes.includes(args.type)) {
    return deny("feature_not_allowed", 403, "This widget type is not included in the current plan.");
  }

  const maxLimit = planRules.maxLimit;
  if (args.limit > maxLimit) {
    return deny("limit_not_allowed", 403, "The requested widget limit is not included in the current plan.");
  }

  return {
    grant: {
      customerName: customer.name ?? "Publisher",
      maxLimit,
      plan
    },
    ok: true
  };
}

export function getWidgetAccessHeaders(grant: WidgetAccessGrant): Record<string, string> {
  return {
    "x-ai-sports-widget-plan": grant.plan,
    "x-ai-sports-widget-customer": grant.customerName
  };
}

function deny(code: WidgetAccessDecision extends infer Decision ? Decision extends { ok: false; code: infer Code } ? Code : never : never, status: 401 | 402 | 403, message: string): WidgetAccessDecision {
  return { code, message, ok: false, status };
}

function readWidgetApiKey(request: NextRequest): string {
  const headerKey = request.headers.get("x-ai-sports-widget-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return [
    headerKey,
    request.nextUrl.searchParams.get("apiKey"),
    request.nextUrl.searchParams.get("publisherKey"),
    request.nextUrl.searchParams.get("key")
  ].find((value) => Boolean(value?.trim()))?.trim() ?? "";
}

function readWidgetCustomers(): WidgetAccessCustomer[] {
  const raw = process.env.WIDGET_ACCESS_KEYS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isWidgetCustomer) : [];
  } catch (_error) {
    return [];
  }
}

async function findDatabaseCustomer(key: string): Promise<WidgetAccessCustomer | null> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return null;
  }

  const keyHash = createHash("sha256").update(key).digest("hex");

  try {
    const result = await getWidgetDb().query<{
      api_key_hash: string;
      domain: string;
      email: string;
      monthly_limit: number;
      plan: WidgetAccessPlan;
      publication_name: string;
      status: WidgetAccessCustomer["status"];
      access_expires_at_utc: Date | null;
    }>(`
      select api_key_hash, domain, email, monthly_limit, plan, publication_name, status, access_expires_at_utc
      from widget_customers
      where api_key_hash = $1
      limit 1
    `, [keyHash]);
    const row = result.rows[0];
    if (!row) return null;

    return {
      domains: [row.domain],
      expiresAt: row.access_expires_at_utc?.toISOString(),
      keyHash: row.api_key_hash,
      monthlyLimit: row.monthly_limit,
      name: row.publication_name || row.email,
      plan: row.plan,
      status: row.status
    };
  } catch (error) {
    console.error("Widget customer lookup failed", error);
    return null;
  }
}

function isWidgetCustomer(value: unknown): value is WidgetAccessCustomer {
  if (!value || typeof value !== "object") return false;
  const row = value as WidgetAccessCustomer;
  return typeof row.key === "string" || typeof row.keyHash === "string";
}

function matchesCustomerKey(customer: WidgetAccessCustomer, key: string): boolean {
  if (customer.key && secureCompare(customer.key, key)) return true;
  if (!customer.keyHash) return false;

  const expected = customer.keyHash.replace(/^sha256:/i, "");
  const actual = createHash("sha256").update(key).digest("hex");
  return secureCompare(expected, actual);
}

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isPaidCustomer(customer: WidgetAccessCustomer): boolean {
  if (customer.status !== "active") return false;
  if (!customer.expiresAt) return true;
  return new Date(customer.expiresAt).getTime() > Date.now();
}

function readPublisherOrigin(request: NextRequest): string {
  const sourceOrigin = request.nextUrl.searchParams.get("sourceOrigin") ?? request.nextUrl.searchParams.get("origin");
  if (sourceOrigin) return sourceOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return "";

  try {
    return new URL(referer).origin;
  } catch (_error) {
    return "";
  }
}

function isDomainAllowed(customer: WidgetAccessCustomer, origin: string): boolean {
  if (!customer.domains?.length) return true;
  if (!origin) return false;

  let hostname = "";
  try {
    hostname = new URL(origin).hostname.toLowerCase();
  } catch (_error) {
    hostname = origin.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
  }

  return customer.domains.some((domain) => {
    const normalized = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
    const normalizedHost = hostname.replace(/^www\./, "");
    return normalizedHost === normalized || normalizedHost.endsWith("." + normalized);
  });
}
