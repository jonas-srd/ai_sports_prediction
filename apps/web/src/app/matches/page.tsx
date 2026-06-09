/**
 * Purpose: Match schedule page.
 * Group-stage games are shown by day; knockout games are shown as an interactive bracket.
 */
import Link from "next/link";
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getDashboardMatches } from "@/lib/dashboard-data";
import { getDisplayMatch, getOfficialMatchNumber } from "@/lib/match-display";
import { MatchPredictionCard } from "@/components/match-prediction-card";

type ScheduleDay = {
  key: string;
  label: string;
  matches: DashboardMatch[];
};

type BracketColumn = {
  key: string;
  label: string;
  matchNumbers: number[];
};

type BracketHalf = {
  key: string;
  label: string;
  columns: BracketColumn[];
};

export default function MatchesPage() {
  const matches = getDashboardMatches();
  const groupStageMatches = matches.filter((match) => !isKnockoutMatch(match));
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const scheduleDays = groupMatchesByDay(groupStageMatches);
  const knockoutByNumber = getMatchesByOfficialNumber(knockoutMatches);

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

      {knockoutMatches.length > 0 ? (
        <section className="knockoutSection">
          <div className="bracketHeader">
            <p className="sectionKicker">Knockout</p>
            <h2>World Cup 2026 Bracket</h2>
            <p>
              Click any match to inspect model predictions. The left and right halves meet in the final lane.
            </p>
          </div>

          <section className="bracketBoard" aria-label="Interactive knockout bracket">
            <div className="bracketHalf bracketHalfLeft">
              {LEFT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches)
              )}
            </div>

            <div className="bracketFinalLane">
              <div className="finalLaneCard">
                <span className="finalLaneLabel">Final</span>
                {renderBracketMatch(104, knockoutByNumber, matches, "final")}
              </div>
              <div className="finalLaneCard finalLaneCardMuted">
                <span className="finalLaneLabel">Third place</span>
                {renderBracketMatch(103, knockoutByNumber, matches, "standard")}
              </div>
            </div>

            <div className="bracketHalf bracketHalfRight">
              {RIGHT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches)
              )}
            </div>
          </section>
        </section>
      ) : null}

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
    </main>
  );
}

const LEFT_BRACKET: BracketHalf = {
  key: "left",
  label: "Left half",
  columns: [
    { key: "left-32", label: "Round of 32", matchNumbers: [74, 77, 73, 75, 76, 78, 79, 80] },
    { key: "left-16", label: "Round of 16", matchNumbers: [89, 90, 91, 92] },
    { key: "left-qf", label: "Quarter-finals", matchNumbers: [97, 99] },
    { key: "left-sf", label: "Semi-final", matchNumbers: [101] }
  ]
};

const RIGHT_BRACKET: BracketHalf = {
  key: "right",
  label: "Right half",
  columns: [
    { key: "right-sf", label: "Semi-final", matchNumbers: [102] },
    { key: "right-qf", label: "Quarter-finals", matchNumbers: [98, 100] },
    { key: "right-16", label: "Round of 16", matchNumbers: [93, 94, 95, 96] },
    { key: "right-32", label: "Round of 32", matchNumbers: [83, 84, 81, 82, 86, 88, 85, 87] }
  ]
};

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

function renderBracketColumn(
  column: BracketColumn,
  knockoutByNumber: Map<number, DashboardMatch>,
  contextMatches: DashboardMatch[]
) {
  return (
    <section className={`bracketColumn bracketColumn-${column.matchNumbers.length}`} key={column.key}>
      <h3>{column.label}</h3>
      <div className="bracketColumnMatches">
        {column.matchNumbers.map((matchNumber) =>
          renderBracketMatch(matchNumber, knockoutByNumber, contextMatches, "standard")
        )}
      </div>
    </section>
  );
}

function renderBracketMatch(
  matchNumber: number,
  knockoutByNumber: Map<number, DashboardMatch>,
  contextMatches: DashboardMatch[],
  variant: "standard" | "final"
) {
  const match = knockoutByNumber.get(matchNumber);
  const displayMatch = match ? getDisplayMatch(match, contextMatches) : null;

  if (!displayMatch) {
    return (
      <article className={`bracketGameCard bracketGameCard-${variant}`} key={matchNumber}>
        <span className="matchNumberBadge">Match {matchNumber}</span>
        <div className="bracketPlaceholder">
          <strong>TBD</strong>
          <span>Fixture not loaded</span>
        </div>
      </article>
    );
  }

  return (
    <MatchPredictionCard
      compact
      badge={`Match ${matchNumber}`}
      center={formatMatchCenter(displayMatch)}
      className={`bracketGameCard bracketGameCard-${variant}`}
      key={matchNumber}
      match={displayMatch}
      meta={formatMatchMeta(displayMatch)}
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

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
}

function compareMatches(a: DashboardMatch, b: DashboardMatch): number {
  return getTimeValue(a.utcDate) - getTimeValue(b.utcDate);
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

function formatCompetition(value?: string): string | null {
  if (!value) {
    return null;
  }

  const details: string[] = [];

  if (value.includes("GROUP_STAGE")) {
    details.push("Group stage");
  } else if (value.includes("LAST_32")) {
    details.push("Round of 32");
  } else if (value.includes("LAST_16")) {
    details.push("Round of 16");
  } else if (value.includes("QUARTER_FINALS")) {
    details.push("Quarter-finals");
  } else if (value.includes("SEMI_FINALS")) {
    details.push("Semi-finals");
  } else if (value.includes("THIRD_PLACE")) {
    details.push("Third place");
  } else if (value.includes("FINAL")) {
    details.push("Final");
  }

  const group = value.match(/GROUP_([A-Z])/);
  if (group) {
    details.push(`Group ${group[1]}`);
  }

  if (details.length > 0) {
    return details.join(" - ");
  }

  return value.replace("FIFA World Cup", "World Cup");
}
