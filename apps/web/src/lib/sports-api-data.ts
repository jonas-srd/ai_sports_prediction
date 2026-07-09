/**
 * Purpose: Server-only API-Football/API-Sports data adapters for football, NFL, NBA and tennis.
 */
import type { FootballCompetition, FootballTeam } from "@/lib/football-data";

export type ApiSportId = "football" | "nfl" | "nba" | "tennis";

export type SportApiMatch = {
  id: string;
  competition: string;
  round?: string | null;
  date: string | null;
  venue?: string | null;
  homeId?: string | null;
  homeName: string;
  awayId?: string | null;
  awayName: string;
  homeLogo: string | null;
  awayLogo: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
};

export type SportApiStanding = {
  rank: number;
  teamName: string;
  teamLogo: string | null;
  played: number | null;
  won: number | null;
  drawn: number | null;
  lost: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  goalDiff: number | null;
  points: number | null;
  form: string | null;
  detail: string | null;
};

export type SportApiTeam = {
  id: string;
  name: string;
  logo: string | null;
};

export type SportApiSquadPlayer = {
  id: string;
  name: string;
  age: number | null;
  number: number | null;
  position: string;
  photo: string | null;
};

export type SportApiSnapshot = {
  sport: ApiSportId;
  provider: "api-football" | "api-sports" | "thesportsdb" | "combined";
  status: "live" | "not_configured" | "error";
  message: string;
  matches: SportApiMatch[];
  standings: SportApiStanding[];
  teams: SportApiTeam[];
};

export type SportApiStatRow = {
  label: string;
  home: string | number | null;
  away: string | number | null;
};

export type SportApiAnalysisSnapshot = {
  status: "live" | "not_configured" | "error";
  message: string;
  stats: SportApiStatRow[];
  h2h: SportApiMatch[];
  source: string;
};

type ApiSportsResponse<T> = {
  errors?: unknown;
  response?: T[];
};

type SportConfig = {
  host: string;
  keyEnv: string[];
  provider: "api-football" | "api-sports";
  providerName: string;
  defaultQuery: () => Record<string, string>;
  gamesPath: string;
  cacheSeconds?: () => number;
};

type TheSportsDbLeagueRef = {
  id?: string;
  name: string;
  aliases?: string[];
};

const FOOTBALL_LEAGUE_IDS: Record<string, string> = {
  "bundesliga": "78",
  "dfb-pokal": "81",
  "premier-league": "39",
  "fa-cup": "45",
  "la-liga": "140",
  "copa-del-rey": "143",
  "ligue-1": "61",
  "coupe-de-france": "66",
  "serie-a": "135",
  "coppa-italia": "137",
  "champions-league": "2",
  "europa-league": "3",
  "conference-league": "848"
};

const THE_SPORTS_DB_LEAGUES: Record<ApiSportId, TheSportsDbLeagueRef> = {
  football: { id: "4328", name: "English Premier League" },
  nfl: { id: "4391", name: "NFL" },
  nba: { id: "4387", name: "NBA" },
  tennis: { id: "4464", name: "ATP" }
};

const THE_SPORTS_DB_SPORT_PATHS: Record<ApiSportId, string[]> = {
  football: ["soccer"],
  nfl: ["american-football", "nfl"],
  nba: ["basketball"],
  tennis: ["tennis"]
};

const THE_SPORTS_DB_V1_SPORT_NAMES: Record<ApiSportId, string> = {
  football: "Soccer",
  nfl: "American Football",
  nba: "Basketball",
  tennis: "Tennis"
};

const THE_SPORTS_DB_FOOTBALL_LEAGUES: Record<string, TheSportsDbLeagueRef> = {
  "bundesliga": { id: "4331", name: "German Bundesliga" },
  "dfb-pokal": { id: "4470", name: "DFB-Pokal" },
  "premier-league": { id: "4328", name: "English Premier League" },
  "fa-cup": { id: "4482", name: "FA Cup" },
  "la-liga": { id: "4335", name: "Spanish La Liga" },
  "copa-del-rey": { id: "4483", name: "Copa del Rey" },
  "ligue-1": { id: "4334", name: "French Ligue 1" },
  "coupe-de-france": { id: "4484", name: "Coupe de France" },
  "serie-a": { id: "4332", name: "Italian Serie A" },
  "coppa-italia": { id: "4485", name: "Coppa Italia" },
  "champions-league": { id: "4480", name: "UEFA Champions League" },
  "europa-league": { id: "4481", name: "UEFA Europa League" },
  "conference-league": { id: "5366", name: "UEFA Conference League", aliases: ["UEFA Europa Conference League", "Europa Conference League"] }
};

let theSportsDbLeagueRowsPromise: Promise<any[]> | null = null;

const configs: Record<ApiSportId, SportConfig> = {
  football: {
    host: "https://v3.football.api-sports.io",
    keyEnv: ["API_FOOTBALL_KEY", "API_SPORTS_FOOTBALL_KEY", "API_SPORTS_KEY"],
    provider: "api-football",
    providerName: "API-Football",
    gamesPath: "/fixtures",
    defaultQuery: () => ({
      league: process.env.API_FOOTBALL_LEAGUE_ID ?? "39",
      season: process.env.API_FOOTBALL_SEASON ?? getCurrentSeason()
    })
  },
  nfl: {
    host: "https://v1.american-football.api-sports.io",
    keyEnv: ["API_SPORTS_NFL_KEY", "API_SPORTS_KEY", "API_NFL_KEY"],
    provider: "api-sports",
    providerName: "API-Sports NFL",
    gamesPath: "/games",
    defaultQuery: () => ({
      league: process.env.API_NFL_LEAGUE_ID ?? "1",
      season: process.env.API_NFL_SEASON ?? getCurrentSeason()
    })
  },
  nba: {
    host: "https://v2.nba.api-sports.io",
    keyEnv: ["API_SPORTS_NBA_KEY", "API_SPORTS_KEY", "API_NBA_KEY"],
    provider: "api-sports",
    providerName: "API-Sports NBA",
    gamesPath: "/games",
    defaultQuery: () => ({
      league: process.env.API_NBA_LEAGUE ?? "standard",
      season: process.env.API_NBA_SEASON ?? getCurrentSeason()
    })
  },
  tennis: {
    host: process.env.API_TENNIS_HOST ?? "https://v1.tennis.api-sports.io",
    keyEnv: ["API_TENNIS_KEY", "API_SPORTS_TENNIS_KEY", "API_SPORTS_KEY"],
    provider: "api-sports",
    providerName: "API-Sports Tennis",
    gamesPath: "/fixtures",
    defaultQuery: () => ({
      next: process.env.API_TENNIS_MATCH_LIMIT ?? "24"
    }),
    cacheSeconds: () => Number(process.env.API_TENNIS_CACHE_SECONDS ?? 60)
  }
};

