import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  footballCompetitions,
  getCompetition,
  getTeam,
  type FootballCompetition,
  type FootballTeam
} from "@/lib/football-data";
import { localizePath, type Locale } from "@/lib/i18n";
import {
  fallbackTeamsToStandings,
  getFootballCompetitionApiSnapshot,
  type SportApiMatch,
  type SportApiStanding,
  type SportApiTeam
} from "@/lib/sports-api-data";

const labels = {
  en: {
    football: "Football",
    overview: "Competition overview",
    intro: "Choose a league or national cup. Each competition opens its own prediction hub with teams, news, fixtures, table and model signals.",
    leagues: "Leagues",
    cups: "Cups",
    open: "Open",
    predictionHub: "Prediction hub",
    news: "News",
    matchday: "Matchday",
    teamMatches: "Matches",
    table: "Table",
    scorers: "Scorers",
    teamStats: "Team stats",
    teams: "Teams",
    overviewTab: "Overview",
    results: "Results",
    rounds: "Rounds",
    cupPath: "Cup path",
    fixturesAndResults: "Fixtures & results",
    teamFixtures: "Matches",
    standings: "Standings",
    rank: "#",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    goals: "Goals",
    difference: "Diff",
    allCompetitions: "All competitions",
    latestSignals: "Latest signals",
    fixtures: "Upcoming matchday",
    showAll: "Show all",
    points: "Pts",
    form: "Form",
    prediction: "AI signal",
    teamProfile: "Team profile",
    league: "Competition",
    city: "City",
    modelSummary: "Model summary",
    teamNews: "Team news",
    backToCompetition: "Back to competition",
    liveData: "Live data",
    apiReady: "API ready",
    source: "Source",
    featuredCompetitions: "Leagues and cups",
    noTableForCup: "Cup competitions do not use a league table. Follow the knockout path and fixtures instead.",
    participatingTeams: "Participating teams",
    formGuide: "Form guide",
    matchCenter: "Match center",
    competitionFacts: "Competition facts"
  },
  de: {
    football: "Fußball",
    overview: "Wettbewerbsübersicht",
    intro: "Wähle eine Liga oder einen nationalen Pokal. Jeder Wettbewerb öffnet seinen eigenen Prediction Hub mit Teams, News, Spieltag, Tabelle und Modell-Signalen.",
    leagues: "Ligen",
    cups: "Pokale",
    open: "Öffnen",
    predictionHub: "Prediction Hub",
    news: "News",
    matchday: "Spieltag",
    teamMatches: "Spiele",
    table: "Tabelle",
    scorers: "Torschützen",
    teamStats: "Teamstatistik",
    teams: "Teams",
    overviewTab: "Übersicht",
    results: "Ergebnisse",
    rounds: "Runden",
    cupPath: "Pokalpfad",
    fixturesAndResults: "Spiele & Ergebnisse",
    teamFixtures: "Spiele",
    standings: "Tabelle",
    rank: "#",
    played: "Sp.",
    won: "S",
    drawn: "U",
    lost: "N",
    goals: "Tore",
    difference: "Diff.",
    allCompetitions: "Alle Wettbewerbe",
    latestSignals: "Aktuelle Signale",
    fixtures: "Nächster Spieltag",
    showAll: "Alle anzeigen",
    points: "Pkt",
    form: "Form",
    prediction: "KI-Signal",
    teamProfile: "Teamprofil",
    league: "Wettbewerb",
    city: "Stadt",
    modelSummary: "Modell-Zusammenfassung",
    teamNews: "Team-News",
    backToCompetition: "Zurück zum Wettbewerb",
    liveData: "Live-Daten",
    apiReady: "API bereit",
    source: "Quelle",
    featuredCompetitions: "Ligen und Pokale",
    noTableForCup: "Pokalwettbewerbe haben keine Ligatabelle. Hier zählt der K.-o.-Pfad mit Spielen und Runden.",
    participatingTeams: "Teilnehmende Teams",
    formGuide: "Formkurve",
    matchCenter: "Matchcenter",
    competitionFacts: "Wettbewerbsdaten"
  }
} as const;

export function TeamCrest({ team, size = "md" }: { team: FootballTeam; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-label={`${team.name} logo`}
      className={`teamCrest teamCrest-${size}`}
      style={{ "--crest-a": team.colors[0], "--crest-b": team.colors[1] } as CSSProperties}
      title={team.name}
    >
      {team.shortName}
    </span>
  );
}

type DisplayTeam = {
  key: string;
  name: string;
  logo: string | null;
  localTeam?: FootballTeam;
};

export type CompetitionTab = "news" | "matchday" | "table" | "rounds" | "teams" | "stats";
export type TeamTab = "overview" | "matches" | "news" | "stats";

