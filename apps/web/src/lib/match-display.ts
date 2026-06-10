/**
 * Purpose: Converts unresolved World Cup knockout teams into official bracket seeds.
 * API providers often return unresolved teams for future knockout games; the UI should still show the fixed path.
 */
import type { DashboardMatch } from "@/lib/dashboard-data";

type KnockoutSlot = {
  matchNumber: number;
  homeLabel: string;
  awayLabel: string;
};

export type MatchupLabels = {
  homeTeamLabel: string;
  awayTeamLabel: string;
};

export type GroupStanding = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  sortOrder: number;
};

export type GroupRanking = {
  complete: boolean;
  standings: GroupStanding[];
};

const KNOCKOUT_SLOTS_BY_UTC: Record<string, KnockoutSlot> = {
  "2026-06-28T19:00:00Z": {
    matchNumber: 73,
    homeLabel: "Runner-up Group A",
    awayLabel: "Runner-up Group B"
  },
  "2026-06-29T17:00:00Z": {
    matchNumber: 76,
    homeLabel: "Winner Group C",
    awayLabel: "Runner-up Group F"
  },
  "2026-06-29T20:30:00Z": {
    matchNumber: 74,
    homeLabel: "Winner Group E",
    awayLabel: "Best Third A/B/C/D/F"
  },
  "2026-06-30T01:00:00Z": {
    matchNumber: 75,
    homeLabel: "Winner Group F",
    awayLabel: "Runner-up Group C"
  },
  "2026-06-30T17:00:00Z": {
    matchNumber: 78,
    homeLabel: "Runner-up Group E",
    awayLabel: "Runner-up Group I"
  },
  "2026-06-30T21:00:00Z": {
    matchNumber: 77,
    homeLabel: "Winner Group I",
    awayLabel: "Best Third C/D/F/G/H"
  },
  "2026-07-01T01:00:00Z": {
    matchNumber: 79,
    homeLabel: "Winner Group A",
    awayLabel: "Best Third C/E/F/H/I"
  },
  "2026-07-01T16:00:00Z": {
    matchNumber: 80,
    homeLabel: "Winner Group L",
    awayLabel: "Best Third E/H/I/J/K"
  },
  "2026-07-01T20:00:00Z": {
    matchNumber: 82,
    homeLabel: "Winner Group G",
    awayLabel: "Best Third A/E/H/I/J"
  },
  "2026-07-02T00:00:00Z": {
    matchNumber: 81,
    homeLabel: "Winner Group D",
    awayLabel: "Best Third B/E/F/I/J"
  },
  "2026-07-02T19:00:00Z": {
    matchNumber: 84,
    homeLabel: "Winner Group H",
    awayLabel: "Runner-up Group J"
  },
  "2026-07-02T23:00:00Z": {
    matchNumber: 83,
    homeLabel: "Runner-up Group K",
    awayLabel: "Runner-up Group L"
  },
  "2026-07-03T03:00:00Z": {
    matchNumber: 85,
    homeLabel: "Winner Group B",
    awayLabel: "Best Third E/F/G/I/J"
  },
  "2026-07-03T18:00:00Z": {
    matchNumber: 88,
    homeLabel: "Runner-up Group D",
    awayLabel: "Runner-up Group G"
  },
  "2026-07-03T22:00:00Z": {
    matchNumber: 86,
    homeLabel: "Winner Group J",
    awayLabel: "Runner-up Group H"
  },
  "2026-07-04T01:30:00Z": {
    matchNumber: 87,
    homeLabel: "Winner Group K",
    awayLabel: "Best Third D/E/I/J/L"
  },
  "2026-07-04T17:00:00Z": {
    matchNumber: 90,
    homeLabel: "Winner Match 73",
    awayLabel: "Winner Match 75"
  },
  "2026-07-04T21:00:00Z": {
    matchNumber: 89,
    homeLabel: "Winner Match 74",
    awayLabel: "Winner Match 77"
  },
  "2026-07-05T20:00:00Z": {
    matchNumber: 91,
    homeLabel: "Winner Match 76",
    awayLabel: "Winner Match 78"
  },
  "2026-07-06T00:00:00Z": {
    matchNumber: 92,
    homeLabel: "Winner Match 79",
    awayLabel: "Winner Match 80"
  },
  "2026-07-06T19:00:00Z": {
    matchNumber: 93,
    homeLabel: "Winner Match 83",
    awayLabel: "Winner Match 84"
  },
  "2026-07-07T00:00:00Z": {
    matchNumber: 94,
    homeLabel: "Winner Match 81",
    awayLabel: "Winner Match 82"
  },
  "2026-07-07T16:00:00Z": {
    matchNumber: 95,
    homeLabel: "Winner Match 86",
    awayLabel: "Winner Match 88"
  },
  "2026-07-07T20:00:00Z": {
    matchNumber: 96,
    homeLabel: "Winner Match 85",
    awayLabel: "Winner Match 87"
  },
  "2026-07-09T20:00:00Z": {
    matchNumber: 97,
    homeLabel: "Winner Match 89",
    awayLabel: "Winner Match 90"
  },
  "2026-07-10T19:00:00Z": {
    matchNumber: 98,
    homeLabel: "Winner Match 93",
    awayLabel: "Winner Match 94"
  },
  "2026-07-11T21:00:00Z": {
    matchNumber: 99,
    homeLabel: "Winner Match 91",
    awayLabel: "Winner Match 92"
  },
  "2026-07-12T01:00:00Z": {
    matchNumber: 100,
    homeLabel: "Winner Match 95",
    awayLabel: "Winner Match 96"
  },
  "2026-07-14T19:00:00Z": {
    matchNumber: 101,
    homeLabel: "Winner Match 97",
    awayLabel: "Winner Match 98"
  },
  "2026-07-15T19:00:00Z": {
    matchNumber: 102,
    homeLabel: "Winner Match 99",
    awayLabel: "Winner Match 100"
  },
  "2026-07-18T21:00:00Z": {
    matchNumber: 103,
    homeLabel: "Loser Match 101",
    awayLabel: "Loser Match 102"
  },
  "2026-07-19T19:00:00Z": {
    matchNumber: 104,
    homeLabel: "Winner Match 101",
    awayLabel: "Winner Match 102"
  }
};

