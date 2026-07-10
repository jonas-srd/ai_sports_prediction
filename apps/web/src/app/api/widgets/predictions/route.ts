import { NextResponse, type NextRequest } from "next/server";
import {
  getPublicWidgetPayload,
  parseWidgetLimit,
  parseWidgetSport,
  parseWidgetType
} from "@/lib/widget-data";
import { getWidgetAccessHeaders, verifyWidgetAccess } from "@/lib/widget-access";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = parseWidgetLimit(searchParams.get("limit"));
  const type = parseWidgetType(searchParams.get("type"));
  const access = verifyWidgetAccess({ limit, request, type });

  if (!access.ok) {
    return NextResponse.json({
      error: access.code,
      message: access.message
    }, {
      status: access.status,
      headers: {
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      }
    });
  }

  const payload = await getPublicWidgetPayload({
    competition: searchParams.get("competition"),
    limit,
    matchId: searchParams.get("matchId"),
    sport: parseWidgetSport(searchParams.get("sport")),
    type
  });

  return NextResponse.json(payload, {
    headers: {
      ...getWidgetAccessHeaders(access.grant),
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60, stale-while-revalidate=300"
    }
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "access-control-allow-headers": "authorization, content-type, x-ai-sports-widget-key",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-origin": "*",
      "access-control-max-age": "86400"
    }
  });
}
