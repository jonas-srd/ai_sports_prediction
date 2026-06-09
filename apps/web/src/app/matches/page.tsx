/**
 * Purpose: Match detail page for inspecting per-model predictions.
 * This page makes bad JSON, model drift, and scoring differences easy to spot during the MVP phase.
 */
import Link from "next/link";
import { getDashboardMatches } from "@/lib/dashboard-data";
import { calculatePredictionScore } from "@/lib/scorer";

type BracketLayout = {
  left: BracketRound[];
  center: BracketRound[];
  right: BracketRound[];
};

export default function MatchesPage() {
  const matches = getDashboardMatches();
<<<<<<< Updated upstream
=======
  const groupStageMatches = matches.filter((match) => !isKnockoutMatch(match));
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const scheduleDays = groupMatchesByDay(groupStageMatches);
  const bracketLayout = buildBracketLayout(knockoutMatches);
  const hasBracketMatches = [...bracketLayout.left, ...bracketLayout.center, ...bracketLayout.right]
    .some((round) => round.matches.length > 0);
>>>>>>> Stashed changes

  return (
    <main className="shell">
      <nav className="topNav">
        <Link href="/">Back to ranking</Link>
      </nav>

      <section className="hero compactHero">
        <div>
          <p className="eyebrow">Daily predictions</p>
          <h1>Matches and model picks</h1>
        </div>
      </section>

      <section className="matchDetailList">
        {matches.map((match) => (
          <article className="panel" key={match.id}>
            <div className="matchHeader">
              <h2>
                {match.homeTeam} vs {match.awayTeam}
              </h2>
              <strong>
                {formatScore(match.actualHome, match.actualAway)}
              </strong>
            </div>

            <div className="predictionTable">
              {match.predictions.length === 0 ? (
                <div className="predictionRow">
                  <div>
                    <strong>No predictions yet</strong>
                    <p>Run the daily prediction script after syncing matches.</p>
                  </div>
                </div>
              ) : (
                match.predictions.map((prediction) => {
                  const score = match.actualHome === null || match.actualAway === null
                    ? null
                    : calculatePredictionScore(
                        { home: prediction.predictedHome, away: prediction.predictedAway },
                        { home: match.actualHome, away: match.actualAway }
                      );

                  return (
                    <div className="predictionRow" key={`${match.id}-${prediction.model}`}>
                      <div>
                        <strong>{prediction.model}</strong>
                        <p>{prediction.provider}</p>
                      </div>
                      <span>
                        {prediction.predictedHome} - {prediction.predictedAway}
                      </span>
                      <span className="points">{score ? `${score.points} pts` : "pending"}</span>
                      <span className="reason">{score?.reason ?? "not scored"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        ))}
      </section>
<<<<<<< Updated upstream
=======

      {hasBracketMatches ? (
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
            <div className="bracketArena">
              <div className="bracketSide bracketSideLeft">
                {bracketLayout.left.map((round) => renderBracketRound(round, matches))}
              </div>
              <div className="bracketFinalColumn">
                {bracketLayout.center.map((round) => renderBracketRound(round, matches))}
              </div>
              <div className="bracketSide bracketSideRight">
                {bracketLayout.right.map((round) => renderBracketRound(round, matches))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
>>>>>>> Stashed changes
    </main>
  );
}

<<<<<<< Updated upstream
function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) {
    return "TBD";
  }

  return `${home} - ${away}`;
=======
function renderBracketRound(round: BracketRound, matches: DashboardMatch[]) {
  return (
    <section className="bracketRound" data-count={round.matches.length} key={round.key}>
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

function buildBracketLayout(matches: DashboardMatch[]): BracketLayout {
  const byMatchNumber = new Map<number, DashboardMatch>();

  for (const match of [...matches].sort(compareBracketMatches)) {
    const matchNumber = getOfficialMatchNumber(match);
    if (matchNumber) {
      byMatchNumber.set(matchNumber, match);
    }
  }

  return {
    left: [
      createBracketRound("left-last-32", "Letzte 32", [74, 77, 73, 75, 83, 84, 81, 82], byMatchNumber),
      createBracketRound("left-last-16", "Achtelfinale", [89, 90, 93, 94], byMatchNumber),
      createBracketRound("left-quarter", "Viertelfinale", [97, 98], byMatchNumber),
      createBracketRound("left-semi", "Halbfinale", [101], byMatchNumber)
    ],
    center: [
      createBracketRound("final", "Finale", [104], byMatchNumber),
      createBracketRound("third-place", "Platz 3", [103], byMatchNumber)
    ],
    right: [
      createBracketRound("right-semi", "Halbfinale", [102], byMatchNumber),
      createBracketRound("right-quarter", "Viertelfinale", [99, 100], byMatchNumber),
      createBracketRound("right-last-16", "Achtelfinale", [91, 92, 95, 96], byMatchNumber),
      createBracketRound("right-last-32", "Letzte 32", [76, 78, 79, 80, 86, 88, 85, 87], byMatchNumber)
    ]
  };
}

function createBracketRound(
  key: string,
  label: string,
  matchNumbers: number[],
  matches: Map<number, DashboardMatch>
): BracketRound {
  return {
    key,
    label,
    matches: matchNumbers
      .map((matchNumber) => matches.get(matchNumber))
      .filter((match): match is DashboardMatch => Boolean(match))
  };
}

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
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

  const group = value.match(/GROUP_([A-L])\b/);
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
>>>>>>> Stashed changes
}
