/**
 * Purpose: Seeds local SQLite with sample fixtures from data/fixtures.sample.json.
 * Use this before the real API-Football integration is configured.
 */
import "../load-env";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createSqliteDb, getDefaultDbPath, upsertMatches } from "@llm-kicktipp/db";
import type { MatchRow } from "@llm-kicktipp/db";

type SampleFixture = {
  id: string;
  utcDate: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
};

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const fixturePath = resolve(root, "data/fixtures.sample.json");
  const fixtures = JSON.parse(await readFile(fixturePath, "utf8")) as SampleFixture[];

  const matches: MatchRow[] = fixtures.map((fixture) => ({
    id: fixture.id,
    utc_date: fixture.utcDate,
    competition: fixture.competition,
    home_team: fixture.homeTeam,
    away_team: fixture.awayTeam,
    status: fixture.status,
    home_score: fixture.homeScore,
    away_score: fixture.awayScore
  }));

  const db = createSqliteDb();
  await upsertMatches(db, matches);
  db.close();

  console.log(`Seeded ${matches.length} sample fixtures.`);
  console.log(`SQLite DB: ${getDefaultDbPath()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
