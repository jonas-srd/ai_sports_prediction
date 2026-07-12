import { createHash } from "node:crypto";
import { upsertNewsletterSubscriber } from "@ai-sports-prediction/db";
import { NextResponse, type NextRequest } from "next/server";
import { getNewsletterDb } from "@/lib/newsletter-db";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const email = String(body.email ?? "").trim().toLowerCase();
  const consent = body.consent === true;
  const honeypot = String(body.company ?? "").trim();

  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (!consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  try {
    const subscriber = await upsertNewsletterSubscriber(getNewsletterDb(), {
      consentText: String(body.consentText ?? "Newsletter subscription consent"),
      email,
      ipHash: hashIp(getClientIp(request)),
      locale: normalizeNullableText(body.locale),
      source: normalizeNullableText(body.source) ?? "newsletter-modal",
      userAgent: normalizeNullableText(request.headers.get("user-agent"))
    });

    return NextResponse.json({
      email: subscriber.email,
      ok: true,
      status: subscriber.status
    }, {
      headers: {
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: "newsletter_unavailable",
      message: "Newsletter signup is temporarily unavailable."
    }, { status: 503 });
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-origin": "*",
      "access-control-max-age": "86400"
    }
  });
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("cf-connecting-ip") || null;
}

function hashIp(ip: string | null): string | null {
  if (!ip) {
    return null;
  }

  const salt = process.env.NEWSLETTER_IP_HASH_SALT ?? "ai-sports-prediction-newsletter";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function normalizeNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
