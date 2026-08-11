import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createTikTokAuthorizationUrl,
  readTikTokServerConfig
} from "@ai-sports-prediction/tiktok";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "residual_tiktok_oauth_state";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminSession(request)) {
    return NextResponse.redirect(new URL("/admin/login?next=/admin/marketing", request.url));
  }

  try {
    const config = readTikTokServerConfig();
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createTikTokAuthorizationUrl(config, state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/tiktok/oauth/callback",
      priority: "high"
    });
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("Could not start TikTok OAuth:", error);
    return NextResponse.redirect(new URL("/admin/marketing?tiktok=not_configured", request.url));
  }
}
