import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  FULL_SITE_PREVIEW_COOKIE,
  getAdminSessionSecret,
  getAllowedAdminEmails,
  verifyAdminSession
} from "@/lib/admin-session";

const PUBLIC_FILE = /\.(?:avif|ico|jpg|jpeg|png|svg|webp|txt|xml|pdf|html|js|css|map)$/i;
const PUBLIC_LEGAL_PATHS = new Set([
  "/terms",
  "/privacy",
  "/impressum",
  "/cookies",
  "/widget-terms",
  "/data-processing",
  "/de/terms",
  "/de/privacy",
  "/de/impressum",
  "/de/cookies",
  "/de/widget-terms",
  "/de/data-processing"
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const localizedPath = pathname.match(/^\/(es|pt|fr|it)(\/.*)?$/);
  const routePathname = localizedPath?.[2] || (localizedPath ? "/" : pathname);
  const isAdminPath = pathname === "/admin"
    || pathname.startsWith("/admin/")
    || pathname === "/api/admin"
    || pathname.startsWith("/api/admin/");

  if (isAdminPath) {
    if (isLocalDevelopmentRequest(request)) {
      return withAdminPrivacyHeaders(NextResponse.next());
    }

    const isLoginPage = pathname === "/admin/login";
    const isAuthEndpoint = pathname === "/api/admin/auth"
      || pathname.startsWith("/api/admin/auth/");
    if (isLoginPage || isAuthEndpoint) {
      return withAdminPrivacyHeaders(NextResponse.next());
    }

    const sessionSecret = getAdminSessionSecret();
    const allowedEmails = getAllowedAdminEmails();
    if (!sessionSecret || allowedEmails.size === 0) {
      return adminDenied(request, 503, "Admin-Zugriff ist noch nicht vollständig konfiguriert.");
    }

    const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
    const session = sessionToken
      ? await verifyAdminSession(sessionToken, sessionSecret, allowedEmails)
      : null;
    if (!session) {
      if (pathname.startsWith("/api/")) {
        return adminDenied(request, 401, "Bitte melde dich im Admin-Cockpit an.");
      }
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return withAdminPrivacyHeaders(NextResponse.redirect(loginUrl));
    }

    return withAdminPrivacyHeaders(NextResponse.next());
  }

  if (shouldShowFullSite()) {
    return localizedPath ? localizedRewrite(request, localizedPath) : NextResponse.next();
  }

  if (
    routePathname === "/coming-soon" ||
    PUBLIC_LEGAL_PATHS.has(routePathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return localizedPath ? localizedRewrite(request, localizedPath) : NextResponse.next();
  }

  const previewSession = await readAuthorizedAdminSession(request);
  if (previewSession) {
    const response = localizedPath ? localizedRewrite(request, localizedPath) : NextResponse.next();
    response.cookies.set(FULL_SITE_PREVIEW_COOKIE, "1", {
      httpOnly: false,
      secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.max(1, previewSession.expiresAt - Math.floor(Date.now() / 1000)),
      path: "/"
    });
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    response.headers.append("vary", "Cookie");
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  const response = NextResponse.rewrite(url);
  if (request.cookies.has(FULL_SITE_PREVIEW_COOKIE)) {
    response.cookies.set(FULL_SITE_PREVIEW_COOKIE, "", {
      httpOnly: false,
      secure: request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/"
    });
  }
  return response;
}

function localizedRewrite(request: NextRequest, match: RegExpMatchArray) {
  const url = request.nextUrl.clone();
  url.pathname = match[2] || "/";
  const headers = new Headers(request.headers);
  headers.set("x-residual-locale", match[1]);
  return NextResponse.rewrite(url, { request: { headers } });
}

async function readAuthorizedAdminSession(request: NextRequest) {
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  if (!sessionToken) return null;
  const sessionSecret = getAdminSessionSecret();
  const allowedEmails = getAllowedAdminEmails();
  if (!sessionSecret || allowedEmails.size === 0) return null;
  return verifyAdminSession(sessionToken, sessionSecret, allowedEmails);
}

function isLocalDevelopmentRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return ["localhost", "127.0.0.1", "::1"].includes(request.nextUrl.hostname);
}

function adminDenied(request: NextRequest, status: number, message: string): NextResponse {
  const headers = {
    "cache-control": "private, no-store",
    "x-robots-tag": "noindex, nofollow, noarchive, nosnippet, noimageindex"
  };
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status, headers });
  }

  return new NextResponse(
    `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Geschützter Bereich</title></head><body style="font-family:system-ui;background:#071510;color:#eefbf5;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:38rem;padding:2rem"><h1>Geschützter Bereich</h1><p>${message}</p></main></body></html>`,
    { status, headers: { ...headers, "content-type": "text/html; charset=utf-8" } }
  );
}

function withAdminPrivacyHeaders(response: NextResponse): NextResponse {
  response.headers.set("cache-control", "private, no-store");
  response.headers.set(
    "x-robots-tag",
    "noindex, nofollow, noarchive, nosnippet, noimageindex"
  );
  return response;
}

function shouldShowFullSite() {
  return process.env.SHOW_FULL_SITE !== "0";
}

export const config = {
  matcher: ["/:path*"]
};
