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
import type { Locale } from "@/lib/i18n";

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

const TOURNAMENT_TEXT = {
  en: {
    groupsLabel: "World Cup groups",
    groupStage: "Group stage",
    groups: "Groups",
    groupDescription: "The group layout feeds the fixed knockout path below.",
    group: "Group",
    team: "Team",
    played: "Pld",
    won: "W",
    drawn: "D",
    lost: "L",
    goalsFor: "GF",
    points: "Pts",
    bracketLabel: "Interactive knockout bracket",
    worldCup: "World Cup 2026",
    treeTitle: "Tournament Tree",
    final: "Final",
    thirdPlace: "Third place",
    knockout: "Knockout",
    noFixtures: "No knockout fixtures loaded yet",
    noFixturesDescription: "Sync fixtures once the tournament tree is available to show the bracket here.",
    match: "Match",
    fixtureNotLoaded: "Fixture not loaded",
    roundOf32: "Round of 32",
    roundOf16: "Round of 16",
    quarterFinals: "Quarter-finals",
    semiFinal: "Semi-final"
  },
  de: {
    groupsLabel: "WM-Gruppen",
    groupStage: "Gruppenphase",
    groups: "Gruppen",
    groupDescription: "Die Gruppeneinteilung bestimmt den festen K.-o.-Pfad darunter.",
    group: "Gruppe",
    team: "Team",
    played: "Sp.",
    won: "S",
    drawn: "U",
    lost: "N",
    goalsFor: "T",
    points: "Pkt.",
    bracketLabel: "Interaktiver K.-o.-Baum",
    worldCup: "WM 2026",
    treeTitle: "Turnierbaum",
    final: "Finale",
    thirdPlace: "Spiel um Platz 3",
    knockout: "K.-o.-Phase",
    noFixtures: "Noch keine K.-o.-Spiele geladen",
    noFixturesDescription: "Synchronisiere die Spiele, sobald der Turnierbaum verfugbar ist, um ihn hier anzuzeigen.",
    match: "Spiel",
    fixtureNotLoaded: "Spiel nicht geladen",
    roundOf32: "Runde der 32",
    roundOf16: "Achtelfinale",
    quarterFinals: "Viertelfinale",
    semiFinal: "Halbfinale"
  }
} as const;

type TournamentCopy = { [Key in keyof typeof TOURNAMENT_TEXT.en]: string };

