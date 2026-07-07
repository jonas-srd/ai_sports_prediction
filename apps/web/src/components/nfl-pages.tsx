import Link from "next/link";
import { notFound } from "next/navigation";
import { localizePath, type Locale } from "@/lib/i18n";
import { getNflTeam, nflTeams, type NflTeam } from "@/lib/nfl-data";
import { getFallbackSportMatches, getSportApiSnapshot, type SportApiMatch, type SportApiTeam } from "@/lib/sports-api-data";

export type NflTab = "news" | "matches" | "table" | "teams" | "stats";
export type NflTeamTab = "overview" | "matches" | "news" | "stats";

type DisplayNflTeam = NflTeam & {
  apiLogo?: string | null;
};

const labels = {
  en: {
    nfl: "NFL",
    allSports: "All sports",
    title: "NFL",
    subtitle: "Weekly slate, team strength, playoff paths and model signals.",
    predictionHub: "Prediction hub",
    news: "News",
    matches: "Matches",
    table: "Table",
    teams: "Teams",
    stats: "Team stats",
    overview: "Overview",
    matchCenter: "Match center",
    fixturesAndResults: "Games & results",
    latestSignals: "Latest signals",
    source: "Source",
    standings: "Standings",
    rank: "#",
    team: "Team",
    conf: "Conf.",
    div: "Div.",
    wins: "W",
    losses: "L",
    ties: "T",
    pct: "Pct.",
    points: "PF:PA",
    diff: "Diff.",
    participatingTeams: "Teams",
    competitionFacts: "League facts",
    modelSummary: "Model summary",
    backToLeague: "Back to NFL",
    teamProfile: "Team profile",
    city: "City",
    division: "Division",
    conference: "Conference",
    record: "Record",
    form: "Form",
    apiReady: "API ready"
  },
  de: {
    nfl: "NFL",
    allSports: "Alle Sportarten",
    title: "NFL",
    subtitle: "Weekly Slate, Teamstärke, Playoff-Pfade und Modell-Signale.",
    predictionHub: "Prediction Hub",
    news: "News",
    matches: "Spiele",
    table: "Tabelle",
    teams: "Teams",
    stats: "Teamstatistik",
    overview: "Übersicht",
    matchCenter: "Matchcenter",
    fixturesAndResults: "Spiele & Ergebnisse",
    latestSignals: "Aktuelle Signale",
    source: "Quelle",
    standings: "Tabelle",
    rank: "#",
    team: "Team",
    conf: "Conf.",
    div: "Div.",
    wins: "S",
    losses: "N",
    ties: "U",
    pct: "Quote",
    points: "PF:PA",
    diff: "Diff.",
    participatingTeams: "Teilnehmende Teams",
    competitionFacts: "Liga-Daten",
    modelSummary: "Modell-Zusammenfassung",
    backToLeague: "Zurück zur NFL",
    teamProfile: "Teamprofil",
    city: "Stadt",
    division: "Division",
    conference: "Conference",
    record: "Bilanz",
    form: "Form",
    apiReady: "API bereit"
  }
} as const;

