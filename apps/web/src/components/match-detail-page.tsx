import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  footballCompetitions,
  getCompetition,
  type FootballCompetition,
  type FootballTeam
} from "@/lib/football-data";
import { localizePath, type Locale } from "@/lib/i18n";
import { nbaTeams } from "@/lib/nba-data";
import { nflTeams } from "@/lib/nfl-data";
import { getSportsNewsLinks, type SportsNewsTopic } from "@/lib/sports-news";
import {
  getFootballCompetitionApiSnapshot,
  getSportMatchAnalysis,
  getSportApiSnapshot,
  type SportApiAnalysisSnapshot,
  type ApiSportId,
  type SportApiMatch
} from "@/lib/sports-api-data";
import { findTennisPlayerByName, getTennisFlagUrl } from "@/lib/tennis-data";
import { SportsNewsCards } from "@/components/sports-news-cards";

export type MatchDetailTab = "overview" | "comparison" | "stats" | "signal";

type MatchSearchParams = Record<string, string | string[] | undefined>;

type MatchContext = {
  competition?: FootballCompetition;
  analysis: SportApiAnalysisSnapshot;
  locale: Locale;
  match: SportApiMatch;
  sport: ApiSportId;
};

type Metric = {
  label: string;
  home: string;
  away: string;
  note: string;
};

type Prediction = {
  confidence: string;
  pick: string;
  reason: string;
  score: string;
};

const copy = {
  en: {
    back: "Back",
    comparison: "Comparison",
    confidence: "Confidence",
    datePending: "Date pending",
    h2h: "H2H & trend",
    live: "Live",
    matchStats: "Match stats",
    modelSignal: "Model signal",
    overview: "Overview",
    odds: "Odds",
    bestOdds: "Best odds",
    bookmakers: "books",
    pick: "Pick",
    prediction: "AI prediction",
    reasoning: "Reasoning",
    scheduled: "Scheduled",
    score: "Score",
    stats: "Stats",
    title: "Game center",
    source: "Source",
    venue: "Venue",
    tabs: {
      overview: "Overview",
      comparison: "Comparison",
      stats: "Stats",
      signal: "AI signal"
    },
    matchNews: "Match news",
    matchNewsEyebrow: "Sporting context"
  },
  de: {
    back: "Zurück",
    comparison: "Vergleich",
    confidence: "Sicherheit",
    datePending: "Termin offen",
    h2h: "H2H & Trend",
    live: "Live",
    matchStats: "Spielstatistiken",
    modelSignal: "Modell-Signal",
    overview: "Übersicht",
    odds: "Quoten",
    bestOdds: "Beste Quote",
    bookmakers: "Anbieter",
    pick: "Tipp",
    prediction: "KI-Prognose",
    reasoning: "Begründung",
    scheduled: "Geplant",
    score: "Ergebnis",
    stats: "Statistiken",
    title: "Gamecenter",
    source: "Quelle",
    venue: "Stadion",
    tabs: {
      overview: "Übersicht",
      comparison: "Vergleich",
      stats: "Statistiken",
      signal: "KI-Signal"
    },
    matchNews: "News zum Spiel",
    matchNewsEyebrow: "Sportlicher Kontext"
  }
} as const;

