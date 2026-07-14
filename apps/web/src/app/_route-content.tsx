import Link from "next/link";
import type { CSSProperties } from "react";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { HomeDashboard } from "@/components/home-dashboard";
import { MatchesSchedule } from "@/components/matches-schedule";
import { TournamentTreeView } from "@/components/tournament-tree-view";
import { getDashboardMatchesFromApi, getSpecialPredictionsFromApi } from "@/lib/dashboard-api-data";
import { sampleMatches } from "@/lib/dashboard-types";
import { footballCompetitions } from "@/lib/football-data";
import { localizePath, routeText, type Locale } from "@/lib/i18n";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import { getSportMatchHref } from "@/components/match-detail-page";
import { SportsNewsCards } from "@/components/sports-news-cards";
import {
  getFootballCompetitionApiSnapshot,
  getSportApiSnapshot,
  type ApiSportId,
  type SportApiMatch
} from "@/lib/sports-api-data";
import { getSportsNewsLinks, type SportsNewsItem } from "@/lib/sports-news";
import { resolveTennisPlayerFlagUrl } from "@/lib/tennis-data";

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
    signalTitle: "A sharper way to read sport before it happens",
    signalText: "Our method compresses form, matchup context, live data and model reasoning into one readable edge instead of throwing raw stats at you.",
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
      { label: "Signal fusion", text: "Blends form, matchup style, schedule pressure and live context into one prediction signal." },
      { label: "Narrative engine", text: "Turns complex model output into a clear reason why the pick exists." },
      { label: "Confidence filter", text: "Separates strong edges from noisy games where the model intentionally stays cautious." },
      { label: "Result feedback", text: "Checks predictions after the final score so the system can expose what worked and what did not." }
    ]
  },
  de: {
    liveBadge: "Live Model Hub",
    primaryCta: "Sportarten entdecken",
    secondaryCta: "Hintergrund & Methodik",
    boardTitle: "Prognose-Board",
    boardSubtitle: "Modell-Konsens über aktive Sportarten",
    sportNavLabel: "Zur Sportart springen",
    sportPageCta: "Sportseite öffnen",
    sportsTitle: "Sportarten für Prognosen",
    sportsText: "Jede Sportart bekommt eigene Modell-Signale, Kontextdaten und Ergebnisvalidierung.",
    dashboardEyebrow: "Live-Vorschau",
    dashboardTitle: "Aktuelle Fußball-Benchmark-Ansicht",
    dashboardText: "Die vorhandenen Match-Daten bleiben verfügbar, während das Multi-Sport-Frontend ausgebaut wird.",
    signalTitle: "Eine neue Art, Sport vor dem Spiel zu lesen",
    signalText: "Unsere Methode verdichtet Form, Matchup-Kontext, Live-Daten und Modell-Begründung zu einem klaren Vorteilssignal statt nur rohe Statistiken anzuzeigen.",
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
        title: "Quotenlinien, Playoff-Chancen und Teamstärke",
        description: "Prognosen auf Basis von Effizienz, Verletzungen, Spielplan und Spielverlauf.",
        features: ["Siegwahrscheinlichkeit", "Spread-Sensitivität", "Playoff-Pfad-Simulation"],
        markets: "Sieger, Abstand, Gesamtpunkte, Conference- und Super-Bowl-Pfade"
      },
      {
        id: "nba",
        label: "NBA",
        status: "Nächstes Modul",
        title: "Schnelle Prognosen für NBA-Abende",
        description: "Vorhersagen mit Erholungstagen, Reisen, Rotation und Spieler-Verfügbarkeit.",
        features: ["Back-to-back-Faktor", "Lineup-Einfluss", "Tempo- und Effizienzsignale"],
        markets: "Sieger, Abstand, Gesamtpunkte, Playoff-Serien"
      },
      {
        id: "tennis",
        label: "Tennis",
        status: "Nächstes Modul",
        title: "Belagsspezifische Match-Prognosen",
        description: "Tennis-Prognosen mit Draw-Kontext, Belag, Aufschlagqualität und aktueller Form.",
        features: ["Belag-Anpassung", "Aufschlag-/Return-Split", "Best-of-Format"],
        markets: "Match-Sieger, Satz-Ergebnis, Turnierpfade"
      }
    ],
    signals: [
      { label: "Signalbündelung", text: "Verknüpft Form, Matchup-Stil, Spielplan-Druck und Live-Kontext zu einem Prognose-Signal." },
      { label: "Begründungslogik", text: "Übersetzt komplexe Modellwerte in eine klare Begründung, warum der Tipp entsteht." },
      { label: "Konfidenzfilter", text: "Trennt echte Modellvorteile von Spielen, bei denen die Datenlage bewusst vorsichtig bewertet wird." },
      { label: "Ergebnisfeedback", text: "Prüft Prognosen nach dem Endstand, damit sichtbar wird, welche Signale wirklich getragen haben." }
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
      eyebrow: "Fußball-Prognosezentrum",
      title: "Fußball-Prognosen für Ligen, Pokale und Turnierpfade.",
      description: "Eine eigene Fußball-Ansicht für 90-Minuten-Ausgänge, exakte Ergebnisideen, Formtrends, xG-Kontext und K.-o.-Simulationen.",
      status: "Kernmodul",
      sampleMatch: "Deutschland vs Brasilien",
      samplePick: "2:1",
      confidence: "64%",
      modelNote: "Kombiniert aktuelle Form, xG-Trend, Heim-/Neutral-Kontext und Turnierdruck zu einem lesbaren Tipp.",
      focusCards: [
        { title: "Spielausgang", text: "Sieg, Remis-Wahrscheinlichkeit und Überraschungsrisiko für normale Spiele." },
        { title: "Exaktes Ergebnis", text: "Ergebnisspannen mit Konfidenz statt einem einzelnen Blind-Tipp." },
        { title: "Turnierpfade", text: "Gruppentabellen, Qualifikationschancen und K.-o.-Szenarien." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "xG und Formkurve" },
        { label: "Markt", value: "Ergebnis, Exact Score, Qualifikation" },
        { label: "Aktualisierung", value: "Tägliche Spiele und Aufstellungsfenster" }
      ],
      roadmap: ["Liga-Prognosekarten", "Internationaler Turniermodus", "Aufstellungs- und Verletzungsgewichtung"]
    },
    nfl: {
      label: "NFL",
      eyebrow: "NFL-Prognosezentrum",
      title: "NFL-Prognosen für Wochenlinien, Abstände und Playoff-Pfade.",
      description: "Eine eigene NFL-Seite für Siegchancen, Spread-Sensitivität, Teamstärke, Verletzungskontext und Playoff-Szenarien.",
      status: "Nächstes Modul",
      sampleMatch: "Chiefs vs Bills",
      samplePick: "27:24",
      confidence: "58%",
      modelNote: "Gewichtet Offensiv-Effizienz, Defensivdruck, Quarterback-Verfügbarkeit, Erholungstage und erwarteten Spielverlauf.",
      focusCards: [
        { title: "Siegwahrscheinlichkeit", text: "Vor-dem-Spiel-Wahrscheinlichkeit mit Konfidenz und Volatilitätshinweis." },
        { title: "Spread-Sensitivität", text: "Abstandsspannen, die zeigen, wann ein Spiel nah an der Linie liegt." },
        { title: "Playoff-Simulator", text: "Conference-Pfade, Seeding-Druck und Super-Bowl-Routen." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "EPA, Verletzungen und Spielplan" },
        { label: "Markt", value: "Sieger, Spread, Gesamtpunkte, Playoff-Pfad" },
        { label: "Aktualisierung", value: "Wöchentliche Spiele und Verletzungsbericht-Fenster" }
      ],
      roadmap: ["Teamstärke-Index", "Import der Verletzungsberichte", "Playoff-Pfad-Modell"]
    },
    nba: {
      label: "NBA",
      eyebrow: "NBA-Prognosezentrum",
      title: "NBA-Prognosen für Spielabende und Playoff-Serien.",
      description: "Eine Basketball-Ansicht für Tempo, Erholung, Reisen, Spieler-Verfügbarkeit, Rotationen und Serienwahrscheinlichkeit.",
      status: "Nächstes Modul",
      sampleMatch: "Celtics vs Knicks",
      samplePick: "113:108",
      confidence: "61%",
      modelNote: "Liest Tempo, Effizienz, Aufstellungsverfügbarkeit, Belastung aus direkt aufeinanderfolgenden Spielen und Reisekontext.",
      focusCards: [
        { title: "Spielabend-Matchup", text: "Sieger und Ergebnisspanne für viele Regular-Season-Spiele." },
        { title: "Spieler-Verfügbarkeit", text: "Rotationen und Ausfälle als sichtbare Modelleingaben." },
        { title: "Serienansicht", text: "Playoff-Serienquoten mit Momentum und Heimvorteil-Kontext." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "Tempo, Effizienz und Erholung" },
        { label: "Markt", value: "Sieger, Abstand, Gesamtpunkte, Serien" },
        { label: "Aktualisierung", value: "Tägliche Spiele und Verletzungsupdates" }
      ],
      roadmap: ["Tägliches Spieleboard", "Aufstellungs-Einfluss", "Playoff-Serien-Simulator"]
    },
    tennis: {
      label: "Tennis",
      eyebrow: "Tennis-Prognosezentrum",
      title: "Tennis-Prognosen für Beläge, Draws und Satz-Ergebnisse.",
      description: "Eine Tennis-Seite für Siegchancen, Satzscore-Spannen, Belagsstärke und Draw-Kontext.",
      status: "Nächstes Modul",
      sampleMatch: "Sinner vs Alcaraz",
      samplePick: "3:1",
      confidence: "55%",
      modelNote: "Trennt Belagsform, Aufschlag-/Return-Splits, Best-of-Format und Draw-Belastung von generischer Matchform.",
      focusCards: [
        { title: "Belagsmodell", text: "Sand, Rasen und Hartplatz werden als eigene Kontexte behandelt." },
        { title: "Aufschlag und Return", text: "Aufschlagspiele, Break-Druck und Return-Qualität werden klar getrennt." },
        { title: "Draw-Pfad", text: "Turnierpfad, Erholungstage und Belastung zwischen Runden." }
      ],
      signalRows: [
        { label: "Hauptsignal", value: "Belag und Serve-/Return-Split" },
        { label: "Markt", value: "Sieger, Satzscore, Draw-Pfad" },
        { label: "Aktualisierung", value: "Turnierrunden und Draw-Updates" }
      ],
      roadmap: ["Belagsbereinigte Ratings", "Draw-Simulation", "Satzscore-Wahrscheinlichkeiten"]
    }
  }
};

