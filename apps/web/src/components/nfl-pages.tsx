import { LeagueSportPage, LeagueSportTeamPage, type LeagueSportTab, type LeagueSportTeamTab } from "@/components/league-sport-pages";
import { nflTeams } from "@/lib/nfl-data";
import type { Locale } from "@/lib/i18n";

const nflConfig = {
  apiSport: "nfl" as const,
  basePath: "/nfl" as const,
  title: "NFL",
  subtitle: {
    en: "Weekly slate, team strength, playoff paths and model signals.",
    de: "Weekly Slate, Teamstärke, Playoff-Pfade und Modell-Signale."
  },
  provider: "TheSportsDB",
  teams: nflTeams,
  pointsLabel: "PF",
  scoreStep: 3,
  modelFocus: {
    en: "EPA, quarterback availability, rest days and game script",
    de: "EPA, Quarterback-Verfügbarkeit, Rest Days und Game Script"
  }
};

export function NflPage({ locale, tab = "news" }: { locale: Locale; tab?: LeagueSportTab }) {
  return <LeagueSportPage config={nflConfig} locale={locale} tab={tab} />;
}

export function NflTeamPage({ locale, tab = "info", teamSlug }: { locale: Locale; tab?: LeagueSportTeamTab; teamSlug: string }) {
  return <LeagueSportTeamPage config={nflConfig} locale={locale} tab={tab} teamSlug={teamSlug} />;
}

export function nflTeamStaticParams() {
  return nflTeams.map((team) => ({ teamSlug: team.slug }));
}
