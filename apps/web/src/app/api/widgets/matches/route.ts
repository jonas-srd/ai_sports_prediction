import { NextResponse, type NextRequest } from "next/server";
import { getWidgetAccessHeaders, verifyWidgetAccess } from "@/lib/widget-access";
import {
  getPublicWidgetPayload,
  parseWidgetSport,
  parseWidgetType
} from "@/lib/widget-data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sport = parseWidgetSport(searchParams.get("sport"));
  const type = parseWidgetType(searchParams.get("type"));
  const access = verifyWidgetAccess({ limit: 1, request, type });

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

  const query = normalizeSearch(searchParams.get("q"));
  const payload = await getPublicWidgetPayload({
    competition: searchParams.get("competition"),
    limit: 12,
    matchId: null,
    sport,
    type
  });
  const matches = payload.matches
    .filter((match) => {
      if (!query) return true;
      return normalizeSearch([
        match.id,
        match.competition,
        match.homeTeam,
        match.awayTeam,
        match.sport
      ].join(" ")).includes(query);
    })
    .slice(0, 12)
    .map((match) => ({
      id: match.id,
      sport: match.sport,
      competition: match.competition,
      date: match.date,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeLogo: match.homeLogo,
      awayLogo: match.awayLogo,
      label: `${match.homeTeam} vs ${match.awayTeam}`
    }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    matches,
    source: payload.source
  }, {
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

function normalizeSearch(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
