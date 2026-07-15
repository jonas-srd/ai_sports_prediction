import { NextResponse, type NextRequest } from "next/server";
import {
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  recordAdminLoginFailure
} from "@/lib/admin-login-rate-limit";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminSessionSecret,
  getAdminSessionTtlSeconds,
  getAllowedAdminEmails,
  isSafeAdminRedirect
} from "@/lib/admin-session";
import {
  getAdminTotpSecrets,
  getTotpSecretOrDummy,
  verifyAdminTotp
} from "@/lib/admin-totp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null) as {
    code?: unknown;
    email?: unknown;
    next?: unknown;
  } | null;
  const email = String(payload?.email ?? "").trim().toLowerCase();
  const code = String(payload?.code ?? "").replace(/\s/g, "");
  const nextValue = typeof payload?.next === "string" ? payload.next : null;
  if (!email || !/^\d{6}$/.test(code)) {
    return json({ error: "invalid_login", message: "E-Mail-Adresse oder Authenticator-Code ist nicht gültig." }, 400);
  }

  const allowedEmails = getAllowedAdminEmails();
  const totpSecrets = getAdminTotpSecrets();
  const sessionSecret = getAdminSessionSecret();
  if (!sessionSecret || allowedEmails.size === 0 || totpSecrets.size === 0) {
    return json({ error: "auth_not_configured", message: "Der Admin-Login ist noch nicht konfiguriert." }, 503);
  }

  const ip = getClientIp(request.headers);
  const rateLimit = checkAdminLoginRateLimit(email, ip);
  if (!rateLimit.allowed) {
    return NextResponse.json({
      error: "too_many_attempts",
      message: "Zu viele Fehlversuche. Bitte versuche es später erneut."
    }, {
      status: 429,
      headers: {
        "cache-control": "private, no-store",
        "retry-after": String(rateLimit.retryAfterSeconds)
      }
    });
  }

  const validCode = verifyAdminTotp({
    code,
    secret: getTotpSecretOrDummy(email, totpSecrets),
    window: 1
  });
  if (!allowedEmails.has(email) || !totpSecrets.has(email) || !validCode) {
    recordAdminLoginFailure(email, ip);
    return json({ error: "invalid_login", message: "E-Mail-Adresse oder Authenticator-Code ist nicht gültig." }, 401);
  }

  clearAdminLoginFailures(email, ip);
  const ttlSeconds = getAdminSessionTtlSeconds();
  const session = await createAdminSession(email, sessionSecret, undefined, ttlSeconds);
  const response = json({
    ok: true,
    redirectTo: isSafeAdminRedirect(nextValue) ? nextValue : "/admin/marketing"
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, session, {
    httpOnly: true,
    maxAge: ttlSeconds,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

function getClientIp(headers: Headers): string | null {
  return headers.get("cf-connecting-ip")
    ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? null;
}