export async function getSportApiSnapshot(sport: ApiSportId): Promise<SportApiSnapshot> {
  const config = configs[sport];
  const apiKey = getFirstEnv(config.keyEnv);
  const sportsDbLeague = THE_SPORTS_DB_LEAGUES[sport];

  if (!apiKey) {
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot(sport, sportsDbLeague).catch(() => null);
    if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
      return sportsDbSnapshot;
    }

    return {
      sport,
      provider: config.provider,
      status: "not_configured",
      message: `${getMissingKeyMessage(sport, config)} TheSportsDB is also not configured or returned no rows.`,
      matches: [],
      standings: [],
      teams: []
    };
  }

  try {
    const { matches, query } = await fetchBestSportMatches(sport, config);
    const apiTeams = sport === "nfl" || sport === "nba"
      ? await fetchSportTeams(config, query).catch(() => [])
      : [];
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot(sport, sportsDbLeague).catch(() => null);
    const matchesWithFallback = mergeMatches(matches, sportsDbSnapshot?.matches ?? []);
    const teams = mergeTeams(apiTeams, sportsDbSnapshot?.teams ?? []);

    return {
      sport,
      provider: sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)
        ? "combined"
        : config.provider,
      status: "live",
      message: sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)
        ? `Live data loaded from ${config.providerName} and TheSportsDB Premium.`
        : `Live data loaded from ${config.providerName}.`,
      matches: matchesWithFallback,
      standings: [],
      teams
    };
  } catch {
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot(sport, sportsDbLeague).catch(() => null);
    if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
      return sportsDbSnapshot;
    }

    return {
      sport,
      provider: config.provider,
      status: "error",
      message: `${config.providerName} and TheSportsDB requests failed or returned no usable rows.`,
      matches: [],
      standings: [],
      teams: []
    };
  }
}

export async function getFootballCompetitionApiSnapshot(competition: FootballCompetition): Promise<SportApiSnapshot> {
  const config = configs.football;
  const apiKey = getFirstEnv(config.keyEnv);
  const league = process.env[`API_FOOTBALL_${toEnvKey(competition.slug)}_LEAGUE_ID`] ?? FOOTBALL_LEAGUE_IDS[competition.slug];
  const season = process.env.API_FOOTBALL_SEASON ?? getCurrentSeason();
  const sportsDbLeague = THE_SPORTS_DB_FOOTBALL_LEAGUES[competition.slug] ?? {
    id: "",
    name: competition.name
  };

  if (!apiKey || !league) {
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot("football", sportsDbLeague).catch(() => null);
    if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
      return sportsDbSnapshot;
    }

    return {
      sport: "football",
      provider: config.provider,
      status: "not_configured",
      message: !apiKey
        ? getMissingKeyMessage("football", config)
        : `No API-Football league id configured for ${competition.name}.`,
      matches: [],
      standings: [],
      teams: []
    };
  }

  try {
    const [matchesResult, standingsResult, teamsResult] = await Promise.allSettled([
      fetchMatches("football", config, { league, season }, getFootballMatchLimit()),
      competition.type === "league" ? fetchFootballStandings(config, { league, season }) : Promise.resolve([]),
      fetchFootballTeams(config, { league, season })
    ]);
    const matches = matchesResult.status === "fulfilled" ? matchesResult.value : [];
    const standings = standingsResult.status === "fulfilled" ? standingsResult.value : [];
    const apiTeams = teamsResult.status === "fulfilled" ? teamsResult.value : [];
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot("football", sportsDbLeague).catch(() => null);
    const mergedMatches = mergeMatches(matches, sportsDbSnapshot?.matches ?? []);
    const teams = mergeTeams(apiTeams, sportsDbSnapshot?.teams ?? []);

    return {
      sport: "football",
      provider: sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)
        ? "combined"
        : config.provider,
      status: "live",
      message: getFootballSnapshotMessage(
        mergedMatches.length,
        standings.length,
        teams.length,
        competition.type,
        [
          matchesResult.status === "rejected" ? matchesResult.reason : null,
          standingsResult.status === "rejected" ? standingsResult.reason : null,
          teamsResult.status === "rejected" ? teamsResult.reason : null
        ]
      ),
      matches: mergedMatches,
      standings,
      teams
    };
  } catch {
    const sportsDbSnapshot = await fetchTheSportsDbSnapshot("football", sportsDbLeague).catch(() => null);
    if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
      return sportsDbSnapshot;
    }

    return {
      sport: "football",
      provider: config.provider,
      status: "error",
      message: `API-Football request failed for ${competition.name}. Showing local fallback data.`,
      matches: [],
      standings: [],
      teams: []
    };
  }
}

export async function getFootballTeamSquad(teamId: string): Promise<SportApiSquadPlayer[]> {
  const config = configs.football;
  const apiKey = getFirstEnv(config.keyEnv);

  if (!apiKey || !teamId) {
    return [];
  }

  try {
    const data = await fetchApiSports<any>(config, "/players/squads", { team: teamId });
    const players = data[0]?.players;

    if (!Array.isArray(players)) {
      return [];
    }

    return players.map((player: any) => ({
      id: getString(player.id) || getString(player.name),
      name: getString(player.name),
      age: toNumber(player.age),
      number: toNumber(player.number),
      position: getString(player.position) || "Squad",
      photo: getString(player.photo) || null
    })).filter((player: SportApiSquadPlayer) => player.id && player.name);
  } catch {
    return [];
  }
}

export async function getSportMatchAnalysis({
  competition,
  match,
  sport
}: {
  competition?: FootballCompetition;
  match: SportApiMatch;
  sport: ApiSportId;
}): Promise<SportApiAnalysisSnapshot> {
  const config = configs[sport];
  const apiKey = getFirstEnv(config.keyEnv);

  if (!apiKey) {
    return {
      status: "not_configured",
      message: getMissingKeyMessage(sport, config),
      stats: [],
      h2h: [],
      source: config.providerName
    };
  }

  try {
    const [statsResult, h2hResult] = await Promise.allSettled([
      fetchMatchStatistics(sport, config, match, competition),
      fetchHeadToHead(sport, config, match, competition)
    ]);
    const stats = statsResult.status === "fulfilled" ? statsResult.value : [];
    const h2h = h2hResult.status === "fulfilled" ? h2hResult.value : [];

    return {
      status: "live",
      message: stats.length > 0 || h2h.length > 0
        ? `Match analysis loaded from ${config.providerName}.`
        : `${config.providerName} returned the fixture but no detailed comparison rows yet.`,
      stats,
      h2h,
      source: config.providerName
    };
  } catch {
    return {
      status: "error",
      message: `${config.providerName} match analysis request failed. Showing model comparison fallback.`,
      stats: [],
      h2h: [],
      source: config.providerName
    };
  }
}

