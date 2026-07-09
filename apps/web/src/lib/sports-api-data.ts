/**
 * Purpose: Server-only TheSportsDB data adapter for football, NFL, NBA and tennis.
 */
import type { FootballCompetition, FootballTeam } from "@/lib/football-data";
import { tennisPlayers } from "@/lib/tennis-data";

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
  provider: "thesportsdb";
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

type TheSportsDbLeagueRef = {
  id?: string;
  name: string;
  aliases?: string[];
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

export async function getSportApiSnapshot(sport: ApiSportId): Promise<SportApiSnapshot> {
  const sportsDbLeague = THE_SPORTS_DB_LEAGUES[sport];
  const sportsDbSnapshot = await fetchTheSportsDbSnapshot(sport, sportsDbLeague).catch(() => null);

  if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
    return sportsDbSnapshot;
  }

  return {
    sport,
    provider: "thesportsdb",
    status: getTheSportsDbKey() ? "error" : "not_configured",
    message: getTheSportsDbKey()
      ? `TheSportsDB returned no usable rows for ${sportsDbLeague.name}.`
      : "Set THE_SPORTS_DB_API_KEY to enable live sports data.",
    matches: [],
    standings: [],
    teams: []
  };
}

export async function getFootballCompetitionApiSnapshot(competition: FootballCompetition): Promise<SportApiSnapshot> {
  const sportsDbLeague = THE_SPORTS_DB_FOOTBALL_LEAGUES[competition.slug] ?? {
    id: "",
    name: competition.name
  };
  const sportsDbSnapshot = await fetchTheSportsDbSnapshot("football", sportsDbLeague).catch(() => null);

  if (sportsDbSnapshot && (sportsDbSnapshot.matches.length > 0 || sportsDbSnapshot.teams.length > 0)) {
    return sportsDbSnapshot;
  }

  return {
    sport: "football",
    provider: "thesportsdb",
    status: getTheSportsDbKey() ? "error" : "not_configured",
    message: getTheSportsDbKey()
      ? `TheSportsDB returned no usable rows for ${competition.name}.`
      : "Set THE_SPORTS_DB_API_KEY to enable live football data.",
    matches: [],
    standings: [],
    teams: []
  };
}

export async function getFootballCompetitionLogos(): Promise<Record<string, string>> {
  if (!getTheSportsDbKey()) {
    return {};
  }

  const rows = await getTheSportsDbLeagueRowsCached().catch(() => []);
  const detailedRows = await Promise.all(
    Object.values(THE_SPORTS_DB_FOOTBALL_LEAGUES).map((league) =>
      fetchTheSportsDbLeagueDetailRows(league).catch(() => [])
    )
  );
  const detailsBySlug = Object.fromEntries(
    Object.keys(THE_SPORTS_DB_FOOTBALL_LEAGUES).map((slug, index) => [slug, detailedRows[index]?.[0]])
  ) as Record<string, any>;
  const logos: Record<string, string> = {};

  for (const [slug, league] of Object.entries(THE_SPORTS_DB_FOOTBALL_LEAGUES)) {
    const configuredId = getTheSportsDbLeagueId(league);
    const lookupNames = getTheSportsDbLeagueLookupNames(league);
    const row = detailsBySlug[slug] ?? rows.find((candidate) => {
      const candidateId = getString(candidate.idLeague || candidate.id || candidate.leagueId);
      const candidateName = getTheSportsDbLeagueName(candidate);

      return (configuredId && candidateId === configuredId) ||
        lookupNames.some((lookupName) => namesMatch(candidateName, lookupName));
    });
    const logo = getTheSportsDbLeagueLogo(row);

    if (logo) {
      logos[slug] = logo;
    }
  }

  return logos;
}

