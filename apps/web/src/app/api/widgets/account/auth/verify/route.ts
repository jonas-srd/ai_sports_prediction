import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getWidgetDb } from "@/lib/widget-db";
import {
  createWidgetCustomerSession,
  getWidgetCustomerSessionSecret,
  getWidgetCustomerSessionTtlSeconds,
  WIDGET_CUSTOMER_SESSION_COOKIE
} from "@/lib/widget-customer-session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const locale = request.nextUrl.searchParams.get("locale") === "de" ? "de" : "en";
  const loginPath = locale === "de" ? "/de/widgets/account/login" : "/widgets/account/login";
  const accountPath = locale === "de" ? "/de/widgets/account" : "/widgets/account";
  const secret = getWidgetCustomerSessionSecret();
  if (!secret || token.length < 32) return NextResponse.redirect(new URL(`${loginPath}?error=invalid`, request.url));

  try {
    const result = await getWidgetDb().query<{ customer_id: string; email: string }>(`
      update widget_customer_login_tokens t
      set used_at_utc = now()
      from widget_customers c
      where t.customer_id = c.id and t.token_hash = $1 and t.used_at_utc is null
        and t.expires_at_utc > now() and c.status in ('active', 'past_due')
      returning t.customer_id, c.email
    `, [createHash("sha256").update(token).digest("hex")]);
    const row = result.rows[0];
    if (!row) return NextResponse.redirect(new URL(`${loginPath}?error=invalid`, request.url));

    const response = NextResponse.redirect(new URL(accountPath, request.url));
    response.cookies.set(
      WIDGET_CUSTOMER_SESSION_COOKIE,
      createWidgetCustomerSession(row.customer_id, row.email, secret),
      {
        httpOnly: true,
        maxAge: getWidgetCustomerSessionTtlSeconds(),
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      }
    );
    return response;
  } catch (error) {
    console.error("Widget customer login verification failed", error);
    return NextResponse.redirect(new URL(`${loginPath}?error=unavailable`, request.url));
  }
}
