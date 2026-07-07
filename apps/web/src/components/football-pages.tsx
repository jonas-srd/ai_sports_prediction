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
  type SportApiStanding
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
    table: "Table",
    scorers: "Scorers",
    teamStats: "Team stats",
    teams: "Teams",
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
    scrollMore: "More",
    featuredCompetitions: "Leagues and cups"
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
    table: "Tabelle",
    scorers: "Torschützen",
    teamStats: "Teamstatistik",
    teams: "Teams",
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
    scrollMore: "Mehr",
    featuredCompetitions: "Ligen und Pokale"
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

      <section className="footballRailSection" aria-label={text.featuredCompetitions}>
        <div className="footballRailHeader">
          <h2>{text.featuredCompetitions}</h2>
          <a aria-label={text.scrollMore} className="footballRailNext" href="#football-rail-end">›</a>
        </div>
        <nav className="footballCompetitionRail" aria-label={text.featuredCompetitions}>
          {footballCompetitions.map((competition) => (
            <Link
              className="footballRailItem"
              href={localizePath(`/football/${competition.slug}`, locale)}
              key={competition.slug}
            >
              <span>{competition.type === "league" ? text.leagues : text.cups}</span>
              <strong>{competition.name}</strong>
              <small>{competition.country}</small>
            </Link>
          ))}
          <span aria-hidden="true" className="footballRailEnd" id="football-rail-end" />
        </nav>
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
          <span>{competition.countryCode}</span>
          <strong>{competition.name}</strong>
          <small>{competition.description}</small>
          <em>{text.open}</em>
        </Link>
      ))}
      </div>
    </section>
  );
}