function getFootballSnapshotMessage(
  matchCount: number,
  standingCount: number,
  teamCount: number,
  competitionType: FootballCompetition["type"],
  errors: unknown[] = []
): string {
  const planError = errors.map(getErrorMessage).find((message) => message.toLowerCase().includes("free plans"));
  const limitError = errors.map(getErrorMessage).find((message) => message.toLowerCase().includes("request limit"));
  if (limitError && matchCount === 0 && standingCount === 0 && teamCount === 0) {
    return "API-Football daily request limit reached. Showing local fallback data.";
  }

  if (planError && matchCount === 0 && standingCount === 0) {
    return `API-Football key is active, but the current plan blocks this request: ${planError}`;
  }

  if (matchCount > 0 && (standingCount > 0 || competitionType !== "league")) {
    return "Live football data loaded from API-Football.";
  }

  if (teamCount > 0) {
    return "Live team logos loaded from API-Football. Fixtures or standings are using fallback data.";
  }

  if (matchCount > 0) {
    return "Live fixtures loaded from API-Football. Standings are using local fallback data.";
  }

  if (standingCount > 0) {
    return "Live standings loaded from API-Football. Fixtures are using local fallback data.";
  }

  return "API-Football responded, but no live rows were available for this league and season. Showing local fallback data.";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function fallbackTeamsToStandings(teams: FootballTeam[]): SportApiStanding[] {
  return teams.map((team) => ({
    rank: team.rank,
    teamName: team.name,
    teamLogo: null,
    played: 34,
    won: Math.max(0, Math.round((team.points ?? 0) / 3)),
    drawn: Math.max(0, (team.points ?? 0) % 3),
    lost: Math.max(0, 34 - Math.round((team.points ?? 0) / 3) - ((team.points ?? 0) % 3)),
    goalsFor: null,
    goalsAgainst: null,
    goalDiff: null,
    points: team.points,
    form: team.form,
    detail: team.prediction
  }));
}

async function fetchMatches(
  sport: ApiSportId,
  config: SportConfig,
  query: Record<string, string>,
  limit = 8
): Promise<SportApiMatch[]> {
  const data = await fetchApiSports<any>(config, config.gamesPath, query);
  const normalizers: Record<ApiSportId, (item: any) => SportApiMatch> = {
    football: normalizeFootballFixture,
    nfl: normalizeAmericanFootballGame,
    nba: normalizeNbaGame,
    tennis: normalizeTennisFixture
  };

  return data.map(normalizers[sport]).filter((match) => match.homeName && match.awayName).slice(0, limit);
}

async function fetchBestSportMatches(sport: ApiSportId, config: SportConfig): Promise<{ matches: SportApiMatch[]; query: Record<string, string> }> {
  const queries = getSportSnapshotQueries(sport, config);

  if (sport === "nba" || sport === "nfl") {
    const results = await Promise.all(
      queries.map((query) =>
        fetchMatches(sport, config, query, getSportMatchLimit(sport))
          .then((matches) => ({ matches, query }))
          .catch(() => ({ matches: [] as SportApiMatch[], query }))
      )
    );
    const best = results.find((result) => result.matches.length > 0);

    return best ?? { matches: [], query: queries[0] ?? config.defaultQuery() };
  }

  for (const query of queries) {
    const matches = await fetchMatches(sport, config, query, getSportMatchLimit(sport)).catch(() => []);

    if (matches.length > 0) {
      return { matches, query };
    }
  }

  return { matches: [], query: queries[0] ?? config.defaultQuery() };
}

function getSportSnapshotQueries(sport: ApiSportId, config: SportConfig) {
  const defaultQuery = config.defaultQuery();

  if (sport === "tennis") {
    const limit = process.env.API_TENNIS_MATCH_LIMIT ?? process.env.API_SPORTS_MATCH_LIMIT ?? "24";
    return [
      { next: limit },
      { last: limit }
    ];
  }

  if (sport === "nba" || sport === "nfl") {
    const currentSeason = getCurrentUsSportSeason();
    const configuredSeason = sport === "nba" ? process.env.API_NBA_SEASON : process.env.API_NFL_SEASON;
    const seasonCandidates = uniqueStrings([
      String(currentSeason),
      String(currentSeason + 1),
      configuredSeason,
      String(currentSeason - 1)
    ]);

    return seasonCandidates.map((season) => ({
      ...defaultQuery,
      season
    }));
  }

  return [defaultQuery];
}

function getSportMatchLimit(sport: ApiSportId) {
  const configured = Number(
    sport === "tennis"
      ? process.env.API_TENNIS_MATCH_LIMIT ?? process.env.API_SPORTS_MATCH_LIMIT
      : process.env.API_SPORTS_MATCH_LIMIT
  );

  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }

  return sport === "tennis" ? 24 : 80;
}

async function fetchFootballStandings(config: SportConfig, query: Record<string, string>): Promise<SportApiStanding[]> {
  const data = await fetchApiSports<any>(config, "/standings", query);
  const rows = data[0]?.league?.standings?.[0];

  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row: any) => ({
    rank: toNumber(row.rank) ?? 0,
    teamName: getString(row.team?.name),
    teamLogo: getString(row.team?.logo),
    played: toNumber(row.all?.played),
    won: toNumber(row.all?.win),
    drawn: toNumber(row.all?.draw),
    lost: toNumber(row.all?.lose),
    goalsFor: toNumber(row.all?.goals?.for),
    goalsAgainst: toNumber(row.all?.goals?.against),
    goalDiff: toNumber(row.goalsDiff),
    points: toNumber(row.points),
    form: getString(row.form),
    detail: toNumber(row.goalsDiff) === null ? null : `${row.goalsDiff} GD`
  })).filter((row: SportApiStanding) => row.rank > 0 && row.teamName);
}

async function fetchFootballTeams(config: SportConfig, query: Record<string, string>): Promise<SportApiTeam[]> {
  const data = await fetchApiSports<any>(config, "/teams", query);

  return data
    .map((item: any): SportApiTeam => ({
      id: String(item.team?.id ?? ""),
      name: getString(item.team?.name),
      logo: getString(item.team?.logo) || null
    }))
    .filter((team) => team.name);
}

async function fetchSportTeams(config: SportConfig, query: Record<string, string>): Promise<SportApiTeam[]> {
  const data = await fetchApiSports<any>(config, "/teams", query);

  return data
    .map((item: any): SportApiTeam => ({
      id: String(item.team?.id ?? item.id ?? ""),
      name: getString(item.team?.name || item.name),
      logo: getString(item.team?.logo || item.logo) || null
    }))
    .filter((team) => team.name);
}

async function fetchTheSportsDbSnapshot(
  sport: ApiSportId,
  league: TheSportsDbLeagueRef
): Promise<SportApiSnapshot | null> {
  const apiKey = getTheSportsDbKey();
  if (!apiKey) {
    return null;
  }

  const [teams, events] = await Promise.all([
    fetchTheSportsDbTeams(league).catch(() => []),
    fetchTheSportsDbLeagueEvents(sport, league).catch(() => [])
  ]);
  const matches = hydrateTheSportsDbEventLogos(events, teams);

  return {
    sport,
    provider: "thesportsdb",
    status: "live",
    message: `Live data loaded from TheSportsDB Premium for ${league.name}.`,
    matches,
    standings: [],
    teams
  };
}

async function fetchTheSportsDbLeagueEvents(sport: ApiSportId, league: TheSportsDbLeagueRef): Promise<SportApiMatch[]> {
  const leagueId = await resolveTheSportsDbLeagueId(league);
  if (!leagueId) {
    return [];
  }

  const seasons = getTheSportsDbSeasonCandidates();
  const [v2NextEvents, v2PastEvents, v2SeasonEvents, v2LiveEvents, v2SportLiveEvents, nextEvents, pastEvents, seasonEvents] = await Promise.all([
    fetchTheSportsDbV2Events(`schedule/next/league/${leagueId}`),
    fetchTheSportsDbV2Events(`schedule/previous/league/${leagueId}`),
    fetchTheSportsDbV2SeasonEvents(leagueId, seasons),
    fetchTheSportsDbV2Events(`livescore/${leagueId}`),
    fetchTheSportsDbSportLiveEvents(sport, leagueId, league.name),
    fetchTheSportsDbList<any>("eventsnextleague.php", { id: leagueId }, "events"),
    fetchTheSportsDbList<any>("eventspastleague.php", { id: leagueId }, "events"),
    fetchTheSportsDbSeasonEvents(leagueId, seasons)
  ]);
  const limit = getTheSportsDbMatchLimit();

  const merged = mergeMatches([
    ...v2SeasonEvents.map(normalizeTheSportsDbEvent),
    ...v2NextEvents.map(normalizeTheSportsDbEvent),
    ...v2PastEvents.map(normalizeTheSportsDbEvent),
    ...v2LiveEvents.map(normalizeTheSportsDbEvent),
    ...v2SportLiveEvents.map(normalizeTheSportsDbEvent),
    ...seasonEvents.map(normalizeTheSportsDbEvent),
    ...nextEvents.map(normalizeTheSportsDbEvent),
    ...pastEvents.map(normalizeTheSportsDbEvent)
  ], [])
    .filter((match) => match.homeName && match.awayName);

  if (merged.length > 0) {
    return limitMatchesWithUpcomingPriority(merged, limit);
  }

  const dayEvents = await fetchTheSportsDbUpcomingDayEvents(sport, leagueId, league.name);
  const dayMatches = mergeMatches(dayEvents.map(normalizeTheSportsDbEvent), [])
    .filter((match) => match.homeName && match.awayName);

  return limitMatchesWithUpcomingPriority(dayMatches, limit);
}