const teamNameAliases: Record<string, string[]> = {
  "fc-bayern": ["Bayern München", "Bayern Munich", "FC Bayern München"],
  "borussia-dortmund": ["Dortmund"],
  "borussia-moenchengladbach": ["Borussia Mönchengladbach", "Borussia Monchengladbach", "Borussia MG"],
  "mainz-05": ["FSV Mainz 05", "1. FSV Mainz 05"],
  "fc-augsburg": ["Augsburg"],
  "werder-bremen": ["SV Werder Bremen"],
  "vfb-stuttgart": ["VfB Stuttgart"],
  "bayer-leverkusen": ["Bayer 04 Leverkusen"],
  "eintracht-frankfurt": ["Eintracht Frankfurt"],
  "sc-freiburg": ["SC Freiburg"],
  "rb-leipzig": ["RB Leipzig"],
  "manchester-city": ["Manchester City"],
  "arsenal": ["Arsenal"],
  "liverpool": ["Liverpool"],
  "chelsea": ["Chelsea"],
  "tottenham": ["Tottenham Hotspur", "Spurs"],
  "manchester-united": ["Manchester United", "Man United", "Manchester Utd"],
  "newcastle-united": ["Newcastle", "Newcastle United"],
  "aston-villa": ["Aston Villa"],
  "real-madrid": ["Real Madrid"],
  "barcelona": ["Barcelona", "FC Barcelona"],
  "atletico-madrid": ["Atletico Madrid", "Atlético Madrid", "Atletico"],
  "real-sociedad": ["Real Sociedad"],
  "athletic-bilbao": ["Athletic Club", "Athletic Bilbao"],
  "villarreal": ["Villarreal"],
  "psg": ["Paris Saint Germain", "Paris Saint-Germain", "PSG"],
  "marseille": ["Olympique Marseille", "Marseille"],
  "monaco": ["AS Monaco", "Monaco"],
  "lyon": ["Olympique Lyonnais", "Lyon"],
  "lille": ["Lille", "LOSC Lille"],
  "nice": ["Nice", "OGC Nice"],
  "inter": ["Inter", "Inter Milan", "Internazionale"],
  "juventus": ["Juventus"],
  "ac-milan": ["AC Milan", "Milan"],
  "napoli": ["Napoli", "Naples"],
  "roma": ["AS Roma", "Roma"],
  "lazio": ["Lazio"]
};

const competitionLogos: Record<string, string> = {
  "bundesliga": "https://media.api-sports.io/football/leagues/78.png",
  "dfb-pokal": "https://media.api-sports.io/football/leagues/81.png",
  "premier-league": "https://media.api-sports.io/football/leagues/39.png",
  "fa-cup": "https://media.api-sports.io/football/leagues/45.png",
  "la-liga": "https://media.api-sports.io/football/leagues/140.png",
  "copa-del-rey": "https://media.api-sports.io/football/leagues/143.png",
  "ligue-1": "https://media.api-sports.io/football/leagues/61.png",
  "coupe-de-france": "https://media.api-sports.io/football/leagues/66.png",
  "serie-a": "https://media.api-sports.io/football/leagues/135.png",
  "coppa-italia": "https://media.api-sports.io/football/leagues/137.png"
};

const knownTeamLogos: Record<string, string> = {
  "fc-bayern": "https://media.api-sports.io/football/teams/157.png",
  "borussia-dortmund": "https://media.api-sports.io/football/teams/165.png",
  "rb-leipzig": "https://media.api-sports.io/football/teams/173.png",
  "bayer-leverkusen": "https://media.api-sports.io/football/teams/168.png",
  "eintracht-frankfurt": "https://media.api-sports.io/football/teams/169.png",
  "vfb-stuttgart": "https://media.api-sports.io/football/teams/172.png",
  "borussia-moenchengladbach": "https://media.api-sports.io/football/teams/163.png",
  "sc-freiburg": "https://media.api-sports.io/football/teams/160.png",
  "werder-bremen": "https://media.api-sports.io/football/teams/162.png",
  "hamburger-sv": "https://media.api-sports.io/football/teams/175.png",
  "fc-augsburg": "https://media.api-sports.io/football/teams/170.png",
  "mainz-05": "https://media.api-sports.io/football/teams/164.png",
  "manchester-city": "https://media.api-sports.io/football/teams/50.png",
  "arsenal": "https://media.api-sports.io/football/teams/42.png",
  "liverpool": "https://media.api-sports.io/football/teams/40.png",
  "chelsea": "https://media.api-sports.io/football/teams/49.png",
  "tottenham": "https://media.api-sports.io/football/teams/47.png",
  "manchester-united": "https://media.api-sports.io/football/teams/33.png",
  "newcastle-united": "https://media.api-sports.io/football/teams/34.png",
  "aston-villa": "https://media.api-sports.io/football/teams/66.png",
  "real-madrid": "https://media.api-sports.io/football/teams/541.png",
  "barcelona": "https://media.api-sports.io/football/teams/529.png",
  "atletico-madrid": "https://media.api-sports.io/football/teams/530.png",
  "real-sociedad": "https://media.api-sports.io/football/teams/548.png",
  "athletic-bilbao": "https://media.api-sports.io/football/teams/531.png",
  "villarreal": "https://media.api-sports.io/football/teams/533.png",
  "psg": "https://media.api-sports.io/football/teams/85.png",
  "marseille": "https://media.api-sports.io/football/teams/81.png",
  "monaco": "https://media.api-sports.io/football/teams/91.png",
  "lyon": "https://media.api-sports.io/football/teams/80.png",
  "lille": "https://media.api-sports.io/football/teams/79.png",
  "nice": "https://media.api-sports.io/football/teams/84.png",
  "inter": "https://media.api-sports.io/football/teams/505.png",
  "juventus": "https://media.api-sports.io/football/teams/496.png",
  "ac-milan": "https://media.api-sports.io/football/teams/489.png",
  "napoli": "https://media.api-sports.io/football/teams/492.png",
  "roma": "https://media.api-sports.io/football/teams/497.png",
  "lazio": "https://media.api-sports.io/football/teams/487.png"
};

