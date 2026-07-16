import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const WIDGET_CUSTOMER_SESSION_COOKIE = "ai_sports_widget_customer_session";

type CustomerSessionPayload = {
  customerId: string;
  email: string;
  exp: number;
  iat: number;
  version: 1;
};

export function getWidgetCustomerSessionSecret(): string | null {
  const secret = process.env.WIDGET_CUSTOMER_SESSION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

export function getWidgetCustomerSessionTtlSeconds(): number {
  const hours = Number(process.env.WIDGET_CUSTOMER_SESSION_TTL_HOURS ?? 720);
  return Math.round(Math.min(Math.max(Number.isFinite(hours) ? hours : 720, 1), 24 * 90) * 3600);
}

export function createWidgetCustomerSession(
  customerId: string,
  email: string,
  secret: string,
  now = Math.floor(Date.now() / 1000)
): string {
  const payload: CustomerSessionPayload = {
    customerId,
    email: email.trim().toLowerCase(),
    exp: now + getWidgetCustomerSessionTtlSeconds(),
    iat: now,
    version: 1
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readWidgetCustomerSession(
  request: NextRequest
): CustomerSessionPayload | null {
  const secret = getWidgetCustomerSessionSecret();
  const token = request.cookies.get(WIDGET_CUSTOMER_SESSION_COOKIE)?.value;
  if (!secret || !token) return null;
  try {
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra || !safeEqual(signature, sign(encoded, secret))) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CustomerSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (
      payload.version !== 1
      || !payload.customerId
      || !payload.email
      || payload.exp <= now
      || payload.iat > now + 30
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