async function fetchTheSportsDbTeams(league: TheSportsDbLeagueRef): Promise<SportApiTeam[]> {
  const rows = await fetchTheSportsDbList<any>("search_all_teams.php", { l: league.name }, "teams");

  return rows
    .map((team: any): SportApiTeam => ({
      id: getString(team.idTeam),
      name: getString(team.strTeam),
      logo: getString(team.strBadge || team.strTeamBadge || team.strLogo || team.strTeamLogo) || null
    }))
    .filter((team) => team.name);
}

async function fetchTheSportsDbList<T>(
  path: string,
  query: Record<string, string>,
  key: "events" | "teams"
): Promise<T[]> {
  const payload = await fetchTheSportsDb<Record<string, unknown>>(path, query);
  return findTheSportsDbRows<T>(payload, key);
}

async function fetchTheSportsDb<T>(path: string, query: Record<string, string>): Promise<T | null> {
  const apiKey = getTheSportsDbKey();
  if (!apiKey) {
    return null;
  }

  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey}/${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.THE_SPORTS_DB_FETCH_TIMEOUT_MS ?? 6000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 6000);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: controller.signal,
    next: { revalidate: Number(process.env.THE_SPORTS_DB_CACHE_SECONDS ?? 300) }
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

async function fetchTheSportsDbV2Events(path: string): Promise<any[]> {
  const payload = await fetchTheSportsDbV2<Record<string, unknown>>(path);
  return findTheSportsDbRows<any>(payload, "events");
}

async function fetchTheSportsDbV2SeasonEvents(leagueId: string, seasons: string[]) {
  const results = await Promise.all(
    seasons.map((season) => fetchTheSportsDbV2Events(`schedule/league/${leagueId}/${encodeURIComponent(season)}`).catch(() => []))
  );

  return results.flat();
}

async function fetchTheSportsDbV2<T>(path: string): Promise<T | null> {
  const apiKey = getTheSportsDbKey();
  if (!apiKey) {
    return null;
  }

  const cleanedPath = path.replace(/^\/+/, "");
  const url = new URL(`https://www.thesportsdb.com/api/v2/json/${cleanedPath}`);
  const controller = new AbortController();
  const timeoutMs = Number(process.env.THE_SPORTS_DB_FETCH_TIMEOUT_MS ?? 6000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 6000);

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": apiKey,
      accept: "application/json"
    },
    signal: controller.signal,
    next: { revalidate: Number(process.env.THE_SPORTS_DB_CACHE_SECONDS ?? 300) }
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

function findTheSportsDbRows<T>(payload: unknown, preferredKey: "events" | "teams"): T[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const direct = (payload as Record<string, unknown>)[preferredKey];
  if (Array.isArray(direct)) {
    return direct as T[];
  }

  const candidates = findArrays(payload);
  const preferred = candidates.find((rows) => rows.some((row) => rowLooksLikeTheSportsDbRow(row, preferredKey)));

  return (preferred ?? []) as T[];
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

function rowLooksLikeTheSportsDbRow(row: unknown, preferredKey: "events" | "teams") {
  if (!row || typeof row !== "object") {
    return false;
  }

  const value = row as Record<string, unknown>;
  if (preferredKey === "teams") {
    return Boolean(value.idTeam || value.strTeam || value.team || value.name);
  }

  return Boolean(
    value.idEvent ||
    value.strEvent ||
    value.strHomeTeam ||
    value.strAwayTeam ||
    value.homeTeam ||
    value.awayTeam ||
    value.home_team ||
    value.away_team
  );
}

function normalizeTheSportsDbEvent(event: any): SportApiMatch {
  const eventName = getString(event.strEvent || event.event || event.name);
  const [parsedHome, parsedAway] = eventName.includes(" vs ")
    ? eventName.split(" vs ").map((value) => value.trim())
    : ["", ""];
  const date = getTheSportsDbEventDate(event);

  return {
    id: `tsdb:${getString(event.idEvent || event.id || event.eventId)}`,
    competition: getString(event.strLeague || event.league || event.leagueName) || "TheSportsDB",
    round: getString(event.intRound || event.strRound || event.round) || null,
    date,
    venue: getString(event.strVenue || event.venue) || null,
    homeId: getString(event.idHomeTeam || event.homeTeamId || event.home_id) || null,
    homeName: getString(event.strHomeTeam || event.homeTeam || event.home_team || event.home?.name) || parsedHome,
    awayId: getString(event.idAwayTeam || event.awayTeamId || event.away_id) || null,
    awayName: getString(event.strAwayTeam || event.awayTeam || event.away_team || event.away?.name) || parsedAway,
    homeLogo: getString(event.strHomeTeamBadge || event.strHomeBadge || event.homeBadge || event.homeLogo || event.home?.badge || event.home?.logo) || null,
    awayLogo: getString(event.strAwayTeamBadge || event.strAwayBadge || event.awayBadge || event.awayLogo || event.away?.badge || event.away?.logo) || null,
    homeScore: toNumber(event.intHomeScore ?? event.homeScore ?? event.home_score ?? event.home?.score),
    awayScore: toNumber(event.intAwayScore ?? event.awayScore ?? event.away_score ?? event.away?.score),
    status: getString(event.strStatus || event.strProgress || event.strResult) || null
  };
}

function hydrateTheSportsDbEventLogos(matches: SportApiMatch[], teams: SportApiTeam[]) {
  return matches.map((match) => {
    const home = teams.find((team) => team.id === match.homeId || namesMatch(team.name, match.homeName));
    const away = teams.find((team) => team.id === match.awayId || namesMatch(team.name, match.awayName));

    return {
      ...match,
      homeLogo: match.homeLogo ?? home?.logo ?? null,
      awayLogo: match.awayLogo ?? away?.logo ?? null
    };
  });
}

function mergeMatches(primary: SportApiMatch[], secondary: SportApiMatch[]): SportApiMatch[] {
  const seen = new Set<string>();
  const merged: SportApiMatch[] = [];

  for (const match of [...primary, ...secondary]) {
    const key = getMatchDedupeKey(match);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(match);
  }

  return merged.sort(sortMatchesByDate);
}

function mergeTeams(primary: SportApiTeam[], secondary: SportApiTeam[]): SportApiTeam[] {
  const merged = new Map<string, SportApiTeam>();

  for (const team of [...primary, ...secondary]) {
    const key = normalizeName(team.name);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, team);
      continue;
    }

    merged.set(key, {
      id: existing.id || team.id,
      name: existing.name || team.name,
      logo: existing.logo || team.logo
    });
  }

  return Array.from(merged.values());
}

function getMatchDedupeKey(match: SportApiMatch) {
  const dateKey = match.date ? match.date.slice(0, 10) : "";
  const teamKey = `${normalizeName(match.homeName)}:${normalizeName(match.awayName)}`;

  return `${dateKey}:${teamKey}:${normalizeName(match.competition)}`;
}

