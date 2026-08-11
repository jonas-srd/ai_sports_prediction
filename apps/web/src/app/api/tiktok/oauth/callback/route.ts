import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeTikTokAuthorizationCode,
  fetchTikTokProfile,
  readTikTokServerConfig,
  saveTikTokConnection
} from "@ai-sports-prediction/tiktok";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";
import { getMarketingDb } from "@/lib/marketing-admin-db";
import { getPublicSiteDestination } from "@/lib/public-site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "residual_tiktok_oauth_state";

export async function GET(request: NextRequest) {
  const destination = getPublicSiteDestination("/admin/marketing", request.url);
  const response = (status: string, reason?: string) => {
    destination.searchParams.set("tiktok", status);
    if (reason) destination.searchParams.set("reason", reason);
    const redirect = NextResponse.redirect(destination);
    redirect.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: isSecureRequest(request),
      sameSite: "lax",
      maxAge: 0,
      path: "/api/tiktok/oauth/callback"
    });
    redirect.headers.set("cache-control", "no-store");
    return redirect;
  };

  const session = await getAuthorizedAdminSession(request);
  if (!session) return response("error", "admin_session");

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return response("error", "authorization_denied");

  const state = request.nextUrl.searchParams.get("state") ?? "";
  const expectedState = request.cookies.get(STATE_COOKIE)?.value ?? "";
  if (!safeEqual(state, expectedState)) return response("error", "invalid_state");

  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!code) return response("error", "missing_code");

  try {
    const config = readTikTokServerConfig();
    const bundle = await exchangeTikTokAuthorizationCode(code, config);
    const profile = await fetchTikTokProfile(bundle.accessToken);
    if (profile.openId !== bundle.openId) {
      throw new Error("TikTok profile does not match the authorized token owner.");
    }
    await saveTikTokConnection(
      getMarketingDb(),
      config,
      bundle,
      profile,
      session.email
    );
    return response("connected");
  } catch (error) {
    console.error("TikTok OAuth callback failed:", error);
    return response("error", "token_exchange");
  }
}

function isSecureRequest(request: NextRequest): boolean {
  return process.env.NODE_ENV === "production"
    || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
    || request.nextUrl.protocol === "https:";
}

function safeEqual(left: string, right: string): boolean {
  if (!left || !right) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
