import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createTikTokAuthorizationUrl,
  readTikTokServerConfig
} from "@ai-sports-prediction/tiktok";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";
import { getPublicSiteDestination } from "@/lib/public-site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "residual_tiktok_oauth_state";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminSession(request)) {
    return NextResponse.redirect(getPublicSiteDestination(
      "/admin/login?next=/admin/marketing",
      request.url
    ));
  }

  try {
    const config = readTikTokServerConfig();
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createTikTokAuthorizationUrl(config, state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/tiktok/oauth/callback",
      priority: "high"
    });
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("Could not start TikTok OAuth:", error);
    return NextResponse.redirect(getPublicSiteDestination(
      "/admin/marketing?tiktok=not_configured",
      request.url
    ));
  }
}

function isSecureRequest(request: NextRequest): boolean {
  return process.env.NODE_ENV === "production"
    || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
    || request.nextUrl.protocol === "https:";
}
