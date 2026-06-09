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
  return (
    <div className={`fixtureMatchup${compact ? " compactFixture" : ""}`}>
      <div className="fixtureLine">
        <span className="fixtureTeam homeFixtureTeam">
          <span>{homeTeam}</span>
          <TeamFlag teamName={homeTeam} />
        </span>
        <strong className="fixtureCenter">{center}</strong>
        <span className="fixtureTeam awayFixtureTeam">
          <TeamFlag teamName={awayTeam} />
          <span>{awayTeam}</span>
        </span>
      </div>
      {meta ? <p className="fixtureMeta">{meta}</p> : null}
    </div>
  );
}

function TeamFlag({ teamName }: { teamName: string }) {
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