function sortMatchesByDate(left: SportApiMatch, right: SportApiMatch) {
  const leftTime = left.date ? new Date(left.date).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.date ? new Date(right.date).getTime() : Number.MAX_SAFE_INTEGER;

  return (Number.isFinite(leftTime) ? leftTime : Number.MAX_SAFE_INTEGER) -
    (Number.isFinite(rightTime) ? rightTime : Number.MAX_SAFE_INTEGER);
}

function limitMatchesWithUpcomingPriority(matches: SportApiMatch[], limit: number) {
  const now = Date.now();
  const upcoming = matches
    .filter((match) => {
      const timestamp = getSportApiMatchTimestamp(match);
      return timestamp !== null && timestamp >= now && !isCompletedSportApiMatch(match);
    })
    .sort(sortMatchesByDate);
  const pastOrUnscheduled = matches
    .filter((match) => !upcoming.includes(match))
    .sort((left, right) => sortMatchesByDate(right, left));

  return [...upcoming, ...pastOrUnscheduled].slice(0, limit);
}

function getSportApiMatchTimestamp(match: SportApiMatch) {
  if (!match.date) {
    return null;
  }

  const timestamp = new Date(match.date).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isCompletedSportApiMatch(match: SportApiMatch) {
  const status = (match.status ?? "").toLowerCase();
  return Boolean(match.homeScore !== null && match.awayScore !== null) ||
    status.includes("ft") ||
    status.includes("final") ||
    status.includes("finished");
}

function getTheSportsDbKey() {
  return getFirstEnv(["THE_SPORTS_DB_API_KEY", "THE_SPORTSDB_API_KEY", "THESPORTSDB_API_KEY"]);
}

function getTheSportsDbLeagueId(league: TheSportsDbLeagueRef) {
  const override = process.env[`THE_SPORTS_DB_${toEnvKey(league.name)}_LEAGUE_ID`];
  return override ?? league.id ?? "";
}

async function resolveTheSportsDbLeagueId(league: TheSportsDbLeagueRef) {
  const configured = getTheSportsDbLeagueId(league);
  const lookupNames = getTheSportsDbLeagueLookupNames(league);
  const rows = await getTheSportsDbLeagueRowsCached();
  const match = rows.find((row) => {
    const rowName = getTheSportsDbLeagueName(row);
    return lookupNames.some((lookupName) => namesMatch(rowName, lookupName));
  });

  const resolved = getString(match?.idLeague || match?.id || match?.leagueId);
  if (resolved) {
    return resolved;
  }

  if (configured) {
    return configured;
  }

  return "";
}

function getTheSportsDbLeagueRowsCached() {
  theSportsDbLeagueRowsPromise ??= Promise.all([
    fetchTheSportsDbV2LeagueRows().catch(() => []),
    fetchTheSportsDbLeagueRows().catch(() => [])
  ]).then((results) => results.flat());

  return theSportsDbLeagueRowsPromise;
}

async function fetchTheSportsDbLeagueRows() {
  const payload = await fetchTheSportsDb<Record<string, unknown>>("all_leagues.php", {});
  return findTheSportsDbLeagueRows(payload);
}

async function fetchTheSportsDbV2LeagueRows() {
  const payload = await fetchTheSportsDbV2<Record<string, unknown>>("all/leagues");
  return findTheSportsDbLeagueRows(payload);
}

function findTheSportsDbLeagueRows(payload: unknown): any[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const direct = (payload as Record<string, unknown>).leagues;
  if (Array.isArray(direct)) {
    return direct;
  }

  return findArrays(payload)
    .find((rows) => rows.some((row) => {
      if (!row || typeof row !== "object") {
        return false;
      }

      const value = row as Record<string, unknown>;
      return Boolean(value.idLeague || value.strLeague || value.leagueName || value.name);
    })) ?? [];
}

function getTheSportsDbLeagueName(row: any) {
  return getString(row.strLeague || row.leagueName || row.name || row.league);
}

function getTheSportsDbLeagueLookupNames(league: TheSportsDbLeagueRef) {
  return uniqueStrings([league.name, ...(league.aliases ?? [])]);
}

async function fetchTheSportsDbSportLiveEvents(sport: ApiSportId, leagueId: string, leagueName: string): Promise<any[]> {
  const results = await Promise.all(
    THE_SPORTS_DB_SPORT_PATHS[sport].map((path) =>
      fetchTheSportsDbV2Events(`livescore/${path}`)
        .then((rows) => filterTheSportsDbRowsForLeague(rows, leagueId, leagueName))
        .catch(() => [])
    )
  );

  return results.flat();
}

async function fetchTheSportsDbUpcomingDayEvents(sport: ApiSportId, leagueId: string, leagueName: string): Promise<any[]> {
  const days = getUpcomingIsoDates(Number(process.env.THE_SPORTS_DB_DAY_SCAN_DAYS ?? 28));
  const leagueParam = leagueName.replace(/\s+/g, "_");
  const sportName = THE_SPORTS_DB_V1_SPORT_NAMES[sport];
  const results = await Promise.all(
    days.flatMap((date) => [
      fetchTheSportsDbV2Events(`schedule/day/${date}/league/${leagueId}`).catch(() => []),
      fetchTheSportsDbV2Events(`schedule/league/${leagueId}/day/${date}`).catch(() => []),
      fetchTheSportsDbV2Events(`schedule/day/${date}`).then((rows) => filterTheSportsDbRowsForLeague(rows, leagueId, leagueName)).catch(() => []),
      ...THE_SPORTS_DB_SPORT_PATHS[sport].flatMap((path) => [
        fetchTheSportsDbV2Events(`schedule/day/${date}/${path}`).then((rows) => filterTheSportsDbRowsForLeague(rows, leagueId, leagueName)).catch(() => []),
        fetchTheSportsDbV2Events(`schedule/${path}/day/${date}`).then((rows) => filterTheSportsDbRowsForLeague(rows, leagueId, leagueName)).catch(() => [])
      ]),
      fetchTheSportsDbList<any>("eventsday.php", { d: date, l: leagueParam }, "events").catch(() => []),
      fetchTheSportsDbList<any>("eventsday.php", { d: date, l: leagueName }, "events").catch(() => []),
      fetchTheSportsDbList<any>("eventsday.php", { d: date, s: sportName }, "events").then((rows) => filterTheSportsDbRowsForLeague(rows, leagueId, leagueName)).catch(() => [])
    ])
  );

  return results.flat();
}

function filterTheSportsDbRowsForLeague(rows: any[], leagueId: string, leagueName: string) {
  return rows.filter((row) => {
    const rowLeagueId = getString(row.idLeague || row.leagueId || row.league_id);
    const rowLeagueName = getTheSportsDbLeagueName(row);

    return rowLeagueId === leagueId || namesMatch(rowLeagueName, leagueName);
  });
}

function getUpcomingIsoDates(dayCount: number) {
  const safeDayCount = Number.isFinite(dayCount) && dayCount > 0 ? Math.min(dayCount, 90) : 28;
  const today = new Date();

  return Array.from({ length: safeDayCount }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + index));
    return date.toISOString().slice(0, 10);
  });
}

async function fetchTheSportsDbSeasonEvents(leagueId: string, seasons: string[]) {
  const results = await Promise.all(
    seasons.map((season) =>
      fetchTheSportsDbList<any>("eventsseason.php", { id: leagueId, s: season }, "events").catch(() => [])
    )
  );

  return results.flat();
}

