/**
 * Purpose: Match schedule page.
 * Group-stage games are shown by day; knockout games are shown as a bracket-style tree.
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

export default function MatchesPage() {
  const matches = getDashboardMatches();
  const groupStageMatches = matches.filter((match) => !isKnockoutMatch(match));
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const scheduleDays = groupMatchesByDay(groupStageMatches);
  const bracketRounds = groupKnockoutRounds(knockoutMatches);

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
                Offizielle Wege der WM 2026: keine leeren Platzhalter, sondern Gruppensieger,
                Gruppenzweite und Folgesieger je Spiel.
              </p>
            </div>
            <span>32 Teams / 5 Runden</span>
          </div>
          <div className="bracketScroller">
            <div className="bracketGrid">
              {bracketRounds.map((round) => (
                <section className="bracketRound" key={round.key}>
                  <h3>{round.label}</h3>
                  <div className="bracketMatches">
                    {round.matches.map((match) => {
                      const matchNumber = getOfficialMatchNumber(match);
                      const displayMatch = getDisplayMatch(match, matches);
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
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
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