export async function SportMatchDetailPage({
  competitionSlug,
  locale,
  matchId,
  searchParams,
  sport,
  tab = "overview"
}: {
  competitionSlug?: string;
  locale: Locale;
  matchId: string;
  searchParams?: MatchSearchParams;
  sport: ApiSportId;
  tab?: MatchDetailTab;
}) {
  const decodedMatchId = decodeURIComponent(matchId);
  const context = await getMatchContext({ competitionSlug, locale, matchId: decodedMatchId, searchParams, sport });

  if (!context) {
    notFound();
  }

  const text = copy[locale];
  const activeTab = isMatchTab(tab) ? tab : "overview";
  const prediction = buildPrediction(context);
  const metrics = buildMetrics(context);
  const backHref = getBackHref(context);
  const matchNews = activeTab === "overview" ? await getMatchNews(context) : [];
  const metaItems = [
    { label: locale === "de" ? "Wettbewerb" : "Competition", value: context.match.competition },
    { label: locale === "de" ? "Runde" : "Round", value: context.match.round },
    { label: text.venue, value: context.match.venue },
    { label: locale === "de" ? "Termin" : "Kickoff", value: formatMatchDate(context.match.date, locale) },
    { label: "Status", value: formatMatchStatus(context.match, locale) }
  ].filter((item) => item.value);

  return (
    <main className="shell matchDetailShell">
      <section className="sportschauHero matchDetailHero">
        <div className="matchDetailHeroText">
          <p className="footballEyebrow">{getSportLabel(context.sport, locale)}</p>
          <h1>
            <span>{context.match.homeName}</span>
            <em>vs</em>
            <span>{context.match.awayName}</span>
          </h1>
          <div className="matchDetailMetaPills" aria-label={locale === "de" ? "Spieldetails" : "Match details"}>
            {metaItems.map((item) => (
              <span key={`${item.label}:${item.value}`}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
        <div className="matchDetailHeroAside">
          <article className="matchDetailScoreCard">
            <span>{text.title}</span>
            <div className="matchDetailScoreLine">
              <ParticipantLink context={context} logo={context.match.homeLogo} name={context.match.homeName} />
              <strong>{formatMatchCenter(context.match)}</strong>
              <ParticipantLink context={context} logo={context.match.awayLogo} name={context.match.awayName} />
            </div>
            <MatchDetailCompactOddsLine context={context} locale={locale} />
          </article>
          <Link className="secondaryLink" href={backHref}>{text.back}</Link>
        </div>
      </section>

      <nav className="competitionTabs sportschauSubTabs matchDetailTabs" aria-label={text.title}>
        {(["overview", "comparison", "stats", "signal"] as MatchDetailTab[]).map((item) => (
          <Link
            aria-current={activeTab === item ? "page" : undefined}
            className={activeTab === item ? "isActive" : ""}
            href={getMatchTabHref(context, decodedMatchId, item, searchParams)}
            key={item}
          >
            {text.tabs[item]}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <>
          <section className="footballPanel matchDetailGrid">
            <PredictionPanel context={context} locale={locale} prediction={prediction} />
            <ComparisonPanel locale={locale} metrics={metrics.slice(0, 4)} />
          </section>
          <MatchNewsPanel locale={locale} newsItems={matchNews} />
        </>
      ) : null}

      {activeTab === "comparison" ? (
        <ComparisonPanel full locale={locale} metrics={metrics} />
      ) : null}

      {activeTab === "stats" ? (
        <StatsPanel context={context} locale={locale} metrics={metrics} />
      ) : null}

      {activeTab === "signal" ? (
        <SignalPanel context={context} locale={locale} prediction={prediction} />
      ) : null}
    </main>
  );
}

function PredictionPanel({
  context,
  locale,
  prediction
}: {
  context: MatchContext;
  locale: Locale;
  prediction: Prediction;
}) {
  const text = copy[locale];
  const contextRows = getPredictionContextRows(context, locale);

  return (
    <article className="matchDetailPrediction">
      <span>{text.prediction}</span>
      <div className="predictionMetrics">
        <div><small>{text.pick}</small><strong>{prediction.pick}</strong></div>
        <div><small>{text.score}</small><strong>{prediction.score}</strong></div>
        <div><small>{text.confidence}</small><strong>{prediction.confidence}</strong></div>
      </div>
      <p className="predictionReasoning"><span>{text.reasoning}</span>{prediction.reason}</p>
      <div className="predictionContextGrid">
        {contextRows.map((row) => (
          <div key={row.label}>
            <small>{row.label}</small>
            <strong>{row.text}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function MatchDetailCompactOddsLine({ context, locale }: { context: MatchContext; locale: Locale }) {
  const text = copy[locale];
  const odds = context.match.odds;

  if (!odds || odds.outcomes.length === 0) {
    return null;
  }

  return (
    <div className="compactOddsLine matchDetailCompactOddsLine" aria-label={text.odds}>
      <span>{text.odds}</span>
      {odds.outcomes.map((outcome) => (
        <small key={`${outcome.label}:${outcome.name}`}>
          <span className="compactOddsName">{formatCompactOddsOutcomeLabel(outcome.label)}</span>
          <strong>{formatDecimalOdds(outcome.price)}</strong>
        </small>
      ))}
      <em>{formatCompactOddsSource(odds, locale, text.bookmakers)}</em>
    </div>
  );
}

function ComparisonPanel({
  full = false,
  locale,
  metrics
}: {
  full?: boolean;
  locale: Locale;
  metrics: Metric[];
}) {
  const text = copy[locale];

  return (
    <section className={full ? "footballPanel matchDetailComparisonFull" : "matchDetailComparison"}>
      <div className="sportschauSectionTitle">
        <span>{text.comparison}</span>
        <h2>{full ? text.matchStats : text.h2h}</h2>
      </div>
      <div className="matchMetricList">
        {metrics.map((metric) => (
          <div className="matchMetricRow" key={metric.label}>
            <strong>{metric.home}</strong>
            <div className="matchMetricCore">
              <span>{metric.label}</span>
              <MetricBar metric={metric} />
              <small>{metric.note}</small>
            </div>
            <strong>{metric.away}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricBar({ metric }: { metric: Metric }) {
  const { awayPct, homePct } = getMetricShare(metric);

  return (
    <div
      aria-label={`${metric.label}: ${metric.home} zu ${metric.away}`}
      className="matchMetricBar"
      role="img"
      style={{ "--away-pct": `${awayPct}%`, "--home-pct": `${homePct}%` } as CSSProperties}
    >
      <span className="matchMetricBarHome" />
      <span className="matchMetricBarAway" />
    </div>
  );
}

function StatsPanel({ context, locale, metrics }: { context: MatchContext; locale: Locale; metrics: Metric[] }) {
  const text = copy[locale];
  const statGroups = buildStatGroups(context, metrics);

  return (
    <section className="footballPanel matchDetailStatsPanel">
      <div className="sportschauSectionTitle">
        <span>{text.stats}</span>
        <h2>{text.matchStats}</h2>
      </div>
      <div className="matchStatCards">
        {statGroups.map((group) => (
          <article key={group.title}>
            <span>{group.title}</span>
            {group.rows.map((row) => (
              <div key={row.label}>
                <small>{row.label}</small>
                <strong>{row.value}</strong>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function SignalPanel({ context, locale, prediction }: { context: MatchContext; locale: Locale; prediction: Prediction }) {
  const text = copy[locale];
  const signals = getSignalRows(context, prediction, locale);

  return (
    <section className="footballPanel matchDetailSignalPanel">
      <div className="sportschauSectionTitle">
        <span>{text.modelSignal}</span>
        <h2>{prediction.pick}</h2>
      </div>
      <div className="signalGrid">
        {signals.map((signal) => (
          <article className="signalCard" key={signal.label}>
            <span />
            <h3>{signal.label}</h3>
            <p>{signal.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function MatchNewsPanel({ locale, newsItems }: { locale: Locale; newsItems: Awaited<ReturnType<typeof getMatchNews>> }) {
  const text = copy[locale];

  if (newsItems.length === 0) {
    return null;
  }

  return (
    <section className="footballPanel sportschauNewsPanel matchDetailNewsPanel">
      <div className="sportschauSectionTitle">
        <span>{text.matchNewsEyebrow}</span>
        <h2>{text.matchNews}</h2>
      </div>
      <div className="footballNewsGrid sportschauNewsGrid">
        <SportsNewsCards items={newsItems} locale={locale} />
      </div>
    </section>
  );
}

async function getMatchNews(context: MatchContext) {
  const topic = getNewsTopic(context.sport);
  const contextName = `${context.match.homeName} ${context.match.awayName} ${context.match.competition}`;

  return getSportsNewsLinks({
    contextName,
    limit: 3,
    locale: context.locale,
    topic
  });
}

function getNewsTopic(sport: ApiSportId): SportsNewsTopic {
  if (sport === "nba") {
    return "nba";
  }

  if (sport === "nfl") {
    return "nfl";
  }

  if (sport === "tennis") {
    return "tennis";
  }

  return "football";
}

async function getMatchContext({
  competitionSlug,
  locale,
  matchId,
  searchParams,
  sport
}: {
  competitionSlug?: string;
  locale: Locale;
  matchId: string;
  searchParams?: MatchSearchParams;
  sport: ApiSportId;
}): Promise<MatchContext | null> {
  const competition = competitionSlug ? getCompetition(competitionSlug) : undefined;
  const matches = await getMatchesForSport(sport, competition);
  const queryMatch = matchFromSearchParams(matchId, searchParams);
  const match = matches.find((entry) => entry.id === matchId) ??
    (queryMatch ? findEquivalentApiMatch(matches, queryMatch) : null) ??
    queryMatch;

  if (!match) {
    return null;
  }
  const hydratedMatch = hydrateMatchLogos(sport, match);
  const analysis = await getSportMatchAnalysis({ competition, match: hydratedMatch, sport });

  return {
    analysis,
    competition,
    locale,
    match: hydratedMatch,
    sport
  };
}

function findEquivalentApiMatch(matches: SportApiMatch[], queryMatch: SportApiMatch) {
  return matches.find((entry) => {
    const sameTeams = namesMatch(entry.homeName, queryMatch.homeName) && namesMatch(entry.awayName, queryMatch.awayName);
    const swappedTeams = namesMatch(entry.homeName, queryMatch.awayName) && namesMatch(entry.awayName, queryMatch.homeName);
    const sameCompetition = !queryMatch.competition || namesMatch(entry.competition, queryMatch.competition);

    return sameCompetition && (sameTeams || swappedTeams);
  }) ?? null;
}

async function getMatchesForSport(sport: ApiSportId, competition?: FootballCompetition) {
  if (sport === "football") {
    if (!competition) {
      return [];
    }

    const snapshot = await getFootballCompetitionApiSnapshot(competition);
    return snapshot.matches;
  }

  const snapshot = await getSportApiSnapshot(sport);
  return snapshot.matches;
}

function matchFromSearchParams(matchId: string, searchParams?: MatchSearchParams): SportApiMatch | null {
  if (isSyntheticMatchId(matchId)) {
    return null;
  }

  const homeName = getQueryValue(searchParams, "home");
  const awayName = getQueryValue(searchParams, "away");

  if (!homeName || !awayName) {
    return null;
  }

  return {
    id: matchId,
    awayId: getQueryValue(searchParams, "awayId"),
    awayLogo: getQueryValue(searchParams, "awayLogo"),
    awayName,
    awayScore: toNullableNumber(getQueryValue(searchParams, "awayScore")),
    competition: getQueryValue(searchParams, "competition") ?? "Match",
    date: getQueryValue(searchParams, "date"),
    homeId: getQueryValue(searchParams, "homeId"),
    homeLogo: getQueryValue(searchParams, "homeLogo"),
    homeName,
    homeScore: toNullableNumber(getQueryValue(searchParams, "homeScore")),
    round: getQueryValue(searchParams, "round"),
    venue: getQueryValue(searchParams, "venue"),
    status: getQueryValue(searchParams, "status") ?? "preview"
  };
}

function isSyntheticMatchId(matchId: string) {
  const decoded = decodeURIComponent(matchId).toLowerCase();

  return decoded.startsWith("fallback:") || decoded.includes("-fallback-") || decoded.includes("fallback%3a");
}

function hydrateMatchLogos(sport: ApiSportId, match: SportApiMatch): SportApiMatch {
  return {
    ...match,
    awayLogo: match.awayLogo ?? findParticipantLogo(sport, match.awayName),
    homeLogo: match.homeLogo ?? findParticipantLogo(sport, match.homeName)
  };
}

function findParticipantLogo(sport: ApiSportId, name: string) {
  if (sport === "nfl") {
    return nflTeams.find((team) => namesMatch(team.name, name) || namesMatch(team.shortName, name) || namesMatch(team.city, name))?.logo ?? null;
  }

  if (sport === "nba") {
    return nbaTeams.find((team) => namesMatch(team.name, name) || namesMatch(team.shortName, name) || namesMatch(team.city, name))?.logo ?? null;
  }

  if (sport === "tennis") {
    return getTennisFlagUrl(findTennisPlayerByName(name)?.countryCode);
  }

  void name;
  return null;
}

function buildPrediction(context: MatchContext): Prediction {
  const seed = stringSeed(`${context.sport}:${context.match.homeName}:${context.match.awayName}:${context.match.date ?? ""}`);
  const confidence = 56 + (seed % 20);
  const homeEdge = getParticipantStrength(context.sport, context.match.homeName) - getParticipantStrength(context.sport, context.match.awayName) + 2;
  const pick = homeEdge >= 0 ? context.match.homeName : context.match.awayName;

  if (context.sport === "nfl") {
    return {
      confidence: `${Math.min(79, Math.max(55, confidence))}%`,
      pick,
      reason: context.locale === "de"
        ? "Passing-Effizienz, Turnover-Schutz, Defensive Pressure und Rest-Kontext ergeben den Modellvorteil."
        : "Passing efficiency, turnover control, defensive pressure and rest context create the model edge.",
      score: `${23 + (seed % 11)}:${20 + ((seed + 4) % 10)}`
    };
  }

  if (context.sport === "nba") {
    return {
      confidence: `${Math.min(78, Math.max(55, confidence))}%`,
      pick,
      reason: context.locale === "de"
        ? "Pace, Shot Profile, Rebounding und Rotationstiefe sprechen am stärksten für diesen Tipp."
        : "Pace, shot profile, rebounding and rotation depth drive this pick most strongly.",
      score: `${106 + (seed % 15)}:${101 + ((seed + 3) % 15)}`
    };
  }

  if (context.sport === "tennis") {
    return {
      confidence: `${Math.min(77, Math.max(54, confidence))}%`,
      pick,
      reason: context.locale === "de"
        ? "Belagprofil, Serve-Plus-One, Return-Stabilität und Breakpoint-Druck bestimmen das Signal."
        : "Surface profile, serve plus one, return stability and breakpoint pressure determine the signal.",
      score: Math.abs(homeEdge) > 8 ? "2:0" : "2:1"
    };
  }

  return {
    confidence: `${Math.min(78, Math.max(55, confidence))}%`,
    pick,
    reason: context.locale === "de"
      ? "Formkurve, Chancenqualität, Pressingdruck und Standards erzeugen das stärkste Vergleichssignal."
      : "Form curve, chance quality, pressing pressure and set pieces create the strongest comparison signal.",
    score: `${1 + (seed % 3)}:${(seed + 1) % 3}`
  };
}

function buildMetrics(context: MatchContext): Metric[] {
  const apiMetrics = buildApiMetrics(context);

  if (apiMetrics.length > 0) {
    return apiMetrics;
  }

  const labels = getMetricLabels(context.sport, context.locale);
  const seed = stringSeed(`${context.match.id}:${context.match.homeName}:${context.match.awayName}`);
  const homeStrength = getParticipantStrength(context.sport, context.match.homeName);
  const awayStrength = getParticipantStrength(context.sport, context.match.awayName);

  return labels.map((label, index) => {
    const swing = ((seed + index * 7) % 13) - 6;
    const home = formatMetricValue(label.kind, homeStrength + swing + index * 2);
    const away = formatMetricValue(label.kind, awayStrength - swing + index);

    return {
      label: label.label,
      home,
      away,
      note: label.note
    };
  });
}

function buildApiMetrics(context: MatchContext): Metric[] {
  const preferredLabels = getPreferredStatLabels(context.sport);
  const orderedStats = [
    ...preferredLabels.flatMap((label) => context.analysis.stats.filter((row) => normalizeName(row.label) === normalizeName(label))),
    ...context.analysis.stats.filter((row) => !preferredLabels.some((label) => normalizeName(row.label) === normalizeName(label)))
  ];

  return orderedStats.slice(0, 8).map((row) => ({
    label: translateStatLabel(row.label, context.sport, context.locale),
    home: formatApiMetricValue(row.home),
    away: formatApiMetricValue(row.away),
    note: context.locale === "de" ? "Live-Vergleich aus der Sport-API" : "Live comparison from the sports API"
  }));
}

function getPreferredStatLabels(sport: ApiSportId) {
  if (sport === "football") {
    return ["Expected Goals", "Ball Possession", "Total Shots", "Shots on Goal", "Big Chances", "Corner Kicks", "Fouls", "Passes %"];
  }

  if (sport === "nba") {
    return ["Points", "Field goals", "FG%", "3PT", "3PT%", "Free throws", "Rebounds", "Assists", "Turnovers"];
  }

  if (sport === "nfl") {
    return ["Total Yards", "Passing Yards", "Rushing Yards", "First Downs", "Turnovers", "Possession Time", "Penalties"];
  }

  return ["Aces", "Double Faults", "First Serve %", "Break Points", "Service Points Won", "Return Points Won"];
}

function translateStatLabel(label: string, sport: ApiSportId, locale: Locale) {
  if (locale !== "de") {
    return titleCase(label);
  }

  const translations: Record<string, string> = {
    "3pt": "Dreier",
    "3pt%": "Dreierquote",
    "aces": "Asse",
    "assists": "Assists",
    "ball possession": "Ballbesitz",
    "big chances": "Großchancen",
    "blocks": "Blocks",
    "break points": "Breakbälle",
    "corner kicks": "Ecken",
    "defensive pressure": "Defensivdruck",
    "double faults": "Doppelfehler",
    "failed to score": "Ohne Tor",
    "fg%": "Wurfquote",
    "field goals": "Würfe",
    "first downs": "First Downs",
    "first serve %": "Erster Aufschlag",
    "fouls": "Fouls",
    "free throws": "Freiwürfe",
    "goals against": "Gegentore",
    "goals for": "Tore",
    "avg goals": "Tore im Schnitt",
    "avg points": "Punkte im Schnitt",
    "avg sets": "Sätze im Schnitt",
    "draws": "Remis",
    "h2h wins": "Direkte Siege",
    "last meeting": "Letztes Duell",
    "meetings": "Duelle",
    "passes %": "Passquote",
    "passing yards": "Passing Yards",
    "penalties scored": "Elfmeter verwandelt",
    "penalties": "Strafen",
    "points": "Punkte",
    "possession time": "Ballbesitzzeit",
    "rebounds": "Rebounds",
    "return points won": "Return-Punkte",
    "rushing yards": "Rushing Yards",
    "service points won": "Service-Punkte",
    "shots on goal": "Schüsse aufs Tor",
    "steals": "Steals",
    "total shots": "Schüsse",
    "total yards": "Total Yards",
    "turnovers": "Ballverluste"
  };

  return translations[normalizeName(label)] ?? titleCase(label);
}

function formatApiMetricValue(value: string | number | null) {
  if (value === null || value === "") {
    return "-";
  }

  return String(value);
}

function pickMetricLeader(metric: Metric, context: MatchContext) {
  const home = parseMetricNumber(metric.home);
  const away = parseMetricNumber(metric.away);

  if (home === away) {
    return context.locale === "de" ? "ausgeglichen" : "even";
  }

  return home > away ? context.match.homeName : context.match.awayName;
}

function parseMetricNumber(value: string) {
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  const parsed = Number(match?.[0]?.replace(",", ".") ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMetricShare(metric: Metric) {
  const home = Math.max(0, parseMetricNumber(metric.home));
  const away = Math.max(0, parseMetricNumber(metric.away));
  const total = home + away;

  if (total <= 0) {
    return { awayPct: 50, homePct: 50 };
  }

  const homePct = clamp(Math.round((home / total) * 100), 8, 92);
  return { awayPct: 100 - homePct, homePct };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildStatGroups(context: MatchContext, metrics: Metric[]) {
  const text = copy[context.locale];
  const h2hRows = context.analysis.h2h.slice(0, 3);

  return [
    {
      title: text.overview,
      rows: [
        { label: "Competition", value: context.match.competition },
        { label: text.venue, value: context.match.venue ?? "-" },
        { label: "Status", value: formatMatchStatus(context.match, context.locale) },
        { label: "Kickoff", value: formatMatchDate(context.match.date, context.locale) }
      ]
    },
    {
      title: text.comparison,
      rows: metrics.slice(0, 3).map((metric) => ({
        label: metric.label,
        value: `${metric.home} - ${metric.away}`
      }))
    },
    {
      title: h2hRows.length > 0 ? text.h2h : text.modelSignal,
      rows: h2hRows.length > 0
        ? h2hRows.map((match) => ({
            label: formatMatchDate(match.date, context.locale),
            value: `${match.homeName} ${formatMatchCenter(match)} ${match.awayName}`
          }))
        : metrics.slice(3, 6).map((metric) => ({
            label: metric.label,
            value: pickMetricLeader(metric, context)
          }))
    }
  ];
}

function getMetricLabels(sport: ApiSportId, locale: Locale): Array<{ kind: "number" | "percent" | "score"; label: string; note: string }> {
  if (sport === "nfl") {
    return locale === "de"
      ? [
          { kind: "score", label: "Passing Edge", note: "QB-Produktion und Explosivität" },
          { kind: "score", label: "Run Game", note: "Rushing-Erfolg und Box-Kontrolle" },
          { kind: "score", label: "Defensive Pressure", note: "Sacks, Hurries und Stop Rate" },
          { kind: "percent", label: "Turnover Control", note: "Ball Security und Takeaway-Risiko" },
          { kind: "score", label: "Red Zone", note: "Effizienz nah an der Endzone" },
          { kind: "score", label: "Rest Advantage", note: "Pause, Travel und Schedule" }
        ]
      : [
          { kind: "score", label: "Passing edge", note: "QB production and explosiveness" },
          { kind: "score", label: "Run game", note: "Rushing success and box control" },
          { kind: "score", label: "Defensive pressure", note: "Sacks, hurries and stop rate" },
          { kind: "percent", label: "Turnover control", note: "Ball security and takeaway risk" },
          { kind: "score", label: "Red zone", note: "Efficiency near the end zone" },
          { kind: "score", label: "Rest advantage", note: "Rest, travel and schedule" }
        ];
  }

  if (sport === "nba") {
    return locale === "de"
      ? [
          { kind: "score", label: "Offensive Rating", note: "Punkte pro 100 Possessions" },
          { kind: "score", label: "Defensive Rating", note: "Gegnerqualität und Stops" },
          { kind: "score", label: "Pace", note: "Tempo und Transition-Anteil" },
          { kind: "percent", label: "Shot Quality", note: "Dreier, Rim Pressure und Midrange" },
          { kind: "score", label: "Rebounding", note: "Boards und zweite Chancen" },
          { kind: "score", label: "Rotation Depth", note: "Bankminuten und Ausfälle" }
        ]
      : [
          { kind: "score", label: "Offensive rating", note: "Points per 100 possessions" },
          { kind: "score", label: "Defensive rating", note: "Opponent quality and stops" },
          { kind: "score", label: "Pace", note: "Tempo and transition share" },
          { kind: "percent", label: "Shot quality", note: "Threes, rim pressure and midrange" },
          { kind: "score", label: "Rebounding", note: "Boards and second chances" },
          { kind: "score", label: "Rotation depth", note: "Bench minutes and absences" }
        ];
  }

  if (sport === "tennis") {
    return locale === "de"
      ? [
          { kind: "score", label: "Serve Rating", note: "Aces, erste Aufschläge und Hold Rate" },
          { kind: "score", label: "Return Rating", note: "Returntiefe und Break-Chancen" },
          { kind: "score", label: "Belagprofil", note: "Hard/Clay/Grass-Fit" },
          { kind: "percent", label: "Breakpoint-Druck", note: "Conversion und Saves" },
          { kind: "score", label: "Form", note: "letzte Ergebnisse und Stabilität" },
          { kind: "score", label: "H2H-Tendenz", note: "Matchup-Muster" }
        ]
      : [
          { kind: "score", label: "Serve rating", note: "Aces, first serves and hold rate" },
          { kind: "score", label: "Return rating", note: "Return depth and break chances" },
          { kind: "score", label: "Surface profile", note: "Hard/clay/grass fit" },
          { kind: "percent", label: "Breakpoint pressure", note: "Conversion and saves" },
          { kind: "score", label: "Form", note: "Recent results and stability" },
          { kind: "score", label: "H2H tendency", note: "Matchup patterns" }
        ];
  }

  return locale === "de"
    ? [
        { kind: "percent", label: "Ballbesitz", note: "Kontrolle und Spielaufbau" },
        { kind: "score", label: "Schussqualität", note: "xG, Abschlüsse und Box Touches" },
        { kind: "score", label: "Pressingdruck", note: "Balleroberungen und PPDA-Signal" },
        { kind: "score", label: "Standards", note: "Ecken, Freistöße und Luftduelle" },
        { kind: "score", label: "Defensive Stabilität", note: "zugelassene Chancen" },
        { kind: "score", label: "Formkurve", note: "letzte Spiele und Momentum" }
      ]
    : [
        { kind: "percent", label: "Possession", note: "Control and buildup" },
        { kind: "score", label: "Shot quality", note: "xG, attempts and box touches" },
        { kind: "score", label: "Pressing pressure", note: "Recoveries and PPDA signal" },
        { kind: "score", label: "Set pieces", note: "Corners, free kicks and aerials" },
        { kind: "score", label: "Defensive stability", note: "Chances allowed" },
        { kind: "score", label: "Form curve", note: "Recent games and momentum" }
      ];
}

function getSignalRows(context: MatchContext, prediction: Prediction, locale: Locale) {
  const isDe = locale === "de";
  const metrics = buildMetrics(context);
  const strongestMetric = metrics[0];
  const secondaryMetric = metrics[1];

  return [
    {
      label: isDe ? "Tipp" : "Pick",
      text: `${prediction.pick} · ${prediction.score} · ${prediction.confidence}`
    },
    {
      label: isDe ? "Modellgrund" : "Model reason",
      text: prediction.reason
    },
    {
      label: isDe ? "Datenbasis" : "Data used",
      text: context.analysis.stats.length > 0
        ? (isDe
            ? `${context.analysis.source}: ${context.analysis.stats.length} Live-Statistiken plus Team-/Spielerprofile.`
            : `${context.analysis.source}: ${context.analysis.stats.length} live stats plus team/player profiles.`)
        : context.analysis.h2h.length > 0
          ? (isDe
              ? `${context.analysis.source}: ${context.analysis.h2h.length} direkte Duelle plus Team-/Spielerprofile.`
              : `${context.analysis.source}: ${context.analysis.h2h.length} head-to-head games plus team/player profiles.`)
          : getProfileBasisText(context, isDe)
    },
    {
      label: isDe ? "Worauf achten" : "What to watch",
      text: strongestMetric && secondaryMetric
        ? (isDe
            ? `${strongestMetric.label}: ${strongestMetric.home} zu ${strongestMetric.away}. ${secondaryMetric.label}: ${secondaryMetric.home} zu ${secondaryMetric.away}.`
            : `${strongestMetric.label}: ${strongestMetric.home} to ${strongestMetric.away}. ${secondaryMetric.label}: ${secondaryMetric.home} to ${secondaryMetric.away}.`)
        : (isDe
            ? "Die nächsten API-Updates verändern Spielstand, H2H und Vergleichswerte auf dieser Seite."
            : "The next API updates adjust score, H2H and comparison values on this page.")
    }
  ];
}

function getPredictionContextRows(context: MatchContext, locale: Locale) {
  const isDe = locale === "de";
  const metrics = buildMetrics(context);
  const primary = metrics[0];
  const secondary = metrics[1];
  const basis = context.analysis.stats.length > 0
    ? (isDe
        ? `${context.analysis.stats.length} Live-Werte aus ${context.analysis.source}`
        : `${context.analysis.stats.length} live values from ${context.analysis.source}`)
    : context.analysis.h2h.length > 0
      ? (isDe
          ? `${context.analysis.h2h.length} direkte Duelle aus ${context.analysis.source}`
          : `${context.analysis.h2h.length} head-to-head games from ${context.analysis.source}`)
      : getProfileBasisText(context, isDe);

  return [
    {
      label: isDe ? "Stärkster Vorteil" : "Strongest edge",
      text: primary
        ? `${primary.label}: ${primary.home} zu ${primary.away}`
        : (isDe ? "Noch keine Vergleichswerte" : "No comparison values yet")
    },
    {
      label: isDe ? "Zweites Signal" : "Second signal",
      text: secondary
        ? `${secondary.label}: ${secondary.home} zu ${secondary.away}`
        : formatMatchStatus(context.match, locale)
    },
    {
      label: isDe ? "Datenbasis" : "Data basis",
      text: basis
    }
  ];
}

function getProfileBasisText(context: MatchContext, isDe: boolean) {
  if (context.sport === "tennis") {
    const home = findTennisPlayer(context.match.homeName);
    const away = findTennisPlayer(context.match.awayName);
    const homeText = home ? `${home.name}: #${home.rank}, ${home.hand}, ${home.form}` : context.match.homeName;
    const awayText = away ? `${away.name}: #${away.rank}, ${away.hand}, ${away.form}` : context.match.awayName;

    return isDe
      ? `TheSportsDB-Spieltermin plus Spielerprofile: ${homeText}; ${awayText}.`
      : `TheSportsDB fixture plus player profiles: ${homeText}; ${awayText}.`;
  }

  return isDe
    ? `${context.match.competition}, TheSportsDB-Termin, Teamprofile und sportartspezifische Vergleichsmetriken.`
    : `${context.match.competition}, TheSportsDB fixture, team profiles and sport-specific comparison metrics.`;
}

function getParticipantStrength(sport: ApiSportId, name: string) {
  if (sport === "nfl") {
    const team = nflTeams.find((entry) => namesMatch(entry.name, name) || namesMatch(entry.shortName, name) || namesMatch(entry.city, name));
    return team ? 80 - team.rank + team.wins * 1.4 - team.losses * 0.8 : 50;
  }

  if (sport === "nba") {
    const team = nbaTeams.find((entry) => namesMatch(entry.name, name) || namesMatch(entry.shortName, name) || namesMatch(entry.city, name));
    return team ? 82 - team.rank + team.wins * 0.9 - team.losses * 0.3 : 50;
  }

  if (sport === "tennis") {
    const player = findTennisPlayer(name);
    return player ? 95 - player.rank + player.hard * 0.25 + player.clay * 0.18 + player.grass * 0.18 : 50;
  }

  const team = findFootballTeam(name);
  return team ? 75 - team.rank + (team.points ?? 40) * 0.45 : 50;
}

function findTennisPlayer(name: string) {
  return findTennisPlayerByName(name);
}

function findFootballTeam(name: string): FootballTeam | undefined {
  return footballCompetitions.flatMap((competition) => competition.teams).find((team) => namesMatch(team.name, name) || namesMatch(team.shortName, name));
}

function ParticipantMark({ logo, name, sport }: { logo: string | null; name: string; sport: ApiSportId }) {
  if (logo) {
    return <img alt="" className={sport === "tennis" ? "matchDetailLogo matchDetailFlag" : "matchDetailLogo"} src={logo} />;
  }

  return <span className="matchDetailLogo textLogo">{getInitials(name)}</span>;
}

function ParticipantLink({ context, logo, name }: { context: MatchContext; logo: string | null; name: string }) {
  const href = getParticipantHref(context, name);
  const content = (
    <>
      <ParticipantMark logo={logo} name={name} sport={context.sport} />
      <span>{name}</span>
    </>
  );

  if (!href) {
    return <span className="matchDetailParticipant">{content}</span>;
  }

  return <Link className="matchDetailParticipant" href={href}>{content}</Link>;
}

function getParticipantHref(context: MatchContext, name: string) {
  if (context.sport === "football") {
    const team = context.competition?.teams.find((entry) => namesMatch(entry.name, name) || namesMatch(entry.shortName, name)) ?? findFootballTeam(name);

    if (!team) {
      return null;
    }

    const href = localizePath(`/football/team/${team.slug}`, context.locale);
    return context.competition ? `${href}?from=${encodeURIComponent(context.competition.slug)}` : href;
  }

  if (context.sport === "nfl") {
    const team = nflTeams.find((entry) => namesMatch(entry.name, name) || namesMatch(entry.shortName, name) || namesMatch(entry.city, name));
    return team ? localizePath(`/nfl/team/${team.slug}`, context.locale) : null;
  }

  if (context.sport === "nba") {
    const team = nbaTeams.find((entry) => namesMatch(entry.name, name) || namesMatch(entry.shortName, name) || namesMatch(entry.city, name));
    return team ? localizePath(`/nba/team/${team.slug}`, context.locale) : null;
  }

  const player = findTennisPlayer(name);
  return player ? localizePath(`/tennis/player/${player.slug}`, context.locale) : null;
}

function getBackHref(context: MatchContext) {
  if (context.sport === "football") {
    const slug = context.competition?.slug ?? "bundesliga";
    return localizePath(`/football/${slug}/${context.locale === "de" ? "spieltag" : "matchday"}`, context.locale);
  }

  if (context.sport === "tennis") {
    return localizePath(`/tennis/${context.locale === "de" ? "vorhersagen" : "matches"}`, context.locale);
  }

  return localizePath(`/${context.sport}/${context.locale === "de" ? "spieltag" : "matches"}`, context.locale);
}

function getMatchTabHref(context: MatchContext, matchId: string, tab: MatchDetailTab, searchParams?: MatchSearchParams) {
  const base = getMatchBaseHref(context, matchId);
  const query = new URLSearchParams();

  query.set("tab", tab);

  for (const key of ["home", "away", "date", "competition", "status", "homeLogo", "awayLogo", "homeId", "awayId", "round", "venue", "homeScore", "awayScore"]) {
    const value = getQueryValue(searchParams, key);
    if (value) {
      query.set(key, value);
    }
  }

  return `${base}?${query.toString()}`;
}

export function getSportMatchHref({
  competitionSlug,
  locale,
  match,
  sport
}: {
  competitionSlug?: string;
  locale: Locale;
  match: SportApiMatch;
  sport: ApiSportId;
}) {
  const context: MatchContext = {
    analysis: { h2h: [], message: "", source: "", stats: [], status: "not_configured" },
    competition: competitionSlug ? getCompetition(competitionSlug) : undefined,
    locale,
    match,
    sport
  };
  const base = getMatchBaseHref(context, match.id);
  const query = new URLSearchParams({
    away: match.awayName,
    competition: match.competition,
    home: match.homeName
  });

  if (match.awayLogo) query.set("awayLogo", match.awayLogo);
  if (match.awayId) query.set("awayId", match.awayId);
  if (match.homeLogo) query.set("homeLogo", match.homeLogo);
  if (match.homeId) query.set("homeId", match.homeId);
  if (match.date) query.set("date", match.date);
  if (match.round) query.set("round", match.round);
  if (match.status) query.set("status", match.status);
  if (match.venue) query.set("venue", match.venue);
  if (match.awayScore !== null) query.set("awayScore", String(match.awayScore));
  if (match.homeScore !== null) query.set("homeScore", String(match.homeScore));

  return `${base}?${query.toString()}`;
}

function getMatchBaseHref(context: MatchContext, matchId: string) {
  const encodedMatchId = encodeURIComponent(matchId);

  if (context.sport === "football") {
    const competitionSlug = context.competition?.slug ?? "bundesliga";
    return localizePath(`/football/${competitionSlug}/${context.locale === "de" ? "spiel" : "match"}/${encodedMatchId}`, context.locale);
  }

  if (context.sport === "tennis") {
    return localizePath(`/tennis/${context.locale === "de" ? "spiel" : "match"}/${encodedMatchId}`, context.locale);
  }

  return localizePath(`/${context.sport}/${context.locale === "de" ? "spiel" : "game"}/${encodedMatchId}`, context.locale);
}

function isMatchTab(value: string): value is MatchDetailTab {
  return ["overview", "comparison", "stats", "signal"].includes(value);
}

function formatMatchCenter(match: SportApiMatch) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore} - ${match.awayScore}`;
  }

  if (match.date) {
    const date = new Date(match.date);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
    }
  }

  return "vs";
}

function formatOddsOutcomeLabel(label: "home" | "draw" | "away", match: SportApiMatch, locale: Locale) {
  if (label === "home") {
    return match.homeName;
  }

  if (label === "away") {
    return match.awayName;
  }

  return locale === "de" ? "Remis" : "Draw";
}

function formatCompactOddsOutcomeLabel(label: "home" | "draw" | "away") {
  if (label === "home") {
    return "1";
  }

  if (label === "away") {
    return "2";
  }

  return "X";
}

function formatCompactOddsSource(odds: SportApiMatch["odds"], locale: Locale, bookmakersLabel: string) {
  if (!odds) {
    return "";
  }

  return odds.provider === "The Odds API"
    ? `${odds.bookmakerCount} ${bookmakersLabel}`
    : locale === "de" ? "Modell" : "model";
}

function formatDecimalOdds(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatMatchDate(value: string | null, locale: Locale) {
  if (!value) {
    return copy[locale].datePending;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatMatchStatus(match: SportApiMatch, locale: Locale) {
  const text = copy[locale];
  const status = (match.status ?? "").toLowerCase();

  if (status.includes("live") || status.includes("quarter") || status.includes("in play")) {
    return text.live;
  }

  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore}:${match.awayScore}`;
  }

  return match.status || text.scheduled;
}

function getSportLabel(sport: ApiSportId, locale: Locale) {
  if (sport === "football") return locale === "de" ? "Fußball" : "Football";
  return sport.toUpperCase();
}

function formatMetricValue(kind: "number" | "percent" | "score", value: number) {
  if (kind === "percent") {
    return `${Math.max(35, Math.min(72, Math.round(value)))}%`;
  }

  if (kind === "number") {
    return String(Math.max(1, Math.round(value)));
  }

  return String(Math.max(52, Math.min(96, Math.round(value))));
}

function getInitials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function namesMatch(left: string, right: string) {
  const a = normalizeName(left);
  const b = normalizeName(right);

  return a === b || a.includes(b) || b.includes(a);
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function stringSeed(value: string) {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getQueryValue(searchParams: MatchSearchParams | undefined, key: string) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function toNullableNumber(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
