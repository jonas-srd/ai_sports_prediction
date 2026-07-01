import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { HomeDashboard } from "@/components/home-dashboard";
import { MatchesSchedule } from "@/components/matches-schedule";
import { TournamentTreeView } from "@/components/tournament-tree-view";
import { getDashboardMatchesFromApi, getSpecialPredictionsFromApi } from "@/lib/dashboard-api-data";
import { sampleMatches } from "@/lib/dashboard-types";
import { localizePath, routeText, type Locale } from "@/lib/i18n";

export async function HomePageContent({ locale }: { locale: Locale }) {
  const matches = await getDashboardMatches();
  const specialPredictions = await getSpecialQuestionPredictions();
  const text = routeText[locale].home;

  return (
    <main className="shell">
      <section className="hero heroCentered">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="heroText">
          {text.description}
        </p>
        <div className="heroActions">
          <Link className="primaryLink" href={localizePath("/matches", locale)}>{text.cta}</Link>
        </div>
      </section>

      <HomeDashboard locale={locale} matches={matches} specialPredictions={specialPredictions} />
    </main>
  );
}

export async function MatchesPageContent({ locale }: { locale: Locale }) {
  const matches = await getDashboardMatches();
  const text = routeText[locale].matches;

  return (
    <main className="shell scheduleShell">
      <section className="hero heroCentered compactHero">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="heroText">
          {text.description}
        </p>
      </section>

      <MatchesSchedule locale={locale} matches={matches} />
    </main>
  );
}

export async function AnalyticsPageContent({ locale }: { locale: Locale }) {
  const matches = await getDashboardMatches();
  const predictions = matches
    .flatMap((match) => match.predictions)
    .filter((prediction) => !prediction.id.startsWith("legacy:"));
  const specialPredictions = await getSpecialQuestionPredictions();
  const text = routeText[locale].analytics;

  return (
    <main className="shell analyticsShell">
      <section className="hero heroCentered compactHero">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="heroText">
          {text.description}
        </p>
      </section>

      <AnalyticsDashboard locale={locale} predictions={predictions} specialPredictions={specialPredictions} />
    </main>
  );
}

export async function TournamentTreePageContent({ locale }: { locale: Locale }) {
  const matches = await getDashboardMatches();

  return <TournamentTreeView locale={locale} matches={matches} />;
}

async function getDashboardMatches() {
  try {
    return await getDashboardMatchesFromApi() ?? sampleMatches;
  } catch (error) {
    console.error(error);
    return sampleMatches;
  }
}

async function getSpecialQuestionPredictions() {
  try {
    return await getSpecialPredictionsFromApi() ?? [];
  } catch (error) {
    console.error(error);
    return [];
  }
}
