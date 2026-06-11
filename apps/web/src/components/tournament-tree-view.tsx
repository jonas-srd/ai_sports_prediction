"use client";

/**
 * Purpose: Dedicated World Cup knockout tournament tree page.
 */
import type { DashboardMatch } from "@/lib/dashboard-data";
import { getTeamFlag } from "@/lib/country-flags";
import {
  getDisplayMatch,
  getGroupRankings,
  getOfficialMatchNumber,
  type GroupStanding
} from "@/lib/match-display";
import { MatchPredictionCard } from "@/components/match-prediction-card";
import { formatMatchTime } from "@/lib/timezone";
import { useTimeZone } from "@/components/time-zone-provider";

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

type GroupOverview = {
  letter: string;
  standings: GroupStanding[];
};

export function TournamentTreeView({ matches }: { matches: DashboardMatch[] }) {
  const { timeZone } = useTimeZone();
  const groups = getGroupOverview(matches);
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const knockoutByNumber = getMatchesByOfficialNumber(knockoutMatches);

  return (
    <main className="shell scheduleShell">
      {groups.length > 0 ? (
        <section className="groupOverviewSection" aria-label="World Cup groups">
          <div className="groupOverviewHeader">
            <p className="sectionKicker">Group stage</p>
            <h2>Groups</h2>
            <p>The group layout feeds the fixed knockout path below.</p>
          </div>

          <div className="groupOverviewGrid">
            {groups.map((group) => (
              <article className="groupOverviewCard" key={group.letter}>
                <h3>Group {group.letter}</h3>
                <GroupTable standings={group.standings} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section className="knockoutSection tournamentTreeSection">
          <section className="bracketBoard" aria-label="Interactive knockout bracket">
            <div className="bracketBoardTitle">
              <p className="sectionKicker">World Cup 2026</p>
              <h1>Tournament Tree</h1>
            </div>

            <div className="bracketHalf bracketHalfLeft">
              {LEFT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches, timeZone)
              )}
            </div>

            <div className="bracketFinalLane">
              <div className="finalLaneCard">
                <span className="finalLaneLabel">Final</span>
                {renderBracketMatch(104, knockoutByNumber, matches, "final", timeZone)}
              </div>
              <div className="finalLaneCard finalLaneCardMuted">
                <span className="finalLaneLabel">Third place</span>
                {renderBracketMatch(103, knockoutByNumber, matches, "standard", timeZone)}
              </div>
            </div>

            <div className="bracketHalf bracketHalfRight">
              {RIGHT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches, timeZone)
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="panel emptyTreePanel">
          <p className="sectionKicker">Knockout</p>
          <h2>No knockout fixtures loaded yet</h2>
          <p>Sync fixtures once the tournament tree is available to show the bracket here.</p>
        </section>
      )}
    </main>
  );
}

function GroupTeamFlag({ teamName }: { teamName: string }) {
  const flag = getTeamFlag(teamName);

  if (!flag) {
    return (
      <span className="groupTeamFlag groupTeamFlagFallback" aria-hidden="true">
        FIFA
      </span>
    );
  }

  return (
    <img
      alt={flag.alt}
      className="groupTeamFlag"
      loading="lazy"
      src={flag.src}
      srcSet={flag.srcSet}
    />
  );
}

function GroupTable({ standings }: { standings: GroupStanding[] }) {
  return (
    <div className="groupTableWrap">
      <table className="groupTable">
        <thead>
          <tr>
            <th aria-label="Position"></th>
            <th>Team</th>
            <th>Pld</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((standing, index) => (
            <tr key={standing.team}>
              <td className="groupTableRank">{index + 1}</td>
              <td className="groupTableTeam">
                <span className="groupTableTeamInner">
                  <GroupTeamFlag teamName={standing.team} />
                  <span>{standing.team}</span>
                </span>
              </td>
              <td>{standing.played}</td>
              <td>{standing.won}</td>
              <td>{standing.drawn}</td>
              <td>{standing.lost}</td>
              <td>{standing.goalsFor}</td>
              <td className="groupTablePoints">{standing.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
  contextMatches: DashboardMatch[],
  timeZone: string
) {
  return (
    <section className={`bracketColumn bracketColumn-${column.matchNumbers.length}`} key={column.key}>
      <h3>{column.label}</h3>
      <div className="bracketColumnMatches">
        {column.matchNumbers.map((matchNumber) =>
          renderBracketMatch(matchNumber, knockoutByNumber, contextMatches, "standard", timeZone)
        )}
      </div>
    </section>
  );
}

function renderBracketMatch(
  matchNumber: number,
  knockoutByNumber: Map<number, DashboardMatch>,
  contextMatches: DashboardMatch[],
  variant: "standard" | "final",
  timeZone: string
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
      center={formatMatchCenter(displayMatch, timeZone)}
      className={`bracketGameCard bracketGameCard-${variant}`}
      key={matchNumber}
      match={displayMatch}
      meta={formatMatchMeta(displayMatch)}
    />
  );
}

function isKnockoutMatch(match: DashboardMatch): boolean {
  const competition = match.competition ?? "";
  return !competition.includes("GROUP_STAGE");
}

function getGroupOverview(matches: DashboardMatch[]): GroupOverview[] {
  return [...getGroupRankings(matches).entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([letter, ranking]) => ({ letter, standings: ranking.standings }));
}

function formatMatchCenter(match: DashboardMatch, timeZone: string): string {
  if (match.actualHome !== null && match.actualAway !== null) {
    return `${match.actualHome} - ${match.actualAway}`;
  }

  return formatMatchTime(match.utcDate, timeZone);
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

  if (value.includes("LAST_32")) {
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

  return details.length > 0 ? details.join(" - ") : value.replace("FIFA World Cup", "World Cup");
}
