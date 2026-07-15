import Link from "next/link";
import { notFound } from "next/navigation";
import { localizePath, type Locale } from "@/lib/i18n";
import { getSportsNewsLinks } from "@/lib/sports-news";
import { getSportApiSnapshot, type ApiSportId, type SportApiMatch, type SportApiTeam } from "@/lib/sports-api-data";
import { getSportMatchHref } from "@/components/match-detail-page";
import { SportsNewsCards } from "@/components/sports-news-cards";
import { PredictionModelSelector, SelectedModelPrediction } from "@/components/prediction-model-selector";
import { buildModelPredictions } from "@/lib/prediction-models";

type LeagueTeam = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  conference: string;
  division: string;
  colors: [string, string];
  rank: number;
  wins: number;
  losses: number;
  ties?: number;
  pointsFor: number;
  pointsAgainst: number;
  form: string;
  prediction: string;
  logo: string;
  fullName?: string;
  nickname?: string;
  founded?: string;
  arena?: string;
  stadium?: string;
  capacity?: string;
};

type DisplayLeagueTeam = LeagueTeam & {
  apiLogo?: string | null;
};

export type LeagueSportTab = "news" | "matches" | "table" | "teams" | "stats";
export type LeagueSportTeamTab = "matches" | "table" | "squad" | "scorers" | "fairness" | "running" | "duels" | "info";

type RosterGroup = {
  position: string;
  players: Array<{ name: string; number: string }>;
};

type MetricCard = {
  label: string;
  value: string;
  detail: string;
};

export type LeagueSportConfig<TTeam extends LeagueTeam> = {
  apiSport: ApiSportId;
  basePath: "/nfl" | "/nba";
  title: string;
  subtitle: {
    de: string;
    en: string;
  };
  provider: string;
  teams: TTeam[];
  pointsLabel: string;
  scoreStep: number;
  modelFocus: {
    de: string;
    en: string;
  };
};

const labels = {
  en: {
    allSports: "All sports",
    predictionHub: "Prediction hub",
    news: "News",
    matches: "Game predictions",
    table: "Table",
    teams: "Teams",
    stats: "Team stats",
    matchCenter: "Match center",
    fixturesAndResults: "Predictions & games",
    latestSignals: "Latest signals",
    upcomingPredictions: "Next 5 predictions",
    source: "Source",
    standings: "Standings",
    rank: "#",
    team: "Team",
    conf: "Conf.",
    div: "Div.",
    wins: "W",
    losses: "L",
    ties: "T",
    points: "PF:PA",
    diff: "Diff.",
    pct: "PCT",
    gb: "GB",
    ppg: "PPG",
    opp: "OPP",
    net: "Net",
    streak: "Strk",
    participatingTeams: "Teams",
    competitionFacts: "Team stats",
    modelSummary: "Model summary",
    backToLeague: "Back to league",
    teamProfile: "Team profile",
    city: "City",
    division: "Division",
    conference: "Conference",
    record: "Record",
    form: "Form",
    fullName: "Full name",
    nickname: "Nickname",
    colors: "Colors",
    founded: "Founded",
    venue: "Arena",
    capacity: "Capacity",
    squad: "Squad",
    scorers: "Scorers",
    fairPlay: "Fairness",
    running: "Running",
    duels: "Duels",
    info: "Info",
    predictionSignal: "AI prediction",
    pick: "Pick",
    predictedScore: "Score",
    confidence: "Win probability",
    odds: "Odds",
    bestOdds: "Best odds",
    bookmakers: "books",
    reasoning: "Reasoning",
    squadUnavailable: "Core roster roles are shown here; full live roster sync can be connected next.",
    live: "Live",
    final: "Final",
    scheduled: "Scheduled",
    details: "Open analysis",
    noLiveMatchesTitle: "No scheduled games from the API",
    noLiveMatchesText: "As soon as the API returns real fixtures, this area fills automatically. Demo pairings are hidden."
  },
  de: {
    allSports: "Alle Sportarten",
    predictionHub: "Prediction Hub",
    news: "News",
    matches: "Spiel-Prognosen",
    table: "Tabelle",
    teams: "Teams",
    stats: "Teamstatistik",
    matchCenter: "Matchcenter",
    fixturesAndResults: "Prognosen & Spiele",
    latestSignals: "Aktuelle Signale",
    upcomingPredictions: "Nächste 5 Prognosen",
    source: "Quelle",
    standings: "Tabelle",
    rank: "#",
    team: "Team",
    conf: "Conf.",
    div: "Div.",
    wins: "S",
    losses: "N",
    ties: "U",
    points: "PF:PA",
    diff: "Diff.",
    pct: "PCT",
    gb: "GB",
    ppg: "PPG",
    opp: "OPP",
    net: "Net",
    streak: "Serie",
    participatingTeams: "Teams",
    competitionFacts: "Teamstatistik",
    modelSummary: "Modell-Zusammenfassung",
    backToLeague: "Zurück zur Liga",
    teamProfile: "Teamprofil",
    city: "Stadt",
    division: "Division",
    conference: "Conference",
    record: "Bilanz",
    form: "Form",
    fullName: "vollst. Name",
    nickname: "Spitzname",
    colors: "Farben",
    founded: "Gegründet",
    venue: "Stadion",
    capacity: "Kapazität",
    squad: "Kader",
    scorers: "Topscorer",
    fairPlay: "Fairness",
    running: "Laufleistung",
    duels: "Zweikämpfe",
    info: "Infos",
    predictionSignal: "KI-Prognose",
    pick: "Tipp",
    predictedScore: "Ergebnis",
    confidence: "Siegchance",
    odds: "Quoten",
    bestOdds: "Beste Quote",
    bookmakers: "Anbieter",
    reasoning: "Begründung",
    squadUnavailable: "Hier stehen Kaderkern und Rollen; vollständige Live-Roster können als nächster Schritt angebunden werden.",
    live: "Live",
    final: "Final",
    scheduled: "Geplant",
    details: "Analyse öffnen",
    noLiveMatchesTitle: "Keine echten API-Spiele terminiert",
    noLiveMatchesText: "Sobald die API echte Spiele zurückgibt, füllt sich dieser Bereich automatisch. Demo-Paarungen werden ausgeblendet."
  }
} as const;