const BRACKET_VISUAL_ORDER = [
  74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87,
  89, 90, 93, 94, 91, 92, 95, 96,
  97, 98, 99, 100,
  101, 102,
  104, 103
];

const groupRankingCache = new WeakMap<readonly DashboardMatch[], Map<string, GroupRanking>>();

export function getMatchupLabels(
  match: DashboardMatch,
  contextMatches?: readonly DashboardMatch[]
): MatchupLabels {
  const slot = getKnockoutSlot(match);
  const rankings = contextMatches ? getGroupRankings(contextMatches) : null;

  return {
    homeTeamLabel: resolveTeamLabel(match.homeTeam, slot?.homeLabel, rankings),
    awayTeamLabel: resolveTeamLabel(match.awayTeam, slot?.awayLabel, rankings)
  };
}

export function getDisplayMatch(
  match: DashboardMatch,
  contextMatches?: readonly DashboardMatch[]
): DashboardMatch {
  const labels = getMatchupLabels(match, contextMatches);

  if (labels.homeTeamLabel === match.homeTeam && labels.awayTeamLabel === match.awayTeam) {
    return match;
  }

  return {
    ...match,
    homeTeam: labels.homeTeamLabel,
    awayTeam: labels.awayTeamLabel
  };
}

export function getOfficialMatchNumber(match: DashboardMatch): number | null {
  return getKnockoutSlot(match)?.matchNumber ?? null;
}

export function getBracketSortValue(match: DashboardMatch): number {
  const matchNumber = getOfficialMatchNumber(match);

  if (matchNumber) {
    const visualIndex = BRACKET_VISUAL_ORDER.indexOf(matchNumber);
    return visualIndex >= 0 ? visualIndex : matchNumber;
  }

  return getTimeValue(match.utcDate);
}

function getKnockoutSlot(match: DashboardMatch): KnockoutSlot | null {
  const key = normalizeUtcDate(match.utcDate);
  return key ? KNOCKOUT_SLOTS_BY_UTC[key] ?? null : null;
}

function resolveTeamLabel(
  teamName: string,
  fallbackLabel?: string,
  rankings?: Map<string, GroupRanking> | null
): string {
  const normalizedSeed = formatCompactSeed(teamName);
  const label = fallbackLabel ?? normalizedSeed;

  if (!isPlaceholderTeam(teamName) && !normalizedSeed) {
    return teamName;
  }

  if (label) {
    return resolveKnownGroupSlot(label, rankings) ?? label;
  }

  return "TBD";
}

function formatCompactSeed(value: string): string | null {
  const seed = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = seed.match(/^([123])([A-L]+)$/);

  if (!match) {
    return null;
  }

  const [, position, groups] = match;
  const groupLabel = groups.split("").join("/");

  if (position === "1") return `Winner Group ${groupLabel}`;
  if (position === "2") return `Runner-up Group ${groupLabel}`;
  return `Best Third ${groupLabel}`;
}

