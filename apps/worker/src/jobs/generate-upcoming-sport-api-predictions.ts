/**
 * Purpose: Creates OpenRouter predictions for newly discovered Sport API fixtures.
 */
import {
  predictionExists,
  type PostgresDb,
  upsertPredictionMatch,
  upsertPredictionModel,
  upsertStoredPrediction
} from "@ai-sports-prediction/db";
import { OpenRouterClient } from "@ai-sports-prediction/llm";

export type SportId = "football" | "nfl" | "nba" | "tennis";

type LeagueRef = {
  aliases?: string[];
  competition: string;
  eventCountry?: string;
  id: string;
  mainStageOnly?: boolean;
  sport: SportId;
  strictIdentity?: boolean;
};

export type SportFixture = {
  id: string;
  competition: string;
  sport: SportId;
  utcDate: string;
  homeTeam: string;
  awayTeam: string;
  venue: string | null;
  status: string;
  round: string | null;
  matchday: number | null;
};

const LEAGUES: LeagueRef[] = [
  { sport: "football", id: "4331", competition: "German Bundesliga" },
  { sport: "football", id: "4485", competition: "DFB-Pokal", aliases: ["DFB Pokal"], eventCountry: "Germany", strictIdentity: true },
  { sport: "football", id: "4328", competition: "English Premier League" },
  { sport: "football", id: "4482", competition: "FA Cup", aliases: ["English FA Cup"], eventCountry: "England", strictIdentity: true },
  { sport: "football", id: "4335", competition: "Spanish La Liga" },
  { sport: "football", id: "4483", competition: "Copa del Rey", eventCountry: "Spain", strictIdentity: true },
  { sport: "football", id: "4334", competition: "French Ligue 1" },
  { sport: "football", id: "4484", competition: "Coupe de France", eventCountry: "France", strictIdentity: true },
  { sport: "football", id: "4332", competition: "Italian Serie A" },
  { sport: "football", id: "4506", competition: "Coppa Italia", eventCountry: "Italy", strictIdentity: true },
  { sport: "football", id: "4480", competition: "UEFA Champions League", aliases: ["Champions League"], eventCountry: "Europe", mainStageOnly: true, strictIdentity: true },
  { sport: "football", id: "4481", competition: "UEFA Europa League", aliases: ["Europa League"], eventCountry: "Europe", strictIdentity: true },
  { sport: "football", id: "5071", competition: "UEFA Conference League", aliases: ["UEFA Europa Conference League", "Europa Conference League"], eventCountry: "Europe", strictIdentity: true },
  { sport: "nfl", id: "4391", competition: "NFL" },
  { sport: "nba", id: "4387", competition: "NBA" },
  { sport: "tennis", id: "4464", competition: "ATP" },
  { sport: "tennis", id: "4465", competition: "WTA" }
];

export async function generateUpcomingSportApiPredictions(db: PostgresDb) {
  const apiKey = getFirstEnv(["THE_SPORTS_DB_API_KEY", "THE_SPORTSDB_API_KEY", "THESPORTSDB_API_KEY"]);
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("THE_SPORTS_DB_API_KEY is required to generate upcoming predictions.");
  }

  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is required to generate upcoming predictions.");
  }

  const modelId = getOpenRouterModelId();
  await upsertPredictionModel(db, {
    id: `openrouter:${modelId}`,
    name: modelId,
    provider: "OpenRouter",
    modelVersion: modelId,
    modelFamily: "openrouter",
    supportsToolAccess: false,
    isOpenWeight: modelId.includes("gpt-oss")
  });

  const client = new OpenRouterClient({
    apiKey: openRouterApiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });
  const fixtures = await fetchUpcomingFixtures(apiKey);
  const limit = Number(process.env.PREDICTION_AUTOMATION_MAX_NEW_PER_RUN ?? 50);
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    if (created >= limit) {
      break;
    }

    const matchId = `sport-api:${fixture.id}`;
    await upsertPredictionMatch(db, {
      id: matchId,
      utcDate: fixture.utcDate,
      competition: fixture.competition,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue,
      status: fixture.status,
      source: "thesportsdb",
      sourceMatchId: fixture.id,
      sport: fixture.sport,
      stage: fixture.round,
      matchday: fixture.matchday
    });

    if (await predictionExists(db, matchId, `openrouter:${modelId}`)) {
      skipped += 1;
      continue;
    }

    try {
      const prediction = await client.predictScore(modelId, buildSportPredictionPrompt(fixture));
      await upsertStoredPrediction(db, {
        matchId,
        modelId: `openrouter:${modelId}`,
        predictedHome: prediction.home,
        predictedAway: prediction.away,
        confidence: prediction.confidence ?? null,
        reason: prediction.reason ?? null,
        rawResponse: prediction.rawResponse
      });
      created += 1;
    } catch (error) {
      failed += 1;
      console.error(`Prediction generation failed for ${fixture.id}:`, error);
    }
  }

  console.log(`Upcoming prediction job finished: ${created} created, ${skipped} skipped, ${failed} failed.`);
}

