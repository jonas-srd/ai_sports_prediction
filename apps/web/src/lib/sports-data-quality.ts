import type { ApiSportId, SportApiMatch, SportApiTeam } from "./sports-api-data";
import type { TheSportsDbLeagueIdentity } from "./sports-league-identity";
import {
  isOfficialWidgetLogoUrl,
  isVerifiedTennisFlagUrl
} from "./widget-logo-policy";

export type SportsDataQualityCode =
  | "champions_league_qualifier"
  | "competition_mismatch"
  | "invalid_participant"
  | "league_id_mismatch"
  | "missing_team_logo"
  | "missing_tennis_flag"
  | "nba_team_mismatch"
  | "nfl_team_mismatch"
  | "sport_mismatch";

export type SportsDataQualityIssue = {
  code: SportsDataQualityCode;
  competition: string;
  detectedAtUtc: string;
  matchId: string;
  message: string;
  participants: string;
  sport: ApiSportId;
};

export type SportsDataQualityReport = {
  blocked: number;
  checked: number;
  checkedAtUtc: string;
  issues: SportsDataQualityIssue[];
  published: number;
};

export function emptySportsDataQualityReport(): SportsDataQualityReport {
  return {
    blocked: 0,
    checked: 0,
    checkedAtUtc: new Date().toISOString(),
    issues: [],
    published: 0
  };
}

export function auditSportsMatches(input: {
  expectedLeagueId: string;
  league: TheSportsDbLeagueIdentity;
  matches: SportApiMatch[];
  sport: ApiSportId;
  teams: SportApiTeam[];
}): { matches: SportApiMatch[]; report: SportsDataQualityReport } {
  const checkedAtUtc = new Date().toISOString();
  const accepted: SportApiMatch[] = [];
  const issues: SportsDataQualityIssue[] = [];
  const roster = buildRoster(input.teams);

  for (const match of input.matches) {
    const matchIssues = inspectMatch({
      ...input,
      checkedAtUtc,
      match,
      roster
    });
    if (matchIssues.length === 0) {
      accepted.push(match);
    } else {
      issues.push(...matchIssues);
    }
  }

  return {
    matches: accepted,
    report: {
      blocked: input.matches.length - accepted.length,
      checked: input.matches.length,
      checkedAtUtc,
      issues,
      published: accepted.length
    }
  };
}

function inspectMatch(input: {
  checkedAtUtc: string;
  expectedLeagueId: string;
  league: TheSportsDbLeagueIdentity;
  match: SportApiMatch;
  roster: Set<string>;
  sport: ApiSportId;
  teams: SportApiTeam[];
}): SportsDataQualityIssue[] {
  const issues: SportsDataQualityIssue[] = [];
  const add = (code: SportsDataQualityCode, message: string) => {
    issues.push({
      code,
      competition: input.match.competition,
      detectedAtUtc: input.checkedAtUtc,
      matchId: input.match.id,
      message,
      participants: `${input.match.homeName} – ${input.match.awayName}`,
      sport: input.sport
    });
  };

  if (!input.match.homeName.trim() || !input.match.awayName.trim() || namesEqual(input.match.homeName, input.match.awayName)) {
    add("invalid_participant", "Beide Teilnehmer müssen vorhanden und unterschiedlich sein.");
  }

  if (!input.match.leagueId || input.match.leagueId !== input.expectedLeagueId) {
    add(
      "league_id_mismatch",
      `Liga-ID ${input.match.leagueId || "fehlt"} ist nicht für ${input.league.name} freigegeben; erwartet wird ${input.expectedLeagueId}.`
    );
  }

  const providerCompetition = input.match.providerCompetition || input.match.competition;
  const allowedCompetitionNames = [input.league.name, ...(input.league.aliases ?? [])];
  if (!providerCompetition || !allowedCompetitionNames.some((name) => namesEqual(providerCompetition, name))) {
    add(
      "competition_mismatch",
      `Wettbewerb „${providerCompetition || "unbekannt"}“ entspricht nicht exakt dem erlaubten Wettbewerb „${input.league.name}“.`
    );
  }

  if (
    input.match.providerSport
    && input.league.sportName
    && !namesEqual(input.match.providerSport, input.league.sportName)
  ) {
    add(
      "sport_mismatch",
      `Anbieter meldet „${input.match.providerSport}“, erwartet wird „${input.league.sportName}“.`
    );
  }

  if (input.expectedLeagueId === "4480" && isChampionsLeagueQualifier(input.match)) {
    add(
      "champions_league_qualifier",
      "Champions-League-Qualifikation, Vorrunde und Play-offs sind für die Hauptwettbewerbsansicht gesperrt."
    );
  }

  if (input.sport === "nba") {
    for (const participant of [input.match.homeName, input.match.awayName]) {
      if (!NBA_TEAM_NAMES.has(normalizeName(participant))) {
        add("nba_team_mismatch", `„${participant}“ ist kein freigegebenes NBA-Team.`);
      }
    }
  } else if (input.sport === "nfl") {
    for (const participant of [input.match.homeName, input.match.awayName]) {
      if (!NFL_TEAM_NAMES.has(normalizeName(participant))) {
        add("nfl_team_mismatch", `„${participant}“ ist kein freigegebenes NFL-Team.`);
      }
    }
  }

  if (input.sport === "tennis") {
    if (!isVerifiedTennisFlagUrl(input.match.homeLogo)) {
      add("missing_tennis_flag", `Für „${input.match.homeName}“ fehlt eine automatisch bestätigte Länderflagge.`);
    }
    if (!isVerifiedTennisFlagUrl(input.match.awayLogo)) {
      add("missing_tennis_flag", `Für „${input.match.awayName}“ fehlt eine automatisch bestätigte Länderflagge.`);
    }
  } else {
    if (!isOfficialWidgetLogoUrl(input.match.homeLogo)) {
      add("missing_team_logo", `Für „${input.match.homeName}“ fehlt ein echtes HTTPS-Teamlogo aus der Sportdatenquelle.`);
    }
    if (!isOfficialWidgetLogoUrl(input.match.awayLogo)) {
      add("missing_team_logo", `Für „${input.match.awayName}“ fehlt ein echtes HTTPS-Teamlogo aus der Sportdatenquelle.`);
    }
  }

  return dedupeIssues(issues);
}

