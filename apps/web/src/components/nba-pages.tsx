import { LeagueSportPage, LeagueSportTeamPage, type LeagueSportTab, type LeagueSportTeamTab } from "@/components/league-sport-pages";
import type { Locale } from "@/lib/i18n";
import { nbaTeams } from "@/lib/nba-data";

const nbaConfig = {
  apiSport: "nba" as const,
  basePath: "/nba" as const,
  title: "NBA",
  subtitle: {
    en: "Nightly matchups, pace, rest, rotations and playoff series signals.",
    de: "Nightly Matchups, Pace, Rest, Rotationen und Playoff-Series-Signale."
  },
  provider: "API-Sports NBA",
  teams: nbaTeams,
  pointsLabel: "PTS",
  scoreStep: 80,
  modelFocus: {
    en: "pace, efficiency, rest, travel and player availability",
    de: "Pace, Effizienz, Rest, Travel und Player Availability"
  }
};

export function NbaPage({ locale, tab = "news" }: { locale: Locale; tab?: LeagueSportTab }) {
  return <LeagueSportPage config={nbaConfig} locale={locale} tab={tab} />;
}

export function NbaTeamPage({ locale, tab = "info", teamSlug }: { locale: Locale; tab?: LeagueSportTeamTab; teamSlug: string }) {
  return <LeagueSportTeamPage config={nbaConfig} locale={locale} tab={tab} teamSlug={teamSlug} />;
}

export function nbaTeamStaticParams() {
  return nbaTeams.map((team) => ({ teamSlug: team.slug }));
}
