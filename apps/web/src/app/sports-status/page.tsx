/**
 * Purpose: Local diagnostics page for checking whether configured sports APIs return fixtures.
 */
import { getCompetition } from "@/lib/football-data";
import { getFootballCompetitionApiSnapshot, getSportApiSnapshot, type ApiSportId, type SportApiMatch } from "@/lib/sports-api-data";

const sports = new Set<ApiSportId>(["football", "nfl", "nba", "tennis"]);

export default async function SportsStatusPage({
  searchParams
}: {
  searchParams: Promise<{ competition?: string; sport?: string }>;
}) {
  const params = await searchParams;
  const competitionSlug = params.competition ?? "bundesliga";
  const sportParam = params.sport as ApiSportId | undefined;
  const payload = sportParam && sports.has(sportParam)
    ? await getSportStatus(sportParam)
    : await getCompetitionStatus(competitionSlug);

  return (
    <main style={{ background: "#0f1e2b", color: "#f5f7fb", minHeight: "100vh", padding: 32 }}>
      <h1>Sports API Status</h1>
      <p>Local diagnostics only. API keys are not shown.</p>
      <pre style={{ background: "#172838", border: "1px solid #2b4257", borderRadius: 8, overflow: "auto", padding: 20 }}>
        {JSON.stringify(payload, null, 2)}
      </pre>
    </main>
  );
}

async function getSportStatus(sport: ApiSportId) {
  const snapshot = await getSportApiSnapshot(sport);

  return formatSnapshot(snapshot.matches, {
    message: snapshot.message,
    provider: snapshot.provider,
    sport,
    status: snapshot.status,
    teams: snapshot.teams.length
  });
}

async function getCompetitionStatus(competitionSlug: string) {
  const competition = getCompetition(competitionSlug);
  if (!competition) {
    return { error: `Unknown competition: ${competitionSlug}` };
  }

  const snapshot = await getFootballCompetitionApiSnapshot(competition);

  return formatSnapshot(snapshot.matches, {
    competition: competition.slug,
    message: snapshot.message,
    provider: snapshot.provider,
    sport: "football",
    status: snapshot.status,
    teams: snapshot.teams.length
  });
}

function formatSnapshot(matches: SportApiMatch[], meta: Record<string, unknown>) {
  const now = Date.now();
  const upcoming = matches.filter((match) => {
    if (!match.date) {
      return false;
    }

    const timestamp = new Date(match.date).getTime();
    return Number.isFinite(timestamp) && timestamp >= now && !isFinished(match);
  });

  return {
    ...meta,
    rawMatches: matches.length,
    upcomingMatches: upcoming.length,
    firstRaw: matches.slice(0, 12).map(formatMatch),
    firstUpcoming: upcoming.slice(0, 12).map(formatMatch)
  };
}

function formatMatch(match: SportApiMatch) {
  return {
    id: match.id,
    competition: match.competition,
    date: match.date,
    home: match.homeName,
    away: match.awayName,
    score: match.homeScore === null || match.awayScore === null ? null : `${match.homeScore}:${match.awayScore}`,
    status: match.status
  };
}

function isFinished(match: SportApiMatch) {
  const status = (match.status ?? "").toLowerCase();
  return Boolean(match.homeScore !== null && match.awayScore !== null) ||
    status.includes("ft") ||
    status.includes("final") ||
    status.includes("finished");
}
