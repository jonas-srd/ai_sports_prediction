import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { HomeDashboard } from "@/components/home-dashboard";
import { MatchesSchedule } from "@/components/matches-schedule";
import { TournamentTreeView } from "@/components/tournament-tree-view";
import { getDashboardMatchesFromApi, getSpecialPredictionsFromApi } from "@/lib/dashboard-api-data";
import { sampleMatches } from "@/lib/dashboard-types";
import { localizePath, routeText, type Locale } from "@/lib/i18n";

const homeExperience = {
  en: {
    liveBadge: "Live model hub",
    primaryCta: "Explore sports",
    secondaryCta: "View AI analytics",
    boardTitle: "Prediction board",
    boardSubtitle: "Model consensus across active sports",
    sportNavLabel: "Jump to sport",
    sportsTitle: "Sports built for prediction",
    sportsText: "Each sport gets its own model signals, market context and result validation.",
    dashboardEyebrow: "Live preview",
    dashboardTitle: "Current football benchmark view",
    dashboardText: "The existing match data remains available while the multi-sport frontend is being expanded.",
    signalTitle: "What the AI layer reads",
    signalText: "Signals are normalized per sport so the same dashboard can compare football, NFL, NBA and tennis without mixing incompatible metrics.",
    boardRows: [
      { league: "Football", teams: "Germany vs Brazil", pick: "2-1", confidence: "64%", meter: "64%" },
      { league: "NFL", teams: "Chiefs vs Bills", pick: "27-24", confidence: "58%", meter: "58%" },
      { league: "NBA", teams: "Celtics vs Knicks", pick: "113-108", confidence: "61%", meter: "61%" },
      { league: "Tennis", teams: "Sinner vs Alcaraz", pick: "3-1", confidence: "55%", meter: "55%" }
    ],
    sports: [
      {
        id: "football",
        label: "Football",
        status: "Core sport",
        title: "Fixtures, form and tournament paths",
        description: "Model picks for domestic leagues, international fixtures and knockout tournaments.",
        features: ["90-minute scorelines", "xG and form curves", "Group and bracket simulations"],
        markets: "Match result, exact score, qualification, upset risk"
      },
      {
        id: "nfl",
        label: "NFL",
        status: "Next module",
        title: "Game lines, playoff odds and team strength",
        description: "Forecasts built around possession efficiency, injuries, schedules and game scripts.",
        features: ["Win probability", "Spread sensitivity", "Playoff path simulation"],
        markets: "Winner, margin, totals, conference and Super Bowl paths"
      },
      {
        id: "nba",
        label: "NBA",
        status: "Next module",
        title: "High-tempo forecasts for matchup nights",
        description: "Predictions that account for rest, travel, rotations and player availability.",
        features: ["Back-to-back factor", "Lineup impact", "Pace and efficiency signals"],
        markets: "Winner, margin, totals, playoff series"
      },
      {
        id: "tennis",
        label: "Tennis",
        status: "Next module",
        title: "Surface-aware match predictions",
        description: "Tennis forecasts built around draw context, surface, serve quality and recent form.",
        features: ["Surface adjustment", "Serve and return split", "Best-of format handling"],
        markets: "Match winner, set score, tournament draw paths"
      }
    ],
    signals: [
      { label: "Model consensus", text: "Aggregates multiple model picks into one readable forecast." },
      { label: "Upset alert", text: "Highlights games where model confidence and public expectation diverge." },
      { label: "Reliability score", text: "Separates confident forecasts from noisy, low-signal matchups." },
      { label: "Result check", text: "Scores predictions after the official result is available." }
    ]
  },
  de: {
    liveBadge: "Live Model Hub",
    primaryCta: "Sportarten entdecken",
    secondaryCta: "KI-Analyse ansehen",
    boardTitle: "Prediction Board",
    boardSubtitle: "Modell-Konsens über aktive Sportarten",
    sportNavLabel: "Zur Sportart springen",
    sportsTitle: "Sportarten für Prognosen",
    sportsText: "Jede Sportart bekommt eigene Modell-Signale, Kontextdaten und Ergebnisvalidierung.",
    dashboardEyebrow: "Live Preview",
    dashboardTitle: "Aktuelle Fußball-Benchmark-Ansicht",
    dashboardText: "Die vorhandenen Match-Daten bleiben verfügbar, während das Multi-Sport-Frontend ausgebaut wird.",
    signalTitle: "Was die KI-Schicht auswertet",
    signalText: "Signale werden pro Sportart normalisiert, damit Fußball, NFL, NBA und Tennis vergleichbar bleiben.",
    boardRows: [
      { league: "Fußball", teams: "Deutschland vs Brasilien", pick: "2:1", confidence: "64%", meter: "64%" },
      { league: "NFL", teams: "Chiefs vs Bills", pick: "27:24", confidence: "58%", meter: "58%" },
      { league: "NBA", teams: "Celtics vs Knicks", pick: "113:108", confidence: "61%", meter: "61%" },
      { league: "Tennis", teams: "Sinner vs Alcaraz", pick: "3:1", confidence: "55%", meter: "55%" }
    ],
    sports: [
      {
        id: "football",
        label: "Fußball",
        status: "Kernmodul",
        title: "Spiele, Form und Turnierpfade",
        description: "Modelltipps für Ligen, internationale Spiele und K.-o.-Turniere.",
        features: ["90-Minuten-Ergebnisse", "xG- und Formkurven", "Gruppen- und Bracket-Simulationen"],
        markets: "Spielausgang, exaktes Ergebnis, Qualifikation, Upset-Risiko"
      },
      {
        id: "nfl",
        label: "NFL",
        status: "Nächstes Modul",
        title: "Game Lines, Playoff Odds und Team Strength",
        description: "Prognosen auf Basis von Effizienz, Verletzungen, Spielplan und Game Scripts.",
        features: ["Siegwahrscheinlichkeit", "Spread-Sensitivität", "Playoff-Pfad-Simulation"],
        markets: "Sieger, Margin, Totals, Conference- und Super-Bowl-Pfade"
      },
      {
        id: "nba",
        label: "NBA",
        status: "Nächstes Modul",
        title: "Schnelle Forecasts für Matchup Nights",
        description: "Vorhersagen mit Rest Days, Travel, Rotation und Spieler-Verfügbarkeit.",
        features: ["Back-to-back-Faktor", "Lineup Impact", "Pace- und Effizienzsignale"],
        markets: "Sieger, Margin, Totals, Playoff-Serien"
      },
      {
        id: "tennis",
        label: "Tennis",
        status: "Nächstes Modul",
        title: "Surface-aware Match Predictions",
        description: "Tennis-Prognosen mit Draw-Kontext, Belag, Serve-Qualität und aktueller Form.",
        features: ["Belag-Anpassung", "Serve-/Return-Split", "Best-of-Format"],
        markets: "Match-Sieger, Satz-Ergebnis, Turnierpfade"
      }
    ],
    signals: [
      { label: "Model Consensus", text: "Bündelt mehrere Modelltipps zu einer lesbaren Prognose." },
      { label: "Upset Alert", text: "Markiert Spiele, bei denen Modellkonfidenz und Erwartung auseinandergehen." },
      { label: "Reliability Score", text: "Trennt klare Prognosen von rauschigen Matchups mit wenig Signal." },
      { label: "Result Check", text: "Bewertet Vorhersagen nach dem offiziellen Ergebnis." }
    ]
  }
} as const;