export async function getFootballTeamSquad(teamId: string): Promise<SportApiSquadPlayer[]> {
  void teamId;
  return [];
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
  const apiKey = getTheSportsDbKey();
  const league = sport === "football" && competition
    ? THE_SPORTS_DB_FOOTBALL_LEAGUES[competition.slug] ?? { id: "", name: competition.name }
    : THE_SPORTS_DB_LEAGUES[sport];

  if (!apiKey) {
    return {
      status: "not_configured",
      message: "Set THE_SPORTS_DB_API_KEY to enable live match analysis.",
      stats: [],
      h2h: [],
      source: "TheSportsDB"
    };
  }

  const [snapshot, participantHistory] = await Promise.all([
    fetchTheSportsDbSnapshot(sport, league).catch(() => null),
    fetchTheSportsDbParticipantHistory(sport, match).catch(() => [])
  ]);
  const h2h = findTheSportsDbHeadToHead(mergeMatches(snapshot?.matches ?? [], participantHistory), match);
  const stats = buildTheSportsDbH2HStats(h2h, match, sport);

  return {
    status: "live",
    message: h2h.length > 0
      ? `Head-to-head trends loaded from TheSportsDB event history for ${league.name}.`
      : `TheSportsDB has no previous direct matchup rows for ${match.homeName} vs ${match.awayName} in ${league.name}.`,
    stats,
    h2h,
    source: "TheSportsDB"
  };
}

function findTheSportsDbHeadToHead(matches: SportApiMatch[], target: SportApiMatch) {
  return matches
    .filter((candidate) => {
      if (candidate.id === target.id) {
        return false;
      }

      return isSameTheSportsDbPair(candidate, target) &&
        candidate.homeScore !== null &&
        candidate.awayScore !== null &&
        isCompletedSportApiMatch(candidate);
    })
    .sort((left, right) => sortMatchesByDate(right, left))
    .slice(0, 8);
}

function isSameTheSportsDbPair(candidate: SportApiMatch, target: SportApiMatch) {
  const sameDirection = namesMatch(candidate.homeName, target.homeName) && namesMatch(candidate.awayName, target.awayName);
  const swappedDirection = namesMatch(candidate.homeName, target.awayName) && namesMatch(candidate.awayName, target.homeName);

  return sameDirection || swappedDirection;
}

function buildTheSportsDbH2HStats(matches: SportApiMatch[], target: SportApiMatch, sport: ApiSportId): SportApiStatRow[] {
  const completed = matches.filter((match) => match.homeScore !== null && match.awayScore !== null);

  if (completed.length === 0) {
    return [];
  }

  let targetHomeWins = 0;
  let targetAwayWins = 0;
  let draws = 0;
  let targetHomeScoreTotal = 0;
  let targetAwayScoreTotal = 0;

  for (const match of completed) {
    const sameDirection = namesMatch(match.homeName, target.homeName) && namesMatch(match.awayName, target.awayName);
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const targetHomeScore = sameDirection ? homeScore : awayScore;
    const targetAwayScore = sameDirection ? awayScore : homeScore;

    targetHomeScoreTotal += targetHomeScore;
    targetAwayScoreTotal += targetAwayScore;

    if (targetHomeScore > targetAwayScore) {
      targetHomeWins += 1;
    } else if (targetHomeScore < targetAwayScore) {
      targetAwayWins += 1;
    } else {
      draws += 1;
    }
  }

  const scoreLabel = sport === "nfl" || sport === "nba"
    ? "Avg points"
    : sport === "tennis"
      ? "Avg sets"
      : "Avg goals";
  const rows: SportApiStatRow[] = [
    { label: "H2H wins", home: targetHomeWins, away: targetAwayWins },
    { label: scoreLabel, home: formatAverage(targetHomeScoreTotal / completed.length), away: formatAverage(targetAwayScoreTotal / completed.length) },
    { label: "Meetings", home: completed.length, away: completed.length }
  ];

  if (sport === "football" && draws > 0) {
    rows.push({ label: "Draws", home: draws, away: draws });
  }

  const lastMeeting = completed[0];
  if (lastMeeting?.homeScore !== null && lastMeeting?.awayScore !== null) {
    const sameDirection = namesMatch(lastMeeting.homeName, target.homeName) && namesMatch(lastMeeting.awayName, target.awayName);
    rows.push({
      label: "Last meeting",
      home: sameDirection ? lastMeeting.homeScore : lastMeeting.awayScore,
      away: sameDirection ? lastMeeting.awayScore : lastMeeting.homeScore
    });
  }

  return rows;
}

