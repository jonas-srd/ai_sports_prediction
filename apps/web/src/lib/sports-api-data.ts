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
  provider: "api-football" | "api-sports";
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

  if (!apiKey) {
    return {
      sport,
      provider: config.provider,
      status: "not_configured",
      message: getMissingKeyMessage(sport, config),
      matches: [],
      standings: [],
      teams: []
    };
  }

  try {
    const { matches, query } = await fetchBestSportMatches(sport, config);
    const teams = sport === "nfl" || sport === "nba"
      ? await fetchSportTeams(config, query).catch(() => [])
      : [];

    return {
      sport,
      provider: config.provider,
      status: "live",
      message: `Live data loaded from ${config.providerName}.`,
      matches,
      standings: [],
      teams
    };
  } catch {
    return {
      sport,
      provider: config.provider,
      status: "error",
      message: `${config.providerName} request failed. Showing local fallback data.`,
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

  if (!apiKey || !league) {
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
    const teams = teamsResult.status === "fulfilled" ? teamsResult.value : [];

    return {
      sport: "football",
      provider: config.provider,
      status: "live",
      message: getFootballSnapshotMessage(
        matches.length,
        standings.length,
        teams.length,
        competition.type,
        [
          matchesResult.status === "rejected" ? matchesResult.reason : null,
          standingsResult.status === "rejected" ? standingsResult.reason : null,
          teamsResult.status === "rejected" ? teamsResult.reason : null
        ]
      ),
      matches,
      standings,
      teams
    };
  } catch {
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