export async function fetchUpcomingFixtures(
  apiKey: string,
  lookaheadDays = Number(process.env.PREDICTION_AUTOMATION_LOOKAHEAD_DAYS ?? 7)
) {
  const rows = (await Promise.all(LEAGUES.map((league) => fetchLeagueFixtures(apiKey, league)))).flat();
  const now = Date.now();
  const safeLookaheadDays = Number.isFinite(lookaheadDays) ? Math.max(1, Math.min(90, lookaheadDays)) : 7;
  const horizonMs = safeLookaheadDays * 24 * 60 * 60 * 1000;
  const seen = new Set<string>();

  return rows
    .filter((fixture) => {
      if (seen.has(fixture.id)) {
        return false;
      }

      seen.add(fixture.id);
      const timestamp = new Date(fixture.utcDate).getTime();
      return Number.isFinite(timestamp) &&
        timestamp >= now &&
        timestamp <= now + horizonMs &&
        !isFinishedStatus(fixture.status);
    })
    .sort((left, right) => new Date(left.utcDate).getTime() - new Date(right.utcDate).getTime());
}

async function fetchLeagueFixtures(apiKey: string, league: LeagueRef): Promise<SportFixture[]> {
  const rows = await Promise.all([
    fetchTheSportsDbV1(apiKey, "eventsnextleague.php", { id: league.id }),
    ...getSeasonCandidates().map((season) => fetchTheSportsDbV2(apiKey, `schedule/league/${league.id}/${encodeURIComponent(season)}`))
  ]);

  return rows
    .flat()
    .filter((row) => matchesLeagueFixtureRow(row, league))
    .map((row) => normalizeFixture(row, league))
    .filter((fixture): fixture is SportFixture => Boolean(fixture));
}

function matchesLeagueFixtureRow(row: any, league: LeagueRef) {
  const rowLeagueId = readString(row.idLeague ?? row.leagueId ?? row.league_id);
  if (rowLeagueId && rowLeagueId !== league.id) {
    return false;
  }

  if (!league.strictIdentity) {
    return matchesRequestedCompetitionStage(row, league);
  }

  const rowLeagueName = normalizeComparableName(readString(row.strLeague ?? row.league ?? row.leagueName));
  const rowCountry = normalizeComparableName(readString(row.strCountry ?? row.country));
  const rowSport = normalizeComparableName(readString(row.strSport ?? row.sport));
  const expectedNames = [league.competition, ...(league.aliases ?? [])]
    .map(normalizeComparableName);
  const exactLeagueName = !rowLeagueName || expectedNames.includes(rowLeagueName);
  const exactCountry = Boolean(
    league.eventCountry &&
    rowCountry &&
    rowCountry === normalizeComparableName(league.eventCountry)
  );
  const exactSport = !rowSport || league.sport !== "football" || rowSport === "soccer";

  if (rowLeagueId === league.id) {
    return exactLeagueName &&
      exactSport &&
      (!rowCountry || !league.eventCountry || exactCountry) &&
      matchesRequestedCompetitionStage(row, league);
  }

  return Boolean(
    league.eventCountry &&
    exactLeagueName &&
    exactCountry &&
    exactSport &&
    matchesRequestedCompetitionStage(row, league)
  );
}

function matchesRequestedCompetitionStage(row: any, league: LeagueRef) {
  if (!league.mainStageOnly) {
    return true;
  }

  const stageText = [
    row.strStage,
    row.strRound,
    row.strEvent,
    row.strDescription,
    row.stage,
    row.round
  ].map(readString).join(" ");
  if (/qualif|prelim|play[ -]?off/i.test(stageText)) {
    return false;
  }

  const rawDate = readString(row.strTimestamp ?? row.dateEvent ?? row.date ?? row.timestamp);
  const eventDate = rawDate ? new Date(rawDate) : null;
  if (eventDate && Number.isFinite(eventDate.getTime())) {
    const month = eventDate.getUTCMonth();
    if (month >= 5 && month <= 7) {
      return false;
    }
  }

  return true;
}