function getTheSportsDbSeasonCandidates() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const configured = process.env.THE_SPORTS_DB_SEASON ?? process.env.API_FOOTBALL_SEASON;

  return uniqueStrings([
    configured,
    `${year}-${year + 1}`,
    `${year - 1}-${year}`,
    String(year),
    String(year - 1)
  ]);
}

function getTheSportsDbMatchLimit() {
  const configured = Number(process.env.THE_SPORTS_DB_MATCH_LIMIT ?? 1500);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 1500;
  }

  return Math.max(configured, 1500);
}

function getTheSportsDbEventDate(event: any) {
  const timestamp = getString(event.strTimestamp);
  if (timestamp) {
    return new Date(timestamp).toISOString();
  }

  const date = getString(event.dateEvent || event.dateEventLocal);
  if (!date) {
    return null;
  }

  const time = getString(event.strTime || event.strTimeLocal).replace(/\+00:00$/, "");
  const raw = time ? `${date}T${time}` : `${date}T00:00:00`;
  const parsed = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);

  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
}

async function fetchApiSports<T>(
  config: SportConfig,
  path: string,
  query: Record<string, string>
): Promise<T[]> {
  const apiKey = getFirstEnv(config.keyEnv);
  if (!apiKey) {
    return [];
  }

  const url = new URL(path, config.host);
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.API_SPORTS_FETCH_TIMEOUT_MS ?? 6000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 6000);

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
      accept: "application/json"
    },
    signal: controller.signal,
    next: { revalidate: config.cacheSeconds?.() ?? Number(process.env.API_SPORTS_CACHE_SECONDS ?? 300) }
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json() as ApiSportsResponse<T>;
  if (hasApiSportsErrors(payload.errors)) {
    return [];
  }

  return Array.isArray(payload.response) ? payload.response : [];
}

function normalizeFootballFixture(item: any): SportApiMatch {
  return {
    id: String(item.fixture?.id ?? ""),
    competition: getString(item.league?.name) || "Football",
    round: getString(item.league?.round) || null,
    date: getString(item.fixture?.date) || null,
    venue: getString(item.fixture?.venue?.name || item.fixture?.venue?.city) || null,
    homeId: getString(item.teams?.home?.id),
    homeName: getString(item.teams?.home?.name),
    awayId: getString(item.teams?.away?.id),
    awayName: getString(item.teams?.away?.name),
    homeLogo: getString(item.teams?.home?.logo) || null,
    awayLogo: getString(item.teams?.away?.logo) || null,
    homeScore: toNumber(item.goals?.home ?? item.score?.fulltime?.home),
    awayScore: toNumber(item.goals?.away ?? item.score?.fulltime?.away),
    status: getString(item.fixture?.status?.short || item.fixture?.status?.long) || null
  };
}

function getFootballMatchLimit() {
  const configured = Number(process.env.API_FOOTBALL_MATCH_LIMIT ?? process.env.API_SPORTS_MATCH_LIMIT ?? 500);

  if (!Number.isFinite(configured) || configured <= 0) {
    return 500;
  }

  return configured;
}

function normalizeAmericanFootballGame(item: any): SportApiMatch {
  const gameDate = getString(item.game?.date?.date || item.game?.date || item.date?.date || item.date);

  return {
    id: String(item.game?.id ?? item.id ?? ""),
    competition: getString(item.league?.name) || "NFL",
    date: gameDate || null,
    venue: getString(item.game?.venue?.name || item.venue?.name) || null,
    homeId: getString(item.teams?.home?.id || item.home?.id),
    homeName: getString(item.teams?.home?.name || item.home?.name),
    awayId: getString(item.teams?.away?.id || item.away?.id),
    awayName: getString(item.teams?.away?.name || item.away?.name),
    homeLogo: getString(item.teams?.home?.logo || item.home?.logo) || null,
    awayLogo: getString(item.teams?.away?.logo || item.away?.logo) || null,
    homeScore: toNumber(item.scores?.home?.total || item.score?.home),
    awayScore: toNumber(item.scores?.away?.total || item.score?.away),
    status: getString(item.game?.status?.short || item.status?.short || item.status?.long) || null
  };
}

function normalizeNbaGame(item: any): SportApiMatch {
  return {
    id: String(item.id ?? ""),
    competition: getString(item.league) || "NBA",
    date: getString(item.date?.start || item.date) || null,
    venue: getString(item.arena?.name || item.venue?.name) || null,
    homeId: getString(item.teams?.home?.id),
    homeName: getString(item.teams?.home?.name),
    awayId: getString(item.teams?.visitors?.id || item.teams?.away?.id),
    awayName: getString(item.teams?.visitors?.name || item.teams?.away?.name),
    homeLogo: getString(item.teams?.home?.logo) || null,
    awayLogo: getString(item.teams?.visitors?.logo || item.teams?.away?.logo) || null,
    homeScore: toNumber(item.scores?.home?.points),
    awayScore: toNumber(item.scores?.visitors?.points || item.scores?.away?.points),
    status: getString(item.status?.short || item.status?.long || item.status) || null
  };
}

function normalizeTennisFixture(item: any): SportApiMatch {
  return {
    id: String(item.id ?? item.fixture?.id ?? ""),
    competition: getString(item.tournament?.name || item.league?.name) || "Tennis",
    date: getString(item.date || item.fixture?.date) || null,
    venue: getString(item.tournament?.city || item.venue?.name) || null,
    homeId: getString(item.players?.first?.id || item.player?.first?.id),
    homeName: getString(item.players?.first?.name || item.player?.first?.name || item.home?.name),
    awayId: getString(item.players?.second?.id || item.player?.second?.id),
    awayName: getString(item.players?.second?.name || item.player?.second?.name || item.away?.name),
    homeLogo: getString(item.players?.first?.logo || item.player?.first?.logo) || null,
    awayLogo: getString(item.players?.second?.logo || item.player?.second?.logo) || null,
    homeScore: toNumber(item.scores?.home || item.score?.home),
    awayScore: toNumber(item.scores?.away || item.score?.away),
    status: getString(item.status?.short || item.status?.long || item.status) || null
  };
}

async function fetchMatchStatistics(
  sport: ApiSportId,
  config: SportConfig,
  match: SportApiMatch,
  competition?: FootballCompetition
): Promise<SportApiStatRow[]> {
  if (sport === "football") {
    if (!match.id || match.id.startsWith("fallback:")) {
      return fetchFootballTeamComparisonStats(config, match, competition);
    }

    const data = await fetchApiSports<any>(config, "/fixtures/statistics", { fixture: match.id });
    const fixtureStats = normalizePairedStatRows(data, match);

    return fixtureStats.length > 0 ? fixtureStats : fetchFootballTeamComparisonStats(config, match, competition);
  }

  if (sport === "nba") {
    const gameStats = match.id && !match.id.startsWith("fallback:")
      ? await fetchApiSports<any>(config, "/games/statistics", { id: match.id }).then((data) => normalizeNbaStatRows(data, match))
      : [];

    return gameStats.length > 0 ? gameStats : fetchNbaTeamComparisonStats(config, match);
  }

  if (sport === "nfl") {
    const gameStats = match.id && !match.id.startsWith("fallback:")
      ? await fetchFirstNonEmpty([
          () => fetchApiSports<any>(config, "/games/statistics", { game: match.id }).then((data) => normalizeAmericanFootballStatRows(data, match)),
          () => fetchApiSports<any>(config, "/games/statistics", { id: match.id }).then((data) => normalizeAmericanFootballStatRows(data, match))
        ])
      : [];

    return gameStats.length > 0 ? gameStats : fetchNflTeamComparisonStats(config, match);
  }

  if (!match.id || match.id.startsWith("fallback:")) {
    return [];
  }

  const data = await fetchApiSports<any>(config, "/fixtures/statistics", { fixture: match.id });
  return normalizePairedStatRows(data, match);
}