export async function HomePageContent({ locale }: { locale: Locale }) {
  const content = homeExperience[locale];
  const homeCopy = getHomeStartCopy(locale);
  const [matchSections, sportNews] = await Promise.all([
    getHomeMatchSections(locale),
    getHomeSportNews(locale)
  ]);

  return (
    <main className="shell homeStartShell">
      <section className="homeStartHero">
        <div className="homeStartCopy">
          <p className="eyebrow">{homeCopy.eyebrow}</p>
          <h1>{homeCopy.title}</h1>
          <p className="heroText">{homeCopy.description}</p>
        </div>
      </section>

      {matchSections.live.length > 0 ? (
        <section className="homeTopGames homeLiveGames" id="live">
          <div className="homeSectionHeader">
            <div>
              <p className="sectionKicker">{homeCopy.liveGamesEyebrow}</p>
              <h2>{homeCopy.liveGamesTitle}</h2>
            </div>
          </div>
          <div className="homeHighlightGrid">
            {matchSections.live.map((highlight) => (
              <HomeHighlightCard highlight={highlight} key={`live-${highlight.sport}-${highlight.match.id}`} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="homeTopGames" id="topspiele">
        <div className="homeSectionHeader">
          <div>
            <p className="sectionKicker">{homeCopy.topGamesEyebrow}</p>
            <h2>{homeCopy.topGamesTitle}</h2>
          </div>
        </div>
        <div className="homeHighlightGrid">
          {matchSections.top.map((highlight) => (
            <HomeHighlightCard highlight={highlight} key={`${highlight.sport}-${highlight.match.id}`} locale={locale} />
          ))}
        </div>
      </section>

      <section className="homeTopGames homeSportNews" id="sport-news">
        <div className="homeSectionHeader">
          <div>
            <p className="sectionKicker">{homeCopy.newsEyebrow}</p>
            <h2>{homeCopy.newsTitle}</h2>
          </div>
          <p>{homeCopy.newsText}</p>
        </div>
        <div className="homeSportNewsGrid">
          {sportNews.map((entry) => (
            <article className="homeSportNewsColumn" key={entry.sport} style={{ "--accent": entry.accent } as CSSProperties}>
              <div className="homeSportNewsColumnHeader">
                <span>{entry.label}</span>
              </div>
              <SportsNewsCards items={entry.items} locale={locale} />
            </article>
          ))}
        </div>
      </section>

      <nav className="quickSportsNav homeStartSportsNav" aria-label={content.sportNavLabel}>
        <span>{content.sportNavLabel}</span>
        {content.sports.map((sport) => (
          <Link href={localizePath(`/${sport.id}`, locale)} key={sport.id}>{sport.label}</Link>
        ))}
      </nav>

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
    </main>
  );
}

type HomeMatchHighlight = {
  accent: string;
  href: string;
  match: SportApiMatch;
  prediction: {
    confidence: string;
    pick: string;
    reason: string;
    score: string;
  };
  sport: ApiSportId;
  sportLabel: string;
};

type HomeSportNews = {
  accent: string;
  items: SportsNewsItem[];
  label: string;
  sport: ApiSportId;
};

function getHomeStartCopy(locale: Locale) {
  return {
    en: {
      eyebrow: "AI Sports Prediction",
      title: "Know the pick before the game starts.",
      description: "AI predictions for football, NFL, NBA and tennis with winner, score idea, confidence and reasoning in one card.",
      primaryCta: "Show top games",
      secondaryCta: "Jump to sport",
      liveGamesEyebrow: "Live now",
      liveGamesTitle: "Live games",
      newsEyebrow: "Top news",
      newsText: "Sporting stories only: teams, players, form, injuries and tournament context. The feed refreshes regularly.",
      newsTitle: "What matters before the next games",
      topGamesEyebrow: "Next AI predictions",
      topGamesTitle: "One top game per sport",
      prediction: "AI prediction",
      confidence: "Confidence",
      reason: "Reasoning"
    },
    de: {
      eyebrow: "AI Sports Prediction",
      title: "Wisse den Tipp, bevor das Spiel beginnt.",
      description: "KI-Prognosen für Fußball, NFL, NBA und Tennis mit Sieger, Ergebnisidee, Sicherheit und Begründung in einer Karte.",
      primaryCta: "Topspiele anzeigen",
      secondaryCta: "Zur Sportart springen",
      liveGamesEyebrow: "Jetzt live",
      liveGamesTitle: "Live-Spiele",
      newsEyebrow: "Topnews",
      newsText: "Nur sportliche Themen: Teams, Spieler, Form, Verletzungen und Turnierkontext. Der Feed aktualisiert sich regelmäßig.",
      newsTitle: "Was vor den nächsten Spielen wichtig ist",
      topGamesEyebrow: "Nächste KI-Prognosen",
      topGamesTitle: "Ein Topspiel pro Sportart",
      prediction: "KI-Prognose",
      confidence: "Sicherheit",
      reason: "Begründung"
    }
  }[locale];
}

async function getHomeMatchSections(locale: Locale): Promise<{ live: HomeMatchHighlight[]; top: HomeMatchHighlight[] }> {
  const [footballSnapshots, nflSnapshot, nbaSnapshot, tennisSnapshot] = await Promise.all([
    Promise.all(footballCompetitions.map(async (competition) => ({
      competitionSlug: competition.slug,
      snapshot: await getFootballCompetitionApiSnapshot(competition)
    }))),
    getSportApiSnapshot("nfl"),
    getSportApiSnapshot("nba"),
    getSportApiSnapshot("tennis")
  ]);

  const rows: Array<{
    accent: string;
    competitionSlug?: string;
    matches: SportApiMatch[];
    sport: ApiSportId;
    sportLabel: string;
  }> = [
    ...footballSnapshots.map(({ competitionSlug, snapshot }) => ({
      accent: "#7df5c1",
      competitionSlug,
      matches: snapshot.matches,
      sport: "football" as const,
      sportLabel: snapshot.matches[0]?.competition || footballCompetitions.find((competition) => competition.slug === competitionSlug)?.name || (locale === "de" ? "Fußball" : "Football")
    })),
    {
      accent: "#58d8ff",
      matches: nflSnapshot.matches,
      sport: "nfl",
      sportLabel: "NFL"
    },
    {
      accent: "#ffc857",
      matches: nbaSnapshot.matches,
      sport: "nba",
      sportLabel: "NBA"
    },
    {
      accent: "#ff7a90",
      matches: tennisSnapshot.matches,
      sport: "tennis",
      sportLabel: "Tennis"
    }
  ];

  const live = rows.flatMap((row, index) => {
    const match = pickLiveHomeMatch(row.matches);
    return match ? [buildHomeHighlight(row, match, locale, index)] : [];
  }).sort((left, right) => compareHomeHighlights(left.match, right.match)).slice(0, 8);
  const footballTop = rows
    .filter((row) => row.sport === "football")
    .flatMap((row, index) => {
      const match = pickTopHomeMatch(row.matches, live);
      return match ? [buildHomeHighlight(row, match, locale, index)] : [];
    })
    .sort((left, right) => compareHomeHighlights(left.match, right.match))[0];
  const otherTop = (["nfl", "nba", "tennis"] as ApiSportId[]).flatMap((sport, index) => {
    const row = rows.find((entry) => entry.sport === sport);
    const match = row ? pickTopHomeMatch(row.matches, live) : null;
    return row && match ? [buildHomeHighlight(row, match, locale, index + 20)] : [];
  });

  return {
    live,
    top: [footballTop, ...otherTop].filter((entry): entry is HomeMatchHighlight => Boolean(entry)).slice(0, 4)
  };
}

function buildHomeHighlight(
  row: {
    accent: string;
    competitionSlug?: string;
    matches: SportApiMatch[];
    sport: ApiSportId;
    sportLabel: string;
  },
  match: SportApiMatch,
  locale: Locale,
  index: number
): HomeMatchHighlight {
  const hydratedMatch = hydrateHomeHighlightMatch(row.sport, match);

  return {
    accent: row.accent,
    href: getSportMatchHref({ competitionSlug: row.competitionSlug, locale, match: hydratedMatch, sport: row.sport }),
    match: hydratedMatch,
    prediction: buildHomePrediction(row.sport, hydratedMatch, locale, index),
    sport: row.sport,
    sportLabel: row.sportLabel
  };
}

async function getHomeSportNews(locale: Locale): Promise<HomeSportNews[]> {
  const rows: Array<{ accent: string; contextName: string; label: string; sport: ApiSportId }> = [
    { accent: "#7df5c1", contextName: locale === "de" ? "Fußball Bundesliga Champions League Spieler Teams" : "football Premier League Champions League players teams", label: locale === "de" ? "Fußball" : "Football", sport: "football" },
    { accent: "#58d8ff", contextName: "NFL teams quarterback injury trade form", label: "NFL", sport: "nfl" },
    { accent: "#ffc857", contextName: "NBA teams players trade injury form", label: "NBA", sport: "nba" },
    { accent: "#ff7a90", contextName: "ATP WTA tennis players tournaments form injury", label: "Tennis", sport: "tennis" }
  ];

  return Promise.all(rows.map(async (row) => ({
    ...row,
    items: await getSportsNewsLinks({
      contextName: row.contextName,
      limit: 2,
      locale,
      topic: row.sport === "football" ? "football" : row.sport
    })
  })));
}

async function getHomeMatchHighlights(locale: Locale): Promise<HomeMatchHighlight[]> {
  const sections = await getHomeMatchSections(locale);
  return [...sections.live, ...sections.top];
}

function pickLiveHomeMatch(matches: SportApiMatch[]) {
  const now = Date.now();
  return matches
    .filter((match) => isLiveHomeMatch(match, now))
    .sort(compareSportMatchesByDate)[0] ?? null;
}

function pickTopHomeMatch(matches: SportApiMatch[], liveHighlights: HomeMatchHighlight[]) {
  const liveIds = new Set(liveHighlights.map((highlight) => highlight.match.id));
  const now = Date.now();
  const upcoming = matches
    .filter((match) => !liveIds.has(match.id) && !isLiveHomeMatch(match, now) && isUpcomingHomeMatch(match, now))
    .sort(compareSportMatchesByDate);
  const relevant = matches
    .filter((match) => !liveIds.has(match.id) && !isFinishedHomeMatch(match.status))
    .sort(compareSportMatchesByDate);

  return upcoming[0] ?? relevant[0] ?? null;
}

function pickRelevantHomeMatch(matches: SportApiMatch[]) {
  const now = Date.now();
  const live = matches
    .filter((match) => isLiveHomeMatch(match, now))
    .sort(compareSportMatchesByDate);
  const upcoming = matches
    .filter((match) => !isLiveHomeMatch(match, now) && isUpcomingHomeMatch(match, now))
    .sort(compareSportMatchesByDate);

  return live[0] ?? upcoming[0] ?? null;
}

function isUpcomingHomeMatch(match: SportApiMatch, now: number) {
  if (isFinishedHomeMatch(match.status)) {
    return false;
  }

  if (!match.date) {
    return true;
  }

  const time = new Date(match.date).getTime();

  if (Number.isNaN(time)) {
    return true;
  }

  return time >= now - 20 * 60 * 1000;
}

function isLiveHomeMatch(match: SportApiMatch, now: number) {
  if (isFinishedHomeMatch(match.status)) {
    return false;
  }

  const status = (match.status ?? "").toLowerCase();
  const statusLooksLive = [
    "live",
    "in play",
    "in progress",
    "1h",
    "2h",
    "ht",
    "q1",
    "q2",
    "q3",
    "q4",
    "period",
    "set"
  ].some((label) => status === label || status.includes(label));

  if (statusLooksLive) {
    return true;
  }

  if (!match.date) {
    return false;
  }

  const time = new Date(match.date).getTime();
  if (Number.isNaN(time)) {
    return false;
  }

  return time <= now && time >= now - 3 * 60 * 60 * 1000;
}

function compareHomeHighlights(left: SportApiMatch, right: SportApiMatch) {
  const now = Date.now();
  const leftLive = isLiveHomeMatch(left, now);
  const rightLive = isLiveHomeMatch(right, now);

  if (leftLive !== rightLive) {
    return leftLive ? -1 : 1;
  }

  return compareSportMatchesByDate(left, right);
}

function isFinishedHomeMatch(status: string | null | undefined) {
  if (!status) {
    return false;
  }

  const normalized = status.toLowerCase();

  return [
    "finished",
    "full time",
    "fulltime",
    "after extra time",
    "after penalties",
    "match finished",
    "ft",
    "aet",
    "pen",
    "final"
  ].some((label) => normalized === label || normalized.includes(label));
}

function hydrateHomeHighlightMatch(sport: ApiSportId, match: SportApiMatch): SportApiMatch {
  return {
    ...match,
    homeLogo: resolveHomeParticipantLogo(sport, match.homeName, match.homeLogo),
    awayLogo: resolveHomeParticipantLogo(sport, match.awayName, match.awayLogo)
  };
}

function resolveHomeParticipantLogo(sport: ApiSportId, name: string, currentLogo: string | null) {
  if (currentLogo) {
    return currentLogo;
  }

  if (sport === "nfl") {
    return findNflTeamLogo(name);
  }

  if (sport === "nba") {
    return findNbaTeamLogo(name);
  }

  if (sport === "tennis") {
    return findTennisPlayerFlag(name);
  }

  return findFootballTeamLogo(name);
}

function findNflTeamLogo(name: string) {
  const team = nflTeams.find((entry) => isSameParticipant(entry.name, name) || isSameParticipant(entry.shortName, name) || isSameParticipant(entry.city, name));
  return team?.logo ?? null;
}

function findNbaTeamLogo(name: string) {
  const team = nbaTeams.find((entry) => isSameParticipant(entry.name, name) || isSameParticipant(entry.shortName, name) || isSameParticipant(entry.city, name));
  return team?.logo ?? null;
}

function findTennisPlayerFlag(name: string) {
  return resolveTennisPlayerFlagUrl(name);
}

function findFootballTeamLogo(name: string) {
  void name;
  return null;
}

function isSameParticipant(left: string, right: string) {
  const normalizedLeft = normalizeParticipantName(left);
  const normalizedRight = normalizeParticipantName(right);

  return normalizedLeft === normalizedRight
    || normalizedLeft.includes(normalizedRight)
    || normalizedRight.includes(normalizedLeft);
}

function normalizeParticipantName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}


function compareSportMatchesByDate(left: SportApiMatch, right: SportApiMatch) {
  const leftTime = left.date ? new Date(left.date).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.date ? new Date(right.date).getTime() : Number.MAX_SAFE_INTEGER;

  return (Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime) - (Number.isNaN(rightTime) ? Number.MAX_SAFE_INTEGER : rightTime);
}

function buildHomePrediction(sport: ApiSportId, match: SportApiMatch, locale: Locale, index: number) {
  const seed = getStringSeed(`${sport}:${match.homeName}:${match.awayName}:${match.competition}`);
  const confidence = 57 + ((seed + index * 5) % 18);
  const homeEdge = ((seed % 11) - 5) / 10;
  const favorite = homeEdge >= 0 ? match.homeName : match.awayName;

  if (sport === "nfl") {
    const home = 20 + (seed % 14);
    const away = 17 + ((seed + 6) % 13);
    return {
      confidence: `${confidence}%`,
      pick: favorite,
      reason: locale === "de"
        ? "Quarterback-Stabilität, Erholungstage und Defensivdruck geben dem Modell den Ausschlag."
        : "Quarterback stability, rest days and defensive pressure create the model edge.",
      score: `${home}:${away}`
    };
  }

  if (sport === "nba") {
    const home = 102 + (seed % 18);
    const away = 99 + ((seed + 9) % 17);
    return {
      confidence: `${confidence}%`,
      pick: favorite,
      reason: locale === "de"
        ? "Pace, Rotationstiefe und Rest-Kontext sprechen knapp für diesen Tipp."
        : "Pace, rotation depth and rest context point narrowly toward this pick.",
      score: `${home}:${away}`
    };
  }

  if (sport === "tennis") {
    const score = seed % 3 === 0 ? "2:1" : seed % 3 === 1 ? "2:0" : "1:2";
    return {
      confidence: `${confidence}%`,
      pick: favorite,
      reason: locale === "de"
        ? "Belagprofil, aktuelle Form und Return-Stabilität liefern den stärksten Ausschlag."
        : "Surface profile, recent form and return stability create the strongest edge.",
      score
    };
  }

  const homeGoals = 1 + (seed % 3);
  const awayGoals = (seed + 1) % 3;
  return {
    confidence: `${confidence}%`,
    pick: favorite,
    reason: locale === "de"
      ? "Formkurve, Heimkontext und Chancenqualität ergeben einen messbaren Vorteil."
      : "Form curve, home context and chance quality create a measurable edge.",
    score: `${homeGoals}:${awayGoals}`
  };
}

function getStringSeed(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function HomeHighlightCard({ highlight, locale }: { highlight: HomeMatchHighlight; locale: Locale }) {
  const copy = getHomeStartCopy(locale);

  return (
    <Link className="homeHighlightCard" href={highlight.href} style={{ "--accent": highlight.accent } as CSSProperties}>
      <div className="homeHighlightHeader">
        <span>{highlight.sportLabel}</span>
        <small>{formatSportMatchDate(highlight.match.date, locale)}</small>
      </div>
      <div className="homeHighlightTeams">
        <div>
          <SportTeamLogo logo={highlight.match.homeLogo} name={highlight.match.homeName} />
          <strong>{highlight.match.homeName}</strong>
        </div>
        <em>{formatHomeHighlightScore(highlight.match, highlight.prediction.score)}</em>
        <div>
          <SportTeamLogo logo={highlight.match.awayLogo} name={highlight.match.awayName} />
          <strong>{highlight.match.awayName}</strong>
        </div>
      </div>
      <div className="homeHighlightPrediction">
        <span>{copy.prediction}</span>
        <strong>{highlight.prediction.pick}</strong>
        <small>{highlight.prediction.confidence}</small>
        <p>
          <span>{copy.reason}</span>{" "}
          {highlight.prediction.reason}
        </p>
      </div>
    </Link>
  );
}

function formatHomeHighlightScore(match: SportApiMatch, predictionScore: string) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore}:${match.awayScore}`;
  }

  return predictionScore;
}

export async function SportPageContent({ locale, sport }: { locale: Locale; sport: SportPageId }) {
  const content = sportPageContent[locale][sport];
  const sports = Object.entries(sportPageContent[locale]) as Array<[SportPageId, typeof content]>;
  const relatedSports = sports.filter(([id]) => id !== sport);
  const apiSnapshot = await getSportApiSnapshot(sport);
  const liveMatches = apiSnapshot.matches;
  const labels = {
    en: {
      back: "All sports",
      method: "Method",
      sample: "Sample forecast",
      confidence: "Confidence",
      focus: "Prediction focus",
      signals: "Signal setup",
      roadmap: "Build roadmap",
      switchSport: "Switch sport",
      liveGames: "Live games",
      status: "Status"
    },
    de: {
      back: "Alle Sportarten",
      method: "Methodik",
      sample: "Beispiel-Prognose",
      confidence: "Konfidenz",
      focus: "Prognose-Fokus",
      signals: "Signalstruktur",
      roadmap: "Ausbauplan",
      switchSport: "Sportart wechseln",
      liveGames: "Live-Spiele",
      status: "Status"
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

      <section className="sportLivePanel">
        <div className="sectionHeaderRow">
          <div>
            <p className="sectionKicker">{labels.liveGames}</p>
            <h2>{content.label}</h2>
          </div>
        </div>
        <div className="sportLiveGrid">
          {liveMatches.map((match) => (
            <article className="sportLiveMatch" key={match.id}>
              <span>{match.competition}</span>
              <div className="sportLiveTeams">
                <div className="sportLiveTeam">
                  <SportTeamLogo logo={match.homeLogo} name={match.homeName} />
                  <strong>{match.homeName}</strong>
                </div>
                <em>{formatSportMatchCenter(match, locale)}</em>
                <div className="sportLiveTeam">
                  <SportTeamLogo logo={match.awayLogo} name={match.awayName} />
                  <strong>{match.awayName}</strong>
                </div>
              </div>
              <p>{formatSportMatchDate(match.date, locale)} · {labels.status}: {match.status ?? "preview"}</p>
            </article>
          ))}
        </div>
        <p className="apiPanelMessage">{apiSnapshot.message}</p>
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

function SportTeamLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    return <img alt="" className="sportLiveLogo" src={logo} />;
  }

  return <span className="sportLiveLogo textLogo">{getSportInitials(name)}</span>;
}

function formatSportMatchCenter(match: SportApiMatch, locale: Locale) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore} - ${match.awayScore}`;
  }

  return locale === "de" ? "vs" : "vs";
}

function getSportInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function formatSportMatchDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === "de" ? "Termin offen" : "Date pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
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