function isPlaceholderTeam(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || normalized === "tbd" || normalized === "to be decided";
}

function resolveKnownGroupSlot(
  label: string,
  rankings?: Map<string, GroupRanking> | null
): string | null {
  if (!rankings) {
    return null;
  }

  const match = label.match(/^(Winner|Runner-up) Group ([A-L])$/);
  if (!match) {
    return null;
  }

  const group = rankings.get(match[2]);
  if (!group?.complete) {
    return null;
  }

  const position = match[1] === "Winner" ? 0 : 1;
  const standing = group.standings[position];
  if (!standing || hasUnresolvedTie(group.standings, position)) {
    return null;
  }

  return standing.team;
}

function hasUnresolvedTie(standings: GroupStanding[], index: number): boolean {
  const current = standings[index];
  const previous = standings[index - 1];
  const next = standings[index + 1];

  return Boolean(
    (previous && hasSameBasicTiebreakers(previous, current)) ||
    (next && hasSameBasicTiebreakers(next, current))
  );
}

function hasSameBasicTiebreakers(a: GroupStanding, b: GroupStanding): boolean {
  return a.points === b.points &&
    a.goalDifference === b.goalDifference &&
    a.goalsFor === b.goalsFor;
}

export function getGroupRankings(matches: readonly DashboardMatch[]): Map<string, GroupRanking> {
  const cached = groupRankingCache.get(matches);
  if (cached) {
    return cached;
  }

  const groups = new Map<string, DashboardMatch[]>();

  for (const match of matches) {
    const group = getGroupLetter(match);
    if (!group) continue;

    const groupMatches = groups.get(group) ?? [];
    groupMatches.push(match);
    groups.set(group, groupMatches);
  }

  const rankings = new Map<string, GroupRanking>();

  for (const [group, groupMatches] of groups) {
    rankings.set(group, buildGroupRanking(groupMatches));
  }

  groupRankingCache.set(matches, rankings);
  return rankings;
}

function buildGroupRanking(matches: DashboardMatch[]): GroupRanking {
  const standings = new Map<string, GroupStanding>();
  let complete = matches.length >= 6;

  for (const match of matches) {
    ensureStanding(standings, match.homeTeam);
    ensureStanding(standings, match.awayTeam);

    if (match.actualHome === null || match.actualAway === null) {
      complete = false;
      continue;
    }

    const home = ensureStanding(standings, match.homeTeam);
    const away = ensureStanding(standings, match.awayTeam);
    const homePoints = match.actualHome > match.actualAway ? 3 : match.actualHome === match.actualAway ? 1 : 0;
    const awayPoints = match.actualAway > match.actualHome ? 3 : match.actualHome === match.actualAway ? 1 : 0;

    home.played += 1;
    home.won += homePoints === 3 ? 1 : 0;
    home.drawn += homePoints === 1 ? 1 : 0;
    home.lost += homePoints === 0 ? 1 : 0;
    home.points += homePoints;
    home.goalsFor += match.actualHome;
    home.goalsAgainst += match.actualAway;
    home.goalDifference = home.goalsFor - home.goalsAgainst;

    away.played += 1;
    away.won += awayPoints === 3 ? 1 : 0;
    away.drawn += awayPoints === 1 ? 1 : 0;
    away.lost += awayPoints === 0 ? 1 : 0;
    away.points += awayPoints;
    away.goalsFor += match.actualAway;
    away.goalsAgainst += match.actualHome;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  return {
    complete,
    standings: [...standings.values()].sort(compareStandings)
  };
}

function ensureStanding(standings: Map<string, GroupStanding>, team: string): GroupStanding {
  const current = standings.get(team);
  if (current) {
    return current;
  }

  const next = {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    sortOrder: standings.size
  };

  standings.set(team, next);
  return next;
}

function compareStandings(a: GroupStanding, b: GroupStanding): number {
  return b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.sortOrder - b.sortOrder ||
    a.team.localeCompare(b.team);
}

function getGroupLetter(match: DashboardMatch): string | null {
  const groupName = match.groupName?.match(/GROUP_([A-L])/);
  if (groupName) {
    return groupName[1];
  }

  const group = (match.competition ?? "").match(/GROUP_STAGE.*GROUP_([A-L])/);
  return group?.[1] ?? null;
}

function normalizeUtcDate(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().replace(".000Z", "Z");
}

function getTimeValue(value?: string): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}
