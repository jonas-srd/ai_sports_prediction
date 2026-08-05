import { storeMatchDataSnapshot, type PostgresDb, upsertPredictionMatch } from "@ai-sports-prediction/db";
import { fetchUpcomingFixtures, toNormalizedFixtureSnapshot } from "./generate-upcoming-sport-api-predictions";

export async function syncUpcomingSportFixtures(db: PostgresDb) {
  const apiKey = [
    process.env.THE_SPORTS_DB_API_KEY,
    process.env.THE_SPORTSDB_API_KEY,
    process.env.THESPORTSDB_API_KEY
  ].map((value) => value?.trim()).find(Boolean);
  if (!apiKey) throw new Error("THE_SPORTS_DB_API_KEY is required for fixture synchronization.");

  const fixtures = await fetchUpcomingFixtures(apiKey);
  for (const fixture of fixtures) {
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
    await storeMatchDataSnapshot(db, {
      matchId,
      provider: "TheSportsDB",
      sourceMatchId: fixture.id,
      snapshotType: "fixture",
      eventTimeUtc: fixture.utcDate,
      rawPayload: fixture.sourcePayload ?? fixture,
      normalizedPayload: toNormalizedFixtureSnapshot(fixture)
    });
  }
  console.log(`Fixture synchronization finished: ${fixtures.length} upcoming fixtures stored.`);
  return { fixtures: fixtures.length };
}
