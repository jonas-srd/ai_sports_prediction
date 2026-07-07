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
  homeName: string;
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

export type SportApiSnapshot = {
  sport: ApiSportId;
  provider: "api-football" | "api-sports";
  status: "live" | "not_configured" | "error";
  message: string;
  matches: SportApiMatch[];
  standings: SportApiStanding[];
  teams: SportApiTeam[];
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
  "coppa-italia": "137"
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
    keyEnv: ["API_TENNIS_KEY"],
    provider: "api-sports",
    providerName: "API-Sports Tennis",
    gamesPath: "/fixtures",
    defaultQuery: () => ({
      next: process.env.API_TENNIS_MATCH_LIMIT ?? process.env.API_SPORTS_MATCH_LIMIT ?? "8"
    })
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
    const query = config.defaultQuery();
    const [matchesResult, teamsResult] = await Promise.allSettled([
      fetchMatches(sport, config, query),
      sport === "nfl" ? fetchSportTeams(config, query) : Promise.resolve([])
    ]);
    const matches = matchesResult.status === "fulfilled" ? matchesResult.value : [];
    const teams = teamsResult.status === "fulfilled" ? teamsResult.value : [];

    if (matchesResult.status === "rejected") {
      console.error(matchesResult.reason);
    }

    if (teamsResult.status === "rejected") {
      console.error(teamsResult.reason);
    }

    return {
      sport,
      provider: config.provider,
      status: "live",
      message: `Live data loaded from ${config.providerName}.`,
      matches,
      standings: [],
      teams
    };
  } catch (error) {
    console.error(error);
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

    if (matchesResult.status === "rejected") {
      console.error(matchesResult.reason);
    }

    if (standingsResult.status === "rejected") {
      console.error(standingsResult.reason);
    }

    if (teamsResult.status === "rejected") {
      console.error(teamsResult.reason);
    }

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
  } catch (error) {
    console.error(error);
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

function getFootballSnapshotMessage(
  matchCount: number,
  standingCount: number,
  teamCount: number,
  competitionType: FootballCompetition["type"],
  errors: unknown[] = []
): string {
  const planError = errors.map(getErrorMessage).find((message) => message.toLowerCase().includes("free plans"));
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

export function getFallbackSportMatches(sport: ApiSportId): SportApiMatch[] {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const matchRows: Record<ApiSportId, Array<[string, string, string]>> = {
    football: [
      ["Premier League", "Arsenal", "Chelsea"],
      ["Bundesliga", "FC Bayern", "Borussia Dortmund"]
    ],
    nfl: [
      ["NFL", "Chiefs", "Bills"],
      ["NFL", "Eagles", "49ers"]
    ],
    nba: [
      ["NBA", "Celtics", "Knicks"],
      ["NBA", "Lakers", "Warriors"]
    ],
    tennis: [
      ["ATP Tour", "Sinner", "Alcaraz"],
      ["WTA Tour", "Swiatek", "Sabalenka"]
    ]
  };

  return matchRows[sport].map(([competition, homeName, awayName], index) => ({
    id: `fallback:${sport}:${index}`,
    competition,
    date: new Date(now.getTime() + (index + 1) * day).toISOString(),
    homeName,
    awayName,
    homeLogo: null,
    awayLogo: null,
    homeScore: null,
    awayScore: null,
    status: "preview"
  }));
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
  })).filter((row: SportApiStanding) => row.rank > 0 && row.teamName).slice(0, 18);
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

  const response = await fetch(url, {
    headers: {
      "x-apisports-key": apiKey,
      accept: "application/json"
    },
    next: { revalidate: Number(process.env.API_SPORTS_CACHE_SECONDS ?? 300) }
  });

  if (!response.ok) {
    throw new Error(`${config.providerName} request failed ${response.status}: ${url.origin}${url.pathname}`);
  }

  const payload = await response.json() as ApiSportsResponse<T>;
  if (hasApiSportsErrors(payload.errors)) {
    throw new Error(`${config.providerName} returned errors: ${formatApiSportsErrors(payload.errors)} for ${url.origin}${url.pathname}`);
  }

  return Array.isArray(payload.response) ? payload.response : [];
}

function normalizeFootballFixture(item: any): SportApiMatch {
  return {
    id: String(item.fixture?.id ?? ""),
    competition: getString(item.league?.name) || "Football",
    round: getString(item.league?.round) || null,
    date: getString(item.fixture?.date) || null,
    homeName: getString(item.teams?.home?.name),
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
    homeName: getString(item.teams?.home?.name || item.home?.name),
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
    homeName: getString(item.teams?.home?.name),
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
    homeName: getString(item.players?.first?.name || item.player?.first?.name || item.home?.name),
    awayName: getString(item.players?.second?.name || item.player?.second?.name || item.away?.name),
    homeLogo: getString(item.players?.first?.logo || item.player?.first?.logo) || null,
    awayLogo: getString(item.players?.second?.logo || item.player?.second?.logo) || null,
    homeScore: toNumber(item.scores?.home || item.score?.home),
    awayScore: toNumber(item.scores?.away || item.score?.away),
    status: getString(item.status?.short || item.status?.long || item.status) || null
  };
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

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
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