function isChampionsLeagueQualifier(match: SportApiMatch) {
  const stage = [
    match.providerStage,
    match.round,
    match.providerCompetition
  ].filter(Boolean).join(" ");
  if (/qualif|prelim|play[ -]?off/i.test(stage)) {
    return true;
  }

  if (!match.date) {
    return false;
  }
  const date = new Date(match.date);
  const month = date.getUTCMonth();
  return Number.isFinite(date.getTime()) && month >= 5 && month <= 7;
}

function buildRoster(teams: SportApiTeam[]) {
  return new Set(teams.flatMap((team) => [
    normalizeName(team.name)
  ]).filter(Boolean));
}

function dedupeIssues(issues: SportsDataQualityIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function namesEqual(left: string, right: string) {
  return normalizeName(left) === normalizeName(right);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const NBA_TEAM_NAMES = new Set([
  "Atlanta Hawks",
  "Boston Celtics",
  "Brooklyn Nets",
  "Charlotte Hornets",
  "Chicago Bulls",
  "Cleveland Cavaliers",
  "Dallas Mavericks",
  "Denver Nuggets",
  "Detroit Pistons",
  "Golden State Warriors",
  "Houston Rockets",
  "Indiana Pacers",
  "Los Angeles Clippers",
  "LA Clippers",
  "Los Angeles Lakers",
  "LA Lakers",
  "Memphis Grizzlies",
  "Miami Heat",
  "Milwaukee Bucks",
  "Minnesota Timberwolves",
  "New Orleans Pelicans",
  "New York Knicks",
  "Oklahoma City Thunder",
  "Orlando Magic",
  "Philadelphia 76ers",
  "Phoenix Suns",
  "Portland Trail Blazers",
  "Sacramento Kings",
  "San Antonio Spurs",
  "Toronto Raptors",
  "Utah Jazz",
  "Washington Wizards"
].map(normalizeName));

const NFL_TEAM_NAMES = new Set([
  "Arizona Cardinals",
  "Atlanta Falcons",
  "Baltimore Ravens",
  "Buffalo Bills",
  "Carolina Panthers",
  "Chicago Bears",
  "Cincinnati Bengals",
  "Cleveland Browns",
  "Dallas Cowboys",
  "Denver Broncos",
  "Detroit Lions",
  "Green Bay Packers",
  "Houston Texans",
  "Indianapolis Colts",
  "Jacksonville Jaguars",
  "Kansas City Chiefs",
  "Las Vegas Raiders",
  "Los Angeles Chargers",
  "Los Angeles Rams",
  "Miami Dolphins",
  "Minnesota Vikings",
  "New England Patriots",
  "New Orleans Saints",
  "New York Giants",
  "New York Jets",
  "Philadelphia Eagles",
  "Pittsburgh Steelers",
  "San Francisco 49ers",
  "Seattle Seahawks",
  "Tampa Bay Buccaneers",
  "Tennessee Titans",
  "Washington Commanders",
  "Cardinals",
  "Falcons",
  "Ravens",
  "Bills",
  "Panthers",
  "Bears",
  "Bengals",
  "Browns",
  "Cowboys",
  "Broncos",
  "Lions",
  "Packers",
  "Texans",
  "Colts",
  "Jaguars",
  "Chiefs",
  "Raiders",
  "Chargers",
  "Rams",
  "Dolphins",
  "Vikings",
  "Patriots",
  "Saints",
  "Giants",
  "Jets",
  "Eagles",
  "Steelers",
  "49ers",
  "Seahawks",
  "Buccaneers",
  "Titans",
  "Commanders"
].map(normalizeName));