export function TournamentTreeView({ locale, matches }: { locale: Locale; matches: DashboardMatch[] }) {
  const { timeZone } = useTimeZone();
  const text = TOURNAMENT_TEXT[locale];
  const groups = getGroupOverview(matches);
  const knockoutMatches = matches.filter(isKnockoutMatch);
  const knockoutByNumber = getMatchesByOfficialNumber(knockoutMatches);

  return (
    <main className="shell scheduleShell">
      {groups.length > 0 ? (
        <section className="groupOverviewSection" aria-label={text.groupsLabel}>
          <div className="groupOverviewHeader">
            <p className="sectionKicker">{text.groupStage}</p>
            <h2>{text.groups}</h2>
            <p>{text.groupDescription}</p>
          </div>

          <div className="groupOverviewGrid">
            {groups.map((group) => (
              <article className="groupOverviewCard" key={group.letter}>
                <h3>{text.group} {group.letter}</h3>
                <GroupTable locale={locale} standings={group.standings} />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {knockoutMatches.length > 0 ? (
        <section className="knockoutSection tournamentTreeSection">
          <section className="bracketBoard" aria-label={text.bracketLabel}>
            <div className="bracketBoardTitle">
              <p className="sectionKicker">{text.worldCup}</p>
              <h1>{text.treeTitle}</h1>
            </div>

            <div className="bracketHalf bracketHalfLeft">
              {LEFT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches, timeZone, locale)
              )}
            </div>

            <div className="bracketFinalLane">
              <div className="finalLaneCard">
                <span className="finalLaneLabel">{text.final}</span>
                {renderBracketMatch(104, knockoutByNumber, matches, "final", timeZone, locale)}
              </div>
              <div className="finalLaneCard finalLaneCardMuted">
                <span className="finalLaneLabel">{text.thirdPlace}</span>
                {renderBracketMatch(103, knockoutByNumber, matches, "standard", timeZone, locale)}
              </div>
            </div>

            <div className="bracketHalf bracketHalfRight">
              {RIGHT_BRACKET.columns.map((column) =>
                renderBracketColumn(column, knockoutByNumber, matches, timeZone, locale)
              )}
            </div>
          </section>
        </section>
      ) : (
        <section className="panel emptyTreePanel">
          <p className="sectionKicker">{text.knockout}</p>
          <h2>{text.noFixtures}</h2>
          <p>{text.noFixturesDescription}</p>
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

function GroupTable({ locale, standings }: { locale: Locale; standings: GroupStanding[] }) {
  const text = TOURNAMENT_TEXT[locale];
  return (
    <div className="groupTableWrap">
      <table className="groupTable">
        <thead>
          <tr>
            <th aria-label="Position"></th>
            <th>{text.team}</th>
            <th>{text.played}</th>
            <th>{text.won}</th>
            <th>{text.drawn}</th>
            <th>{text.lost}</th>
            <th>{text.goalsFor}</th>
            <th>{text.points}</th>
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
  timeZone: string,
  locale: Locale
) {
  const text = TOURNAMENT_TEXT[locale];
  return (
    <section className={`bracketColumn bracketColumn-${column.matchNumbers.length}`} key={column.key}>
      <h3>{formatBracketColumnLabel(column.label, text)}</h3>
      <div className="bracketColumnMatches">
        {column.matchNumbers.map((matchNumber) =>
          renderBracketMatch(matchNumber, knockoutByNumber, contextMatches, "standard", timeZone, locale)
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
  timeZone: string,
  locale: Locale
) {
  const text = TOURNAMENT_TEXT[locale];
  const match = knockoutByNumber.get(matchNumber);
  const displayMatch = match ? getDisplayMatch(match, contextMatches) : null;

  if (!displayMatch) {
    return (
      <article className={`bracketGameCard bracketGameCard-${variant}`} key={matchNumber}>
        <span className="matchNumberBadge">{text.match} {matchNumber}</span>
        <div className="bracketPlaceholder">
          <strong>TBD</strong>
          <span>{text.fixtureNotLoaded}</span>
        </div>
      </article>
    );
  }

  return (
    <MatchPredictionCard
      compact
      badge={`${text.match} ${matchNumber}`}
      center={formatMatchCenter(displayMatch, timeZone)}
      className={`bracketGameCard bracketGameCard-${variant}`}
      key={matchNumber}
      locale={locale}
      match={displayMatch}
      meta={formatMatchMeta(displayMatch, locale)}
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

function formatMatchMeta(match: DashboardMatch, locale: Locale): string | null {
  const details = [formatCompetition(match.competition, locale), match.venue].filter(Boolean);
  return details.length > 0 ? details.join(" - ") : null;
}

function formatCompetition(value: string | undefined, locale: Locale): string | null {
  if (!value) {
    return null;
  }

  const text = TOURNAMENT_TEXT[locale];
  const details: string[] = [];

  if (value.includes("LAST_32")) {
    details.push(text.roundOf32);
  } else if (value.includes("LAST_16")) {
    details.push(text.roundOf16);
  } else if (value.includes("QUARTER_FINALS")) {
    details.push(text.quarterFinals);
  } else if (value.includes("SEMI_FINALS")) {
    details.push(text.semiFinal);
  } else if (value.includes("THIRD_PLACE")) {
    details.push(text.thirdPlace);
  } else if (value.includes("FINAL")) {
    details.push(text.final);
  }

  return details.length > 0 ? details.join(" - ") : value.replace("FIFA World Cup", "World Cup");
}

function formatBracketColumnLabel(label: string, text: TournamentCopy): string {
  if (label === "Round of 32") return text.roundOf32;
  if (label === "Round of 16") return text.roundOf16;
  if (label === "Quarter-finals") return text.quarterFinals;
  if (label === "Semi-final") return text.semiFinal;
  return label;
}
