import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import type { WidgetType } from "@/lib/widget-data";
import { getWidgetDb } from "@/lib/widget-db";

export type WidgetAccessPlan = "starter" | "growth" | "enterprise";

export type WidgetAccessCustomer = {
  apiKeyEnabled?: boolean;
  allowedTypes?: WidgetType[];
  customerId?: string;
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
  monthlyLimit: number | null;
  plan: WidgetAccessPlan;
  remainingRequests: number | null;
  usedRequests: number | null;
};

export type WidgetAccessDecision =
  | { grant: WidgetAccessGrant; ok: true }
  | { code: "missing_key" | "invalid_key" | "inactive_subscription" | "domain_not_allowed" | "feature_not_allowed" | "limit_not_allowed" | "monthly_limit_reached"; message: string; ok: false; status: 401 | 402 | 403 | 429 };

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
  endpoint: "matches" | "predictions";
  limit: number;
  request: NextRequest;
  type: WidgetType;
}): Promise<WidgetAccessDecision> {
  return verifyWidgetAccessAsync(args);
}

async function verifyWidgetAccessAsync(args: {
  endpoint: "matches" | "predictions";
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
  if (customer.apiKeyEnabled === false) {
    return deny("invalid_key", 401, "The widget API key has been disabled.");
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

  const usage = customer.customerId && customer.monthlyLimit
    ? await consumeDatabaseWidgetUsage({
      customerId: customer.customerId,
      endpoint: args.endpoint,
      monthlyLimit: customer.monthlyLimit,
      type: args.type
    })
    : null;
  if (usage && !usage.allowed) {
    return deny("monthly_limit_reached", 429, "The monthly widget request limit has been reached.");
  }

  return {
    grant: {
      customerName: customer.name ?? "Publisher",
      maxLimit,
      monthlyLimit: customer.monthlyLimit ?? null,
      plan,
      remainingRequests: usage ? Math.max(usage.limit - usage.used, 0) : null,
      usedRequests: usage?.used ?? null
    },
    ok: true
  };
}

export function getWidgetAccessHeaders(grant: WidgetAccessGrant): Record<string, string> {
  return {
    "x-ai-sports-widget-plan": grant.plan,
    "x-ai-sports-widget-customer": grant.customerName,
    ...(grant.monthlyLimit === null ? {} : { "x-ai-sports-widget-monthly-limit": String(grant.monthlyLimit) }),
    ...(grant.usedRequests === null ? {} : { "x-ai-sports-widget-monthly-used": String(grant.usedRequests) }),
    ...(grant.remainingRequests === null ? {} : { "x-ai-sports-widget-monthly-remaining": String(grant.remainingRequests) })
  };
}

function deny(code: WidgetAccessDecision extends infer Decision ? Decision extends { ok: false; code: infer Code } ? Code : never : never, status: 401 | 402 | 403 | 429, message: string): WidgetAccessDecision {
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
      api_key_enabled: boolean;
      api_key_hash: string;
      domain: string;
      email: string;
      id: string;
      monthly_limit: number;
      plan: WidgetAccessPlan;
      publication_name: string;
      status: WidgetAccessCustomer["status"];
      access_expires_at_utc: Date | null;
    }>(`
      select id, api_key_hash, api_key_enabled, domain, email, monthly_limit, plan,
             publication_name, status, access_expires_at_utc
      from widget_customers
      where api_key_hash = $1
      limit 1
    `, [keyHash]);
    const row = result.rows[0];
    if (!row) return null;

    const domainResult = await getWidgetDb().query<{ domain: string }>(`
      select domain from widget_customer_domains where customer_id = $1 order by is_primary desc, created_at_utc
    `, [row.id]);

    return {
      apiKeyEnabled: row.api_key_enabled,
      customerId: row.id,
      domains: domainResult.rows.length ? domainResult.rows.map((entry) => entry.domain) : [row.domain],
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

async function consumeDatabaseWidgetUsage(input: {
  customerId: string;
  endpoint: "matches" | "predictions";
  monthlyLimit: number;
  type: WidgetType;
}): Promise<{ allowed: boolean; limit: number; used: number }> {
  const db = getWidgetDb();
  const result = await db.query<{ request_count: string }>(`
    insert into widget_usage_monthly (customer_id, month_start, request_count, last_request_at_utc)
    values ($1, date_trunc('month', now())::date, 1, now())
    on conflict (customer_id, month_start) do update set
      request_count = widget_usage_monthly.request_count + 1,
      last_request_at_utc = now()
    where widget_usage_monthly.request_count < $2
    returning request_count::text
  `, [input.customerId, input.monthlyLimit]);
  const row = result.rows[0];
  if (!row) {
    return { allowed: false, limit: input.monthlyLimit, used: input.monthlyLimit };
  }

  await db.query(`
    insert into widget_usage_daily (customer_id, usage_date, endpoint, widget_type, request_count)
    values ($1, current_date, $2, $3, 1)
    on conflict (customer_id, usage_date, endpoint, widget_type) do update set
      request_count = widget_usage_daily.request_count + 1
  `, [input.customerId, input.endpoint, input.type]);
  return {
    allowed: true,
    limit: input.monthlyLimit,
    used: Number(row.request_count)
  };
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
