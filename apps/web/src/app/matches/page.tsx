/**
 * Purpose: Match schedule page.
 * Group-stage games are shown by day; knockout games are shown as readable bracket sectors.
 */
import Link from "next/link";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getDashboardMatches } from "@/lib/dashboard-data";
import { getBracketSortValue, getDisplayMatch, getOfficialMatchNumber } from "@/lib/match-display";
import { MatchPredictionCard } from "@/components/match-prediction-card";

type ScheduleDay = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

type BracketRound = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

type BracketSector = {
  key: string;
  title: string;
  subtitle: string;
  columns: BracketColumn[];
};

type BracketColumn = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

export default function MatchesPage() {
  const matches = getDashboardMatches();
  const groupStageMatches = matches.filter((match) => !isKnockoutMatch(match));
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const scheduleDays = groupMatchesByDay(groupStageMatches);
  const bracketRounds = groupKnockoutRounds(knockoutMatches);
  const bracketSectors = buildBracketSectors(knockoutMatches);
  const championshipRounds = buildChampionshipRounds(knockoutMatches);

  return (
    <main className="shell scheduleShell">
      <nav className="topNav">
        <Link href="/">Back to ranking</Link>
      </nav>

      <section className="hero heroCentered compactHero">
        <p className="eyebrow">World Cup 2026</p>
        <h1>Schedule</h1>
        <p className="heroText">
          Group-stage fixtures by day, then knockout matches as a bracket. Click any match to inspect model picks.
        </p>
      </section>

      <section className="scheduleList">
        {scheduleDays.map((day) => (
          <section className="scheduleDay" key={day.key}>
            <div className="scheduleDayHeader">
              <h2>{day.label}</h2>
              <span>View groups</span>
            </div>
            <div className="scheduleDayMatches">
              {day.matches.map((match) => {
                const displayMatch = getDisplayMatch(match, matches);
                return (
                  <MatchPredictionCard
                    className="scheduleMatchCard"
                    key={match.id}
                    match={displayMatch}
                    center={formatMatchCenter(match)}
                    meta={formatMatchMeta(match)}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </section>

      {bracketRounds.length > 0 ? (
        <section className="knockoutSection">
          <div className="scheduleDayHeader knockoutHeader">
            <div>
              <p className="sectionKicker">Knockout</p>
              <h2>Turnierbaum</h2>
              <p className="bracketNote">
                Vier klare Pfade statt einer breiten Scroll-Wand: jede Box zeigt, welche Spiele
                zusammenlaufen. Halbfinale, Finale und Platz 3 stehen separat darunter.
              </p>
            </div>
            <span>32 Teams / 5 Runden</span>
          </div>
          <div className="bracketSummary" aria-label="Knockout round overview">
            {bracketRounds.map((round) => (
              <div className="bracketSummaryItem" key={round.key}>
                <strong>{round.matches.length}</strong>
                <span>{round.label}</span>
              </div>
            ))}
          </div>
          <div className="bracketSectors">
            {bracketSectors.map((sector) => (
              <section className="bracketSector" key={sector.key}>
                <div className="bracketSectorHeader">
                  <div>
                    <p>{sector.subtitle}</p>
                    <h3>{sector.title}</h3>
                  </div>
                  <span>{getSectorMatchCount(sector)} Spiele</span>
                </div>
                <div className="bracketSectorGrid">
                  {sector.columns.map((column) => (
                    <div className="bracketSectorColumn" key={column.key}>
                      <h4>{column.label}</h4>
                      <div className="bracketMatches">
                        {column.matches.map((match) => renderBracketMatch(match, matches))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="championshipLane">
            {championshipRounds.map((round) => (
              <section className="championshipRound" key={round.key}>
                <h3>{round.label}</h3>
                <div className="championshipMatches">
                  {round.matches.map((match) => renderBracketMatch(match, matches))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

const BRACKET_SECTOR_DEFINITIONS = [
  {
    key: "sector-a",
    title: "Pfad A",
    subtitle: "Viertel oben links",
    columns: [
      { key: "last32", label: "Letzte 32", matchNumbers: [74, 77, 73, 75] },
      { key: "last16", label: "Achtelfinale", matchNumbers: [89, 90] },
      { key: "quarter", label: "Viertelfinale", matchNumbers: [97] }
    ]
  },
  {
    key: "sector-b",
    title: "Pfad B",
    subtitle: "Viertel oben rechts",
    columns: [
      { key: "last32", label: "Letzte 32", matchNumbers: [83, 84, 81, 82] },
      { key: "last16", label: "Achtelfinale", matchNumbers: [93, 94] },
      { key: "quarter", label: "Viertelfinale", matchNumbers: [98] }
    ]
  },
  {
    key: "sector-c",
    title: "Pfad C",
    subtitle: "Viertel unten links",
    columns: [
      { key: "last32", label: "Letzte 32", matchNumbers: [76, 78, 79, 80] },
      { key: "last16", label: "Achtelfinale", matchNumbers: [91, 92] },
      { key: "quarter", label: "Viertelfinale", matchNumbers: [99] }
    ]
  },
  {
    key: "sector-d",
    title: "Pfad D",
    subtitle: "Viertel unten rechts",
    columns: [
      { key: "last32", label: "Letzte 32", matchNumbers: [86, 88, 85, 87] },
      { key: "last16", label: "Achtelfinale", matchNumbers: [95, 96] },
      { key: "quarter", label: "Viertelfinale", matchNumbers: [100] }
    ]
  }
] as const;

const CHAMPIONSHIP_DEFINITIONS = [
  { key: "semis", label: "Halbfinale", matchNumbers: [101, 102] },
  { key: "finals", label: "Finale & Platz 3", matchNumbers: [104, 103] }
] as const;

function buildBracketSectors(matches: DashboardMatch[]): BracketSector[] {
  const byMatchNumber = getMatchesByOfficialNumber(matches);

  return BRACKET_SECTOR_DEFINITIONS.map((sector) => ({
    key: sector.key,
    title: sector.title,
    subtitle: sector.subtitle,
    columns: sector.columns
      .map((column) => ({
        key: column.key,
        label: column.label,
        matches: column.matchNumbers
          .map((matchNumber) => byMatchNumber.get(matchNumber))
          .filter((match): match is DashboardMatch => Boolean(match))
      }))
      .filter((column) => column.matches.length > 0)
  })).filter((sector) => sector.columns.length > 0);
}

function buildChampionshipRounds(matches: DashboardMatch[]): BracketColumn[] {
  const byMatchNumber = getMatchesByOfficialNumber(matches);

  return CHAMPIONSHIP_DEFINITIONS.map((round) => ({
    key: round.key,
    label: round.label,
    matches: round.matchNumbers
      .map((matchNumber) => byMatchNumber.get(matchNumber))
      .filter((match): match is DashboardMatch => Boolean(match))
  })).filter((round) => round.matches.length > 0);
}

function getMatchesByOfficialNumber(matches: DashboardMatch[]): Map<number, DashboardMatch> {
  const byMatchNumber = new Map<number, DashboardMatch>();

  for (const match of matches) {
    const matchNumber = getOfficialMatchNumber(match);
    if (matchNumber) {
      byMatchNumber.set(matchNumber, match);
    }
  }

  return byMatchNumber;
}

function getSectorMatchCount(sector: BracketSector): number {
  return sector.columns.reduce((total, column) => total + column.matches.length, 0);
}

function renderBracketMatch(match: DashboardMatch, contextMatches: DashboardMatch[]) {
  const matchNumber = getOfficialMatchNumber(match);
  const displayMatch = getDisplayMatch(match, contextMatches);

  return (
    <MatchPredictionCard
      compact
      badge={matchNumber ? `Spiel ${matchNumber}` : undefined}
      className="bracketMatchCard"
      key={match.id}
      match={displayMatch}
      center={formatMatchCenter(match)}
      meta={formatBracketMeta(match)}
    />
  );
}

function groupMatchesByDay(matches: DashboardMatch[]): ScheduleDay[] {
  const days = new Map<string, ScheduleDay>();

  for (const match of matches) {
    const key = getDayKey(match);
    const day = days.get(key) ?? {
      key,
      label: formatDayLabel(match.utcDate),
      matches: []
    };

    day.matches.push(match);
    days.set(key, day);
  }

  return [...days.values()]
    .map((day) => ({
      ...day,
      matches: day.matches.sort(compareMatches)
    }))
    .sort((a, b) => compareDateKeys(a.key, b.key));
}

function groupKnockoutRounds(matches: DashboardMatch[]): BracketRound[] {
  const rounds = new Map<string, BracketRound>();

  for (const match of [...matches].sort(compareBracketMatches)) {
    const key = getRoundKey(match);
    const round = rounds.get(key) ?? {
      key,
      label: formatRoundLabel(key),
      matches: []
    };

    round.matches.push(match);
    rounds.set(key, round);
  }

  return [...rounds.values()].sort((a, b) => getRoundOrder(a.key) - getRoundOrder(b.key));
}

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
}

function getRoundKey(match: DashboardMatch): string {
  const competition = match.competition ?? "";
  if (competition.includes("LAST_32")) return "LAST_32";
  if (competition.includes("LAST_16")) return "LAST_16";
  if (competition.includes("QUARTER_FINALS")) return "QUARTER_FINALS";
  if (competition.includes("SEMI_FINALS")) return "SEMI_FINALS";
  if (competition.includes("THIRD_PLACE")) return "THIRD_PLACE";
  if (competition.includes("FINAL")) return "FINAL";
  return "KNOCKOUT";
}

function getRoundOrder(round: string): number {
  const order: Record<string, number> = {
    LAST_32: 1,
    LAST_16: 2,
    QUARTER_FINALS: 3,
    SEMI_FINALS: 4,
    FINAL: 5,
    THIRD_PLACE: 6,
    KNOCKOUT: 99
  };

  return order[round] ?? 99;
}

function formatRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    LAST_32: "Runde der letzten 32",
    LAST_16: "Achtelfinale",
    QUARTER_FINALS: "Viertelfinale",
    SEMI_FINALS: "Halbfinale",
    THIRD_PLACE: "Spiel um Platz 3",
    FINAL: "Finale",
    KNOCKOUT: "K.o.-Phase"
  };

  return labels[round] ?? round;
}

function compareMatches(a: DashboardMatch, b: DashboardMatch): number {
  return getTimeValue(a.utcDate) - getTimeValue(b.utcDate);
}

function compareBracketMatches(a: DashboardMatch, b: DashboardMatch): number {
  return getBracketSortValue(a) - getBracketSortValue(b) || compareMatches(a, b);
}

function compareDateKeys(a: string, b: string): number {
  return a.localeCompare(b);
}

function getDayKey(match: DashboardMatch): string {
  if (!match.utcDate) {
    return "9999-unknown";
  }

  const date = new Date(match.utcDate);
  if (Number.isNaN(date.getTime())) {
    return "9999-unknown";
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Berlin"
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function getTimeValue(value?: string): number {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function formatDayLabel(value?: string): string {
  if (!value) {
    return "Date open";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin"
  })
    .format(date)
    .replace(",", "");
}

function formatMatchCenter(match: DashboardMatch): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  if (!match.utcDate) {
    return "Open";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(new Date(match.utcDate));
}

function formatMatchMeta(match: DashboardMatch): string | null {
  const details = [formatCompetition(match.competition), match.venue].filter(Boolean);
  return details.length > 0 ? details.join(" - ") : null;
}

function formatBracketMeta(match: DashboardMatch): string | null {
  const details = [
    formatShortDayLabel(match.utcDate),
    formatCompetition(match.competition),
    match.venue
  ].filter(Boolean);

  return details.length > 0 ? details.join(" - ") : null;
}

function formatCompetition(value?: string): string | null {
  if (!value) {
    return null;
  }

  const details: string[] = [];

  if (value.includes("GROUP_STAGE")) {
    details.push("Gruppenphase");
  } else if (value.includes("LAST_32")) {
    details.push("Runde der letzten 32");
  } else if (value.includes("LAST_16")) {
    details.push("Achtelfinale");
  } else if (value.includes("QUARTER_FINALS")) {
    details.push("Viertelfinale");
  } else if (value.includes("SEMI_FINALS")) {
    details.push("Halbfinale");
  } else if (value.includes("THIRD_PLACE")) {
    details.push("Spiel um Platz 3");
  } else if (value.includes("FINAL")) {
    details.push("Finale");
  }

  const group = value.match(/GROUP_([A-Z])/);
  if (group) {
    details.push(`Gruppe ${group[1]}`);
  }

  if (details.length > 0) {
    return details.join(" - ");
  }

  return value.replace("FIFA World Cup", "World Cup");
}

function formatShortDayLabel(value?: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Berlin"
  }).format(date);
}