async function fetchTheSportsDbV1(apiKey: string, path: string, query: Record<string, string>): Promise<any[]> {
  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey}/${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return fetchJsonRows(url, { accept: "application/json" });
}

async function fetchTheSportsDbV2(apiKey: string, path: string): Promise<any[]> {
  const url = new URL(`https://www.thesportsdb.com/api/v2/json/${path}`);
  return fetchJsonRows(url, { "X-API-KEY": apiKey, accept: "application/json" });
}

async function fetchJsonRows(url: URL, headers: Record<string, string>): Promise<any[]> {
  const response = await fetch(url, { headers }).catch(() => null);

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json().catch(() => null);
  const direct = payload && typeof payload === "object" ? (payload as Record<string, unknown>).events : null;

  if (Array.isArray(direct)) {
    return direct;
  }

  return findArrays(payload).find((rows) => rows.some((row) => row && typeof row === "object")) ?? [];
}

function normalizeFixture(row: any, league: LeagueRef): SportFixture | null {
  const id = readString(row.idEvent ?? row.id ?? row.eventId);
  const eventName = readString(row.strEvent ?? row.event ?? row.name);
  const parsed = eventName.includes(" vs ") ? eventName.split(" vs ").map((part) => part.trim()) : ["", ""];
  const homeTeam = readString(row.strHomeTeam ?? row.homeTeam ?? row.home_team ?? row.home?.name) || parsed[0];
  const awayTeam = readString(row.strAwayTeam ?? row.awayTeam ?? row.away_team ?? row.away?.name) || parsed[1];
  const utcDate = readEventDate(row);

  if (!id || !homeTeam || !awayTeam || !utcDate) {
    return null;
  }

  return {
    id,
    competition: league.competition,
    sport: league.sport,
    utcDate,
    homeTeam,
    awayTeam,
    venue: readString(row.strVenue ?? row.venue) || null,
    status: readString(row.strStatus ?? row.status ?? row.strProgress) || "SCHEDULED",
    round: readString(row.intRound ?? row.strRound ?? row.round) || null,
    matchday: readNumber(row.intRound ?? row.round)
  };
}

function readEventDate(row: any) {
  const timestamp = readString(row.strTimestamp ?? row.timestamp ?? row.dateTime);
  if (timestamp) {
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }

  const date = readString(row.dateEvent ?? row.date ?? row.event_date);
  const time = readString(row.strTime ?? row.time ?? "00:00:00").replace(/\+00:00$/, "");

  if (!date) {
    return null;
  }

  const parsed = new Date(`${date}T${time || "00:00:00"}Z`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function buildSportPredictionPrompt(fixture: SportFixture) {
  return [
    "Create one calibrated sports prediction for the fixture below.",
    "Return only valid JSON. Do not include markdown.",
    "JSON schema: {\"home\": integer, \"away\": integer, \"confidence\": number, \"reason\": \"short reason\"}",
    "Use conservative scores and do not overstate certainty.",
    "",
    `Sport: ${fixture.sport}`,
    `Competition: ${fixture.competition}`,
    `Kickoff UTC: ${fixture.utcDate}`,
    `Home/listed first team: ${fixture.homeTeam}`,
    `Away/listed second team: ${fixture.awayTeam}`,
    `Venue: ${fixture.venue ?? "unknown"}`,
    `Round: ${fixture.round ?? "unknown"}`
  ].join("\n");
}

function getSeasonCandidates() {
  const now = new Date();
  const year = now.getUTCFullYear();
  return [
    String(year),
    `${year}-${year + 1}`,
    `${year - 1}-${year}`
  ];
}

function getOpenRouterModelId() {
  return process.env.OPENROUTER_MODEL_IDS?.split(",").map((value) => value.trim()).filter(Boolean)[0] ??
    "openai/gpt-oss-20b:free";
}

function isFinishedStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized.includes("final") || normalized.includes("finished") || normalized === "ft";
}

function findArrays(value: unknown): unknown[][] {
  if (Array.isArray(value)) {
    return [value, ...value.flatMap(findArrays)];
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.values(value).flatMap(findArrays);
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function readNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return "";
}
