/**
 * Purpose: Displays a football fixture in one compact line with team flags.
 * The layout mirrors common match-center rows: home team, center time/score, away team, then metadata.
 */
import { formatTeamName, getTeamFlag } from "@/lib/country-flags";
import type { Locale } from "@/lib/i18n";

type TeamMatchupProps = {
  homeTeam: string;
  awayTeam: string;
  center: string;
  meta?: string | null;
  compact?: boolean;
  locale?: Locale;
};

export function TeamMatchup({ homeTeam, awayTeam, center, meta, compact = false, locale = "en" }: TeamMatchupProps) {
  const homeIsSeed = getSeedFlagLabel(homeTeam) !== null;
  const awayIsSeed = getSeedFlagLabel(awayTeam) !== null;
  const displayHomeTeam = formatTeamName(homeTeam, locale);
  const displayAwayTeam = formatTeamName(awayTeam, locale);

  return (
    <div className={`fixtureMatchup${compact ? " compactFixture" : ""}`}>
      <div className="fixtureLine">
        <span className="fixtureTeam homeFixtureTeam">
          {!homeIsSeed && <span>{displayHomeTeam}</span>}
          <TeamFlag locale={locale} teamName={homeTeam} />
        </span>
        <strong className="fixtureCenter">{center}</strong>
        <span className="fixtureTeam awayFixtureTeam">
          <TeamFlag locale={locale} teamName={awayTeam} />
          {!awayIsSeed && <span>{displayAwayTeam}</span>}
        </span>
      </div>
      {meta ? <p className="fixtureMeta">{meta}</p> : null}
    </div>
  );
}

function TeamFlag({ locale, teamName }: { locale: Locale; teamName: string }) {
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
      alt={locale === "de" ? `Flagge ${formatTeamName(teamName, locale)}` : flag.alt}
      className="countryFlag"
      loading="lazy"
      src={flag.src}
      srcSet={flag.srcSet}
    />
  );
}

function getSeedFlagLabel(teamName: string): string | null {
  const winnerGroup = teamName.match(/^Winner Group ([A-L])$/);
  if (winnerGroup) return `1${winnerGroup[1]}`;

  const runnerUpGroup = teamName.match(/^Runner-up Group ([A-L])$/);
  if (runnerUpGroup) return `2${runnerUpGroup[1]}`;

  if (teamName.startsWith("Best Third ")) return "3x";

  const winnerMatch = teamName.match(/^Winner Match (\d+)$/);
  if (winnerMatch) return `W${winnerMatch[1]}`;

  const loserMatch = teamName.match(/^Loser Match (\d+)$/);
  if (loserMatch) return `V${loserMatch[1]}`;

  if (teamName === "TBD") return "?";

  return null;
}