export async function NflPage({ locale, tab = "news" }: { locale: Locale; tab?: NflTab }) {
  const text = labels[locale];
  const apiSnapshot = await getSportApiSnapshot("nfl");
  const matches = apiSnapshot.matches.length > 0 ? apiSnapshot.matches : buildFallbackNflMatches();
  const displayTeams = buildDisplayTeams(apiSnapshot.teams);
  const tabItems = getNflTabs(locale);

  return (
    <main className="footballDetailShell sportschauFootballPage nflPage">
      <section className="competitionHero sportschauCompetitionHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{text.nfl}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        <FeaturedNflGame match={matches[0]} locale={locale} />
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
          <Link className="teamLogoRailItem" href={getNflTeamHref(team.slug, locale)} key={team.slug} title={team.name}>
            <NflTeamLogo team={team} />
          </Link>
        ))}
      </section>

      <div className="sportschauPageGrid">
        <div className="sportschauMainColumn">
          {tab === "news" ? <NflNewsSection locale={locale} /> : null}
          {tab === "matches" ? <NflMatchesSection locale={locale} matches={matches} /> : null}
          {tab === "table" ? <NflStandingsSection locale={locale} teams={displayTeams} /> : null}
          {tab === "teams" ? <NflTeamsSection locale={locale} teams={displayTeams} /> : null}
          {tab === "stats" ? <NflStatsSection locale={locale} matches={matches} teams={displayTeams} /> : null}
        </div>

        {tab !== "teams" && tab !== "stats" ? (
          <aside className="sportschauSideColumn">
            <NflStatsSection compact locale={locale} matches={matches} teams={displayTeams} />
            <NflTeamsCompact locale={locale} teams={displayTeams.slice(0, 12)} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

export async function NflTeamPage({
  locale,
  tab = "overview",
  teamSlug
}: {
  locale: Locale;
  tab?: NflTeamTab;
  teamSlug: string;
}) {
  const team = getNflTeam(teamSlug);
  const text = labels[locale];

  if (!team) {
    notFound();
  }

  const apiSnapshot = await getSportApiSnapshot("nfl");
  const apiTeam = findApiTeam(apiSnapshot.teams, team);
  const displayTeam: DisplayNflTeam = { ...team, apiLogo: apiTeam?.logo };
  const matches = (apiSnapshot.matches.length > 0 ? apiSnapshot.matches : buildFallbackNflMatches()).filter((match) =>
    teamMatchesName(team, match.homeName) || teamMatchesName(team, match.awayName)
  );
  const teamMatches = matches.length > 0 ? matches : buildTeamFallbackMatches(team);
  const tabItems = getNflTeamTabs(team.slug, locale);

  return (
    <main className="footballDetailShell sportschauFootballPage nflPage">
      <section className="teamHero sportschauTeamHero">
        <NflTeamLogo className="teamHeroLogo" team={displayTeam} />
        <div>
          <p className="footballEyebrow">{text.teamProfile}</p>
          <h1>{team.name}</h1>
          <p>{team.prediction}. Form: {team.form}.</p>
        </div>
        <Link className="footballBackLink" href={localizePath("/nfl", locale)}>
          {text.backToLeague}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={text.teamProfile}>
        {tabItems.map((item) => (
          <Link className={tab === item.tab ? "isActive" : ""} href={item.href} key={item.tab}>
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" || tab === "stats" ? (
        <section className="teamProfileGrid sportschauTeamProfileGrid">
          <NflTeamStatsCard locale={locale} team={team} />
          {tab === "overview" ? <NflTeamNewsCard locale={locale} team={team} /> : null}
        </section>
      ) : null}

      {tab === "matches" ? <NflMatchesSection locale={locale} matches={teamMatches} title={team.shortName} /> : null}
      {tab === "news" ? <NflTeamNewsCard expanded locale={locale} team={team} /> : null}
    </main>
  );
}

export function nflTeamStaticParams() {
  return nflTeams.map((team) => ({ teamSlug: team.slug }));
}

function FeaturedNflGame({ match, locale }: { match: SportApiMatch; locale: Locale }) {
  const text = labels[locale];

  return (
    <article className="featuredFixtureCard">
      <span>{text.matchCenter}</span>
      <div className="featuredFixtureTeams">
        <SportLogo logo={match.homeLogo} name={match.homeName} />
        <strong>{formatMatchCenter(match)}</strong>
        <SportLogo logo={match.awayLogo} name={match.awayName} />
      </div>
      <small>{match.homeName} - {match.awayName}</small>
    </article>
  );
}

function NflMatchesSection({ locale, matches, title }: { locale: Locale; matches: SportApiMatch[]; title?: string }) {
  const text = labels[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel">
      <div className="sectionHeaderRow">
        <div>
          <p className="sectionKicker">{text.fixturesAndResults}</p>
          <h2>{title ?? text.nfl}</h2>
        </div>
        <p>{text.source}: API-Sports NFL</p>
      </div>
      <div className="fixtureGrid sportschauFixtureList">
        {matches.map((match) => (
          <article className="fixtureRow" key={match.id}>
            <FixtureSide locale={locale} logo={match.homeLogo} name={match.homeName} />
            <div className="fixtureCenter">
              <span>{formatMatchDate(match.date, locale)}</span>
              <strong>{formatMatchCenter(match)}</strong>
              <small>{match.competition}</small>
            </div>
            <FixtureSide align="right" locale={locale} logo={match.awayLogo} name={match.awayName} />
          </article>
        ))}
      </div>
    </section>
  );
}

function NflNewsSection({ locale }: { locale: Locale }) {
  const text = labels[locale];
  const headlines = locale === "de"
    ? [
        "NFL-Modell bewertet Playoff-Pfade nach Schedule-Update neu",
        "Quarterback-Verfügbarkeit bleibt stärkster Hebel im Weekly Forecast",
        "Defensive Pressure verändert Spread-Sensitivität in engen Matchups"
      ]
    : [
        "NFL model refresh updates playoff paths after schedule scan",
        "Quarterback availability remains the strongest weekly forecast lever",
        "Defensive pressure shifts spread sensitivity in tight matchups"
      ];

  return (
    <section className="footballPanel sportschauNewsPanel">
      <div className="sportschauSectionTitle">
        <span>{text.latestSignals}</span>
        <h2>{text.nfl}-News</h2>
      </div>
      <div className="footballNewsGrid sportschauNewsGrid">
        {headlines.map((headline, index) => (
          <article className={index === 0 ? "footballNewsCard sportschauLeadNews" : "footballNewsCard"} key={headline}>
            <span>{text.nfl}</span>
            <h3>{headline}</h3>
            <p>{locale === "de" ? "Teamstärke, Verletzungen und Game Script fließen in die Prognose ein." : "Team strength, injuries and game script feed the forecast."}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NflStandingsSection({ locale, teams }: { locale: Locale; teams: DisplayNflTeam[] }) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTablePanel">
      <div className="sportschauSectionTitle">
        <span>{text.nfl}</span>
        <h2>{text.standings}</h2>
      </div>
      <div className="leagueTable sportschauLeagueTable nflLeagueTable">
        <div className="leagueTableRow leagueTableHeader nflTableRow" aria-hidden="true">
          <span>{text.rank}</span>
          <span />
          <strong>{text.team}</strong>
          <small>{text.conf}</small>
          <small>{text.div}</small>
          <small>{text.wins}</small>
          <small>{text.losses}</small>
          <small>{text.ties}</small>
          <small>{text.points}</small>
          <em>{text.diff}</em>
        </div>
        {teams.map((team) => (
          <Link className="leagueTableRow nflTableRow" href={getNflTeamHref(team.slug, locale)} key={team.slug}>
            <span>{team.rank}</span>
            <NflTeamLogo team={team} />
            <strong>{team.name}</strong>
            <small>{team.conference}</small>
            <small>{team.division}</small>
            <small>{team.wins}</small>
            <small>{team.losses}</small>
            <small>{team.ties}</small>
            <small>{team.pointsFor}:{team.pointsAgainst}</small>
            <em>{formatDiff(team.pointsFor - team.pointsAgainst)}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NflTeamsSection({ locale, teams }: { locale: Locale; teams: DisplayNflTeam[] }) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <div className="sportschauSectionTitle">
        <span>{text.participatingTeams}</span>
        <h2>{text.teams}</h2>
      </div>
      <div className="compactTeamList teamsDirectoryList">
        {teams.map((team) => (
          <Link href={getNflTeamHref(team.slug, locale)} key={team.slug}>
            <NflTeamLogo team={team} />
            <span>{team.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NflTeamsCompact({ locale, teams }: { locale: Locale; teams: DisplayNflTeam[] }) {
  const text = labels[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <p className="footballEyebrow">{text.participatingTeams}</p>
      <h2>{text.teams}</h2>
      <div className="compactTeamList">
        {teams.map((team) => (
          <Link href={getNflTeamHref(team.slug, locale)} key={team.slug}>
            <NflTeamLogo team={team} />
            <span>{team.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function NflStatsSection({
  compact = false,
  locale,
  matches,
  teams
}: {
  compact?: boolean;
  locale: Locale;
  matches: SportApiMatch[];
  teams: DisplayNflTeam[];
}) {
  const text = labels[locale];
  const afcTeams = teams.filter((team) => team.conference === "AFC").length;
  const nfcTeams = teams.filter((team) => team.conference === "NFC").length;

  return (
    <section className="footballPanel sportschauInfoPanel">
      <p className="footballEyebrow">{text.competitionFacts}</p>
      <h2>{text.nfl}</h2>
      <div className="teamStatList">
        <div><span>{text.teams}</span><strong>{teams.length}</strong></div>
        <div><span>AFC</span><strong>{afcTeams}</strong></div>
        <div><span>NFC</span><strong>{nfcTeams}</strong></div>
        <div><span>{text.matches}</span><strong>{matches.length}</strong></div>
        {!compact ? <div><span>{text.source}</span><strong>API-Sports NFL</strong></div> : null}
      </div>
    </section>
  );
}

function NflTeamStatsCard({ locale, team }: { locale: Locale; team: NflTeam }) {
  const text = labels[locale];

  return (
    <article className="footballPanel sportschauInfoPanel">
      <p className="footballEyebrow">{text.modelSummary}</p>
      <h2>{team.prediction}</h2>
      <div className="teamStatList">
        <div><span>{text.city}</span><strong>{team.city}</strong></div>
        <div><span>{text.conference}</span><strong>{team.conference}</strong></div>
        <div><span>{text.division}</span><strong>{team.division}</strong></div>
        <div><span>{text.record}</span><strong>{team.wins}-{team.losses}{team.ties ? `-${team.ties}` : ""}</strong></div>
        <div><span>{text.points}</span><strong>{team.pointsFor}:{team.pointsAgainst}</strong></div>
        <div><span>{text.form}</span><strong>{team.form}</strong></div>
      </div>
    </article>
  );
}

function NflTeamNewsCard({ expanded = false, locale, team }: { expanded?: boolean; locale: Locale; team: NflTeam }) {
  const text = labels[locale];

  return (
    <article className={expanded ? "footballPanel sportschauNewsPanel" : "footballPanel sportschauNewsPanel"}>
      <div className="sportschauSectionTitle">
        <span>{text.latestSignals}</span>
        <h2>{team.name}</h2>
      </div>
      <div className="footballNewsGrid compact">
        {[
          `${team.shortName}: ${team.prediction} signal holds after latest slate scan`,
          `${team.name} record profile: ${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ""}`,
          `${team.division} matchup context shifts model volatility`
        ].map((headline) => (
          <article className="footballNewsCard" key={headline}>
            <span>{text.nfl}</span>
            <h3>{headline}</h3>
          </article>
        ))}
      </div>
    </article>
  );
}

function FixtureSide({
  align = "left",
  locale,
  logo,
  name
}: {
  align?: "left" | "right";
  locale: Locale;
  logo: string | null;
  name: string;
}) {
  const localTeam = findNflTeamByName(name);
  const mark = localTeam ? <NflTeamLogo team={localTeam} /> : <SportLogo logo={logo} name={name} />;
  const content = (
    <>
      {align === "right" ? name : mark}
      {align === "right" ? mark : name}
    </>
  );

  if (localTeam) {
    return (
      <Link className={`fixtureTeam ${align === "right" ? "alignRight" : ""}`} href={getNflTeamHref(localTeam.slug, locale)}>
        {content}
      </Link>
    );
  }

  return <div className={`fixtureTeam ${align === "right" ? "alignRight" : ""}`}>{content}</div>;
}

function NflTeamLogo({ className = "", team }: { className?: string; team: DisplayNflTeam | NflTeam }) {
  return <img alt="" className={`apiTeamLogo ${className}`.trim()} src={(team as DisplayNflTeam).apiLogo ?? team.logo} />;
}

function SportLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    return <img alt="" className="apiTeamLogo" src={logo} />;
  }

  return <span className="apiTeamLogo textLogo">{getInitials(name)}</span>;
}

function buildDisplayTeams(apiTeams: SportApiTeam[]): DisplayNflTeam[] {
  return nflTeams.map((team) => ({
    ...team,
    apiLogo: findApiTeam(apiTeams, team)?.logo ?? null
  }));
}

function findApiTeam(apiTeams: SportApiTeam[], team: NflTeam) {
  return apiTeams.find((apiTeam) => teamMatchesName(team, apiTeam.name));
}

function findNflTeamByName(name: string) {
  return nflTeams.find((team) => teamMatchesName(team, name));
}

function teamMatchesName(team: NflTeam, name: string) {
  const normalized = normalizeName(name);
  return [team.name, team.shortName, team.city, team.name.replace(team.city, "").trim()].some((candidate) =>
    normalizeName(candidate) === normalized
  );
}

function getNflTabs(locale: Locale): Array<{ href: string; label: string; tab: NflTab }> {
  const text = labels[locale];
  const suffixes: Record<Locale, Record<NflTab, string>> = {
    en: { news: "", matches: "matches", table: "table", teams: "teams", stats: "team-stats" },
    de: { news: "", matches: "spieltag", table: "tabelle", teams: "teams", stats: "teamstatistik" }
  };

  return [
    { tab: "news", label: text.news, href: localizePath("/nfl", locale) },
    { tab: "matches", label: text.matches, href: localizePath(`/nfl/${suffixes[locale].matches}`, locale) },
    { tab: "table", label: text.table, href: localizePath(`/nfl/${suffixes[locale].table}`, locale) },
    { tab: "teams", label: text.teams, href: localizePath(`/nfl/${suffixes[locale].teams}`, locale) },
    { tab: "stats", label: text.stats, href: localizePath(`/nfl/${suffixes[locale].stats}`, locale) }
  ];
}

function getNflTeamTabs(teamSlug: string, locale: Locale): Array<{ href: string; label: string; tab: NflTeamTab }> {
  const text = labels[locale];
  const suffixes: Record<Locale, Record<NflTeamTab, string>> = {
    en: { overview: "", matches: "matches", news: "news", stats: "team-stats" },
    de: { overview: "", matches: "spieltag", news: "news", stats: "teamstatistik" }
  };
  const base = `/nfl/team/${teamSlug}`;

  return [
    { tab: "overview", label: text.overview, href: localizePath(base, locale) },
    { tab: "matches", label: text.matches, href: localizePath(`${base}/${suffixes[locale].matches}`, locale) },
    { tab: "news", label: text.news, href: localizePath(`${base}/${suffixes[locale].news}`, locale) },
    { tab: "stats", label: text.stats, href: localizePath(`${base}/${suffixes[locale].stats}`, locale) }
  ];
}

function getNflTeamHref(teamSlug: string, locale: Locale) {
  return localizePath(`/nfl/team/${teamSlug}`, locale);
}

function buildFallbackNflMatches() {
  const fallback = getFallbackSportMatches("nfl");
  return fallback.map((match, index) => {
    const home = nflTeams[index * 2] ?? nflTeams[0];
    const away = nflTeams[index * 2 + 1] ?? nflTeams[1];

    return {
      ...match,
      homeName: home.name,
      awayName: away.name,
      homeLogo: home.logo,
      awayLogo: away.logo
    };
  });
}

function buildTeamFallbackMatches(team: NflTeam) {
  return nflTeams
    .filter((opponent) => opponent.slug !== team.slug && opponent.conference === team.conference)
    .slice(0, 4)
    .map((opponent, index): SportApiMatch => ({
      id: `nfl-fallback:${team.slug}:${opponent.slug}`,
      competition: "NFL",
      date: null,
      homeName: index % 2 === 0 ? team.name : opponent.name,
      awayName: index % 2 === 0 ? opponent.name : team.name,
      homeLogo: index % 2 === 0 ? team.logo : opponent.logo,
      awayLogo: index % 2 === 0 ? opponent.logo : team.logo,
      homeScore: null,
      awayScore: null,
      status: "preview"
    }));
}

function formatMatchCenter(match: SportApiMatch) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore} - ${match.awayScore}`;
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

function formatDiff(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