export function FootballOverviewPage({ locale }: { locale: Locale }) {
  const text = labels[locale];
  const leagues = footballCompetitions.filter((competition) => competition.type === "league");
  const cups = footballCompetitions.filter((competition) => competition.type === "cup");

  return (
    <main className="shell footballShell">
      <section className="footballHero">
        <p className="footballEyebrow">{text.football}</p>
        <h1>{text.overview}</h1>
        <p>{text.intro}</p>
      </section>

      <section className="footballOverviewBands" aria-label={text.overview}>
        <CompetitionBand competitions={leagues} title={text.leagues} locale={locale} />
        <CompetitionBand competitions={cups} title={text.cups} locale={locale} />
      </section>
    </main>
  );
}

function CompetitionBand({ competitions, title, locale }: { competitions: FootballCompetition[]; title: string; locale: Locale }) {
  const text = labels[locale];

  return (
    <section className="competitionBand">
      <div className="competitionBandHeader">
        <h2>{title}</h2>
      </div>
      <div className="competitionBandGrid">
      {competitions.map((competition) => (
        <Link className="competitionTile" href={localizePath(`/football/${competition.slug}`, locale)} key={competition.slug}>
          <div className="competitionTileTop">
            <CompetitionLogo competition={competition} />
            <span>{competition.countryCode}</span>
          </div>
          <strong>{competition.name}</strong>
          <small>{competition.description}</small>
          <em>{text.open}</em>
        </Link>
      ))}
      </div>
    </section>
  );
}

function CompetitionLogo({ competition }: { competition: FootballCompetition }) {
  const logo = competitionLogos[competition.slug];

  if (logo) {
    return <img alt="" className="competitionLogo" src={logo} />;
  }

  return <span className="competitionLogo competitionLogoFallback">{competition.countryCode}</span>;
}