function formatAverage(value: number) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number.isInteger(value) ? value : value.toFixed(1);
}

async function fetchTheSportsDbParticipantHistory(sport: ApiSportId, match: SportApiMatch): Promise<SportApiMatch[]> {
  const ids = [match.homeId, match.awayId].filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return [];
  }

  const rows = await Promise.all(ids.flatMap((id) => [
    fetchTheSportsDbList<any>("eventslast.php", { id }, "events").catch(() => []),
    fetchTheSportsDbV2Events(`schedule/previous/team/${id}`).catch(() => [])
  ]));

  return mergeMatches(rows.flat().map(normalizeTheSportsDbEvent), [])
    .filter((row) => row.homeName && row.awayName)
    .map((row) => ({ ...row, competition: row.competition || match.competition || THE_SPORTS_DB_LEAGUES[sport].name }));
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
  const standings = sport === "football"
    ? await fetchTheSportsDbStandings(league, teams, matches).catch(() => [])
    : [];

  return {
    sport,
    provider: "thesportsdb",
    status: "live",
    message: `Live data loaded from TheSportsDB Premium for ${league.name}.`,
    matches,
    standings,
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
    ...v2LiveEvents.map(normalizeTheSportsDbEvent),
    ...v2SportLiveEvents.map(normalizeTheSportsDbEvent),
    ...v2NextEvents.map(normalizeTheSportsDbEvent),
    ...v2SeasonEvents.map(normalizeTheSportsDbEvent),
    ...v2PastEvents.map(normalizeTheSportsDbEvent),
    ...nextEvents.map(normalizeTheSportsDbEvent),
    ...seasonEvents.map(normalizeTheSportsDbEvent),
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

  return mergeTeams(rows
    .map((team: any): SportApiTeam => ({
      id: getString(team.idTeam),
      name: getString(team.strTeam),
      logo: getString(team.strBadge || team.strTeamBadge || team.strLogo || team.strTeamLogo) || null
    }))
    .filter((team) => team.name), []);
}

async function fetchTheSportsDbStandings(
  league: TheSportsDbLeagueRef,
  teams: SportApiTeam[],
  matches: SportApiMatch[]
): Promise<SportApiStanding[]> {
  const leagueId = await resolveTheSportsDbLeagueId(league);
  if (!leagueId) {
    return buildStandingsFromMatches(matches, teams);
  }

  const seasons = getTheSportsDbTableSeasonCandidates();
  const seasonRows = await Promise.all(
    seasons.map(async (season) => {
      const rows = await fetchTheSportsDbList<any>("lookuptable.php", { l: leagueId, s: season }, "table").catch(() => []);

      return rows.map((row, index) => normalizeTheSportsDbStanding(row, teams, index)).filter(Boolean) as SportApiStanding[];
    })
  );
  const official = seasonRows.find((rows) => rows.length > 0) ?? [];

  if (official.length > 0) {
    return hydrateTheSportsDbStandingLogos(official, teams);
  }

  return buildStandingsFromMatches(matches, teams);
}

