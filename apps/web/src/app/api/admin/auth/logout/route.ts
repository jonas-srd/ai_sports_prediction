import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, FULL_SITE_PREVIEW_COOKIE } from "@/lib/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true }, {
    headers: { "cache-control": "private, no-store" }
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  response.cookies.set(FULL_SITE_PREVIEW_COOKIE, "", {
    httpOnly: false,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}