export async function FootballCompetitionPage({
  competitionSlug,
  locale,
  tab = "news"
}: {
  competitionSlug: string;
  locale: Locale;
  tab?: CompetitionTab;
}) {
  const competition = getCompetition(competitionSlug);
  const text = labels[locale];

  if (!competition) {
    notFound();
  }

  const apiSnapshot = await getFootballCompetitionApiSnapshot(competition);
  const fixtures = apiSnapshot.matches.length > 0 ? apiSnapshot.matches : buildFixtures(competition.teams);
  const standings = apiSnapshot.standings.length > 0 ? apiSnapshot.standings : fallbackTeamsToStandings(competition.teams);
  const displayTeams = buildDisplayTeams(competition, apiSnapshot.teams, standings, fixtures);
  const isLeague = competition.type === "league";
  const activeTab = normalizeCompetitionTab(tab, isLeague);
  const tabItems = [
    { href: getCompetitionTabHref(competition.slug, locale, "news"), label: text.news, tab: "news" as const },
    { href: getCompetitionTabHref(competition.slug, locale, "matchday"), label: text.matchday, tab: "matchday" as const },
    {
      href: getCompetitionTabHref(competition.slug, locale, isLeague ? "table" : "rounds"),
      label: isLeague ? text.table : text.rounds,
      tab: isLeague ? "table" as const : "rounds" as const
    },
    { href: getCompetitionTabHref(competition.slug, locale, "teams"), label: text.teams, tab: "teams" as const },
    { href: getCompetitionTabHref(competition.slug, locale, "stats"), label: text.teamStats, tab: "stats" as const }
  ];

  return (
    <main className="footballDetailShell sportschauFootballPage">
      <section className="competitionHero sportschauCompetitionHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{text.football}</p>
          <h1>{competition.name}</h1>
          <p>{competition.description}</p>
        </div>
        <FeaturedFixtureCard competition={competition} fixture={fixtures[0]} locale={locale} />
        <Link className="footballBackLink" href={localizePath("/football", locale)}>
          {text.allCompetitions}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={text.predictionHub}>
        {tabItems.map((item) => (
          <Link className={activeTab === item.tab ? "isActive" : ""} href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="teamLogoRail sportschauTeamLogoRail" aria-label={text.teams} id="teams">
        {displayTeams.map((team) => (
          <TeamLogoRailItem competition={competition} displayTeam={team} key={team.key} locale={locale} />
        ))}
      </section>

      <div className="sportschauPageGrid">
        <div className="sportschauMainColumn">
          {activeTab === "matchday" ? (
            <MatchdaySection apiSnapshot={apiSnapshot} competition={competition} fixtures={fixtures} locale={locale} />
          ) : null}

          {activeTab === "news" ? (
            <CompetitionNewsSection competition={competition} locale={locale} />
          ) : null}

          {activeTab === "table" && isLeague ? (
            <LeagueTableSection competition={competition} locale={locale} standings={standings} />
          ) : null}

          {activeTab === "rounds" && !isLeague ? (
            <CupRoundsSection competition={competition} fixtures={fixtures} locale={locale} />
          ) : null}

          {activeTab === "teams" ? (
            <TeamsDirectorySection competition={competition} displayTeams={displayTeams} locale={locale} />
          ) : null}

          {activeTab === "stats" ? (
            <CompetitionStatsSection apiSnapshot={apiSnapshot} competition={competition} displayTeams={displayTeams} locale={locale} />
          ) : null}
        </div>

        {activeTab !== "teams" && activeTab !== "stats" ? (
          <aside className="sportschauSideColumn" id="stats">
            <CompetitionStatsSection apiSnapshot={apiSnapshot} competition={competition} displayTeams={displayTeams} locale={locale} compact />
            <TeamsCompactList competition={competition} displayTeams={displayTeams} locale={locale} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

export async function FootballTeamPage({
  fromCompetitionSlug,
  locale,
  teamSlug,
  tab = "overview"
}: {
  fromCompetitionSlug?: string;
  locale: Locale;
  teamSlug: string;
  tab?: TeamTab;
}) {
  const competition = getPrimaryCompetitionForTeam(teamSlug);
  const team = competition ? getTeam(competition.slug, teamSlug) : undefined;
  const backCompetition = fromCompetitionSlug ? getCompetition(fromCompetitionSlug) ?? competition : competition;
  const text = labels[locale];

  if (!competition || !team) {
    notFound();
  }

  const activeTab = tab;
  const apiSnapshot = await getFootballCompetitionApiSnapshot(competition);
  const fixtures = apiSnapshot.matches.length > 0 ? apiSnapshot.matches : buildFixtures(competition.teams);
  const standings = apiSnapshot.standings.length > 0 ? apiSnapshot.standings : fallbackTeamsToStandings(competition.teams);
  const displayTeams = buildDisplayTeams(competition, apiSnapshot.teams, standings, fixtures);
  const apiTeam = findDisplayTeamByLocalTeam(displayTeams, team);
  const apiStanding = findStandingByLocalTeam(standings, team);
  const teamFixtures = getTeamFixtures(fixtures, competition.teams, team, apiTeam?.name).slice(0, 4);
  const rank = apiStanding?.rank ?? team.rank;
  const points = apiStanding?.points ?? team.points;
  const form = apiStanding?.form ?? team.form;
  const teamTabs = [
    { href: getTeamTabHref(team.slug, locale, "overview", backCompetition?.slug), label: text.overviewTab, tab: "overview" as const },
    { href: getTeamTabHref(team.slug, locale, "matches", backCompetition?.slug), label: text.teamMatches, tab: "matches" as const },
    { href: getTeamTabHref(team.slug, locale, "news", backCompetition?.slug), label: text.news, tab: "news" as const },
    { href: getTeamTabHref(team.slug, locale, "stats", backCompetition?.slug), label: text.teamStats, tab: "stats" as const }
  ];

  return (
    <main className="footballDetailShell sportschauFootballPage">
      <section className="teamHero sportschauTeamHero">
        <TeamProfileLogo logo={apiTeam?.logo ?? null} team={team} />
        <div>
          <p className="footballEyebrow">{text.teamProfile}</p>
          <h1>{team.name}</h1>
          <p>{team.prediction} in {competition.name}. Form: {form}.</p>
        </div>
        <Link className="footballBackLink" href={localizePath(`/football/${backCompetition?.slug ?? competition.slug}`, locale)}>
          {text.backToCompetition}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={text.teamProfile}>
        {teamTabs.map((item) => (
          <Link className={activeTab === item.tab ? "isActive" : ""} href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      {activeTab === "overview" || activeTab === "stats" ? (
        <section className="teamProfileGrid sportschauTeamProfileGrid" id="overview">
          <TeamStatsCard competition={competition} form={form} points={points} rank={rank} team={team} locale={locale} />
          {activeTab === "overview" ? <TeamNewsCard competition={competition} form={form} team={team} locale={locale} /> : null}
        </section>
      ) : null}

      {activeTab === "news" ? (
        <section className="teamProfileGrid sportschauTeamProfileGrid" id="news">
          <TeamNewsCard competition={competition} form={form} team={team} locale={locale} />
          <TeamsCompactList competition={competition} displayTeams={displayTeams} locale={locale} />
        </section>
      ) : null}

      {activeTab === "matches" ? (
        <section className="footballPanel fixturePanel sportschauMatchPanel" id="matches">
        <div className="footballPanelHeader">
          <div>
            <p>{text.teamFixtures}</p>
            <span className="dataProviderNote">{competition.name}</span>
          </div>
          <strong>{team.shortName}</strong>
        </div>
        <div className="fixtureGrid sportschauFixtureList">
          {teamFixtures.map((fixture) => (
            <article className="fixtureRow" key={fixture.id}>
              <FixtureTeam competition={competition} locale={locale} logo={fixture.homeLogo} name={fixture.homeName} align="right" />
              <div className="fixtureTime">
                <span>{formatFixtureDate(fixture.date, locale)}</span>
                <strong>{formatFixtureCenter(fixture, locale)}</strong>
                <small>{fixture.competition || competition.name}</small>
              </div>
              <FixtureTeam competition={competition} locale={locale} logo={fixture.awayLogo} name={fixture.awayName} align="left" />
            </article>
          ))}
        </div>
      </section>
      ) : null}
    </main>
  );
}

function FeaturedFixtureCard({
  competition,
  fixture,
  locale
}: {
  competition: FootballCompetition;
  fixture?: SportApiMatch;
  locale: Locale;
}) {
  const text = labels[locale];

  if (!fixture) {
    return (
      <article className="featuredFixtureCard">
        <span>{text.matchCenter}</span>
        <strong>{competition.name}</strong>
        <small>{text.fixtures}</small>
      </article>
    );
  }

  return (
    <article className="featuredFixtureCard">
      <span>{text.matchCenter}</span>
      <div className="featuredFixtureTeams">
        <TeamMark logo={fixture.homeLogo} name={fixture.homeName} team={findCompetitionTeamByName(competition, fixture.homeName)} />
        <strong>{formatFixtureCenter(fixture, locale)}</strong>
        <TeamMark logo={fixture.awayLogo} name={fixture.awayName} team={findCompetitionTeamByName(competition, fixture.awayName)} />
      </div>
      <small>{fixture.homeName} - {fixture.awayName}</small>
    </article>
  );
}

function TeamProfileLogo({ logo, team }: { logo: string | null; team: FootballTeam }) {
  const resolvedLogo = logo ?? getKnownTeamLogo(team);

  if (resolvedLogo) {
    return <img alt="" className="apiTeamLogo teamHeroLogo" src={resolvedLogo} />;
  }

  return <TeamCrest team={team} size="lg" />;
}

function MatchdaySection({
  apiSnapshot,
  competition,
  fixtures,
  locale
}: {
  apiSnapshot: { status: string; message: string };
  competition: FootballCompetition;
  fixtures: SportApiMatch[];
  locale: Locale;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel" id="matchday">
      <div className="footballPanelHeader">
        <div>
          <p>{text.fixturesAndResults}</p>
          <span className="dataProviderNote">{text.source}: {apiSnapshot.status === "live" ? "API-Football" : text.apiReady}</span>
        </div>
        <strong>{competition.name}</strong>
      </div>
      <div className="fixtureGrid sportschauFixtureList">
        {fixtures.map((fixture) => (
          <article className="fixtureRow" key={fixture.id}>
            <FixtureTeam competition={competition} locale={locale} logo={fixture.homeLogo} name={fixture.homeName} align="right" />
            <div className="fixtureTime">
              <span>{formatFixtureDate(fixture.date, locale)}</span>
              <strong>{formatFixtureCenter(fixture, locale)}</strong>
            </div>
            <FixtureTeam competition={competition} locale={locale} logo={fixture.awayLogo} name={fixture.awayName} align="left" />
          </article>
        ))}
      </div>
      <p className="apiPanelMessage">{apiSnapshot.message}</p>
    </section>
  );
}

function CompetitionNewsSection({ competition, locale }: { competition: FootballCompetition; locale: Locale }) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauNewsPanel" id="news">
      <div className="sportschauSectionTitle">
        <span>{text.latestSignals}</span>
        <h2>{competition.name}-News</h2>
      </div>
      <div className="footballNewsGrid sportschauNewsGrid">
        {[
          `${competition.name}: model confidence moves after latest form update`,
          `${competition.country} cup and league paths now share team strength ratings`,
          `AI watchlist: three teams with rising upset probability`
        ].map((headline, index) => (
          <article className={index === 0 ? "footballNewsCard sportschauLeadNews" : "footballNewsCard"} key={headline}>
            <span>{text.latestSignals}</span>
            <h3>{headline}</h3>
            <p>{competition.modelFocus}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CompetitionStatsSection({
  apiSnapshot,
  compact = false,
  competition,
  displayTeams,
  locale
}: {
  apiSnapshot: { status: string };
  compact?: boolean;
  competition: FootballCompetition;
  displayTeams: DisplayTeam[];
  locale: Locale;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauInfoPanel">
      <p className="footballEyebrow">{text.competitionFacts}</p>
      <h2>{competition.name}</h2>
      <div className="teamStatList">
        <div><span>{text.league}</span><strong>{competition.type === "league" ? text.leagues : text.cups}</strong></div>
        <div><span>{text.teams}</span><strong>{displayTeams.length}</strong></div>
        <div><span>{text.source}</span><strong>{apiSnapshot.status === "live" ? "API-Football" : text.apiReady}</strong></div>
        <div><span>{text.modelSummary}</span><strong>{competition.modelFocus}</strong></div>
        {!compact ? <div><span>{text.prediction}</span><strong>{competition.type === "league" ? text.standings : text.cupPath}</strong></div> : null}
      </div>
    </section>
  );
}

function TeamsDirectorySection({
  competition,
  displayTeams,
  locale
}: {
  competition: FootballCompetition;
  displayTeams: DisplayTeam[];
  locale: Locale;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <div className="sportschauSectionTitle">
        <span>{competition.name}</span>
        <h2>{text.teams}</h2>
      </div>
      <div className="compactTeamList teamsDirectoryList">
        {displayTeams.map((team) => (
          <CompactTeamItem competition={competition} displayTeam={team} key={team.key} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function TeamStatsCard({
  competition,
  form,
  locale,
  points,
  rank,
  team
}: {
  competition: FootballCompetition;
  form: string | null;
  locale: Locale;
  points: number | null;
  rank: number;
  team: FootballTeam;
}) {
  const text = labels[locale];

  return (
    <article className="footballPanel sportschauInfoPanel" id="stats">
      <p className="footballEyebrow">{text.modelSummary}</p>
      <h2>{team.prediction}</h2>
      <div className="teamStatList">
        <div><span>{text.league}</span><strong>{competition.name}</strong></div>
        <div><span>{text.city}</span><strong>{team.city}</strong></div>
        <div><span>{competition.type === "league" ? text.table : text.cupPath}</span><strong>{competition.type === "league" ? `#${rank}` : text.rounds}</strong></div>
        <div><span>{text.points}</span><strong>{competition.type === "league" ? points : "-"}</strong></div>
        <div><span>{text.form}</span><strong>{form}</strong></div>
      </div>
    </article>
  );
}

function TeamNewsCard({
  competition,
  form,
  locale,
  team
}: {
  competition: FootballCompetition;
  form: string | null;
  locale: Locale;
  team: FootballTeam;
}) {
  const text = labels[locale];

  return (
    <article className="footballPanel sportschauNewsPanel" id="news">
      <div className="sportschauSectionTitle">
        <span>{text.teamNews}</span>
        <h2>{team.name}</h2>
      </div>
      <div className="footballNewsGrid compact">
        {[
          `${team.name}: latest model input raises ${team.prediction.toLowerCase()} signal`,
          `${team.shortName} fixture pressure updated after schedule scan`,
          `Prediction profile: ${team.city} side shows ${form} trend`
        ].map((headline) => (
          <article className="footballNewsCard" key={headline}>
            <span>{competition.name}</span>
            <h3>{headline}</h3>
          </article>
        ))}
      </div>
    </article>
  );
}

function LeagueTableSection({
  competition,
  locale,
  standings
}: {
  competition: FootballCompetition;
  locale: Locale;
  standings: SportApiStanding[];
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTablePanel" id="table">
      <div className="sportschauSectionTitle">
        <span>{competition.name}</span>
        <h2>{text.standings}</h2>
      </div>
      <div className="leagueTable sportschauLeagueTable">
        <div className="leagueTableRow leagueTableHeader" aria-hidden="true">
          <span>{text.rank}</span>
          <span />
          <strong>{text.teams}</strong>
          <small>{text.played}</small>
          <small>{text.won}</small>
          <small>{text.drawn}</small>
          <small>{text.lost}</small>
          <small>{text.goals}</small>
          <small>{text.difference}</small>
          <em>{text.points}</em>
        </div>
        {standings.map((team) => (
          <StandingRow competition={competition} key={`${team.rank}-${team.teamName}`} locale={locale} standing={team} />
        ))}
      </div>
    </section>
  );
}

function CupRoundsSection({
  competition,
  fixtures,
  locale
}: {
  competition: FootballCompetition;
  fixtures: SportApiMatch[];
  locale: Locale;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauCupPanel" id="rounds">
      <div className="sportschauSectionTitle">
        <span>{competition.name}</span>
        <h2>{text.cupPath}</h2>
      </div>
      <p className="cupNoTableNote">{text.noTableForCup}</p>
      <div className="cupRoundList">
        {fixtures.slice(0, 6).map((fixture, index) => (
          <article className="cupRoundRow" key={fixture.id}>
            <span>{text.rounds} {index + 1}</span>
            <div>
              <strong>{fixture.homeName}</strong>
              <em>{formatFixtureCenter(fixture, locale)}</em>
              <strong>{fixture.awayName}</strong>
            </div>
            <small>{formatFixtureDate(fixture.date, locale)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TeamLogoRailItem({
  competition,
  displayTeam,
  locale
}: {
  competition: FootballCompetition;
  displayTeam: DisplayTeam;
  locale: Locale;
}) {
  const mark = <TeamMark logo={displayTeam.logo} name={displayTeam.name} team={displayTeam.localTeam} />;

  if (displayTeam.localTeam) {
    return (
      <Link
        className="teamLogoRailItem"
        href={getTeamHref(displayTeam.localTeam.slug, locale, competition.slug)}
        title={displayTeam.name}
      >
        {mark}
      </Link>
    );
  }

  return (
    <span className="teamLogoRailItem" title={displayTeam.name}>
      {mark}
    </span>
  );
}

function TeamsCompactList({
  competition,
  displayTeams,
  locale
}: {
  competition: FootballCompetition;
  displayTeams: DisplayTeam[];
  locale: Locale;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <p className="footballEyebrow">{text.participatingTeams}</p>
      <h2>{text.teams}</h2>
      <div className="compactTeamList">
        {displayTeams.map((team) => (
          <CompactTeamItem competition={competition} displayTeam={team} key={team.key} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function CompactTeamItem({
  competition,
  displayTeam,
  locale
}: {
  competition: FootballCompetition;
  displayTeam: DisplayTeam;
  locale: Locale;
}) {
  const content = (
    <>
      <TeamMark logo={displayTeam.logo} name={displayTeam.name} team={displayTeam.localTeam} />
      <span>{displayTeam.name}</span>
    </>
  );

  if (displayTeam.localTeam) {
    return (
      <Link href={getTeamHref(displayTeam.localTeam.slug, locale, competition.slug)}>
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

function getCompetitionTabHref(competitionSlug: string, locale: Locale, tab: CompetitionTab) {
  const base = `/football/${competitionSlug}`;
  const suffixes: Record<Locale, Record<CompetitionTab, string>> = {
    en: {
      news: "",
      matchday: "matchday",
      table: "table",
      rounds: "rounds",
      teams: "teams",
      stats: "team-stats"
    },
    de: {
      news: "",
      matchday: "spieltag",
      table: "tabelle",
      rounds: "runden",
      teams: "teams",
      stats: "teamstatistik"
    }
  };
  const suffix = suffixes[locale][tab];

  return localizePath(suffix ? `${base}/${suffix}` : base, locale);
}

function getTeamHref(teamSlug: string, locale: Locale, fromCompetitionSlug?: string) {
  const href = localizePath(`/football/team/${teamSlug}`, locale);

  return fromCompetitionSlug ? `${href}?from=${encodeURIComponent(fromCompetitionSlug)}` : href;
}

function getTeamTabHref(teamSlug: string, locale: Locale, tab: TeamTab, fromCompetitionSlug?: string) {
  const base = `/football/team/${teamSlug}`;
  const suffixes: Record<Locale, Record<TeamTab, string>> = {
    en: {
      overview: "",
      matches: "matches",
      news: "news",
      stats: "team-stats"
    },
    de: {
      overview: "",
      matches: "spieltag",
      news: "news",
      stats: "teamstatistik"
    }
  };
  const suffix = suffixes[locale][tab];
  const href = localizePath(suffix ? `${base}/${suffix}` : base, locale);

  return fromCompetitionSlug ? `${href}?from=${encodeURIComponent(fromCompetitionSlug)}` : href;
}

function normalizeCompetitionTab(tab: CompetitionTab, isLeague: boolean): CompetitionTab {
  if (isLeague && tab === "rounds") {
    return "table";
  }

  if (!isLeague && tab === "table") {
    return "rounds";
  }

  return tab;
}

export function footballStaticParams() {
  return footballCompetitions.map((competition) => ({ competitionSlug: competition.slug }));
}

export function footballTeamStaticParams() {
  return footballCompetitions.flatMap((competition) =>
    competition.teams.map((team) => ({
      competitionSlug: competition.slug,
      teamSlug: team.slug
    }))
  );
}

export function footballCanonicalTeamStaticParams() {
  const seen = new Set<string>();

  return footballCompetitions.flatMap((competition) =>
    competition.teams.flatMap((team) => {
      if (seen.has(team.slug)) {
        return [];
      }

      seen.add(team.slug);
      return [{ teamSlug: team.slug }];
    })
  );
}

function getPrimaryCompetitionForTeam(teamSlug: string) {
  return footballCompetitions.find((competition) => competition.teams.some((team) => team.slug === teamSlug));
}

function buildFixtures(teams: FootballTeam[]) {
  const fixtures: SportApiMatch[] = [];

  for (let index = 0; index < teams.length - 1; index += 2) {
    fixtures.push({
      id: `fallback:${teams[index].slug}:${teams[index + 1].slug}`,
      competition: "Local preview",
      date: buildFallbackFixtureDate(index),
      homeName: teams[index].name,
      awayName: teams[index + 1].name,
      homeLogo: null,
      awayLogo: null,
      homeScore: null,
      awayScore: null,
      status: "preview"
    });
  }

  return fixtures.slice(0, 6);
}

function buildTeamFixtures(teams: FootballTeam[], team: FootballTeam) {
  return teams
    .filter((opponent) => opponent.slug !== team.slug)
    .slice(0, 4)
    .map((opponent, index): SportApiMatch => ({
      id: `fallback:${team.slug}:${opponent.slug}`,
      competition: "Local preview",
      date: buildFallbackFixtureDate(index),
      homeName: index % 2 === 0 ? team.name : opponent.name,
      awayName: index % 2 === 0 ? opponent.name : team.name,
      homeLogo: null,
      awayLogo: null,
      homeScore: null,
      awayScore: null,
      status: "preview"
    }));
}

function buildDisplayTeams(
  competition: FootballCompetition,
  apiTeams: SportApiTeam[],
  standings: SportApiStanding[],
  fixtures: SportApiMatch[]
): DisplayTeam[] {
  const teams = new Map<string, DisplayTeam>();
  const apiTeamsForDisplay = getApiTeamsForDisplay(competition, apiTeams);

  const upsertTeam = (name: string, logo: string | null) => {
    const normalized = normalizeName(name);
    if (!normalized) {
      return;
    }

    const localTeam = findCompetitionTeamByName(competition, name);
    const logoKey = logo ? getTeamLogoKey(logo) : null;
    const existingLogoEntry = logoKey
      ? Array.from(teams.values()).find((team) => team.logo && getTeamLogoKey(team.logo) === logoKey)
      : undefined;
    const key = localTeam ? `local:${localTeam.slug}` : existingLogoEntry?.key ?? normalized;
    const existing = teams.get(key);
    const resolvedLogo = logo ?? getKnownTeamLogo(localTeam);
    const displayName = localTeam?.name ?? existingLogoEntry?.name ?? name;

    if (existing) {
      teams.set(key, {
        ...existing,
        logo: existing.logo ?? resolvedLogo,
        name: existing.localTeam || existing.name.length >= displayName.length ? existing.name : displayName,
        localTeam: existing.localTeam ?? localTeam
      });
      return;
    }

    teams.set(key, {
      key,
      name: displayName,
      logo: resolvedLogo,
      localTeam
    });
  };

  competition.teams.forEach((team) => upsertTeam(team.name, null));
  apiTeamsForDisplay.forEach((team) => upsertTeam(team.name, team.logo));
  standings.forEach((standing) => upsertTeam(standing.teamName, standing.teamLogo));
  if (competition.type === "league") {
    fixtures.forEach((fixture) => {
      upsertTeam(fixture.homeName, fixture.homeLogo);
      upsertTeam(fixture.awayName, fixture.awayLogo);
    });
  }

  return Array.from(teams.values()).sort((a, b) => {
    const localRankA = a.localTeam?.rank ?? Number.MAX_SAFE_INTEGER;
    const localRankB = b.localTeam?.rank ?? Number.MAX_SAFE_INTEGER;

    if (localRankA !== localRankB) {
      return localRankA - localRankB;
    }

    return a.name.localeCompare(b.name);
  });
}

function getTeamLogoKey(logo: string) {
  return logo.replace(/^https?:\/\/[^/]+\/football\/teams\//, "").replace(/\?.*$/, "");
}

function getApiTeamsForDisplay(competition: FootballCompetition, apiTeams: SportApiTeam[]) {
  return apiTeams.filter((team) => competition.type === "league" || team.logo);
}

function findDisplayTeamByLocalTeam(displayTeams: DisplayTeam[], team: FootballTeam) {
  return displayTeams.find((displayTeam) => teamMatchesName(team, displayTeam.name));
}

function findStandingByLocalTeam(standings: SportApiStanding[], team: FootballTeam) {
  return standings.find((standing) => teamMatchesName(team, standing.teamName));
}

function getTeamFixtures(fixtures: SportApiMatch[], teams: FootballTeam[], team: FootballTeam, apiName?: string) {
  const matches = fixtures.filter((fixture) =>
    teamMatchesName(team, fixture.homeName) ||
    teamMatchesName(team, fixture.awayName) ||
    (apiName ? normalizeName(fixture.homeName) === normalizeName(apiName) || normalizeName(fixture.awayName) === normalizeName(apiName) : false)
  );

  return matches.length > 0 ? matches : buildTeamFixtures(teams, team);
}

function FixtureTeam({
  align,
  competition,
  locale,
  logo,
  name
}: {
  align: "left" | "right";
  competition: FootballCompetition;
  locale: Locale;
  logo: string | null;
  name: string;
}) {
  const team = findCompetitionTeamByName(competition, name);
  const content = (
    <>
      {align === "right" ? name : <TeamMark logo={logo} name={name} team={team} />}
      {align === "right" ? <TeamMark logo={logo} name={name} team={team} /> : name}
    </>
  );

  if (team) {
    return (
      <Link href={getTeamHref(team.slug, locale, competition.slug)}>
        {content}
      </Link>
    );
  }

  return <span className={`fixtureTeam fixtureTeam-${align}`}>{content}</span>;
}

function StandingRow({ competition, locale, standing }: { competition: FootballCompetition; locale: Locale; standing: SportApiStanding }) {
  const team = findCompetitionTeamByName(competition, standing.teamName);
  const content = (
    <>
      <span>{standing.rank}</span>
      <TeamMark logo={standing.teamLogo} name={standing.teamName} team={team} />
      <strong>{standing.teamName}</strong>
      <small>{formatStandingNumber(standing.played)}</small>
      <small>{formatStandingNumber(standing.won)}</small>
      <small>{formatStandingNumber(standing.drawn)}</small>
      <small>{formatStandingNumber(standing.lost)}</small>
      <small>{formatGoals(standing)}</small>
      <small>{formatGoalDiff(standing.goalDiff)}</small>
      <em>{standing.points === null ? "-" : standing.points}</em>
    </>
  );

  if (team) {
    return (
      <Link className="leagueTableRow" href={getTeamHref(team.slug, locale, competition.slug)}>
        {content}
      </Link>
    );
  }

  return <div className="leagueTableRow">{content}</div>;
}

function formatStandingNumber(value: number | null) {
  return value === null ? "-" : value;
}

function formatGoals(standing: SportApiStanding) {
  if (standing.goalsFor === null || standing.goalsAgainst === null) {
    return "-";
  }

  return `${standing.goalsFor}:${standing.goalsAgainst}`;
}

function formatGoalDiff(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value > 0 ? `+${value}` : String(value);
}

function TeamMark({ logo, name, team }: { logo: string | null; name: string; team?: FootballTeam }) {
  const resolvedLogo = logo ?? getKnownTeamLogo(team);

  if (resolvedLogo) {
    return <img alt="" className="apiTeamLogo" src={resolvedLogo} />;
  }

  if (team) {
    return <TeamCrest team={team} size="sm" />;
  }

  return <span className="apiTeamLogo textLogo">{getInitials(name)}</span>;
}

function getKnownTeamLogo(team?: FootballTeam) {
  return team ? knownTeamLogos[team.slug] ?? null : null;
}

function findCompetitionTeamByName(competition: FootballCompetition, name: string) {
  return competition.teams.find((team) => teamMatchesName(team, name));
}

function teamMatchesName(team: FootballTeam, name: string) {
  const normalizedName = normalizeName(name);
  const aliases = teamNameAliases[team.slug] ?? [];
  const candidateNames = [team.name, team.shortName, ...aliases];

  return candidateNames.some((candidate) => normalizeName(candidate) === normalizedName);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getInitials(name: string) {
  return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase();
}

function formatFixtureDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === "de" ? "Termin offen" : "Date pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

function formatFixtureCenter(fixture: SportApiMatch, locale: Locale) {
  if (fixture.homeScore !== null && fixture.awayScore !== null) {
    return `${fixture.homeScore} - ${fixture.awayScore}`;
  }

  if (!fixture.date) {
    return fixture.status ?? (locale === "de" ? "offen" : "pending");
  }

  const date = new Date(fixture.date);
  if (Number.isNaN(date.getTime())) {
    return fixture.status ?? (locale === "de" ? "offen" : "pending");
  }

  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function buildFallbackFixtureDate(index: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + Math.floor(index / 2) + 1);
  date.setUTCHours(index === 0 ? 18 : 14, 30, 0, 0);
  return date.toISOString();
}
