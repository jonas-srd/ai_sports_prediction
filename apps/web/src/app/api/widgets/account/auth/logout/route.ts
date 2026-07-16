import { NextResponse } from "next/server";
import { WIDGET_CUSTOMER_SESSION_COOKIE } from "@/lib/widget-customer-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(WIDGET_CUSTOMER_SESSION_COOKIE, "", { expires: new Date(0), path: "/" });
  return response;
}
