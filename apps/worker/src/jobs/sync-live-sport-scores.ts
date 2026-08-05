import {
  storeMatchDataSnapshot,
  type PostgresDb,
  updatePredictionMatchFinalResult,
  upsertPredictionMatch
} from "@ai-sports-prediction/db";
import {
  normalizeSportFixture,
  SPORT_API_LEAGUES,
  toNormalizedFixtureSnapshot,
  type SportFixture
} from "./generate-upcoming-sport-api-predictions";

export async function syncLiveSportScores(db: PostgresDb) {
  const apiKey = [
    process.env.THE_SPORTS_DB_API_KEY,
    process.env.THE_SPORTSDB_API_KEY,
    process.env.THESPORTSDB_API_KEY
  ].map((value) => value?.trim()).find(Boolean);
  if (!apiKey) throw new Error("THE_SPORTS_DB_API_KEY is required for live-score synchronization.");

  const fixtures = await fetchSupportedLiveScoreFixtures(apiKey);
  const finalFixtures = fixtures.filter(isFinalScoreFixture);
  let storedFinalResults = 0;

  for (const fixture of finalFixtures) {
    if (fixture.homeScore === null || fixture.homeScore === undefined || fixture.awayScore === null || fixture.awayScore === undefined) {
      continue;
    }

    const matchId = `sport-api:${fixture.id}`;
    const finalStatus = getFinalStatus(fixture);
    await upsertPredictionMatch(db, {
      id: matchId,
      utcDate: fixture.utcDate,
      competition: fixture.competition,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      venue: fixture.venue,
      status: finalStatus,
      source: "thesportsdb",
      sourceMatchId: fixture.id,
      sport: fixture.sport,
      stage: fixture.round,
      matchday: fixture.matchday
    });
    await updatePredictionMatchFinalResult(db, {
      matchId,
      status: finalStatus,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore
    });
    await storeMatchDataSnapshot(db, {
      matchId,
      provider: "TheSportsDB",
      sourceMatchId: fixture.id,
      snapshotType: "final_score",
      eventTimeUtc: fixture.utcDate,
      rawPayload: fixture.sourcePayload ?? fixture,
      normalizedPayload: toNormalizedFixtureSnapshot(fixture)
    });
    storedFinalResults += 1;
  }

  console.log(`Live-score check finished: ${fixtures.length} active/recent games checked, ${storedFinalResults} final results stored.`);
  return { checked: fixtures.length, finalResults: storedFinalResults };
}

export async function fetchSupportedLiveScoreFixtures(apiKey: string): Promise<SportFixture[]> {
  const response = await fetch("https://www.thesportsdb.com/api/v2/json/livescore/all", {
    headers: { "X-API-KEY": apiKey, accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`TheSportsDB livescore request failed with HTTP ${response.status}.`);
  }

  const payload = await response.json().catch(() => null);
  const rows = readEventRows(payload);
  const seen = new Set<string>();

  return rows.flatMap((row) => {
    const fixture = normalizeSupportedLiveScoreRow(row);
    if (!fixture || seen.has(fixture.id)) {
      return [];
    }
    seen.add(fixture.id);
    return [fixture];
  });
}

export function normalizeSupportedLiveScoreRow(row: any): SportFixture | null {
  const leagueId = readString(row?.idLeague ?? row?.leagueId ?? row?.league_id);
  const league = SPORT_API_LEAGUES.find((candidate) => candidate.id === leagueId);
  if (!league || !hasLiveOrFinalState(row)) {
    return null;
  }
  return normalizeSportFixture(row, league);
}

export function isFinalScoreFixture(fixture: SportFixture) {
  const state = `${fixture.status} ${fixture.liveProgress ?? ""}`.trim().toLowerCase();
  return ["ft", "final", "finished", "full time", "aet", "aot", "after penalties", "pen"]
    .some((label) => state === label || state.includes(label));
}

function hasLiveOrFinalState(row: any) {
  const status = readString(row?.strStatus ?? row?.status).toLowerCase();
  const progress = readString(row?.strProgress ?? row?.progress).toLowerCase();
  if (["ns", "not started", "scheduled", "tbd"].includes(status) && !progress) {
    return false;
  }
  return Boolean(status || progress);
}

function getFinalStatus(fixture: SportFixture) {
  const progress = fixture.liveProgress?.trim();
  return progress && isFinalScoreFixture({ ...fixture, status: progress }) ? progress : fixture.status;
}

function readEventRows(payload: unknown): any[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.events)) return record.events;
  if (Array.isArray(record.livescore)) return record.livescore;
  return [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : value === null || value === undefined ? "" : String(value).trim();
}