const nflVenues: Record<string, { founded: string; venue: string; capacity: string }> = {
  "kansas-city-chiefs": { founded: "1960", venue: "GEHA Field at Arrowhead Stadium", capacity: "76.416" },
  "buffalo-bills": { founded: "1960", venue: "Highmark Stadium", capacity: "71.608" },
  "baltimore-ravens": { founded: "1996", venue: "M&T Bank Stadium", capacity: "70.745" },
  "houston-texans": { founded: "1999", venue: "NRG Stadium", capacity: "72.220" },
  "los-angeles-chargers": { founded: "1960", venue: "SoFi Stadium", capacity: "70.240" },
  "pittsburgh-steelers": { founded: "1933", venue: "Acrisure Stadium", capacity: "68.400" },
  "denver-broncos": { founded: "1960", venue: "Empower Field at Mile High", capacity: "76.125" },
  "cincinnati-bengals": { founded: "1968", venue: "Paycor Stadium", capacity: "65.515" },
  "miami-dolphins": { founded: "1965", venue: "Hard Rock Stadium", capacity: "65.326" },
  "indianapolis-colts": { founded: "1953", venue: "Lucas Oil Stadium", capacity: "67.000" },
  "new-york-jets": { founded: "1959", venue: "MetLife Stadium", capacity: "82.500" },
  "jacksonville-jaguars": { founded: "1993", venue: "EverBank Stadium", capacity: "67.814" },
  "new-england-patriots": { founded: "1959", venue: "Gillette Stadium", capacity: "65.878" },
  "las-vegas-raiders": { founded: "1960", venue: "Allegiant Stadium", capacity: "65.000" },
  "cleveland-browns": { founded: "1944", venue: "Huntington Bank Field", capacity: "67.431" },
  "tennessee-titans": { founded: "1959", venue: "Nissan Stadium", capacity: "69.143" },
  "detroit-lions": { founded: "1930", venue: "Ford Field", capacity: "65.000" },
  "philadelphia-eagles": { founded: "1933", venue: "Lincoln Financial Field", capacity: "69.879" },
  "tampa-bay-buccaneers": { founded: "1974", venue: "Raymond James Stadium", capacity: "69.218" },
  "los-angeles-rams": { founded: "1936", venue: "SoFi Stadium", capacity: "70.240" },
  "minnesota-vikings": { founded: "1960", venue: "U.S. Bank Stadium", capacity: "66.860" },
  "washington-commanders": { founded: "1932", venue: "Northwest Stadium", capacity: "67.617" },
  "green-bay-packers": { founded: "1919", venue: "Lambeau Field", capacity: "81.441" },
  "seattle-seahawks": { founded: "1974", venue: "Lumen Field", capacity: "68.740" },
  "atlanta-falcons": { founded: "1965", venue: "Mercedes-Benz Stadium", capacity: "71.000" },
  "arizona-cardinals": { founded: "1898", venue: "State Farm Stadium", capacity: "63.400" },
  "dallas-cowboys": { founded: "1960", venue: "AT&T Stadium", capacity: "80.000" },
  "san-francisco-49ers": { founded: "1944", venue: "Levi's Stadium", capacity: "68.500" },
  "chicago-bears": { founded: "1920", venue: "Soldier Field", capacity: "61.500" },
  "carolina-panthers": { founded: "1993", venue: "Bank of America Stadium", capacity: "74.867" },
  "new-orleans-saints": { founded: "1966", venue: "Caesars Superdome", capacity: "73.208" },
  "new-york-giants": { founded: "1925", venue: "MetLife Stadium", capacity: "82.500" }
};

