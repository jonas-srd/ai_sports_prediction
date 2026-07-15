export type TheSportsDbLeagueIdentity = {
  id?: string;
  name: string;
  aliases?: string[];
  country?: string;
  eventCountry?: string;
  mainStageOnly?: boolean;
  sportName?: string;
  strictIdentity?: boolean;
};

export function matchesTheSportsDbLeagueRow(
  row: any,
  leagueId: string,
  league: TheSportsDbLeagueIdentity
) {
  const rowLeagueId = getString(row.idLeague || row.leagueId || row.league_id);
  const rowLeagueName = getString(row.strLeague || row.leagueName || row.name || row.league);

  if (rowLeagueId && rowLeagueId !== leagueId) {
    return false;
  }

  if (league.strictIdentity) {
    const expectedCountry = league.eventCountry ?? league.country;
    const rowCountry = getString(row.strCountry || row.country);
    const rowSport = getString(row.strSport || row.sport);
    const exactLeagueName = !rowLeagueName || [league.name, ...(league.aliases ?? [])]
      .some((name) => normalizedNamesEqual(rowLeagueName, name));
    const exactCountry = Boolean(
      expectedCountry &&
      rowCountry &&
      normalizedNamesEqual(rowCountry, expectedCountry)
    );
    const exactSport = !rowSport || !league.sportName || normalizedNamesEqual(rowSport, league.sportName);

    if (rowLeagueId === leagueId) {
      return exactLeagueName &&
        exactSport &&
        (!rowCountry || !expectedCountry || exactCountry) &&
        matchesRequestedCompetitionStage(row, league);
    }

    return Boolean(
      expectedCountry &&
      exactLeagueName &&
      exactCountry &&
      exactSport &&
      matchesRequestedCompetitionStage(row, league)
    );
  }

  if (rowLeagueId === leagueId) {
    return matchesRequestedCompetitionStage(row, league);
  }

  return namesMatch(rowLeagueName, league.name) && matchesRequestedCompetitionStage(row, league);
}

function matchesRequestedCompetitionStage(row: any, league: TheSportsDbLeagueIdentity) {
  if (!league.mainStageOnly) {
    return true;
  }

  const stageText = [
    row.strStage,
    row.strRound,
    row.strEvent,
    row.strDescription,
    row.stage,
    row.round
  ].map(getString).join(" ");
  if (/qualif|prelim|play[ -]?off/i.test(stageText)) {
    return false;
  }

  const rawDate = getString(row.strTimestamp || row.dateEvent || row.date || row.timestamp);
  const eventDate = rawDate ? new Date(rawDate) : null;
  if (eventDate && Number.isFinite(eventDate.getTime())) {
    const month = eventDate.getUTCMonth();
    if (month >= 5 && month <= 7) {
      return false;
    }
  }

  return true;
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function namesMatch(left: string, right: string) {
  const a = normalizeName(left);
  const b = normalizeName(right);

  return a === b || a.includes(b) || b.includes(a);
}

function normalizedNamesEqual(left: string, right: string) {
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