function normalizeTheSportsDbStanding(row: any, teams: SportApiTeam[], index: number): SportApiStanding | null {
  const teamName = getString(row.strTeam || row.team || row.name || row.strTeamName);

  if (!teamName) {
    return null;
  }

  const goalsFor = toNumber(row.intGoalsFor ?? row.goalsFor ?? row.goals_for ?? row.for);
  const goalsAgainst = toNumber(row.intGoalsAgainst ?? row.goalsAgainst ?? row.goals_against ?? row.against);
  const explicitDiff = toNumber(row.intGoalDifference ?? row.goalDifference ?? row.goalDiff ?? row.difference);
  const teamId = getString(row.idTeam || row.teamId || row.id);
  const team = teams.find((candidate) => candidate.id === teamId || namesMatch(candidate.name, teamName));

  return {
    rank: toNumber(row.intRank ?? row.rank ?? row.position ?? row.intPosition) ?? index + 1,
    teamName,
    teamLogo: getString(row.strTeamBadge || row.strBadge || row.strLogo || row.logo || row.badge) || team?.logo || null,
    played: toNumber(row.intPlayed ?? row.played ?? row.matchesPlayed ?? row.gamesPlayed),
    won: toNumber(row.intWin ?? row.intWins ?? row.won ?? row.wins),
    drawn: toNumber(row.intDraw ?? row.intDraws ?? row.drawn ?? row.draws),
    lost: toNumber(row.intLoss ?? row.intLosses ?? row.lost ?? row.losses),
    goalsFor,
    goalsAgainst,
    goalDiff: explicitDiff ?? (goalsFor !== null && goalsAgainst !== null ? goalsFor - goalsAgainst : null),
    points: toNumber(row.intPoints ?? row.points ?? row.pts),
    form: getString(row.strForm || row.form) || null,
    detail: getString(row.strDescription || row.description || row.note) || null
  };
}

function buildStandingsFromMatches(matches: SportApiMatch[], teams: SportApiTeam[]): SportApiStanding[] {
  const table = new Map<string, {
    name: string;
    logo: string | null;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
    form: string[];
  }>();

  const ensureTeam = (name: string, logo: string | null, teamId?: string | null) => {
    const key = getTeamStandingKey(name, teamId, teams);
    const apiTeam = teams.find((team) => team.id === teamId || namesMatch(team.name, name));
    const existing = table.get(key);

    if (existing) {
      existing.logo ||= logo ?? apiTeam?.logo ?? null;
      return existing;
    }

    const created = {
      name: apiTeam?.name || name,
      logo: logo ?? apiTeam?.logo ?? null,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: []
    };
    table.set(key, created);

    return created;
  };

  teams.forEach((team) => ensureTeam(team.name, team.logo, team.id));

  for (const match of getStandingSeasonMatches(matches)) {
    const home = ensureTeam(match.homeName, match.homeLogo, match.homeId);
    const away = ensureTeam(match.awayName, match.awayLogo, match.awayId);

    if (match.homeScore === null || match.awayScore === null || !isCompletedSportApiMatch(match)) {
      continue;
    }

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
      home.form.unshift("W");
      away.form.unshift("L");
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
      away.form.unshift("W");
      home.form.unshift("L");
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
      home.form.unshift("D");
      away.form.unshift("D");
    }
  }

  return Array.from(table.values())
    .sort((left, right) => {
      const pointsDiff = right.points - left.points;
      if (pointsDiff !== 0) {
        return pointsDiff;
      }

      const goalDiff = (right.goalsFor - right.goalsAgainst) - (left.goalsFor - left.goalsAgainst);
      if (goalDiff !== 0) {
        return goalDiff;
      }

      const goalsForDiff = right.goalsFor - left.goalsFor;
      return goalsForDiff !== 0 ? goalsForDiff : left.name.localeCompare(right.name);
    })
    .map((team, index) => ({
      rank: index + 1,
      teamName: team.name,
      teamLogo: team.logo,
      played: team.played,
      won: team.won,
      drawn: team.drawn,
      lost: team.lost,
      goalsFor: team.played > 0 ? team.goalsFor : null,
      goalsAgainst: team.played > 0 ? team.goalsAgainst : null,
      goalDiff: team.played > 0 ? team.goalsFor - team.goalsAgainst : null,
      points: team.points,
      form: team.form.slice(0, 5).join(" ") || null,
      detail: null
    }));
}