export async function LeagueSportPage<TTeam extends LeagueTeam>({
  config,
  locale,
  tab = "news"
}: {
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  tab?: LeagueSportTab;
}) {
  const text = labels[locale];
  const apiSnapshot = await getSportApiSnapshot(config.apiSport);
  const apiMatches = apiSnapshot.matches.length > 0 ? hydrateApiMatches(apiSnapshot.matches, config.teams) : [];
  const matches = getUpcomingLeagueMatches(apiMatches);
  const displayTeams = buildDisplayTeams(config.teams, apiSnapshot.teams);
  const tabItems = getLeagueTabs(config, locale);
  const hasSideColumn = false;

  return (
    <main className="footballDetailShell sportschauFootballPage nflPage">
      <section className="competitionHero sportschauCompetitionHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{config.title}</p>
          <h1>{config.title}</h1>
          <p>{config.subtitle[locale]}</p>
        </div>
        {matches[0] ? <FeaturedGame config={config} match={matches[0]} /> : null}
        <Link className="footballBackLink" href={localizePath("/#sports", locale)}>
          {text.allSports}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={text.predictionHub}>
        {tabItems.map((item) => (
          <Link className={tab === item.tab ? "isActive" : ""} href={item.href} key={item.tab}>
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="teamLogoRail sportschauTeamLogoRail" aria-label={text.teams}>
        {displayTeams.map((team) => (
          <Link className="teamLogoRailItem" href={getTeamHref(config, team.slug, locale)} key={team.slug} title={team.name}>
            <LeagueTeamLogo team={team} />
          </Link>
        ))}
      </section>

      <div className={`sportschauPageGrid ${hasSideColumn ? "" : "isSingleColumn"}`}>
        <div className="sportschauMainColumn">
          {tab === "news" ? <LeagueNewsSection config={config} locale={locale} matches={matches} /> : null}
          {tab === "matches" ? <LeagueMatchesSection config={config} locale={locale} matches={matches} /> : null}
          {tab === "table" ? <LeagueStandingsSection config={config} locale={locale} teams={displayTeams} /> : null}
          {tab === "teams" ? <LeagueTeamsSection config={config} locale={locale} teams={displayTeams} /> : null}
          {tab === "stats" ? <LeagueStatsSection config={config} locale={locale} matches={matches} teams={displayTeams} /> : null}
        </div>

        {hasSideColumn ? (
          <aside className="sportschauSideColumn">
            <LeagueStatsSection compact config={config} locale={locale} matches={matches} teams={displayTeams} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

export async function LeagueSportTeamPage<TTeam extends LeagueTeam>({
  config,
  locale,
  tab = "info",
  teamSlug
}: {
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  tab?: LeagueSportTeamTab;
  teamSlug: string;
}) {
  const team = config.teams.find((candidate) => candidate.slug === teamSlug);
  const text = labels[locale];

  if (!team) {
    notFound();
  }

  const apiSnapshot = await getSportApiSnapshot(config.apiSport);
  const apiTeam = findApiTeam(apiSnapshot.teams, team);
  const displayTeam: DisplayLeagueTeam = { ...team, apiLogo: apiTeam?.logo };
  const allMatches = getUpcomingLeagueMatches(apiSnapshot.matches.length > 0 ? hydrateApiMatches(apiSnapshot.matches, config.teams) : []);
  const teamMatches = allMatches.filter((match) => teamMatchesName(team, match.homeName) || teamMatchesName(team, match.awayName));
  const teamTabs = getLeagueTeamTabs(config, team.slug, locale);

  return (
    <main className="footballDetailShell sportschauFootballPage nflPage">
      <section className="teamHero sportschauTeamHero">
        <LeagueTeamLogo className="teamHeroLogo" team={displayTeam} />
        <div>
          <p className="footballEyebrow">{text.teamProfile}</p>
          <h1>{team.name}</h1>
          <p>{team.prediction}. {text.form}: {team.form}.</p>
        </div>
        <Link className="footballBackLink" href={localizePath(config.basePath, locale)}>
          {text.backToLeague}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={text.teamProfile}>
        {teamTabs.map((item) => (
          <Link className={tab === item.tab ? "isActive" : ""} href={item.href} key={item.tab}>
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "info" ? <LeagueTeamInfoSection config={config} locale={locale} team={displayTeam} /> : null}
      {tab === "matches" ? <LeagueMatchesSection config={config} locale={locale} matches={teamMatches} title={team.shortName} /> : null}
      {tab === "table" ? <LeagueStandingsSection config={config} highlightedTeam={team} locale={locale} teams={buildDisplayTeams(config.teams, apiSnapshot.teams)} /> : null}
      {tab === "squad" ? <LeagueSquadSection config={config} locale={locale} team={displayTeam} /> : null}
      {tab === "scorers" || tab === "fairness" || tab === "running" || tab === "duels" ? (
        <LeagueMetricSection activeTab={tab} config={config} locale={locale} team={team} />
      ) : null}
    </main>
  );
}

function FeaturedGame<TTeam extends LeagueTeam>({ config, match }: { config: LeagueSportConfig<TTeam>; match: SportApiMatch }) {
  return (
    <article className="featuredFixtureCard">
      <span>Matchcenter</span>
      <div className="featuredFixtureTeams">
        <SportLogo logo={match.homeLogo} name={match.homeName} />
        <strong>{formatMatchCenter(match)}</strong>
        <SportLogo logo={match.awayLogo} name={match.awayName} />
      </div>
      <small>{match.homeName} - {match.awayName}</small>
      <em>{config.title}</em>
    </article>
  );
}

function LeagueMatchesSection<TTeam extends LeagueTeam>({
  config,
  locale,
  matches,
  title
}: {
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  matches: SportApiMatch[];
  title?: string;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel" id="matchday">
      <div className="footballPanelHeader">
        <div>
          <p>{text.fixturesAndResults}</p>
        </div>
        <div className="fixturePanelModelTools">
          <strong>{title ?? config.title}</strong>
          <PredictionModelSelector compact locale={locale} />
        </div>
      </div>
      {matches.length > 0 ? (
        <div className="fixtureGrid sportschauFixtureList">
          {matches.map((match) => (
            <article className="fixtureRow" key={match.id}>
              <Link
                aria-label={`${text.details}: ${match.homeName} - ${match.awayName}`}
                className="fixtureCardOverlay"
                href={getSportMatchHref({ locale, match, sport: config.apiSport })}
              />
              <div className="fixtureMatchLine">
                <LeagueFixtureTeam align="right" config={config} locale={locale} logo={match.homeLogo} name={match.homeName} />
                <div className="fixtureTime">
                  <span>{formatMatchDate(match.date, locale)}</span>
                  <strong>{formatMatchCenter(match)}</strong>
                  <small>{match.competition || config.title}</small>
                </div>
                <LeagueFixtureTeam align="left" config={config} locale={locale} logo={match.awayLogo} name={match.awayName} />
              </div>
              <LeagueCompactOddsLine locale={locale} match={match} />
              <div className="fixturePrediction">
                <LeaguePredictionCard config={config} locale={locale} match={match} />
                <div className="fixtureActionColumn">
                  <LeagueStatusPill locale={locale} match={match} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <LeagueEmptyMatches locale={locale} />
      )}
    </section>
  );
}

function LeaguePredictionCard<TTeam extends LeagueTeam>({ config, locale, match }: { config: LeagueSportConfig<TTeam>; locale: Locale; match: SportApiMatch }) {
  const text = labels[locale];
  const home = findLocalTeam(config.teams, match.homeName);
  const away = findLocalTeam(config.teams, match.awayName);
  const homeStrength = home ? home.wins * 2 - home.losses + home.rank * -0.6 : 50;
  const awayStrength = away ? away.wins * 2 - away.losses + away.rank * -0.6 : 50;
  const edge = homeStrength - awayStrength + 3;
  const winner = edge >= 0 ? match.homeName : match.awayName;
  const confidence = Math.min(78, Math.max(55, Math.round(58 + Math.abs(edge) * 0.6)));
  const homeScore = config.apiSport === "nba" ? 108 + Math.round(edge / 3) : 24 + Math.round(edge / 6);
  const awayScore = config.apiSport === "nba" ? 105 - Math.round(edge / 4) : 21 - Math.round(edge / 8);
  const score = `${Math.max(config.scoreStep, homeScore)}:${Math.max(config.scoreStep, awayScore)}`;
  const reasoning = locale === "de"
    ? `${winner} liegt im Modell vorne: Bilanz, Formkurve, Heimvorteil und ${config.modelFocus.de.toLowerCase()} geben den Ausschlag.`
    : `${winner} leads the model: record, form trend, home edge and ${config.modelFocus.en.toLowerCase()} drive the projection.`;
  const variants = buildModelPredictions({
    baseConfidence: confidence,
    basePick: winner,
    baseReason: reasoning,
    baseScore: score,
    homeName: match.homeName,
    awayName: match.awayName,
    locale,
    seed: getLeaguePredictionSeed(`${match.id}:${match.homeName}:${match.awayName}`),
    sport: config.apiSport
  });

  return (
    <SelectedModelPrediction
      labels={{
        pick: text.pick,
        prediction: text.predictionSignal,
        probability: text.confidence,
        reason: text.reasoning,
        score: text.predictedScore
      }}
      locale={locale}
      variants={variants}
    />
  );
}

function getLeaguePredictionSeed(value: string) {
  return value.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
}

function LeagueCompactOddsLine({ locale, match }: { locale: Locale; match: SportApiMatch }) {
  const text = labels[locale];
  const odds = match.odds;

  if (!odds || odds.outcomes.length === 0) {
    return null;
  }

  return (
    <div className="compactOddsLine" aria-label={text.odds}>
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

function LeagueStatusPill({ locale, match }: { locale: Locale; match: SportApiMatch }) {
  const text = labels[locale];
  const status = (match.status ?? "").toLowerCase();
  const isLive = isLiveLeagueMatch(match);
  const label = isLive
    ? text.live
    : match.homeScore !== null && match.awayScore !== null
      ? text.final
      : text.scheduled;

  return <span className={isLive ? "fixtureMetaPill isLive" : "fixtureMetaPill"}>{label}</span>;
}

async function LeagueNewsSection<TTeam extends LeagueTeam>({
  config,
  locale,
  matches
}: {
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  matches: SportApiMatch[];
}) {
  const text = labels[locale];
  const newsItems = await getSportsNewsLinks({
    contextName: config.title,
    locale,
    topic: config.apiSport === "nba" ? "nba" : "nfl"
  });
  const upcomingMatches = getUpcomingLeagueMatches(matches).slice(0, 5);

  return (
    <section className="sportsNewsTabStack">
      {upcomingMatches.length > 0 ? (
        <div className="footballPanel sportschauNewsPanel">
          <div className="sportschauSectionTitle">
            <span>{text.upcomingPredictions}</span>
            <h2>{text.fixturesAndResults}</h2>
          </div>
          <div className="newsPredictionList">
            {upcomingMatches.map((match) => (
              <article className="fixtureRow newsPredictionFixture" key={match.id}>
                <Link
                  aria-label={`${text.details}: ${match.homeName} - ${match.awayName}`}
                  className="fixtureCardOverlay"
                  href={getSportMatchHref({ locale, match, sport: config.apiSport })}
                />
                <div className="fixtureMatchLine">
                  <LeagueFixtureTeam align="right" config={config} locale={locale} logo={match.homeLogo} name={match.homeName} />
                  <div className="fixtureTime">
                    <span>{formatMatchDate(match.date, locale)}</span>
                    <strong>{formatMatchCenter(match)}</strong>
                    <small>{match.competition || config.title}</small>
                  </div>
                  <LeagueFixtureTeam align="left" config={config} locale={locale} logo={match.awayLogo} name={match.awayName} />
                </div>
                <LeagueCompactOddsLine locale={locale} match={match} />
                <div className="fixturePrediction">
                  <LeaguePredictionCard config={config} locale={locale} match={match} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="footballPanel sportschauNewsPanel">
        <div className="sportschauSectionTitle">
          <span>{text.latestSignals}</span>
          <h2>{config.title}-News</h2>
        </div>
        <div className="footballNewsGrid sportschauNewsGrid">
          <SportsNewsCards items={newsItems} locale={locale} />
        </div>
      </div>
    </section>
  );
}

function LeagueEmptyMatches({ locale }: { locale: Locale }) {
  const text = labels[locale];

  return (
    <div className="teamEmptyState">
      <strong>{text.noLiveMatchesTitle}</strong>
      <p>{text.noLiveMatchesText}</p>
    </div>
  );
}

function LeagueStandingsSection<TTeam extends LeagueTeam>({
  config,
  highlightedTeam,
  locale,
  teams
}: {
  config: LeagueSportConfig<TTeam>;
  highlightedTeam?: LeagueTeam;
  locale: Locale;
  teams: DisplayLeagueTeam[];
}) {
  const text = labels[locale];
  const groups = buildStandingGroups(config, teams);

  return (
    <section className="footballPanel sportschauTablePanel">
      <div className="sportschauSectionTitle">
        <span>{config.title}</span>
        <h2>{text.standings}</h2>
      </div>
      <div className="leagueStandingsGroups">
        {groups.map((group) => (
          <article className="leagueStandingGroup" key={group.label}>
            <h3>{group.label}</h3>
            <div className="leagueTable sportschauLeagueTable nflLeagueTable">
              {config.apiSport === "nba" ? (
                <>
                  <div className="leagueTableRow leagueTableHeader nbaTableRow" aria-hidden="true">
                    <span>{text.rank}</span>
                    <span />
                    <strong>{text.team}</strong>
                    <small>{text.wins}</small>
                    <small>{text.losses}</small>
                    <small>{text.pct}</small>
                    <small>{text.gb}</small>
                    <small>{text.ppg}</small>
                    <small>{text.opp}</small>
                    <em>{text.diff}</em>
                    <small>{text.streak}</small>
                  </div>
                  {group.teams.map((team, index) => (
                    <Link className={highlightedTeam?.slug === team.slug ? "leagueTableRow nbaTableRow isHighlightedTeam" : "leagueTableRow nbaTableRow"} href={getTeamHref(config, team.slug, locale)} key={team.slug}>
                      <span>{index + 1}</span>
                      <LeagueTeamLogo team={team} />
                      <strong>{team.name}</strong>
                      <small>{team.wins}</small>
                      <small>{team.losses}</small>
                      <small>{formatWinningPercentage(team)}</small>
                      <small>{formatGamesBehind(team, group.teams)}</small>
                      <small>{formatAverage(team.pointsFor, 82)}</small>
                      <small>{formatAverage(team.pointsAgainst, 82)}</small>
                      <em>{formatDiff(team.pointsFor - team.pointsAgainst)}</em>
                      <small>{formatStreak(team.form)}</small>
                    </Link>
                  ))}
                </>
              ) : (
                <>
                  <div className="leagueTableRow leagueTableHeader nflTableRow" aria-hidden="true">
                    <span>{text.rank}</span>
                    <span />
                    <strong>{text.team}</strong>
                    <small>{text.wins}</small>
                    <small>{text.losses}</small>
                    <small>{text.ties}</small>
                    <small>{text.pct}</small>
                    <small>PF</small>
                    <small>PA</small>
                    <em>{text.net}</em>
                    <small>{text.streak}</small>
                  </div>
                  {group.teams.map((team, index) => (
                    <Link className={highlightedTeam?.slug === team.slug ? "leagueTableRow nflTableRow isHighlightedTeam" : "leagueTableRow nflTableRow"} href={getTeamHref(config, team.slug, locale)} key={team.slug}>
                      <span>{index + 1}</span>
                      <LeagueTeamLogo team={team} />
                      <strong>{team.name}</strong>
                      <small>{team.wins}</small>
                      <small>{team.losses}</small>
                      <small>{team.ties ?? 0}</small>
                      <small>{formatWinningPercentage(team)}</small>
                      <small>{team.pointsFor}</small>
                      <small>{team.pointsAgainst}</small>
                      <em>{formatDiff(team.pointsFor - team.pointsAgainst)}</em>
                      <small>{formatStreak(team.form)}</small>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LeagueTeamsSection<TTeam extends LeagueTeam>({ config, locale, teams }: { config: LeagueSportConfig<TTeam>; locale: Locale; teams: DisplayLeagueTeam[] }) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <div className="sportschauSectionTitle">
        <span>{text.participatingTeams}</span>
        <h2>{text.teams}</h2>
      </div>
      <div className="compactTeamList teamsDirectoryList">
        {teams.map((team) => (
          <Link href={getTeamHref(config, team.slug, locale)} key={team.slug}>
            <LeagueTeamLogo team={team} />
            <span>{team.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function LeagueStatsSection<TTeam extends LeagueTeam>({
  compact = false,
  config,
  locale,
  matches,
  teams
}: {
  compact?: boolean;
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  matches: SportApiMatch[];
  teams: DisplayLeagueTeam[];
}) {
  const text = labels[locale];
  const conferences = [...new Set(teams.map((team) => team.conference))];

  return (
    <section className="footballPanel sportschauInfoPanel">
      <p className="footballEyebrow">{text.competitionFacts}</p>
      <h2>{config.title}</h2>
      <div className="teamStatList">
        <div><span>{text.teams}</span><strong>{teams.length}</strong></div>
        {conferences.map((conference) => (
          <div key={conference}><span>{conference}</span><strong>{teams.filter((team) => team.conference === conference).length}</strong></div>
        ))}
        <div><span>{text.matches}</span><strong>{matches.length}</strong></div>
      </div>
    </section>
  );
}

function LeagueTeamInfoSection<TTeam extends LeagueTeam>({ config, locale, team }: { config: LeagueSportConfig<TTeam>; locale: Locale; team: DisplayLeagueTeam }) {
  const text = labels[locale];
  const venue = team.arena ?? team.stadium ?? nflVenues[team.slug]?.venue ?? "-";
  const founded = team.founded ?? nflVenues[team.slug]?.founded ?? "-";
  const capacity = team.capacity ?? nflVenues[team.slug]?.capacity ?? "-";
  const nickname = team.nickname ?? getTeamNickname(team);
  const colors = locale === "de" ? getColorNames(team.colors) : getColorNames(team.colors);

  return (
    <section className="footballPanel teamInfoPanel" id="info">
      <div className="teamInfoLogoWrap">
        <LeagueTeamLogo className="teamHeroLogo" team={team} />
      </div>
      <dl className="teamInfoList">
        <div><dt>{text.fullName}</dt><dd>{team.fullName ?? team.name}</dd></div>
        <div><dt>{text.nickname}</dt><dd>{nickname}</dd></div>
        <div><dt>{text.city}</dt><dd>{team.city}</dd></div>
        <div><dt>{text.conference}</dt><dd>{team.conference}</dd></div>
        <div><dt>{text.colors}</dt><dd>{colors}</dd></div>
        <div><dt>{text.founded}</dt><dd>{founded}</dd></div>
        <div><dt>{text.venue}</dt><dd>{venue}</dd></div>
        <div><dt>{text.capacity}</dt><dd>{capacity}</dd></div>
      </dl>
      <div className="teamInfoCurrent">
        <span>{config.title}</span>
        <strong>#{team.rank}</strong>
        <small>{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""} · {text.form}: {team.form}</small>
      </div>
    </section>
  );
}

function LeagueSquadSection<TTeam extends LeagueTeam>({ config, locale, team }: { config: LeagueSportConfig<TTeam>; locale: Locale; team: DisplayLeagueTeam }) {
  const text = labels[locale];
  const rosterGroups = buildRoster(config, team, locale);

  return (
    <section className="footballPanel teamDetailPanel" id="squad">
      <div className="sportschauSectionTitle">
        <span>{team.name}</span>
        <h2>{text.squad}</h2>
      </div>
      <div className="teamSquadGrid">
        {rosterGroups.map((group) => (
          <article className="teamSquadGroup" key={group.position}>
            <h3>{group.position}</h3>
            <div>
              {group.players.map((player) => (
                <div className="teamSquadPlayer" key={player.name}>
                  <span>{getInitials(player.name)}</span>
                  <strong>{player.name}</strong>
                  <small>{player.number}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="teamEmptyState">
        <p>{text.squadUnavailable}</p>
      </div>
    </section>
  );
}

function LeagueMetricSection<TTeam extends LeagueTeam>({
  activeTab,
  config,
  locale,
  team
}: {
  activeTab: LeagueSportTeamTab;
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  team: LeagueTeam;
}) {
  const text = labels[locale];
  const metricContent = getMetricContent(config, locale, activeTab, team);

  return (
    <section className="footballPanel teamDetailPanel teamMetricPanel">
      <div className="sportschauSectionTitle">
        <span>{team.name}</span>
        <h2>{metricContent.title}</h2>
      </div>
      <div className="teamMetricGrid">
        {metricContent.cards.map((card) => (
          <article className="teamMetricCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.detail}</small>
          </article>
        ))}
      </div>
      <p className="teamMetricNote">{text.modelSummary}: {team.prediction}</p>
    </section>
  );
}

function LeagueFixtureTeam<TTeam extends LeagueTeam>({
  align = "left",
  config,
  locale,
  logo,
  name
}: {
  align?: "left" | "right";
  config: LeagueSportConfig<TTeam>;
  locale: Locale;
  logo: string | null;
  name: string;
}) {
  const localTeam = findLocalTeam(config.teams, name);
  const mark = localTeam
    ? <LeagueTeamLogo team={{ ...localTeam, apiLogo: logo }} />
    : <SportLogo logo={logo} name={name} />;
  const content = (
    <>
      {align === "right" ? name : mark}
      {align === "right" ? mark : name}
    </>
  );

  if (localTeam) {
    return (
      <Link className={`fixtureTeam fixtureTeam-${align}`} href={getTeamHref(config, localTeam.slug, locale)}>
        {content}
      </Link>
    );
  }

  return <span className={`fixtureTeam fixtureTeam-${align}`}>{content}</span>;
}

function LeagueTeamLogo({ className = "", team }: { className?: string; team: DisplayLeagueTeam | LeagueTeam }) {
  return <img alt="" className={`apiTeamLogo ${className}`.trim()} src={(team as DisplayLeagueTeam).apiLogo ?? team.logo} />;
}

function SportLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    return <img alt="" className="apiTeamLogo" src={logo} />;
  }

  return <span className="apiTeamLogo textLogo">{getInitials(name)}</span>;
}

function buildDisplayTeams<TTeam extends LeagueTeam>(teams: TTeam[], apiTeams: SportApiTeam[]): DisplayLeagueTeam[] {
  return teams.map((team) => ({
    ...team,
    apiLogo: findApiTeam(apiTeams, team)?.logo ?? null
  }));
}

function findApiTeam(apiTeams: SportApiTeam[], team: LeagueTeam) {
  return apiTeams.find((apiTeam) => teamMatchesName(team, apiTeam.name));
}

function findLocalTeam<TTeam extends LeagueTeam>(teams: TTeam[], name: string) {
  return teams.find((team) => teamMatchesName(team, name));
}

function teamMatchesName(team: LeagueTeam, name: string) {
  const normalized = normalizeName(name);
  return [team.name, team.shortName, team.city, team.name.replace(team.city, "").trim(), getTeamNickname(team)].some((candidate) =>
    normalizeName(candidate) === normalized
  );
}

function getLeagueTabs<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, locale: Locale): Array<{ href: string; label: string; tab: LeagueSportTab }> {
  const text = labels[locale];
  const suffixes: Record<Locale, Record<LeagueSportTab, string>> = {
    en: { news: "", matches: "matches", table: "table", teams: "teams", stats: "team-stats" },
    de: { news: "", matches: "spieltag", table: "tabelle", teams: "teams", stats: "teamstatistik" }
  };

  return [
    { tab: "news", label: text.news, href: localizePath(config.basePath, locale) },
    { tab: "matches", label: text.matches, href: localizePath(`${config.basePath}/${suffixes[locale].matches}`, locale) },
    { tab: "table", label: text.table, href: localizePath(`${config.basePath}/${suffixes[locale].table}`, locale) },
    { tab: "teams", label: text.teams, href: localizePath(`${config.basePath}/${suffixes[locale].teams}`, locale) },
    { tab: "stats", label: text.stats, href: localizePath(`${config.basePath}/${suffixes[locale].stats}`, locale) }
  ];
}

function getLeagueTeamTabs<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, teamSlug: string, locale: Locale): Array<{ href: string; label: string; tab: LeagueSportTeamTab }> {
  const text = labels[locale];
  const suffixes: Record<Locale, Record<LeagueSportTeamTab, string>> = {
    en: { matches: "matches", table: "table", squad: "squad", scorers: "scorers", fairness: "fairness", running: "running", duels: "duels", info: "info" },
    de: { matches: "spieltag", table: "tabelle", squad: "kader", scorers: "topscorer", fairness: "fairness", running: "laufleistung", duels: "zweikaempfe", info: "infos" }
  };
  const base = `${config.basePath}/team/${teamSlug}`;

  return [
    { tab: "matches", label: text.matches, href: localizePath(`${base}/${suffixes[locale].matches}`, locale) },
    { tab: "table", label: text.table, href: localizePath(`${base}/${suffixes[locale].table}`, locale) },
    { tab: "squad", label: text.squad, href: localizePath(`${base}/${suffixes[locale].squad}`, locale) },
    { tab: "scorers", label: getSportScoringTabLabel(config, locale), href: localizePath(`${base}/${suffixes[locale].scorers}`, locale) },
    { tab: "fairness", label: text.fairPlay, href: localizePath(`${base}/${suffixes[locale].fairness}`, locale) },
    { tab: "running", label: getSportRunningTabLabel(config, locale), href: localizePath(`${base}/${suffixes[locale].running}`, locale) },
    { tab: "duels", label: getSportSpecificTabLabel(config, locale), href: localizePath(`${base}/${suffixes[locale].duels}`, locale) },
    { tab: "info", label: text.info, href: localizePath(`${base}/${suffixes[locale].info}`, locale) }
  ];
}

function getTeamHref<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, teamSlug: string, locale: Locale) {
  return localizePath(`${config.basePath}/team/${teamSlug}/${locale === "de" ? "infos" : "info"}`, locale);
}

function getSportSpecificTabLabel<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, locale: Locale) {
  if (config.apiSport === "nba") {
    return locale === "de" ? "Wurfprofil" : "Shot profile";
  }

  return "Defense";
}

function getSportRunningTabLabel<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, locale: Locale) {
  if (config.apiSport === "nba") {
    return locale === "de" ? "Tempo" : "Pace";
  }

  return locale === "de" ? "Run Game" : "Run game";
}

function getSportScoringTabLabel<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, locale: Locale) {
  if (config.apiSport === "nfl") {
    return locale === "de" ? "Offense" : "Offense";
  }

  return locale === "de" ? "Scoring" : "Scoring";
}

function buildStandingGroups<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, teams: DisplayLeagueTeam[]) {
  if (config.apiSport === "nfl") {
    const groupOrder = ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];

    return groupOrder
      .map((label) => ({
        label,
        teams: sortStandingTeams(teams.filter((team) => `${team.conference} ${team.division}` === label))
      }))
      .filter((group) => group.teams.length > 0);
  }

  const groupOrder = ["East", "West"];

  return groupOrder
    .map((conference) => ({
      label: `${conference} Conference`,
      teams: sortStandingTeams(teams.filter((team) => team.conference === conference))
    }))
    .filter((group) => group.teams.length > 0);
}

function sortStandingTeams(teams: DisplayLeagueTeam[]) {
  return [...teams].sort((a, b) => b.wins - a.wins || a.losses - b.losses || a.rank - b.rank || a.name.localeCompare(b.name));
}

function formatWinningPercentage(team: LeagueTeam) {
  const games = team.wins + team.losses + (team.ties ?? 0);
  const percentage = games > 0 ? (team.wins + (team.ties ?? 0) * 0.5) / games : 0;

  return percentage.toFixed(3).replace(/^0/, "");
}

function formatGamesBehind(team: LeagueTeam, teams: DisplayLeagueTeam[]) {
  const leader = teams[0];

  if (!leader || leader.slug === team.slug) {
    return "-";
  }

  const gamesBehind = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;

  if (gamesBehind <= 0) {
    return "-";
  }

  return Number.isInteger(gamesBehind) ? String(gamesBehind) : gamesBehind.toFixed(1);
}

function formatAverage(total: number, games: number) {
  return (total / games).toFixed(1);
}

function formatStreak(form: string) {
  const values = form.split(/\s+/).filter(Boolean);
  const last = values[values.length - 1] ?? "";
  let count = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== last) {
      break;
    }

    count += 1;
  }

  return last ? `${last}${count}` : "-";
}

function hydrateApiMatches<TTeam extends LeagueTeam>(matches: SportApiMatch[], teams: TTeam[]) {
  return matches.map((match) => {
    const home = findLocalTeam(teams, match.homeName);
    const away = findLocalTeam(teams, match.awayName);

    return {
      ...match,
      homeLogo: match.homeLogo ?? home?.logo ?? null,
      awayLogo: match.awayLogo ?? away?.logo ?? null
    };
  });
}

function buildRoster<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, team: LeagueTeam, locale: Locale): RosterGroup[] {
  const seededRoster = rosterSeeds[team.slug];

  if (seededRoster) {
    return seededRoster;
  }

  if (config.apiSport === "nba") {
    return [
      {
        position: locale === "de" ? "Starting Five" : "Starting five",
        players: [
          { name: locale === "de" ? "Primary Ballhandler" : "Primary ball handler", number: team.shortName },
          { name: locale === "de" ? "Scoring Wing" : "Scoring wing", number: team.shortName },
          { name: locale === "de" ? "Frontcourt Anchor" : "Frontcourt anchor", number: team.shortName }
        ]
      },
      {
        position: locale === "de" ? "Rotation" : "Rotation",
        players: [
          { name: locale === "de" ? "Bench Creator" : "Bench creator", number: team.shortName },
          { name: locale === "de" ? "Spacing Big" : "Spacing big", number: team.shortName },
          { name: locale === "de" ? "Defense Specialist" : "Defensive specialist", number: team.shortName }
        ]
      }
    ];
  }

  return [
    {
      position: "Offense",
      players: [
        { name: "Quarterback", number: team.shortName },
        { name: "Lead rusher", number: team.shortName },
        { name: "Primary receiver", number: team.shortName }
      ]
    },
    {
      position: "Defense",
      players: [
        { name: "Pass rush anchor", number: team.shortName },
        { name: "Coverage leader", number: team.shortName },
        { name: "Linebacker signal caller", number: team.shortName }
      ]
    }
  ];
}

function getMetricContent<TTeam extends LeagueTeam>(config: LeagueSportConfig<TTeam>, locale: Locale, activeTab: LeagueSportTeamTab, team: LeagueTeam): { title: string; cards: MetricCard[] } {
  const text = labels[locale];
  const pointDiff = team.pointsFor - team.pointsAgainst;
  const efficiency = Math.round((team.pointsFor / Math.max(1, team.pointsAgainst)) * 100);
  const winRate = Math.round((team.wins / Math.max(1, team.wins + team.losses + (team.ties ?? 0))) * 100);
  const averageFor = Math.round(team.pointsFor / (config.apiSport === "nba" ? 82 : 17));
  const averageAgainst = Math.round(team.pointsAgainst / (config.apiSport === "nba" ? 82 : 17));

  if (config.apiSport === "nba") {
    const nbaCards: Record<"scorers" | "fairness" | "running" | "duels", MetricCard[]> = {
      scorers: [
        { label: locale === "de" ? "Offense" : "Offense", value: `${averageFor}`, detail: locale === "de" ? "Punkte pro Spiel aus Team-Scoring" : "Points per game from team scoring" },
        { label: locale === "de" ? "Effizienz" : "Efficiency", value: `${efficiency}`, detail: locale === "de" ? "Punkteverhältnis im Saisonprofil" : "Scoring ratio in season profile" },
        { label: locale === "de" ? "Bilanz" : "Record", value: `${team.wins}-${team.losses}`, detail: `${team.conference} · ${team.division}` }
      ],
      fairness: [
        { label: locale === "de" ? "Kontrolle" : "Control", value: `${winRate}%`, detail: locale === "de" ? "Stabilität aus Bilanz und Form" : "Stability from record and form" },
        { label: locale === "de" ? "Defensivdruck" : "Defensive pressure", value: `${averageAgainst}`, detail: locale === "de" ? "Zugelassene Punkte pro Spiel" : "Allowed points per game" },
        { label: locale === "de" ? "Form" : "Form", value: team.form.replaceAll(" ", ""), detail: locale === "de" ? "Aktuelle Modellserie" : "Current model run" }
      ],
      running: [
        { label: locale === "de" ? "Tempo" : "Pace", value: `${averageFor + averageAgainst}`, detail: locale === "de" ? "Gesamtscore-Profil pro Spiel" : "Combined scoring profile per game" },
        { label: locale === "de" ? "Transition" : "Transition", value: `${Math.max(1, Math.round(pointDiff / 82))}`, detail: locale === "de" ? "Vorteil aus Punktedifferenz" : "Edge from point differential" },
        { label: locale === "de" ? "Volatilität" : "Volatility", value: team.rank <= 6 ? "Low" : "High", detail: locale === "de" ? "Ableitung aus Rang und Form" : "Derived from rank and form" }
      ],
      duels: [
        { label: locale === "de" ? "Shot Quality" : "Shot quality", value: `${efficiency}`, detail: locale === "de" ? "Offense gegen erlaubte Punkte" : "Offense versus allowed points" },
        { label: locale === "de" ? "Paint/Perimeter" : "Paint/perimeter", value: team.rank <= 6 ? "Plus" : "Neutral", detail: locale === "de" ? "Modellprofil nach Teamstärke" : "Model profile by team strength" },
        { label: locale === "de" ? "Clutch" : "Clutch", value: `${formatDiff(pointDiff)}`, detail: locale === "de" ? "Saison-Punktedifferenz" : "Season point differential" }
      ]
    };

    return {
      title: activeTab === "duels" ? getSportSpecificTabLabel(config, locale) : {
        scorers: getSportScoringTabLabel(config, locale),
        fairness: text.fairPlay,
        running: getSportRunningTabLabel(config, locale),
        duels: getSportSpecificTabLabel(config, locale)
      }[activeTab as "scorers" | "fairness" | "running" | "duels"],
      cards: nbaCards[activeTab as "scorers" | "fairness" | "running" | "duels"]
    };
  }

  const nflCards: Record<"scorers" | "fairness" | "running" | "duels", MetricCard[]> = {
    scorers: [
      { label: locale === "de" ? "Scoring" : "Scoring", value: `${averageFor}`, detail: locale === "de" ? "Punkte pro Spiel" : "Points per game" },
      { label: locale === "de" ? "Explosivität" : "Explosiveness", value: `${efficiency}`, detail: locale === "de" ? "Offense/Defense-Verhältnis" : "Offense/defense ratio" },
      { label: locale === "de" ? "Red Zone" : "Red zone", value: team.rank <= 8 ? "Plus" : "Risk", detail: locale === "de" ? "Modell aus Rang und Form" : "Model from rank and form" }
    ],
    fairness: [
      { label: locale === "de" ? "Ball Security" : "Ball security", value: `${winRate}%`, detail: locale === "de" ? "Stabilität aus Bilanz" : "Stability from record" },
      { label: locale === "de" ? "Strafen-Risiko" : "Flag risk", value: team.rank <= 8 ? "Low" : "High", detail: locale === "de" ? "Proxy aus Saisonprofil" : "Season-profile proxy" },
      { label: locale === "de" ? "Game Control" : "Game control", value: team.form.replaceAll(" ", ""), detail: locale === "de" ? "Form als Kontrollsignal" : "Form as control signal" }
    ],
    running: [
      { label: locale === "de" ? "Run Game" : "Run game", value: team.wins > team.losses ? "Plus" : "Needs lift", detail: locale === "de" ? "Ableitung aus Record und Scoring" : "Derived from record and scoring" },
      { label: locale === "de" ? "Tempo" : "Tempo", value: `${averageFor + averageAgainst}`, detail: locale === "de" ? "Gesamtpunkte-Profil" : "Combined points profile" },
      { label: locale === "de" ? "Trenches" : "Trenches", value: `${formatDiff(pointDiff)}`, detail: locale === "de" ? "Punktedifferenz als Line-Signal" : "Point differential as line signal" }
    ],
    duels: [
      { label: "Defense", value: `${averageAgainst}`, detail: locale === "de" ? "Zugelassene Punkte pro Spiel" : "Allowed points per game" },
      { label: locale === "de" ? "Pressure" : "Pressure", value: pointDiff >= 0 ? "Plus" : "Risk", detail: locale === "de" ? "Druckprofil aus Differenz" : "Pressure profile from margin" },
      { label: locale === "de" ? "Coverage" : "Coverage", value: `${efficiency}`, detail: locale === "de" ? "Scoring-Verhältnis" : "Scoring ratio" }
    ]
  };

  return {
    title: activeTab === "duels" ? getSportSpecificTabLabel(config, locale) : {
      scorers: getSportScoringTabLabel(config, locale),
      fairness: text.fairPlay,
      running: getSportRunningTabLabel(config, locale),
      duels: getSportSpecificTabLabel(config, locale)
    }[activeTab as "scorers" | "fairness" | "running" | "duels"],
    cards: nflCards[activeTab as "scorers" | "fairness" | "running" | "duels"]
  };
}

const rosterSeeds: Record<string, RosterGroup[]> = {
  "boston-celtics": [
    { position: "Starting Five", players: [{ name: "Jayson Tatum", number: "#0" }, { name: "Jaylen Brown", number: "#7" }, { name: "Derrick White", number: "#9" }, { name: "Jrue Holiday", number: "#4" }, { name: "Kristaps Porzingis", number: "#8" }] },
    { position: "Rotation", players: [{ name: "Al Horford", number: "#42" }, { name: "Payton Pritchard", number: "#11" }, { name: "Sam Hauser", number: "#30" }] }
  ],
  "los-angeles-lakers": [
    { position: "Core", players: [{ name: "LeBron James", number: "#23" }, { name: "Anthony Davis", number: "#3" }, { name: "Austin Reaves", number: "#15" }] },
    { position: "Rotation", players: [{ name: "Rui Hachimura", number: "#28" }, { name: "D'Angelo Russell", number: "#1" }, { name: "Gabe Vincent", number: "#7" }] }
  ],
  "golden-state-warriors": [
    { position: "Core", players: [{ name: "Stephen Curry", number: "#30" }, { name: "Draymond Green", number: "#23" }, { name: "Jonathan Kuminga", number: "#00" }] },
    { position: "Rotation", players: [{ name: "Brandin Podziemski", number: "#2" }, { name: "Moses Moody", number: "#4" }, { name: "Kevon Looney", number: "#5" }] }
  ],
  "denver-nuggets": [
    { position: "Core", players: [{ name: "Nikola Jokic", number: "#15" }, { name: "Jamal Murray", number: "#27" }, { name: "Aaron Gordon", number: "#50" }] },
    { position: "Rotation", players: [{ name: "Michael Porter Jr.", number: "#1" }, { name: "Kentavious Caldwell-Pope", number: "#5" }, { name: "Christian Braun", number: "#0" }] }
  ],
  "dallas-mavericks": [
    { position: "Core", players: [{ name: "Luka Doncic", number: "#77" }, { name: "Kyrie Irving", number: "#11" }, { name: "P. J. Washington", number: "#25" }] },
    { position: "Rotation", players: [{ name: "Daniel Gafford", number: "#21" }, { name: "Dereck Lively II", number: "#2" }, { name: "Josh Green", number: "#8" }] }
  ],
  "milwaukee-bucks": [
    { position: "Core", players: [{ name: "Giannis Antetokounmpo", number: "#34" }, { name: "Damian Lillard", number: "#0" }, { name: "Khris Middleton", number: "#22" }] },
    { position: "Rotation", players: [{ name: "Brook Lopez", number: "#11" }, { name: "Bobby Portis", number: "#9" }, { name: "Pat Connaughton", number: "#24" }] }
  ],
  "kansas-city-chiefs": [
    { position: "Offense", players: [{ name: "Patrick Mahomes", number: "#15" }, { name: "Travis Kelce", number: "#87" }, { name: "Isiah Pacheco", number: "#10" }] },
    { position: "Defense", players: [{ name: "Chris Jones", number: "#95" }, { name: "Trent McDuffie", number: "#22" }, { name: "Nick Bolton", number: "#32" }] }
  ],
  "buffalo-bills": [
    { position: "Offense", players: [{ name: "Josh Allen", number: "#17" }, { name: "James Cook", number: "#4" }, { name: "Khalil Shakir", number: "#10" }] },
    { position: "Defense", players: [{ name: "Matt Milano", number: "#58" }, { name: "Taron Johnson", number: "#7" }, { name: "Greg Rousseau", number: "#50" }] }
  ],
  "baltimore-ravens": [
    { position: "Offense", players: [{ name: "Lamar Jackson", number: "#8" }, { name: "Derrick Henry", number: "#22" }, { name: "Mark Andrews", number: "#89" }] },
    { position: "Defense", players: [{ name: "Roquan Smith", number: "#0" }, { name: "Kyle Hamilton", number: "#14" }, { name: "Marlon Humphrey", number: "#44" }] }
  ],
  "philadelphia-eagles": [
    { position: "Offense", players: [{ name: "Jalen Hurts", number: "#1" }, { name: "Saquon Barkley", number: "#26" }, { name: "A. J. Brown", number: "#11" }] },
    { position: "Defense", players: [{ name: "Jalen Carter", number: "#98" }, { name: "Darius Slay", number: "#2" }, { name: "Zack Baun", number: "#53" }] }
  ],
  "detroit-lions": [
    { position: "Offense", players: [{ name: "Jared Goff", number: "#16" }, { name: "Amon-Ra St. Brown", number: "#14" }, { name: "Jahmyr Gibbs", number: "#26" }] },
    { position: "Defense", players: [{ name: "Aidan Hutchinson", number: "#97" }, { name: "Brian Branch", number: "#32" }, { name: "Jack Campbell", number: "#46" }] }
  ]
};

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

function formatMatchDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === "de" ? "Termin offen" : "Date pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getUpcomingLeagueMatches(matches: SportApiMatch[]) {
  const now = Date.now();
  const live = matches
    .filter((match) => {
      const timestamp = getLeagueMatchTimestamp(match);
      return timestamp !== null &&
        timestamp < now &&
        (isLiveLeagueMatch(match) || isScheduledTodayLeagueMatch(match)) &&
        !isFinishedLeagueMatch(match);
    })
    .sort((a, b) => (getLeagueMatchTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (getLeagueMatchTimestamp(b) ?? Number.MAX_SAFE_INTEGER));
  const scheduled = matches
    .filter((match) => {
      const timestamp = getLeagueMatchTimestamp(match);
      return timestamp !== null && timestamp >= now && !isFinishedLeagueMatch(match);
    })
    .sort((a, b) => (getLeagueMatchTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (getLeagueMatchTimestamp(b) ?? Number.MAX_SAFE_INTEGER));

  return [...live, ...scheduled];
}

function getLeagueMatchTimestamp(match: SportApiMatch) {
  if (!match.date) {
    return null;
  }

  const timestamp = new Date(match.date).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isFinishedLeagueMatch(match: SportApiMatch) {
  const status = (match.status ?? "").toLowerCase();

  if (status.includes("aot") || status.includes("ft") || status.includes("final") || status.includes("finished")) {
    return true;
  }

  return Boolean(match.homeScore !== null && match.awayScore !== null) &&
    !isLiveLeagueMatch(match) &&
    !isScheduledTodayLeagueMatch(match);
}

function isLiveLeagueMatch(match: SportApiMatch) {
  const status = (match.status ?? "").toLowerCase();
  return status.includes("live") ||
    status.includes("in play") ||
    status.includes("quarter") ||
    status.includes("half") ||
    status.includes("period") ||
    status === "ot" ||
    status.includes(" overtime") ||
    status.includes("q1") ||
    status.includes("q2") ||
    status.includes("q3") ||
    status.includes("q4");
}

function isScheduledTodayLeagueMatch(match: SportApiMatch) {
  const status = (match.status ?? "").toLowerCase();

  if (!status.includes("ns") && !status.includes("scheduled") && !status.includes("not started")) {
    return false;
  }

  if (!match.date) {
    return false;
  }

  const matchDate = new Date(match.date);
  const now = new Date();

  return Number.isFinite(matchDate.getTime()) &&
    matchDate.getUTCFullYear() === now.getUTCFullYear() &&
    matchDate.getUTCMonth() === now.getUTCMonth() &&
    matchDate.getUTCDate() === now.getUTCDate();
}

function formatCompactOddsSource(odds: SportApiMatch["odds"], locale: Locale, bookmakersLabel: string) {
  if (!odds) {
    return "";
  }

  return odds.provider === "The Odds API"
    ? `${odds.bookmakerCount} ${bookmakersLabel}`
    : locale === "de" ? "Modell" : "model";
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

function formatDecimalOdds(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatDiff(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function getTeamNickname(team: LeagueTeam) {
  if (team.nickname) {
    return team.nickname;
  }

  const parts = team.name.split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : team.name;
}

function getColorNames(colors: [string, string]) {
  return colors.map((color) => colorNames[color.toLowerCase()] ?? color).join(" / ");
}

const colorNames: Record<string, string> = {
  "#000000": "schwarz",
  "#ffffff": "weiß",
  "#e31837": "rot",
  "#ffb81c": "gold",
  "#00338d": "blau",
  "#c60c30": "rot",
  "#241773": "violett",
  "#9e7c0c": "gold",
  "#03202f": "dunkelblau",
  "#a71930": "rot",
  "#0080c6": "hellblau",
  "#ffc20e": "gold",
  "#ffb612": "gold",
  "#101820": "schwarz",
  "#fb4f14": "orange",
  "#002244": "marineblau",
  "#008e97": "türkis",
  "#fc4c02": "orange",
  "#002c5f": "blau",
  "#a2aaad": "silber",
  "#125740": "grün",
  "#006778": "türkis",
  "#d7a22a": "gold",
  "#a5acaf": "silber",
  "#311d00": "braun",
  "#ff3c00": "orange",
  "#0c2340": "marineblau",
  "#4b92db": "hellblau",
  "#0076b6": "blau",
  "#b0b7bc": "silber",
  "#004c54": "grün",
  "#d50a0a": "rot",
  "#34302b": "zinn",
  "#003594": "blau",
  "#ffd100": "gold",
  "#4f2683": "violett",
  "#ffc62f": "gold",
  "#5a1414": "weinrot",
  "#203731": "grün",
  "#69be28": "grün",
  "#97233f": "weinrot",
  "#869397": "silber",
  "#aa0000": "rot",
  "#b3995d": "gold",
  "#0b162a": "marineblau",
  "#c83803": "orange",
  "#0085ca": "blau",
  "#d3bc8d": "gold",
  "#0b2265": "blau",
  "#007a33": "grün",
  "#ba9653": "gold",
  "#006bb6": "blau",
  "#f58426": "orange",
  "#ed174c": "rot",
  "#ce1141": "rot",
  "#00471b": "grün",
  "#eee1c6": "creme",
  "#860038": "weinrot",
  "#041e42": "marineblau",
  "#002d62": "blau",
  "#fdbb30": "gold",
  "#0077c0": "blau",
  "#c4ced4": "silber",
  "#1d1160": "violett",
  "#0e2240": "marineblau",
  "#fec524": "gold",
  "#236192": "blau",
  "#007ac1": "blau",
  "#ef3b24": "orange",
  "#e03a3e": "rot",
  "#552583": "violett",
  "#fdb927": "gold",
  "#1d428a": "blau",
  "#ffc72c": "gold",
  "#c8102e": "rot",
  "#e56020": "orange",
  "#5a2d81": "violett",
  "#63727a": "grau",
  "#00538c": "blau",
  "#002b5e": "marineblau"
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}