export async function FootballCompetitionPage({ competitionSlug, locale }: { competitionSlug: string; locale: Locale }) {
  const competition = getCompetition(competitionSlug);
  const text = labels[locale];

  if (!competition) {
    notFound();
  }

  const apiSnapshot = await getFootballCompetitionApiSnapshot(competition);
  const fixtures = apiSnapshot.matches.length > 0 ? apiSnapshot.matches : buildFixtures(competition.teams);
  const standings = apiSnapshot.standings.length > 0 ? apiSnapshot.standings : fallbackTeamsToStandings(competition.teams);

  return (
    <main className="footballDetailShell">
      <section className="competitionHero">
        <div>
          <p className="footballEyebrow">{text.football}</p>
          <h1>{competition.name}</h1>
          <p>{competition.description}</p>
        </div>
        <Link className="footballBackLink" href={localizePath("/football", locale)}>
          {text.allCompetitions}
        </Link>
      </section>

      <nav className="competitionTabs" aria-label={text.predictionHub}>
        {[text.news, text.matchday, text.table, text.scorers, text.teamStats].map((item, index) => (
          <a className={index === 0 ? "isActive" : ""} href={index === 0 ? "#news" : index === 1 ? "#matchday" : "#table"} key={item}>
            {item}
          </a>
        ))}
      </nav>

      <section className="teamLogoRail" aria-label={text.teams}>
        {competition.teams.map((team) => (
          <Link href={localizePath(`/football/${competition.slug}/${team.slug}`, locale)} key={team.slug}>
            <TeamCrest team={team} size="sm" />
          </Link>
        ))}
      </section>

      <section className="footballPanel fixturePanel" id="matchday">
        <div className="footballPanelHeader">
          <div>
            <p>{text.fixtures}</p>
            <span className="dataProviderNote">{text.source}: {apiSnapshot.status === "live" ? "API-Football" : text.apiReady}</span>
          </div>
          <strong>{competition.name}</strong>
        </div>
        <div className="fixtureGrid">
          {fixtures.map((fixture) => (
            <article className="fixtureRow" key={fixture.id}>
              <FixtureTeam
                competition={competition}
                locale={locale}
                logo={fixture.homeLogo}
                name={fixture.homeName}
                align="right"
              />
              <div className="fixtureTime">
                <span>{formatFixtureDate(fixture.date, locale)}</span>
                <strong>{formatFixtureCenter(fixture, locale)}</strong>
              </div>
              <FixtureTeam
                competition={competition}
                locale={locale}
                logo={fixture.awayLogo}
                name={fixture.awayName}
                align="left"
              />
            </article>
          ))}
        </div>
        <p className="apiPanelMessage">{apiSnapshot.message}</p>
      </section>

      <section className="footballPanel" id="news">
        <h2>{competition.name}-News</h2>
        <div className="footballNewsGrid">
          {[
            `${competition.name}: model confidence moves after latest form update`,
            `${competition.country} cup and league paths now share team strength ratings`,
            `AI watchlist: three teams with rising upset probability`
          ].map((headline) => (
            <article className="footballNewsCard" key={headline}>
              <span>{text.latestSignals}</span>
              <h3>{headline}</h3>
              <p>{competition.modelFocus}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="footballPanel" id="table">
        <h2>{text.table}</h2>
        <div className="leagueTable">
          {standings.map((team) => (
            <StandingRow competition={competition} key={`${team.rank}-${team.teamName}`} locale={locale} standing={team} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function FootballTeamPage({ competitionSlug, locale, teamSlug }: { competitionSlug: string; locale: Locale; teamSlug: string }) {
  const competition = getCompetition(competitionSlug);
  const team = getTeam(competitionSlug, teamSlug);
  const text = labels[locale];

  if (!competition || !team) {
    notFound();
  }

  return (
    <main className="footballDetailShell">
      <section className="teamHero">
        <TeamCrest team={team} size="lg" />
        <div>
          <p className="footballEyebrow">{text.teamProfile}</p>
          <h1>{team.name}</h1>
          <p>{team.prediction} in {competition.name}. Form: {team.form}.</p>
        </div>
        <Link className="footballBackLink" href={localizePath(`/football/${competition.slug}`, locale)}>
          {text.backToCompetition}
        </Link>
      </section>

      <section className="teamProfileGrid">
        <article className="footballPanel">
          <p className="footballEyebrow">{text.modelSummary}</p>
          <h2>{team.prediction}</h2>
          <div className="teamStatList">
            <div><span>{text.league}</span><strong>{competition.name}</strong></div>
            <div><span>{text.city}</span><strong>{team.city}</strong></div>
            <div><span>{text.table}</span><strong>#{team.rank}</strong></div>
            <div><span>{text.points}</span><strong>{team.points}</strong></div>
            <div><span>{text.form}</span><strong>{team.form}</strong></div>
          </div>
        </article>

        <article className="footballPanel">
          <p className="footballEyebrow">{text.teamNews}</p>
          <h2>{team.name}</h2>
          <div className="footballNewsGrid compact">
            {[
              `${team.name}: latest model input raises ${team.prediction.toLowerCase()} signal`,
              `${team.shortName} fixture pressure updated after schedule scan`,
              `Prediction profile: ${team.city} side shows ${team.form} trend`
            ].map((headline) => (
              <article className="footballNewsCard" key={headline}>
                <span>{competition.name}</span>
                <h3>{headline}</h3>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
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
      <Link href={localizePath(`/football/${competition.slug}/${team.slug}`, locale)}>
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
      <small>{standing.form ?? standing.detail ?? ""}</small>
      <em>{standing.points === null ? "-" : standing.points}</em>
    </>
  );

  if (team) {
    return (
      <Link className="leagueTableRow" href={localizePath(`/football/${competition.slug}/${team.slug}`, locale)}>
        {content}
      </Link>
    );
  }

  return <div className="leagueTableRow">{content}</div>;
}

function TeamMark({ logo, name, team }: { logo: string | null; name: string; team?: FootballTeam }) {
  if (logo) {
    return <img alt="" className="apiTeamLogo" src={logo} />;
  }

  if (team) {
    return <TeamCrest team={team} size="sm" />;
  }

  return <span className="apiTeamLogo textLogo">{getInitials(name)}</span>;
}

function findCompetitionTeamByName(competition: FootballCompetition, name: string) {
  const normalizedName = normalizeName(name);
  return competition.teams.find((team) => normalizeName(team.name) === normalizedName || normalizeName(team.shortName) === normalizedName);
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