function getStandingSeasonMatches(matches: SportApiMatch[]) {
  const [season] = getTheSportsDbSeasonCandidates();
  const seasonRange = getSeasonDateRange(season);

  if (!seasonRange) {
    return matches;
  }

  const filtered = matches.filter((match) => {
    const timestamp = getSportApiMatchTimestamp(match);

    return timestamp !== null && timestamp >= seasonRange.start && timestamp <= seasonRange.end;
  });

  return filtered.length > 0 ? filtered : matches.filter((match) => !match.date);
}

function getSeasonDateRange(season: string | undefined) {
  if (!season) {
    return null;
  }

  const splitSeason = season.match(/^(\d{4})-(\d{4})$/);
  if (splitSeason) {
    const startYear = Number(splitSeason[1]);
    const endYear = Number(splitSeason[2]);

    return {
      start: Date.UTC(startYear, 6, 1),
      end: Date.UTC(endYear, 5, 30, 23, 59, 59)
    };
  }

  const year = Number(season);
  if (!Number.isFinite(year)) {
    return null;
  }

  return {
    start: Date.UTC(year, 0, 1),
    end: Date.UTC(year, 11, 31, 23, 59, 59)
  };
}

function hydrateTheSportsDbStandingLogos(standings: SportApiStanding[], teams: SportApiTeam[]) {
  return standings.map((standing) => {
    const team = teams.find((candidate) => namesMatch(candidate.name, standing.teamName));

    return {
      ...standing,
      teamLogo: standing.teamLogo ?? team?.logo ?? null
    };
  });
}

function getTeamStandingKey(name: string, teamId: string | null | undefined, teams: SportApiTeam[]) {
  const team = teams.find((candidate) => candidate.id === teamId || namesMatch(candidate.name, name));

  return team?.id || normalizeName(team?.name || name);
}

async function fetchTheSportsDbList<T>(
  path: string,
  query: Record<string, string>,
  key: "events" | "teams" | "table"
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
    next: { revalidate: getTheSportsDbRevalidateSeconds(path) }
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
    next: { revalidate: getTheSportsDbRevalidateSeconds(path) }
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return null;
  }

  return response.json() as Promise<T>;
}