export async function HomePageContent({ locale }: { locale: Locale }) {
  const matches = await getDashboardMatches();
  const specialPredictions = await getSpecialQuestionPredictions();
  const text = routeText[locale].home;
  const content = homeExperience[locale];

  return (
    <main className="shell">
      <section className="homeHero">
        <div className="homeHeroCopy">
          <p className="eyebrow">{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <p className="heroText">{text.description}</p>
          <div className="heroActions">
            <Link className="primaryLink" href="#sports">{content.primaryCta}</Link>
            <Link className="secondaryLink" href={localizePath("/analytics", locale)}>{content.secondaryCta}</Link>
          </div>
        </div>

        <aside className="predictionBoard" aria-label={content.boardTitle}>
          <div className="boardTopLine">
            <span className="liveBadge">{content.liveBadge}</span>
            <span className="boardPulse" aria-hidden="true" />
          </div>
          <div className="boardHeader">
            <div>
              <h2>{content.boardTitle}</h2>
              <p>{content.boardSubtitle}</p>
            </div>
            <span className="boardModelCount">4 sports</span>
          </div>
          <div className="forecastList">
            {content.boardRows.map((row) => (
              <article className="forecastRow" key={`${row.league}-${row.teams}`}>
                <div>
                  <p className="forecastLeague">{row.league}</p>
                  <h3>{row.teams}</h3>
                </div>
                <div className="forecastPick">
                  <span>{row.pick}</span>
                  <small>{row.confidence}</small>
                </div>
                <div className="forecastMeter" aria-hidden="true">
                  <span style={{ width: row.meter }} />
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <nav className="quickSportsNav" aria-label={content.sportNavLabel}>
        <span>{content.sportNavLabel}</span>
        {content.sports.map((sport) => (
          <a href={`#${sport.id}`} key={sport.id}>{sport.label}</a>
        ))}
      </nav>

      <section className="sportsHubSection" id="sports">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">Sports Hub</p>
            <h2>{content.sportsTitle}</h2>
          </div>
          <p>{content.sportsText}</p>
        </div>
        <div className="sportCardsGrid">
          {content.sports.map((sport) => (
            <article className="sportCard" id={sport.id} key={sport.id}>
              <div className="sportCardTop">
                <span className="sportTag">{sport.label}</span>
                <span className="sportStatus">{sport.status}</span>
              </div>
              <h3>{sport.title}</h3>
              <p>{sport.description}</p>
              <ul className="sportFeatureList">
                {sport.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p className="sportMarkets">{sport.markets}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="signalSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">AI Layer</p>
            <h2>{content.signalTitle}</h2>
          </div>
          <p>{content.signalText}</p>
        </div>
        <div className="signalGrid">
          {content.signals.map((signal) => (
            <article className="signalCard" key={signal.label}>
              <span />
              <h3>{signal.label}</h3>
              <p>{signal.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardIntro">
        <p className="sectionKicker">{content.dashboardEyebrow}</p>
        <h2>{content.dashboardTitle}</h2>
        <p>{content.dashboardText}</p>
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
