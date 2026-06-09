/**
 * Purpose: Displays a football fixture in one compact line with team flags.
 * The layout mirrors common match-center rows: home team, center time/score, away team, then metadata.
 */
import { getTeamFlag } from "@/lib/country-flags";

type TeamMatchupProps = {
  homeTeam: string;
  awayTeam: string;
  center: string;
  meta?: string | null;
  compact?: boolean;
};

export function TeamMatchup({ homeTeam, awayTeam, center, meta, compact = false }: TeamMatchupProps) {
  const homeIsSeed = getSeedFlagLabel(homeTeam) !== null;
  const awayIsSeed = getSeedFlagLabel(awayTeam) !== null;

  return (
    <div className={`fixtureMatchup${compact ? " compactFixture" : ""}`}>
      <div className="fixtureLine">
        <span className="fixtureTeam homeFixtureTeam">
          {!homeIsSeed && <span>{homeTeam}</span>}
          <TeamFlag teamName={homeTeam} />
        </span>
        <strong className="fixtureCenter">{center}</strong>
        <span className="fixtureTeam awayFixtureTeam">
          <TeamFlag teamName={awayTeam} />
          {!awayIsSeed && <span>{awayTeam}</span>}
        </span>
      </div>
      {meta ? <p className="fixtureMeta">{meta}</p> : null}
    </div>
  );
}

function TeamFlag({ teamName }: { teamName: string }) {
  const seedLabel = getSeedFlagLabel(teamName);
  if (seedLabel) {
    return (
      <span className="countryFlag seedFlag" aria-hidden="true">
        {seedLabel}
      </span>
    );
  }

  const flag = getTeamFlag(teamName);
  if (!flag) {
    return <span className="countryFlag countryFlagFallback" aria-hidden="true" />;
  }

  return (
    <img
      alt={flag.alt}
      className="countryFlag"
      loading="lazy"
      src={flag.src}
      srcSet={flag.srcSet}
    />
  );
}

function getSeedFlagLabel(teamName: string): string | null {
  const winnerGroup = teamName.match(/^Sieger Gruppe ([A-L])$/);
  if (winnerGroup) return `1${winnerGroup[1]}`;

  const runnerUpGroup = teamName.match(/^Zweiter Gruppe ([A-L])$/);
  if (runnerUpGroup) return `2${runnerUpGroup[1]}`;

  if (teamName.startsWith("Bester Dritter ")) return "3x";

  const winnerMatch = teamName.match(/^Sieger Spiel (\d+)$/);
  if (winnerMatch) return `W${winnerMatch[1]}`;

  const loserMatch = teamName.match(/^Verlierer Spiel (\d+)$/);
  if (loserMatch) return `V${loserMatch[1]}`;

  if (teamName === "Offen") return "?";

  return null;
}