async function fetchHeadToHead(
  sport: ApiSportId,
  config: SportConfig,
  match: SportApiMatch,
  competition?: FootballCompetition
): Promise<SportApiMatch[]> {
  if (!match.homeId || !match.awayId || match.id.startsWith("fallback:")) {
    return [];
  }

  if (sport === "football") {
    return fetchMatches("football", config, { h2h: `${match.homeId}-${match.awayId}` }, 5);
  }

  if (sport === "nba") {
    return fetchMatches("nba", config, { h2h: `${match.homeId}-${match.awayId}` }, 5);
  }

  if (sport === "nfl") {
    const season = process.env.API_NFL_SEASON ?? getCurrentSeason();
    return fetchMatches("nfl", config, { team: match.homeId, season }, 8)
      .then((rows) => rows.filter((entry) => entry.homeId === match.awayId || entry.awayId === match.awayId).slice(0, 5));
  }

  const rows = await fetchMatches("tennis", config, { h2h: `${match.homeId}-${match.awayId}` }, 5);
  return rows.length > 0 ? rows : competition ? [] : [];
}

function normalizePairedStatRows(data: any[], match: SportApiMatch): SportApiStatRow[] {
  const home = data.find((entry) => namesMatch(getString(entry.team?.name), match.homeName)) ?? data[0];
  const away = data.find((entry) => namesMatch(getString(entry.team?.name), match.awayName)) ?? data[1];
  const homeStats = arrayToStatMap(home?.statistics);
  const awayStats = arrayToStatMap(away?.statistics);
  const labels = [...new Set([...homeStats.keys(), ...awayStats.keys()])];

  return labels.map((label) => ({
    label,
    home: homeStats.get(label) ?? null,
    away: awayStats.get(label) ?? null
  })).filter((row) => row.home !== null || row.away !== null);
}

function normalizeNbaStatRows(data: any[], match: SportApiMatch): SportApiStatRow[] {
  const home = data.find((entry) => namesMatch(getString(entry.team?.name), match.homeName)) ?? data[0];
  const away = data.find((entry) => namesMatch(getString(entry.team?.name), match.awayName)) ?? data[1];
  const homeStats = getNestedStatObject(home);
  const awayStats = getNestedStatObject(away);
  const fields = [
    ["Points", "points"],
    ["Field goals", "fgm", "fga"],
    ["FG%", "fgp"],
    ["3PT", "tpm", "tpa"],
    ["3PT%", "tpp"],
    ["Free throws", "ftm", "fta"],
    ["Rebounds", "totReb"],
    ["Assists", "assists"],
    ["Steals", "steals"],
    ["Blocks", "blocks"],
    ["Turnovers", "turnovers"]
  ] as const;

  return fields.map(([label, primary, secondary]) => ({
    label,
    home: formatStatPair(readStatValue(homeStats, primary), secondary ? readStatValue(homeStats, secondary) : undefined),
    away: formatStatPair(readStatValue(awayStats, primary), secondary ? readStatValue(awayStats, secondary) : undefined)
  })).filter((row) => row.home !== null || row.away !== null);
}

function normalizeAmericanFootballStatRows(data: any[], match: SportApiMatch): SportApiStatRow[] {
  const rows = normalizePairedStatRows(data, match);

  if (rows.length > 0) {
    return rows;
  }

  const home = getNestedStatObject(data.find((entry) => namesMatch(getString(entry.team?.name), match.homeName)) ?? data[0]);
  const away = getNestedStatObject(data.find((entry) => namesMatch(getString(entry.team?.name), match.awayName)) ?? data[1]);
  const fields = [
    ["First Downs", "first_downs", "firstDowns"],
    ["Total Yards", "total_yards", "totalYards", "yards.total"],
    ["Passing Yards", "passing_yards", "passingYards", "yards.passing"],
    ["Rushing Yards", "rushing_yards", "rushingYards", "yards.rushing"],
    ["Turnovers", "turnovers", "turnover"],
    ["Possession Time", "possession_time", "possessionTime"],
    ["Penalties", "penalties"]
  ] as const;

  return fields.map(([label, ...keys]) => ({
    label,
    home: firstStatValue(home, keys),
    away: firstStatValue(away, keys)
  })).filter((row) => row.home !== null || row.away !== null);
}

async function fetchFootballTeamComparisonStats(
  config: SportConfig,
  match: SportApiMatch,
  competition?: FootballCompetition
): Promise<SportApiStatRow[]> {
  const homeId = match.homeId ?? extractApiSportsIdFromLogo(match.homeLogo);
  const awayId = match.awayId ?? extractApiSportsIdFromLogo(match.awayLogo);

  if (!homeId || !awayId) {
    return [];
  }

  const primaryLeague = competition
    ? process.env[`API_FOOTBALL_${toEnvKey(competition.slug)}_LEAGUE_ID`] ?? FOOTBALL_LEAGUE_IDS[competition.slug]
    : process.env.API_FOOTBALL_LEAGUE_ID ?? "39";
  const season = process.env.API_FOOTBALL_SEASON ?? getCurrentSeason();
  const [homeRows, awayRows] = await Promise.all([
    fetchFootballTeamStatsWithLeagueFallback(config, homeId, primaryLeague, season),
    fetchFootballTeamStatsWithLeagueFallback(config, awayId, primaryLeague, season)
  ]);
  const home = homeRows[0] ?? {};
  const away = awayRows[0] ?? {};
  const fields = [
    ["Goals For", "goals.for.total.total", "goals.for.average.total"],
    ["Goals Against", "goals.against.total.total", "goals.against.average.total"],
    ["Clean Sheets", "clean_sheet.total"],
    ["Failed To Score", "failed_to_score.total"],
    ["Penalties Scored", "penalty.scored.total"],
    ["Cards Yellow", "cards.yellow.total.total"],
    ["Cards Red", "cards.red.total.total"]
  ] as const;

  return fields.map(([label, ...keys]) => ({
    label,
    home: firstStatValue(home, keys),
    away: firstStatValue(away, keys)
  })).filter((row) => row.home !== null || row.away !== null);
}

function extractApiSportsIdFromLogo(logo: string | null) {
  return logo?.match(/\/teams\/(\d+)\.png(?:\?|$)/)?.[1] ?? null;
}

async function fetchFootballTeamStatsWithLeagueFallback(
  config: SportConfig,
  teamId: string,
  primaryLeague: string | undefined,
  primarySeason: string
) {
  const currentSeason = Number(getCurrentSeason());
  const seasons = uniqueStrings([
    primarySeason,
    String(currentSeason),
    String(currentSeason - 1),
    String(currentSeason - 2)
  ]);
  const leagues = uniqueStrings([
    primaryLeague,
    FOOTBALL_LEAGUE_IDS["bundesliga"],
    FOOTBALL_LEAGUE_IDS["premier-league"],
    FOOTBALL_LEAGUE_IDS["la-liga"],
    FOOTBALL_LEAGUE_IDS["ligue-1"],
    FOOTBALL_LEAGUE_IDS["serie-a"],
    FOOTBALL_LEAGUE_IDS["champions-league"],
    FOOTBALL_LEAGUE_IDS["europa-league"],
    FOOTBALL_LEAGUE_IDS["conference-league"]
  ]);

  for (const season of seasons) {
    for (const league of leagues) {
      const rows = await fetchApiSports<any>(config, "/teams/statistics", { league, season, team: teamId }).catch(() => []);

      if (rows.length > 0) {
        return rows;
      }
    }
  }

  return [];
}