function findTheSportsDbRows<T>(payload: unknown, preferredKey: "events" | "teams" | "table"): T[] {
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

function rowLooksLikeTheSportsDbRow(row: unknown, preferredKey: "events" | "teams" | "table") {
  if (!row || typeof row !== "object") {
    return false;
  }

  const value = row as Record<string, unknown>;
  if (preferredKey === "teams") {
    return Boolean(value.idTeam || value.strTeam || value.team || value.name);
  }

  if (preferredKey === "table") {
    return Boolean(
      value.strTeam ||
      value.idTeam ||
      value.intRank ||
      value.rank ||
      value.intPoints ||
      value.points
    );
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
  const isTennis = isTheSportsDbTennisEvent(event);
  const homeName = getString(event.strHomeTeam || event.homeTeam || event.home_team || event.home?.name) || parsedHome;
  const awayName = getString(event.strAwayTeam || event.awayTeam || event.away_team || event.away?.name) || parsedAway;

  return {
    id: `tsdb:${getString(event.idEvent || event.id || event.eventId)}`,
    competition: getString(event.strLeague || event.league || event.leagueName) || "TheSportsDB",
    round: getString(event.intRound || event.strRound || event.round) || null,
    date,
    venue: getString(event.strVenue || event.venue) || null,
    homeId: getString(event.idHomeTeam || event.homeTeamId || event.home_id) || null,
    homeName: isTennis ? cleanTheSportsDbTennisParticipantName(homeName) : homeName,
    awayId: getString(event.idAwayTeam || event.awayTeamId || event.away_id) || null,
    awayName: isTennis ? cleanTheSportsDbTennisParticipantName(awayName) : awayName,
    homeLogo: getString(event.strHomeTeamBadge || event.strHomeBadge || event.homeBadge || event.homeLogo || event.home?.badge || event.home?.logo) || null,
    awayLogo: getString(event.strAwayTeamBadge || event.strAwayBadge || event.awayBadge || event.awayLogo || event.away?.badge || event.away?.logo) || null,
    homeScore: toNumber(event.intHomeScore ?? event.homeScore ?? event.home_score ?? event.home?.score),
    awayScore: toNumber(event.intAwayScore ?? event.awayScore ?? event.away_score ?? event.away?.score),
    status: getString(event.strStatus || event.strProgress || event.strResult) || null
  };
}

function isTheSportsDbTennisEvent(event: any) {
  const sport = getString(event.strSport || event.sport);
  const league = getString(event.strLeague || event.league || event.leagueName);

  return namesMatch(sport, "Tennis") ||
    namesMatch(league, "ATP") ||
    namesMatch(league, "WTA") ||
    tennisTournamentPrefixPattern.test(getString(event.strEvent || event.event || event.name));
}

function cleanTheSportsDbTennisParticipantName(value: string) {
  const name = value.trim();

  if (!name) {
    return name;
  }

  const normalized = normalizeName(name);
  const knownPlayer = tennisPlayers.find((player) => {
    const fullName = normalizeName(player.name);
    const shortName = normalizeName(player.shortName);

    return normalized === fullName ||
      normalized === shortName ||
      normalized.endsWith(fullName) ||
      normalized.endsWith(shortName);
  });

  if (knownPlayer) {
    return knownPlayer.name;
  }

  return name
    .replace(tennisTournamentPrefixPattern, "")
    .replace(/\s+/g, " ")
    .trim();
}

const tennisTournamentPrefixPattern = /^(?:atp|wta|itf|challenger)?\s*(?:wimbledon|us open|u\.s\. open|australian open|roland[-\s]garros|french open|canadian open|cincinnati|monte carlo|madrid open|italian open|rome|paris masters|shanghai masters|miami open|indian wells|atp finals|wta finals|dubai tennis championships|qatar open|halle open|queen'?s club|stuttgart open|vienna open|basel|rotterdam|doha|tokyo|beijing|berlin open)\s+/i;

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
  const stableId = match.id.replace(/^tsdb:/, "");
  if (stableId) {
    return match.id;
  }

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

function getTheSportsDbRevalidateSeconds(path: string) {
  const normalizedPath = path.toLowerCase();
  const envKey = normalizedPath.includes("livescore")
    ? "THE_SPORTS_DB_LIVE_CACHE_SECONDS"
    : normalizedPath.includes("lookuptable")
      ? "THE_SPORTS_DB_TABLE_CACHE_SECONDS"
      : "THE_SPORTS_DB_CACHE_SECONDS";
  const configured = Number(process.env[envKey] ?? process.env.THE_SPORTS_DB_CACHE_SECONDS ?? 300);

  return Number.isFinite(configured) && configured >= 0 ? configured : 300;
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

async function fetchTheSportsDbLeagueDetailRows(league: TheSportsDbLeagueRef) {
  const leagueId = await resolveTheSportsDbLeagueId(league);
  if (!leagueId) {
    return [];
  }

  const payload = await fetchTheSportsDb<Record<string, unknown>>("lookupleague.php", { id: leagueId });
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

function getTheSportsDbLeagueLogo(row: any) {
  return getString(
    row?.strBadge ||
    row?.strLogo ||
    row?.strPoster ||
    row?.strFanart1 ||
    row?.badge ||
    row?.logo ||
    row?.image
  ) || null;
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
  const seasonStartYear = now.getUTCMonth() >= 6 ? year : year - 1;
  const configured = process.env.THE_SPORTS_DB_SEASON;

  return uniqueStrings([
    configured,
    `${seasonStartYear}-${seasonStartYear + 1}`,
    String(year),
    String(year - 1)
  ]);
}

function getTheSportsDbTableSeasonCandidates() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const seasonStartYear = now.getUTCMonth() >= 6 ? year : year - 1;
  const configured = process.env.THE_SPORTS_DB_SEASON;

  return uniqueStrings([
    configured,
    `${seasonStartYear}-${seasonStartYear + 1}`,
    String(year)
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
