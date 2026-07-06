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
    secondaryCta: "Background & method",
    boardTitle: "Prediction board",
    boardSubtitle: "Model consensus across active sports",
    sportNavLabel: "Jump to sport",
    sportPageCta: "Open sport page",
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
    secondaryCta: "Hintergrund & Methodik",
    boardTitle: "Prediction Board",
    boardSubtitle: "Modell-Konsens über aktive Sportarten",
    sportNavLabel: "Zur Sportart springen",
    sportPageCta: "Sportseite öffnen",
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

export type SportPageId = "football" | "nfl" | "nba" | "tennis";

const sportPageContent: Record<Locale, Record<SportPageId, {
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  sampleMatch: string;
  samplePick: string;
  confidence: string;
  modelNote: string;
  focusCards: Array<{ title: string; text: string }>;
  signalRows: Array<{ label: string; value: string }>;
  roadmap: string[];
}>> = {
  en: {
    football: {
      label: "Football",
      eyebrow: "Football prediction hub",
      title: "Football forecasts for leagues, cups and tournament paths.",
      description: "A dedicated football view for 90-minute outcomes, exact-score ideas, form trends, xG context and knockout simulations.",
      status: "Core module",
      sampleMatch: "Germany vs Brazil",
      samplePick: "2-1",
      confidence: "64%",
      modelNote: "Combines recent form, xG trend, home/neutral context and tournament pressure into one readable pick.",
      focusCards: [
        { title: "Match outcome", text: "Winner, draw probability and upset risk for regular fixtures." },
        { title: "Exact score", text: "Scoreline ranges with confidence bands instead of one blind guess." },
        { title: "Tournament paths", text: "Group tables, qualification chances and knockout bracket scenarios." }
      ],
      signalRows: [
        { label: "Main signal", value: "xG and form curve" },
        { label: "Market", value: "Result, exact score, qualification" },
        { label: "Update rhythm", value: "Daily fixtures and lineup window" }
      ],
      roadmap: ["League forecast cards", "International tournament mode", "Lineup and injury weighting"]
    },
    nfl: {
      label: "NFL",
      eyebrow: "NFL prediction hub",
      title: "NFL forecasts for weekly lines, margins and playoff paths.",
      description: "A separate NFL page for win probability, spread sensitivity, team strength, injury context and postseason scenarios.",
      status: "Build next",
      sampleMatch: "Chiefs vs Bills",
      samplePick: "27-24",
      confidence: "58%",
      modelNote: "Weights offensive efficiency, defensive pressure, quarterback availability, rest and game script.",
      focusCards: [
        { title: "Win probability", text: "Pregame likelihood with confidence and volatility flags." },
        { title: "Spread sensitivity", text: "Margin ranges that show when a game is close to the line." },
        { title: "Playoff simulator", text: "Conference paths, seeding pressure and Super Bowl routes." }
      ],
      signalRows: [
        { label: "Main signal", value: "EPA, injuries and schedule" },
        { label: "Market", value: "Winner, spread, totals, playoff path" },
        { label: "Update rhythm", value: "Weekly slate and injury report window" }
      ],
      roadmap: ["Team strength index", "Injury report ingestion", "Playoff path model"]
    },
    nba: {
      label: "NBA",
      eyebrow: "NBA prediction hub",
      title: "NBA forecasts for nightly matchups and playoff series.",
      description: "A basketball view for pace, rest, travel, player availability, rotations and series-level probability.",
      status: "Build next",
      sampleMatch: "Celtics vs Knicks",
      samplePick: "113-108",
      confidence: "61%",
      modelNote: "Reads pace, efficiency, lineup availability, back-to-back fatigue and travel context.",
      focusCards: [
        { title: "Nightly matchup", text: "Winner and score range for high-frequency regular season games." },
        { title: "Player availability", text: "Rotations and absences shown as visible model inputs." },
        { title: "Series view", text: "Playoff series odds with momentum and home-court context." }
      ],
      signalRows: [
        { label: "Main signal", value: "Pace, efficiency and rest" },
        { label: "Market", value: "Winner, margin, totals, series" },
        { label: "Update rhythm", value: "Daily slate and injury updates" }
      ],
      roadmap: ["Daily game board", "Lineup impact layer", "Playoff series simulator"]
    },
    tennis: {
      label: "Tennis",
      eyebrow: "Tennis prediction hub",
      title: "Tennis forecasts for surfaces, draws and set scores.",
      description: "A tennis-specific page for match winner probability, set-score ranges, surface strength and draw context.",
      status: "Build next",
      sampleMatch: "Sinner vs Alcaraz",
      samplePick: "3-1",
      confidence: "55%",
      modelNote: "Separates surface form, serve/return splits, best-of format and draw fatigue from generic match form.",
      focusCards: [
        { title: "Surface model", text: "Clay, grass and hard-court form treated as different contexts." },
        { title: "Serve and return", text: "Service games, break pressure and return quality split out clearly." },
        { title: "Draw path", text: "Tournament route pressure and rest days between rounds." }
      ],
      signalRows: [
        { label: "Main signal", value: "Surface and serve/return split" },
        { label: "Market", value: "Winner, set score, draw path" },
        { label: "Update rhythm", value: "Tournament rounds and draw updates" }
      ],
      roadmap: ["Surface-adjusted ratings", "Draw simulation", "Set-score probability view"]
    }
  },
  de: {
    football: {
      label: "Fußball",
      eyebrow: "Fußball Prediction Hub",
      title: "Fußball-Prognosen für Ligen, Pokale und Turnierpfade.",
      description: "Eine eigene Fußball-Ansicht für 90-Minuten-Ausgänge, Exact-Score-Ideen, Formtrends, xG-Kontext und K.-o.-Simulationen.",
      status: "Kernmodul",
      sampleMatch: "Deutschland vs Brasilien",
      samplePick: "2:1",
      confidence: "64%",
      modelNote: "Kombiniert aktuelle Form, xG-Trend, Heim-/Neutral-Kontext und Turnierdruck zu einem lesbaren Tipp.",
      focusCards: [
        { title: "Spielausgang", text: "Sieg, Remis-Wahrscheinlichkeit und Upset-Risiko für normale Fixtures." },
        { title: "Exaktes Ergebnis", text: "Scoreline-Spannen mit Konfidenz statt einem einzelnen Blind-Tipp." },
        { title: "Turnierpfade", text: "Gruppentabellen, Qualifikationschancen und K.-o.-Szenarien." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "xG und Formkurve" },
        { label: "Markt", value: "Ergebnis, Exact Score, Qualifikation" },
        { label: "Update-Rhythmus", value: "Tägliche Spiele und Lineup-Fenster" }
      ],
      roadmap: ["Liga-Forecast-Karten", "Internationaler Turniermodus", "Lineup- und Verletzungsgewichtung"]
    },
    nfl: {
      label: "NFL",
      eyebrow: "NFL Prediction Hub",
      title: "NFL-Prognosen für Weekly Lines, Margins und Playoff-Pfade.",
      description: "Eine eigene NFL-Seite für Siegchancen, Spread-Sensitivität, Teamstärke, Injury-Kontext und Postseason-Szenarien.",
      status: "Nächstes Modul",
      sampleMatch: "Chiefs vs Bills",
      samplePick: "27:24",
      confidence: "58%",
      modelNote: "Gewichtet Offensive Efficiency, Defensive Pressure, Quarterback-Verfügbarkeit, Rest Days und Game Script.",
      focusCards: [
        { title: "Siegwahrscheinlichkeit", text: "Pregame-Likelihood mit Konfidenz und Volatilitätsflag." },
        { title: "Spread-Sensitivität", text: "Margin-Spannen, die zeigen, wann ein Spiel nah an der Line liegt." },
        { title: "Playoff-Simulator", text: "Conference-Pfade, Seeding-Druck und Super-Bowl-Routen." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "EPA, Verletzungen und Schedule" },
        { label: "Markt", value: "Sieger, Spread, Totals, Playoff-Pfad" },
        { label: "Update-Rhythmus", value: "Weekly Slate und Injury-Report-Fenster" }
      ],
      roadmap: ["Team-Strength-Index", "Injury-Report-Import", "Playoff-Pfad-Modell"]
    },
    nba: {
      label: "NBA",
      eyebrow: "NBA Prediction Hub",
      title: "NBA-Prognosen für Nightly Matchups und Playoff-Serien.",
      description: "Eine Basketball-Ansicht für Pace, Rest, Travel, Player Availability, Rotationen und Series Probability.",
      status: "Nächstes Modul",
      sampleMatch: "Celtics vs Knicks",
      samplePick: "113:108",
      confidence: "61%",
      modelNote: "Liest Pace, Efficiency, Lineup-Verfügbarkeit, Back-to-back-Fatigue und Travel-Kontext.",
      focusCards: [
        { title: "Nightly Matchup", text: "Sieger und Score Range für hochfrequente Regular-Season-Spiele." },
        { title: "Player Availability", text: "Rotationen und Ausfälle als sichtbare Modellinputs." },
        { title: "Series View", text: "Playoff-Serienquoten mit Momentum und Home-Court-Kontext." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "Pace, Effizienz und Rest" },
        { label: "Markt", value: "Sieger, Margin, Totals, Serien" },
        { label: "Update-Rhythmus", value: "Daily Slate und Injury Updates" }
      ],
      roadmap: ["Daily Game Board", "Lineup-Impact-Layer", "Playoff-Serien-Simulator"]
    },
    tennis: {
      label: "Tennis",
      eyebrow: "Tennis Prediction Hub",
      title: "Tennis-Prognosen für Beläge, Draws und Satz-Ergebnisse.",
      description: "Eine Tennis-Seite für Match-Winner-Wahrscheinlichkeit, Satzscore-Spannen, Surface Strength und Draw-Kontext.",
      status: "Nächstes Modul",
      sampleMatch: "Sinner vs Alcaraz",
      samplePick: "3:1",
      confidence: "55%",
      modelNote: "Trennt Surface Form, Serve-/Return-Splits, Best-of-Format und Draw Fatigue von generischer Matchform.",
      focusCards: [
        { title: "Surface Model", text: "Clay, Grass und Hard Court werden als eigene Kontexte behandelt." },
        { title: "Serve und Return", text: "Service Games, Break Pressure und Return Quality klar getrennt." },
        { title: "Draw Path", text: "Turnierpfad, Rest Days und Belastung zwischen Runden." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "Belag und Serve-/Return-Split" },
        { label: "Markt", value: "Sieger, Satzscore, Draw Path" },
        { label: "Update-Rhythmus", value: "Turnierrunden und Draw Updates" }
      ],
      roadmap: ["Surface-adjusted Ratings", "Draw Simulation", "Set-Score Probability View"]
    }
  }
};

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
            <Link className="secondaryLink" href={localizePath("/about", locale)}>{content.secondaryCta}</Link>
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
          <Link href={localizePath(`/${sport.id}`, locale)} key={sport.id}>{sport.label}</Link>
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
              <Link className="sportCardLink" href={localizePath(`/${sport.id}`, locale)}>
                {content.sportPageCta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="signalSection" id="signals">
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

      <section className="dashboardIntro" id="live-results">
        <p className="sectionKicker">{content.dashboardEyebrow}</p>
        <h2>{content.dashboardTitle}</h2>
        <p>{content.dashboardText}</p>
      </section>

      <HomeDashboard locale={locale} matches={matches} specialPredictions={specialPredictions} />
    </main>
  );
}

