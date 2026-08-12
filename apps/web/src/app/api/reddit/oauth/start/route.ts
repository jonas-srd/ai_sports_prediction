import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  createRedditAuthorizationUrl,
  readRedditServerConfig
} from "@ai-sports-prediction/reddit";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";
import { getPublicSiteDestination } from "@/lib/public-site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "residual_reddit_oauth_state";

export async function GET(request: NextRequest) {
  const session = await getAuthorizedAdminSession(request);
  if (!session) {
    return NextResponse.redirect(getPublicSiteDestination(
      "/admin/login?next=/admin/marketing",
      request.url
    ));
  }

  try {
    const config = readRedditServerConfig();
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(createRedditAuthorizationUrl(config, state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/reddit/oauth/callback",
      priority: "high"
    });
    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (sessionToken) {
      response.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, {
        httpOnly: true,
        secure: isSecureRequest(request),
        sameSite: "lax",
        maxAge: Math.max(1, session.expiresAt - Math.floor(Date.now() / 1000)),
        path: "/",
        priority: "high"
      });
    }
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error) {
    console.error("Could not start Reddit OAuth:", error);
    return NextResponse.redirect(getPublicSiteDestination(
      "/admin/marketing?reddit=not_configured",
      request.url
    ));
  }
}

function isSecureRequest(request: NextRequest): boolean {
  return process.env.NODE_ENV === "production"
    || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
    || request.nextUrl.protocol === "https:";
}
