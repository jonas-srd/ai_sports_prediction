import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";
import { getSportsDataQualityOverview } from "@/lib/sports-data-quality-overview";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!await isAdminRequestAuthorized(request)) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }

  try {
    return json({
      ok: true,
      ...(await getSportsDataQualityOverview())
    });
  } catch (error) {
    console.error("Sports data quality scan failed:", error);
    return json({
      error: "quality_scan_failed",
      message: error instanceof Error ? error.message : "Die Datenqualitätsprüfung ist fehlgeschlagen."
    }, 503);
  }
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "private, no-store" }
  });
}
