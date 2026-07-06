import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import {
  footballCompetitions,
  getCompetition,
  getCompetitionGroups,
  getTeam,
  type FootballCompetition,
  type FootballTeam
} from "@/lib/football-data";
import { localizePath, type Locale } from "@/lib/i18n";

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
    backToCompetition: "Back to competition"
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
    backToCompetition: "Zurück zum Wettbewerb"
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
  const groups = getCompetitionGroups();

  return (
    <main className="shell footballShell">
      <section className="footballHero">
        <p className="footballEyebrow">{text.football}</p>
        <h1>{text.overview}</h1>
        <p>{text.intro}</p>
      </section>

      <section className="footballCompetitionGrid" aria-label={text.overview}>
        {groups.map((group) => (
          <article className="footballCountryPanel" key={group.country}>
            <div className="footballCountryHeader">
              <span>{group.countryCode}</span>
              <h2>{group.country}</h2>
            </div>
            <div className="competitionSplit">
              <CompetitionColumn competitions={group.competitions.filter((item) => item.type === "league")} title={text.leagues} locale={locale} />
              <CompetitionColumn competitions={group.competitions.filter((item) => item.type === "cup")} title={text.cups} locale={locale} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function CompetitionColumn({ competitions, title, locale }: { competitions: FootballCompetition[]; title: string; locale: Locale }) {
  const text = labels[locale];

  return (
    <div className="competitionColumn">
      <p>{title}</p>
      {competitions.map((competition) => (
        <Link className="competitionTile" href={localizePath(`/football/${competition.slug}`, locale)} key={competition.slug}>
          <span>{competition.type === "league" ? "League" : "Cup"}</span>
          <strong>{competition.name}</strong>
          <small>{competition.description}</small>
          <em>{text.open}</em>
        </Link>
      ))}
    </div>
  );
}

export function FootballCompetitionPage({ competitionSlug, locale }: { competitionSlug: string; locale: Locale }) {
  const competition = getCompetition(competitionSlug);
  const text = labels[locale];

  if (!competition) {
    notFound();
  }

  const fixtures = buildFixtures(competition.teams);

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
          <p>{text.fixtures}</p>
          <strong>{competition.name}</strong>
        </div>
        <div className="fixtureGrid">
          {fixtures.map((fixture) => (
            <article className="fixtureRow" key={`${fixture.home.slug}-${fixture.away.slug}`}>
              <Link href={localizePath(`/football/${competition.slug}/${fixture.home.slug}`, locale)}>
                {fixture.home.name}
                <TeamCrest team={fixture.home} size="sm" />
              </Link>
              <div className="fixtureTime">
                <span>{fixture.date}</span>
                <strong>{fixture.time}</strong>
              </div>
              <Link href={localizePath(`/football/${competition.slug}/${fixture.away.slug}`, locale)}>
                <TeamCrest team={fixture.away} size="sm" />
                {fixture.away.name}
              </Link>
            </article>
          ))}
        </div>
        <button className="showAllButton" type="button">{text.showAll}</button>
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
          {competition.teams.map((team) => (
            <Link className="leagueTableRow" href={localizePath(`/football/${competition.slug}/${team.slug}`, locale)} key={team.slug}>
              <span>{team.rank}</span>
              <TeamCrest team={team} size="sm" />
              <strong>{team.name}</strong>
              <small>{team.form}</small>
              <em>{team.points} {text.points}</em>
            </Link>
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
  const fixtures = [];

  for (let index = 0; index < teams.length - 1; index += 2) {
    fixtures.push({
      home: teams[index],
      away: teams[index + 1],
      date: index === 0 ? "28.08." : "31.08.",
      time: index === 0 ? "20:30" : "15:30"
    });
  }

  return fixtures.slice(0, 6);
}
