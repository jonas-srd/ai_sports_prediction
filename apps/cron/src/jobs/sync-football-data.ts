/**
 * Purpose: Optional football-data.org adapter for syncing fixtures and final results into Supabase.
 * It fetches matches for one UTC date and upserts normalized rows into the matches table.
 */
import { createSupabaseServiceClient, upsertMatches } from "@llm-kicktipp/db";
import type { MatchRow } from "@llm-kicktipp/db";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  competition: {
    name: string;
  };
  homeTeam: {
    name: string;
  };
  awayTeam: {
    name: string;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
};

type FootballDataResponse = {
  matches: FootballDataMatch[];
};

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY.");
  }

  const date = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const url = new URL("https://api.football-data.org/v4/matches");
  url.searchParams.set("dateFrom", date);
  url.searchParams.set("dateTo", date);

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey
    }
  });

  const body = (await response.json()) as FootballDataResponse;
  if (!response.ok) {
    throw new Error(`football-data.org sync failed: ${JSON.stringify(body)}`);
  }

  const matches: MatchRow[] = body.matches.map((match) => ({
    id: `football-data-${match.id}`,
    utc_date: match.utcDate,
    competition: match.competition.name,
    home_team: match.homeTeam.name,
    away_team: match.awayTeam.name,
    status: match.status,
    home_score: match.score.fullTime.home,
    away_score: match.score.fullTime.away
  }));

  const db = createSupabaseServiceClient();
  await upsertMatches(db, matches);

  console.log(`Synced ${matches.length} matches for ${date}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