export function SportPageContent({ locale, sport }: { locale: Locale; sport: SportPageId }) {
  const content = sportPageContent[locale][sport];
  const sports = Object.entries(sportPageContent[locale]) as Array<[SportPageId, typeof content]>;
  const relatedSports = sports.filter(([id]) => id !== sport);
  const labels = {
    en: {
      back: "All sports",
      method: "Method",
      sample: "Sample forecast",
      confidence: "Confidence",
      focus: "Prediction focus",
      signals: "Signal setup",
      roadmap: "Build roadmap",
      switchSport: "Switch sport"
    },
    de: {
      back: "Alle Sportarten",
      method: "Methodik",
      sample: "Beispiel-Prognose",
      confidence: "Konfidenz",
      focus: "Prediction-Fokus",
      signals: "Signal-Setup",
      roadmap: "Build-Roadmap",
      switchSport: "Sportart wechseln"
    }
  }[locale];

  return (
    <main className="shell sportPageShell">
      <section className="sportPageHero">
        <div className="sportPageHeroCopy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="heroText">{content.description}</p>
          <div className="heroActions">
            <Link className="primaryLink" href={localizePath("/#sports", locale)}>{labels.back}</Link>
            <Link className="secondaryLink" href={localizePath("/about", locale)}>{labels.method}</Link>
          </div>
        </div>

        <aside className="sportPageModelCard">
          <span className="liveBadge">{content.status}</span>
          <p className="sectionKicker">{labels.sample}</p>
          <h2>{content.sampleMatch}</h2>
          <div className="sportPagePick">
            <span>{content.samplePick}</span>
            <small>{labels.confidence}: {content.confidence}</small>
          </div>
          <p>{content.modelNote}</p>
        </aside>
      </section>

      <section className="sportsHubSection">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">{content.label}</p>
            <h2>{labels.focus}</h2>
          </div>
          <p>{content.description}</p>
        </div>
        <div className="sportCardsGrid">
          {content.focusCards.map((card) => (
            <article className="sportCard" key={card.title}>
              <span className="sportTag">{content.label}</span>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sportSignalBand">
        <div>
          <p className="sectionKicker">{labels.signals}</p>
          <h2>{content.label}</h2>
        </div>
        <div className="sportSignalList">
          {content.signalRows.map((row) => (
            <div className="sportSignalRow" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="sportPageBottomGrid">
        <article className="panel">
          <p className="sectionKicker">{labels.roadmap}</p>
          <h2>{content.status}</h2>
          <ul className="sportFeatureList">
            {content.roadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="panel">
          <p className="sectionKicker">{labels.switchSport}</p>
          <h2>{labels.back}</h2>
          <div className="sportSwitchLinks">
            {relatedSports.map(([id, item]) => (
              <Link href={localizePath(`/${id}`, locale)} key={id}>
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </section>
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
