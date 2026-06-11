import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { HomeDashboard } from "@/components/home-dashboard";
import { MatchesSchedule } from "@/components/matches-schedule";
import { TournamentTreeView } from "@/components/tournament-tree-view";
import { getBenchmarkPredictions, getDashboardMatches, getSpecialQuestionPredictions } from "@/lib/dashboard-data";
import { localizePath, routeText, type Locale } from "@/lib/i18n";

export function HomePageContent({ locale }: { locale: Locale }) {
  const matches = getDashboardMatches();
  const specialPredictions = getSpecialQuestionPredictions();
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

export function MatchesPageContent({ locale }: { locale: Locale }) {
  const matches = getDashboardMatches();
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

export function AnalyticsPageContent({ locale }: { locale: Locale }) {
  const predictions = getBenchmarkPredictions().filter((prediction) => !prediction.id.startsWith("legacy:"));
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

      <AnalyticsDashboard locale={locale} predictions={predictions} />
    </main>
  );
}

export function TournamentTreePageContent({ locale }: { locale: Locale }) {
  const matches = getDashboardMatches();

  return <TournamentTreeView locale={locale} matches={matches} />;
}

