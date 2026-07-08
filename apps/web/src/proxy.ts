import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_FILE = /\.(?:avif|ico|jpg|jpeg|png|svg|webp|txt|xml|pdf|js|css|map)$/i;

export function proxy(request: NextRequest) {
  if (shouldShowFullSite()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (
    pathname === "/coming-soon" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

function shouldShowFullSite() {
  if (process.env.NEXT_PUBLIC_SHOW_FULL_SITE === "1") {
    return true;
  }

  return process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_FULL_SITE !== "0";
}

export const config = {
  matcher: ["/:path*"]
};