async function fetchNbaTeamComparisonStats(config: SportConfig, match: SportApiMatch): Promise<SportApiStatRow[]> {
  const [homeId, awayId] = await resolveMatchTeamIds(config, match);

  if (!homeId || !awayId) {
    return [];
  }

  const season = getSeasonFromMatch(match, process.env.API_NBA_SEASON ?? getCurrentUsSportSeason());
  const [homeRows, awayRows] = await Promise.all([
    fetchApiSports<any>(config, "/teams/statistics", { id: homeId, season, league: process.env.API_NBA_LEAGUE ?? "standard" }),
    fetchApiSports<any>(config, "/teams/statistics", { id: awayId, season, league: process.env.API_NBA_LEAGUE ?? "standard" })
  ]);

  return normalizeNbaStatRows([{ team: { name: match.homeName }, statistics: homeRows }, { team: { name: match.awayName }, statistics: awayRows }], match);
}

async function fetchNflTeamComparisonStats(config: SportConfig, match: SportApiMatch): Promise<SportApiStatRow[]> {
  const [homeId, awayId] = await resolveMatchTeamIds(config, match);

  if (!homeId || !awayId) {
    return [];
  }

  const season = getSeasonFromMatch(match, process.env.API_NFL_SEASON ?? getCurrentUsSportSeason());
  const [homeRows, awayRows] = await Promise.all([
    fetchFirstNonEmpty([
      () => fetchApiSports<any>(config, "/teams/statistics", { team: homeId, season, league: process.env.API_NFL_LEAGUE_ID ?? "1" }),
      () => fetchApiSports<any>(config, "/teams/statistics", { team: homeId, season }),
      () => fetchApiSports<any>(config, "/teams/statistics", { id: homeId, season, league: process.env.API_NFL_LEAGUE_ID ?? "1" }),
      () => fetchApiSports<any>(config, "/teams/statistics", { id: homeId, season })
    ]),
    fetchFirstNonEmpty([
      () => fetchApiSports<any>(config, "/teams/statistics", { team: awayId, season, league: process.env.API_NFL_LEAGUE_ID ?? "1" }),
      () => fetchApiSports<any>(config, "/teams/statistics", { team: awayId, season }),
      () => fetchApiSports<any>(config, "/teams/statistics", { id: awayId, season, league: process.env.API_NFL_LEAGUE_ID ?? "1" }),
      () => fetchApiSports<any>(config, "/teams/statistics", { id: awayId, season })
    ])
  ]);

  return normalizeAmericanFootballStatRows([{ team: { name: match.homeName }, statistics: homeRows }, { team: { name: match.awayName }, statistics: awayRows }], match);
}

async function fetchFirstNonEmpty<T>(attempts: Array<() => Promise<T[]>>): Promise<T[]> {
  for (const attempt of attempts) {
    const rows = await attempt().catch(() => []);

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

async function resolveMatchTeamIds(config: SportConfig, match: SportApiMatch): Promise<[string | null, string | null]> {
  if (match.homeId && match.awayId) {
    return [match.homeId, match.awayId];
  }

  const teams = await fetchSportTeams(config, config.defaultQuery()).catch(() => []);
  const home = match.homeId ?? teams.find((team) => namesMatch(team.name, match.homeName))?.id ?? null;
  const away = match.awayId ?? teams.find((team) => namesMatch(team.name, match.awayName))?.id ?? null;

  return [home, away];
}

function getNestedStatObject(entry: any): any {
  if (!entry) {
    return {};
  }

  if (Array.isArray(entry.statistics)) {
    return entry.statistics[0] ?? {};
  }

  if (entry.statistics && typeof entry.statistics === "object") {
    return entry.statistics;
  }

  if (Array.isArray(entry.stats)) {
    return entry.stats[0] ?? {};
  }

  if (entry.stats && typeof entry.stats === "object") {
    return entry.stats;
  }

  return entry;
}

function readStatValue(source: any, key: string): string | number | null {
  const direct = getPathValue(source, key);

  if (direct !== null) {
    return direct;
  }

  const snake = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const compact = key.replace(/[_\s-]+/g, "").toLowerCase();
  const entries = flattenObject(source);
  const found = entries.find(([entryKey]) => {
    const normalized = entryKey.replace(/[_\s.-]+/g, "").toLowerCase();
    return normalized === compact || normalized.endsWith(compact) || normalized === snake.replace(/_/g, "");
  });

  return found?.[1] ?? null;
}

function firstStatValue(source: any, keys: readonly string[]): string | number | null {
  for (const key of keys) {
    const value = readStatValue(source, key);

    if (value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function getPathValue(source: any, path: string): string | number | null {
  const value = path.split(".").reduce<any>((current, key) => current?.[key], source);

  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
}

function flattenObject(source: any, prefix = ""): Array<[string, string | number]> {
  if (!source || typeof source !== "object") {
    return [];
  }

  return Object.entries(source).flatMap(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string" || typeof value === "number") {
      return [[nextKey, value] as [string, string | number]];
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenObject(value, nextKey);
    }

    return [];
  });
}

function getSeasonFromMatch(match: SportApiMatch, fallback: string | number) {
  if (!match.date) {
    return String(fallback);
  }

  const date = new Date(match.date);

  if (Number.isNaN(date.getTime())) {
    return String(fallback);
  }

  return String(date.getUTCFullYear());
}

function arrayToStatMap(value: unknown) {
  const map = new Map<string, string | number | null>();

  if (!Array.isArray(value)) {
    return map;
  }

  for (const item of value) {
    const label = getString(item?.type || item?.name);
    if (label) {
      map.set(label, item?.value ?? null);
    }
  }

  return map;
}

function formatStatPair(primary: unknown, secondary?: unknown) {
  const main = primary === null || primary === undefined || primary === "" ? null : primary;
  const extra = secondary === null || secondary === undefined || secondary === "" ? null : secondary;

  if (main === null) {
    return null;
  }

  return extra === null ? String(main) : `${main}/${extra}`;
}

function getFirstEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }

  return null;
}

function getMissingKeyMessage(sport: ApiSportId, config: SportConfig): string {
  if (sport === "football") {
    return "Set API_FOOTBALL_KEY to the key from dashboard.api-football.com to enable live football data.";
  }

  return `Set ${config.keyEnv.join(" or ")} to enable live ${sport} data.`;
}

function hasApiSportsErrors(errors: unknown): boolean {
  if (!errors) {
    return false;
  }

  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  if (typeof errors === "object") {
    return Object.keys(errors).length > 0;
  }

  return Boolean(errors);
}

function formatApiSportsErrors(errors: unknown): string {
  if (!errors) {
    return "unknown error";
  }

  if (typeof errors === "string") {
    return errors;
  }

  if (Array.isArray(errors)) {
    return errors.map(String).join("; ");
  }

  if (typeof errors === "object") {
    return Object.values(errors as Record<string, unknown>).map(String).join("; ");
  }

  return String(errors);
}

function getCurrentSeason(): string {
  return String(new Date().getUTCFullYear());
}

function getCurrentUsSportSeason(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  return month >= 8 ? year : year - 1;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function getString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return "";
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toEnvKey(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function namesMatch(left: string, right: string) {
  const a = normalizeName(left);
  const b = normalizeName(right);

  return a === b || a.includes(b) || b.includes(a);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}
