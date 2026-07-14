import Link from "next/link";
import { notFound } from "next/navigation";
import { localizePath, type Locale } from "@/lib/i18n";
import { getSportsNewsLinks } from "@/lib/sports-news";
import { getSportApiSnapshot, type SportApiMatch } from "@/lib/sports-api-data";
import { findTennisPlayerByName, getTennisFlagUrl, getTennisPlayer, getTennisTournament, resolveTennisPlayerCountryCode, tennisPlayers, tennisTournaments, type TennisPlayer, type TennisTournament } from "@/lib/tennis-data";
import { getAtpRankingSnapshot, type TennisRankingRow, type TennisRankingSnapshot } from "@/lib/tennis-rankings";
import { getSportMatchHref } from "@/components/match-detail-page";
import { SportsNewsCards } from "@/components/sports-news-cards";

export type TennisTab = "news" | "matches" | "tournaments" | "rankings" | "players";
export type TennisTournamentTab = "results" | "info" | "players";
type TennisTournamentResult = {
  match: number;
  round: string;
  roundSlug: string;
  winner: string;
  loser: string;
  score: string;
};
type TennisTournamentContext = {
  featuredMatch: SportApiMatch | null;
  startDate: string | null;
  tournament: TennisTournament | null;
  tournamentLabel: string;
};
type ModelRankingRow = TennisRankingRow & {
  form: string;
};

const text = {
  en: {
    allSports: "All sports",
    tennis: "Tennis",
    news: "News",
    matches: "Match predictions",
    tournaments: "Tournaments",
    rankings: "Rankings",
    players: "Players",
    matchCenter: "Match center",
    nextTournament: "Next tournament",
    nextTopMatch: "Next top match",
    live: "Live",
    officialPoints: "Official points",
    movement: "+/-",
    tournamentsPlayed: "Tourn played",
    dropping: "Dropping",
    allCountries: "All countries",
    atpSingles: "ATP singles rankings",
    nextBest: "Next best",
    modelPoints: "Model points",
    updated: "Updated",
    officialLive: "Official ATP live",
    officialSnapshot: "Official ATP snapshot",
    latestSignals: "Latest signals",
    upcomingPredictions: "Next 5 predictions",
    source: "Source",
    playerProfile: "Player profile",
    backToTennis: "Back to tennis",
    info: "Info",
    surface: "Surface",
    form: "Form",
    ranking: "Ranking",
    age: "Age",
    hand: "Hand",
    height: "Height",
    turnedPro: "Turned pro",
    residence: "Residence",
    coach: "Coach",
    titles: "Titles",
    grandSlams: "Grand Slams",
    prediction: "AI prediction",
    pick: "Pick",
    odds: "Odds",
    bestOdds: "Best odds",
    bookmakers: "books",
    score: "Set score",
    confidence: "Confidence",
    reasoning: "Reasoning",
    surfaceStrength: "Surface strength",
    importantTournaments: "Important tournaments",
    tournamentProfile: "Tournament profile",
    results: "Results",
    pastResults: "Past results",
    selectRound: "Select round",
    previousRound: "Previous round",
    nextRound: "Next round",
    champion: "Champion",
    finalist: "Finalist",
    category: "Category",
    location: "Location",
    month: "Month",
    draw: "Draw",
    details: "Open analysis",
    liveDataPending: "Live match data pending",
    liveDataPendingText: "No real Tennis API fixtures are available right now. As soon as the API returns scheduled matches, this page fills automatically without demo fallback games.",
    apiStatus: "API status"
  },
  de: {
    allSports: "Alle Sportarten",
    tennis: "Tennis",
    news: "News",
    matches: "Match-Prognosen",
    tournaments: "Turniere",
    rankings: "Ranking",
    players: "Spieler",
    matchCenter: "Matchcenter",
    nextTournament: "Nächstes Turnier",
    nextTopMatch: "Nächstes Topspiel",
    live: "Live",
    officialPoints: "Official Points",
    movement: "+/-",
    tournamentsPlayed: "Turniere",
    dropping: "Dropping",
    allCountries: "Alle Länder",
    atpSingles: "ATP Singles Ranking",
    nextBest: "Next Best",
    modelPoints: "Modellpunkte",
    updated: "Stand",
    officialLive: "Offiziell live",
    officialSnapshot: "Offizieller ATP-Snapshot",
    latestSignals: "Aktuelle Signale",
    upcomingPredictions: "Nächste 5 Prognosen",
    source: "Quelle",
    playerProfile: "Spielerprofil",
    backToTennis: "Zuruck zu Tennis",
    info: "Info",
    surface: "Belag",
    form: "Form",
    ranking: "Ranking",
    age: "Alter",
    hand: "Hand",
    height: "Groesse",
    turnedPro: "Profi seit",
    residence: "Wohnort",
    coach: "Coach",
    titles: "Titel",
    grandSlams: "Grand Slams",
    prediction: "KI-Prognose",
    pick: "Tipp",
    odds: "Quoten",
    bestOdds: "Beste Quote",
    bookmakers: "Anbieter",
    score: "Satzscore",
    confidence: "Sicherheit",
    reasoning: "Begrundung",
    surfaceStrength: "Belagstarke",
    importantTournaments: "Wichtige Turniere",
    tournamentProfile: "Turnierprofil",
    results: "Ergebnisse",
    pastResults: "Vergangene Ergebnisse",
    selectRound: "Runde auswahlen",
    previousRound: "Vorherige Runde",
    nextRound: "Nachste Runde",
    champion: "Sieger",
    finalist: "Finalist",
    category: "Kategorie",
    location: "Ort",
    month: "Monat",
    draw: "Draw",
    details: "Analyse öffnen",
    liveDataPending: "Live-Matchdaten ausstehend",
    liveDataPendingText: "Aktuell liefert die Tennis-API keine echten terminierten Matches. Sobald echte Spiele zurückkommen, füllt sich diese Seite automatisch ohne Demo-Fallbacks.",
    apiStatus: "API-Status"
  }
} as const;

export async function TennisPage({
  locale,
  rankingCountry,
  rankingTop,
  tab = "news"
}: {
  locale: Locale;
  rankingCountry?: string;
  rankingTop?: number;
  tab?: TennisTab;
}) {
  const copy = text[locale];
  const apiSnapshot = await getSportApiSnapshot("tennis");
  const liveMatches = apiSnapshot.matches.length > 0 ? hydrateTennisMatches(apiSnapshot.matches) : [];
  const matches = getUpcomingTennisMatches(liveMatches);
  const nextTournamentContext = getNextTennisTournamentContext(matches);
  const fallbackTournament = getUpcomingCalendarTournament();
  const atpRanking = tab === "rankings" ? await getAtpRankingSnapshot(liveMatches) : null;
  const resolvedNewsTournamentContext =
    nextTournamentContext && nextTournamentContext.tournament
      ? nextTournamentContext
      : buildCalendarTournamentContext(fallbackTournament);
  const featured = nextTournamentContext?.featuredMatch ?? null;
  const tabItems = getTennisTabs(locale);
  const hasSideColumn = false;

  return (
    <main className="footballDetailShell sportschauFootballPage tennisPage">
      <section className="competitionHero sportschauCompetitionHero tennisHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{copy.tennis}</p>
          <h1>{locale === "de" ? "Tennis" : "Tennis"}</h1>
          <p>{locale === "de" ? "Prognosen für Matches, Beläge, Draws, Rankings und Spielerprofile." : "Predictions for matches, surfaces, draws, rankings and player profiles."}</p>
        </div>
        {featured ? <TennisFeaturedMatch locale={locale} match={featured} /> : null}
        <Link className="footballBackLink" href={localizePath("/#sports", locale)}>
          {copy.allSports}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label="Tennis navigation">
        {tabItems.map((item) => (
          <Link className={tab === item.tab ? "isActive" : ""} href={item.href} key={item.tab}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className={`sportschauPageGrid ${hasSideColumn ? "" : "isSingleColumn"}`}>
        <div className="sportschauMainColumn">
          {tab === "news" ? (
            <TennisNewsSection
              locale={locale}
              matches={matches}
              nextTournamentContext={resolvedNewsTournamentContext}
            />
          ) : null}
          {tab === "matches" ? (
            matches.length > 0 ? (
              <TennisMatchesSection locale={locale} matches={matches} />
            ) : (
              <TennisApiEmptySection locale={locale} status={apiSnapshot.status} message={apiSnapshot.message} />
            )
          ) : null}
          {tab === "tournaments" ? <TennisTournamentSection locale={locale} /> : null}
          {tab === "rankings" && atpRanking ? (
            <TennisRankingsSection
              atpRanking={atpRanking}
              locale={locale}
              matches={matches}
              rankingCountry={rankingCountry}
              rankingTop={rankingTop}
            />
          ) : null}
          {tab === "players" ? <TennisPlayersSection locale={locale} /> : null}
        </div>

        {hasSideColumn ? (
          <aside className="sportschauSideColumn">
            <TennisFactPanel locale={locale} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

export function TennisPlayerPage({ locale, playerSlug }: { locale: Locale; playerSlug: string }) {
  const player = getTennisPlayer(playerSlug);
  const copy = text[locale];

  if (!player) {
    notFound();
  }

  return (
    <main className="footballDetailShell sportschauFootballPage tennisPage">
      <section className="teamHero sportschauTeamHero tennisPlayerHero">
        <TennisPlayerAvatar className="teamHeroLogo" player={player} />
        <div>
          <p className="footballEyebrow">{copy.playerProfile}</p>
          <h1>{player.name}</h1>
          <p>{player.prediction} {copy.form}: {player.form}.</p>
        </div>
        <Link className="footballBackLink" href={localizePath("/tennis", locale)}>
          {copy.backToTennis}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={copy.playerProfile}>
        <a className="isActive" href="#info">{copy.info}</a>
        <a href="#surface">{copy.surface}</a>
        <a href="#form">{copy.form}</a>
      </nav>

      <section className="footballPanel teamInfoPanel tennisInfoPanel" id="info">
        <TennisPlayerAvatar className="teamHeroLogo" player={player} />
        <dl className="teamInfoList">
          <div><dt>{copy.ranking}</dt><dd>{player.tour} #{player.rank}</dd></div>
          <div><dt>{copy.age}</dt><dd>{player.age}</dd></div>
          <div><dt>{copy.hand}</dt><dd>{player.hand}</dd></div>
          <div><dt>{copy.height}</dt><dd>{player.height}</dd></div>
          <div><dt>{copy.turnedPro}</dt><dd>{player.turnedPro}</dd></div>
          <div><dt>{copy.residence}</dt><dd>{player.residence}</dd></div>
          <div><dt>{copy.coach}</dt><dd>{player.coach}</dd></div>
          <div><dt>{copy.titles}</dt><dd>{player.titles}</dd></div>
          <div><dt>{copy.grandSlams}</dt><dd>{player.grandSlams}</dd></div>
        </dl>
      </section>

      <section className="footballPanel teamMetricPanel tennisSurfacePanel" id="surface">
        <div className="sportschauSectionTitle">
          <span>{player.name}</span>
          <h2>{copy.surfaceStrength}</h2>
        </div>
        <div className="teamMetricGrid">
          <article className="teamMetricCard"><span>Hard</span><strong>{player.hard}</strong><small>Serve-return index</small></article>
          <article className="teamMetricCard"><span>Clay</span><strong>{player.clay}</strong><small>Rally tolerance</small></article>
          <article className="teamMetricCard"><span>Grass</span><strong>{player.grass}</strong><small>First-strike value</small></article>
        </div>
      </section>

      <section className="footballPanel teamDetailPanel" id="form">
        <div className="sportschauSectionTitle">
          <span>{copy.latestSignals}</span>
          <h2>{copy.form}</h2>
        </div>
        <div className="tennisStrengthList">
          {player.strengths.map((strength) => (
            <span key={strength}>{strength}</span>
          ))}
        </div>
        <p className="teamMetricNote">{player.prediction}</p>
      </section>
    </main>
  );
}

export function TennisTournamentPage({
  locale,
  roundSlug,
  tab = "results",
  tournamentSlug
}: {
  locale: Locale;
  roundSlug?: string;
  tab?: TennisTournamentTab;
  tournamentSlug: string;
}) {
  const tournament = getTennisTournament(tournamentSlug);
  const copy = text[locale];

  if (!tournament) {
    notFound();
  }

  const results = buildTournamentResults(tournament);
  const participants = getTournamentPlayers(tournament);
  const champion = results.find((result) => result.round === "Final")?.winner ?? results[0]?.winner;
  const finalist = results.find((result) => result.round === "Final")?.loser ?? results[0]?.loser;
  const tabItems = getTournamentTabs(tournament.slug, locale);

  return (
    <main className="footballDetailShell sportschauFootballPage tennisPage">
      <section className="competitionHero sportschauCompetitionHero tennisTournamentHero">
        <div className="sportschauCompetitionTitle">
          <p className="footballEyebrow">{copy.tournamentProfile}</p>
          <h1>{tournament.name}</h1>
          <p>{tournament.category} · {tournament.surface} · {tournament.location}</p>
        </div>
        <article className="featuredFixtureCard tennisFeaturedCard">
          <span>{copy.results}</span>
          <div className="featuredFixtureTeams">
            <TennisNameMark name={champion ?? tournament.name} />
            <strong>2:1</strong>
            <TennisNameMark name={finalist ?? tournament.location} />
          </div>
          <small>{champion} - {finalist}</small>
          <em>{tournament.name}</em>
        </article>
        <Link className="footballBackLink" href={localizePath(locale === "de" ? "/tennis/turniere" : "/tennis/tournaments", locale)}>
          {copy.tournaments}
        </Link>
      </section>

      <nav className="competitionTabs sportschauSubTabs" aria-label={copy.tournamentProfile}>
        {tabItems.map((item) => (
          <Link className={tab === item.tab ? "isActive" : ""} href={item.href} key={item.tab}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sportschauPageGrid isSingleColumn">
        <div className="sportschauMainColumn">
          {tab === "results" ? <TennisTournamentResultsSection copy={copy} locale={locale} results={results} roundSlug={roundSlug} tournament={tournament} /> : null}
          {tab === "info" ? <TennisTournamentInfoSection champion={champion} copy={copy} finalist={finalist} participants={participants} tournament={tournament} /> : null}
          {tab === "players" ? <TennisTournamentPlayersSection copy={copy} locale={locale} players={participants} /> : null}
        </div>
      </div>
    </main>
  );
}

export function tennisPlayerStaticParams() {
  return tennisPlayers.map((player) => ({ playerSlug: player.slug }));
}

export function tennisTournamentStaticParams() {
  return tennisTournaments.map((tournament) => ({ tournamentSlug: tournament.slug }));
}

function TennisTournamentResultsSection({
  copy,
  locale,
  results,
  roundSlug,
  tournament
}: {
  copy: (typeof text)[Locale];
  locale: Locale;
  results: ReturnType<typeof buildTournamentResults>;
  roundSlug?: string;
  tournament: TennisTournament;
}) {
  const roundGroups = getTournamentRoundGroups(results, locale);
  const activeIndex = Math.max(0, roundGroups.findIndex((round) => round.slug === roundSlug));
  const activeRound = roundGroups[activeIndex] ?? roundGroups[0];
  const visibleResults = activeRound ? results.filter((result) => result.roundSlug === activeRound.slug) : results;
  const previousRound = roundGroups[Math.max(0, activeIndex - 1)] ?? activeRound;
  const nextRound = roundGroups[Math.min(roundGroups.length - 1, activeIndex + 1)] ?? activeRound;

  return (
    <section className="footballPanel sportschauMatchPanel tennisTournamentResults" id="results">
      <div className="sportschauSectionTitle">
        <span>{copy.pastResults}</span>
        <h2>{tournament.name}</h2>
      </div>
      {activeRound ? (
        <nav className="matchdayStepper tennisRoundStepper" aria-label={copy.selectRound}>
          <Link aria-label={copy.previousRound} className="matchdayStepButton" href={getTournamentRoundHref(tournament.slug, locale, previousRound.slug)}>
            &lsaquo;
          </Link>
          <div className="matchdayStepCurrent">
            <span>{copy.selectRound}</span>
            <strong>{activeRound.label}</strong>
            <small>{activeIndex + 1} / {roundGroups.length}</small>
          </div>
          <Link aria-label={copy.nextRound} className="matchdayStepButton" href={getTournamentRoundHref(tournament.slug, locale, nextRound.slug)}>
            &rsaquo;
          </Link>
        </nav>
      ) : null}
      <div className="tennisResultList">
        {visibleResults.map((result) => (
          <article className="tennisResultRow" key={`${result.round}-${result.match}-${result.winner}-${result.loser}`}>
            <span>{getRoundLabel(result.round, locale)}</span>
            <strong>{result.winner}</strong>
            <em>{result.score}</em>
            <small>{result.loser}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function TennisTournamentInfoSection({
  champion,
  copy,
  finalist,
  participants,
  tournament
}: {
  champion?: string;
  copy: (typeof text)[Locale];
  finalist?: string;
  participants: TennisPlayer[];
  tournament: TennisTournament;
}) {
  return (
    <section className="footballPanel sportschauInfoPanel tennisTournamentInfoPanel" id="info">
      <div className="sportschauSectionTitle">
        <span>{copy.info}</span>
        <h2>{tournament.name}</h2>
      </div>
      <div className="tennisInfoGrid">
        <article><span>{copy.category}</span><strong>{tournament.category}</strong></article>
        <article><span>{copy.surface}</span><strong>{tournament.surface}</strong></article>
        <article><span>{copy.location}</span><strong>{tournament.location}</strong></article>
        <article><span>{copy.month}</span><strong>{tournament.month}</strong></article>
        <article><span>{copy.draw}</span><strong>{tournament.draw}</strong></article>
        <article><span>{copy.champion}</span><strong>{champion}</strong></article>
        <article><span>{copy.finalist}</span><strong>{finalist}</strong></article>
        <article><span>{copy.players}</span><strong>{participants.length}</strong></article>
      </div>
      <p className="teamMetricNote">
        {tournament.name} {tournament.category} {tournament.surface}: {participants.slice(0, 3).map((player) => player.shortName).join(", ")}.
      </p>
    </section>
  );
}

function TennisTournamentPlayersSection({
  copy,
  locale,
  players
}: {
  copy: (typeof text)[Locale];
  locale: Locale;
  players: TennisPlayer[];
}) {
  return (
    <section className="footballPanel sportschauTeamsPanel" id="players">
      <div className="sportschauSectionTitle">
        <span>{copy.players}</span>
        <h2>{copy.players}</h2>
      </div>
      <div className="compactTeamList teamsDirectoryList tennisPlayerDirectory">
        {players.map((player) => (
          <Link href={getPlayerHref(player.slug, locale)} key={player.slug}>
            <TennisPlayerAvatar player={player} />
            <span>{player.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TennisFeaturedMatch({ locale, match }: { locale: Locale; match: SportApiMatch }) {
  const copy = text[locale];

  return (
    <article className="featuredFixtureCard tennisFeaturedCard">
      <span>{copy.matchCenter}</span>
      <div className="featuredFixtureTeams">
        <TennisNameMark logo={match.homeLogo} name={match.homeName} />
        <strong>{formatTennisScore(match)}</strong>
        <TennisNameMark logo={match.awayLogo} name={match.awayName} />
      </div>
      <small>{match.homeName} - {match.awayName}</small>
      <em>{match.competition}</em>
    </article>
  );
}

function TennisMatchesSection({ locale, matches }: { locale: Locale; matches: SportApiMatch[] }) {
  const copy = text[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel" id="matches">
      <div className="footballPanelHeader">
        <div>
          <p>{copy.matches}</p>
        </div>
        <strong>{copy.tennis}</strong>
      </div>
      <div className="fixtureGrid sportschauFixtureList">
        {matches.map((match) => (
          <article className="fixtureRow tennisFixtureRow" key={match.id}>
            <Link
              aria-label={`${copy.details}: ${match.homeName} - ${match.awayName}`}
              className="fixtureCardOverlay"
              href={getSportMatchHref({ locale, match, sport: "tennis" })}
            />
            <div className="fixtureMatchLine">
              <TennisFixturePlayer align="right" locale={locale} logo={match.homeLogo} name={match.homeName} />
              <div className="fixtureTime">
                <span>{formatTennisDate(match.date, locale)}</span>
                <strong>{formatTennisScore(match)}</strong>
                <small>{match.competition}</small>
              </div>
              <TennisFixturePlayer align="left" locale={locale} logo={match.awayLogo} name={match.awayName} />
            </div>
            <TennisCompactOddsLine locale={locale} match={match} />
            <div className="fixturePrediction">
              <TennisPrediction locale={locale} match={match} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TennisApiEmptySection({
  locale
}: {
  locale: Locale;
  status: string;
  message: string | null;
}) {
  const copy = text[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel" id="matches">
      <div className="footballPanelHeader">
        <div>
          <p>{copy.matches}</p>
          <h2>{copy.liveDataPending}</h2>
        </div>
        <strong>{copy.tennis}</strong>
      </div>
      <div className="teamEmptyState">
        <h3>{copy.liveDataPending}</h3>
        <p>{copy.liveDataPendingText}</p>
      </div>
    </section>
  );
}

function TennisPrediction({ locale, match }: { locale: Locale; match: SportApiMatch }) {
  const copy = text[locale];
  const home = findPlayer(match.homeName);
  const away = findPlayer(match.awayName);
  const homeIndex = home ? home.rank * -1 + home.hard * 0.4 + home.clay * 0.25 + home.grass * 0.2 : 55;
  const awayIndex = away ? away.rank * -1 + away.hard * 0.4 + away.clay * 0.25 + away.grass * 0.2 : 55;
  const edge = homeIndex - awayIndex;
  const winner = edge >= 0 ? match.homeName : match.awayName;
  const confidence = Math.min(78, Math.max(54, Math.round(58 + Math.abs(edge) * 1.2)));
  const score = Math.abs(edge) > 8 ? "2:0" : "2:1";
  const reasoning = locale === "de"
    ? `${winner} liegt vorne, weil Ranking, Belagprofil, Form und Return-Stabilitat im Modell besser zusammenpassen.`
    : `${winner} leads because ranking, surface profile, form and return stability fit the model better.`;

  return (
    <div className="fixturePredictionMain tennisPredictionMain">
      <span>{copy.prediction}</span>
      <div className="predictionMetrics">
        <div><small>{copy.pick}</small><strong>{winner}</strong></div>
        <div><small>{copy.score}</small><strong>{score}</strong></div>
        <div><small>{copy.confidence}</small><strong>{confidence}%</strong></div>
      </div>
      <p className="predictionReasoning"><span>{copy.reasoning}</span>{reasoning}</p>
    </div>
  );
}

function TennisCompactOddsLine({ locale, match }: { locale: Locale; match: SportApiMatch }) {
  const copy = text[locale];
  const odds = match.odds;

  if (!odds || odds.outcomes.length === 0) {
    return null;
  }

  return (
    <div className="compactOddsLine" aria-label={copy.odds}>
      <span>{copy.odds}</span>
      {odds.outcomes.map((outcome) => (
        <small key={`${outcome.label}:${outcome.name}`}>
          <span className="compactOddsName">{formatCompactTennisOddsOutcomeLabel(outcome.label)}</span>
          <strong>{formatDecimalOdds(outcome.price)}</strong>
        </small>
      ))}
      <em>{formatCompactOddsSource(odds, locale, copy.bookmakers)}</em>
    </div>
  );
}

async function TennisNewsSection({
  locale,
  matches,
  nextTournamentContext
}: {
  locale: Locale;
  matches: SportApiMatch[];
  nextTournamentContext: TennisTournamentContext | null;
}) {
  const copy = text[locale];
  const newsItems = await getSportsNewsLinks({
    locale,
    topic: "tennis"
  });
  const upcomingMatches = getUpcomingTennisMatches(matches).slice(0, 5);

  const leadContent = (
    <>
      <span>{copy.nextTournament}</span>
      <h3>{nextTournamentContext?.tournamentLabel ?? (locale === "de" ? "Turnier folgt" : "Tournament pending")}</h3>
      <p>
        {nextTournamentContext
          ? locale === "de"
            ? `${formatTennisDate(nextTournamentContext.startDate, locale)} · ${nextTournamentContext.tournament?.location ?? "Tour-Kalender"} · ${nextTournamentContext.tournament?.surface ?? "Mixed"}`
            : `${formatTennisDate(nextTournamentContext.startDate, locale)} · ${nextTournamentContext.tournament?.location ?? "Tour calendar"} · ${nextTournamentContext.tournament?.surface ?? "Mixed"}`
          : locale === "de"
            ? "Sobald neue Turnierdaten vorliegen, erscheint hier direkt das nächste Event."
            : "As soon as new tournament data arrives, the next event will appear here."}
      </p>
      {nextTournamentContext?.featuredMatch ? (
        <small>{copy.nextTopMatch}: {nextTournamentContext.featuredMatch.homeName} - {nextTournamentContext.featuredMatch.awayName}</small>
      ) : null}
    </>
  );

  return (
    <section className="sportsNewsTabStack">
      {upcomingMatches.length > 0 ? (
        <div className="footballPanel sportschauNewsPanel">
          <div className="sportschauSectionTitle">
            <span>{copy.upcomingPredictions}</span>
            <h2>{copy.matches}</h2>
          </div>
          <div className="newsPredictionList">
            {upcomingMatches.map((match) => (
              <article className="fixtureRow tennisFixtureRow newsPredictionFixture" key={match.id}>
                <Link
                  aria-label={`${copy.details}: ${match.homeName} - ${match.awayName}`}
                  className="fixtureCardOverlay"
                  href={getSportMatchHref({ locale, match, sport: "tennis" })}
                />
                <div className="fixtureMatchLine">
                  <TennisFixturePlayer align="right" locale={locale} logo={match.homeLogo} name={match.homeName} />
                  <div className="fixtureTime">
                    <span>{formatTennisDate(match.date, locale)}</span>
                    <strong>{formatTennisScore(match)}</strong>
                    <small>{match.competition}</small>
                  </div>
                  <TennisFixturePlayer align="left" locale={locale} logo={match.awayLogo} name={match.awayName} />
                </div>
                <TennisCompactOddsLine locale={locale} match={match} />
                <div className="fixturePrediction">
                  <TennisPrediction locale={locale} match={match} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="footballPanel sportschauNewsPanel">
        <div className="sportschauSectionTitle">
          <span>{copy.latestSignals}</span>
          <h2>Tennis-News</h2>
        </div>
        <div className="footballNewsGrid sportschauNewsGrid">
          {nextTournamentContext?.tournament ? (
            <Link className="footballNewsCard sportschauLeadNews tennisLeadNews" href={getTournamentHref(nextTournamentContext.tournament.slug, locale)}>
              {leadContent}
            </Link>
          ) : (
            <article className="footballNewsCard sportschauLeadNews tennisLeadNews">
              {leadContent}
            </article>
          )}
          <SportsNewsCards items={newsItems.slice(0, 2)} locale={locale} />
        </div>
      </div>
    </section>
  );
}

function TennisTournamentSection({ locale }: { locale: Locale }) {
  const copy = text[locale];
  const groups = groupTournaments();

  return (
    <section className="footballPanel sportschauTeamsPanel tennisTournamentPanel">
      <div className="sportschauSectionTitle">
        <span>{copy.importantTournaments}</span>
        <h2>{copy.tournaments}</h2>
      </div>
      <div className="tennisTournamentGroups">
        {groups.map((group) => (
          <article className="tennisTournamentGroup" key={group.category}>
            <h3>{group.category}</h3>
            <div className="tennisTournamentGrid">
              {group.tournaments.map((tournament) => (
                <TennisTournamentCard key={tournament.slug} locale={locale} tournament={tournament} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function TennisTournamentCard({ locale, tournament }: { locale: Locale; tournament: TennisTournament }) {
  const copy = text[locale];

  return (
    <Link className="tennisTournamentCard" href={getTournamentHref(tournament.slug, locale)}>
      <div className="tennisTournamentMark">
        <span>{tournament.category}</span>
      </div>
      <div>
        <strong>{tournament.name}</strong>
        <small>{tournament.location} · {tournament.surface}</small>
      </div>
      <dl>
        <div><dt>{copy.month}</dt><dd>{tournament.month}</dd></div>
        <div><dt>{copy.draw}</dt><dd>{tournament.draw}</dd></div>
      </dl>
    </Link>
  );
}

function TennisRankingsSection({
  atpRanking,
  locale,
  matches,
  rankingCountry,
  rankingTop
}: {
  atpRanking: TennisRankingSnapshot;
  locale: Locale;
  matches: SportApiMatch[];
  rankingCountry?: string;
  rankingTop?: number;
}) {
  const copy = text[locale];
  const wtaRows = buildModelRankingRows("WTA", matches);
  const topOptions = [10, 20, 50, 100];
  const selectedTop = normalizeRankingTop(rankingTop);
  const selectedCountry = normalizeRankingCountry(rankingCountry);
  const filteredAtpRows = filterRankingRows(atpRanking.rows, selectedCountry).slice(0, selectedTop);
  const filteredWtaRows = filterRankingRows(wtaRows, selectedCountry).slice(0, selectedTop);
  const availableCountryCodes = getAvailableRankingCountryCodes(atpRanking.rows, wtaRows);
  const rankingHref = getTennisRankingHref(locale);
  const selectedCountryLabel = selectedCountry ? getCountryLabel(selectedCountry, locale) : copy.allCountries;
  const atpPointsLabel = atpRanking.status === "live" || atpRanking.status === "snapshot" ? copy.officialPoints : copy.modelPoints;
  const atpStatusLabel = atpRanking.status === "live" ? copy.officialLive : copy.officialSnapshot;

  return (
    <section className="footballPanel sportschauTablePanel tennisRankingPanel tennisOfficialRankingPanel">
      <div className="sportschauSectionTitle">
        <span>{copy.ranking}</span>
        <h2>{copy.atpSingles}</h2>
      </div>
      <div className="tennisRankingControls">
        <span className="tennisRankingToggle">{copy.live}</span>
        <details className="tennisRankingDropdown">
          <summary className="tennisRankingSelect">Top {selectedTop}</summary>
          <div className="tennisRankingMenu" role="list">
            {topOptions.map((option) => (
              <Link
                className={option === selectedTop ? "isActive" : ""}
                href={buildTennisRankingFilterHref(rankingHref, option, selectedCountry)}
                key={option}
              >
                Top {option}
              </Link>
            ))}
          </div>
        </details>
        <details className="tennisRankingDropdown">
          <summary className="tennisRankingSelect">{selectedCountryLabel}</summary>
          <div className="tennisRankingMenu tennisRankingCountryMenu" role="list">
            <Link
              className={selectedCountry ? "" : "isActive"}
              href={buildTennisRankingFilterHref(rankingHref, selectedTop, null)}
            >
              {copy.allCountries}
            </Link>
            {availableCountryCodes.map((countryCode) => (
              <Link
                className={countryCode === selectedCountry ? "isActive" : ""}
                href={buildTennisRankingFilterHref(rankingHref, selectedTop, countryCode)}
                key={countryCode}
              >
                {getCountryLabel(countryCode, locale)}
              </Link>
            ))}
          </div>
        </details>
        <span className={`tennisRankingStatus is-${atpRanking.status}`}>{atpStatusLabel}</span>
      </div>
      <div className="leagueStandingGroup tennisStandingGroup">
        <h3>ATP</h3>
        <div className="leagueTable sportschauLeagueTable tennisRankingTable">
          <div className="leagueTableRow leagueTableHeader tennisOfficialRankRow" aria-hidden="true">
            <span>Rank</span>
            <span />
            <strong>{copy.players}</strong>
            <small>Age</small>
            <small>{atpPointsLabel}</small>
            <small>{copy.movement}</small>
            <small>{copy.tournamentsPlayed}</small>
            <small>{copy.dropping}</small>
            <em>{copy.nextBest}</em>
          </div>
          {filteredAtpRows.map((row) => (
            <TennisOfficialRankingRow key={`atp-${row.rank}-${row.playerName}`} locale={locale} row={row} />
          ))}
        </div>
      </div>
      <div className="leagueStandingGroup tennisStandingGroup tennisSecondaryRanking">
        <h3>WTA</h3>
        <div className="leagueTable sportschauLeagueTable tennisRankingTable">
          <div className="leagueTableRow leagueTableHeader tennisOfficialRankRow" aria-hidden="true">
            <span>Rank</span>
            <span />
            <strong>{copy.players}</strong>
            <small>Age</small>
            <small>{copy.modelPoints}</small>
            <small>{copy.movement}</small>
            <small>{copy.tournamentsPlayed}</small>
            <small>{copy.dropping}</small>
            <em>{copy.nextBest}</em>
          </div>
          {filteredWtaRows.map((row) => (
            <TennisOfficialRankingRow key={`wta-${row.rank}-${row.playerName}`} locale={locale} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TennisOfficialRankingRow({ locale, row }: { locale: Locale; row: TennisRankingRow }) {
  const localPlayer = row.playerSlug ? getTennisPlayer(row.playerSlug) : findPlayer(row.playerName);
  const content = (
    <>
      <span>{row.rank}</span>
      {localPlayer ? <TennisPlayerAvatar player={localPlayer} /> : <TennisNameMark name={row.playerName} />}
      <strong>{row.playerName}</strong>
      <small>{row.age ?? "-"}</small>
      <small>{formatRankingNumber(row.points, locale)}</small>
      <small className={getMovementClassName(row.movement)}>{formatRankingMovement(row.movement)}</small>
      <small>{formatRankingNumber(row.tournamentsPlayed, locale)}</small>
      <small>{formatRankingNumber(row.dropping, locale)}</small>
      <em>{formatRankingNumber(row.nextBest, locale)}</em>
    </>
  );

  if (row.playerSlug) {
    return <Link className="leagueTableRow tennisOfficialRankRow" href={getPlayerHref(row.playerSlug, locale)}>{content}</Link>;
  }

  return <div className="leagueTableRow tennisOfficialRankRow">{content}</div>;
}

function TennisPlayersSection({ locale }: { locale: Locale }) {
  const copy = text[locale];

  return (
    <section className="footballPanel sportschauTeamsPanel">
      <div className="sportschauSectionTitle">
        <span>{copy.playerProfile}</span>
        <h2>{copy.players}</h2>
      </div>
      <div className="compactTeamList teamsDirectoryList tennisPlayerDirectory">
        {tennisPlayers.map((player) => (
          <Link href={getPlayerHref(player.slug, locale)} key={player.slug}>
            <TennisPlayerAvatar player={player} />
            <span>{player.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TennisFactPanel({ locale }: { locale: Locale }) {
  const copy = text[locale];

  return (
    <section className="footballPanel sportschauInfoPanel">
      <p className="footballEyebrow">{copy.tennis}</p>
      <h2>{copy.importantTournaments}</h2>
      <div className="teamStatList">
        <div><span>Grand Slams</span><strong>4</strong></div>
        <div><span>ATP/WTA 1000</span><strong>9+</strong></div>
        <div><span>{copy.players}</span><strong>{tennisPlayers.length}</strong></div>
      </div>
    </section>
  );
}

function TennisFixturePlayer({ align, locale, logo, name }: { align: "left" | "right"; locale: Locale; logo?: null | string; name: string }) {
  const player = findPlayer(name);
  const mark = player ? <TennisPlayerAvatar player={player} /> : <TennisNameMark logo={logo} name={name} />;
  const content = align === "right" ? <>{name}{mark}</> : <>{mark}{name}</>;

  if (player) {
    return <Link className={`fixtureTeam fixtureTeam-${align}`} href={getPlayerHref(player.slug, locale)}>{content}</Link>;
  }

  return <span className={`fixtureTeam fixtureTeam-${align}`}>{content}</span>;
}

function TennisPlayerAvatar({ className = "", player }: { className?: string; player: TennisPlayer }) {
  const flag = getTennisFlagUrl(player.countryCode);
  const classes = `apiTeamLogo tennisAvatar ${flag ? "tennisAvatarHasFlag" : ""} ${className}`.trim();

  return (
    <span className={classes} title={player.name}>
      {flag ? <img alt="" src={flag} /> : null}
      <strong>{getInitials(player.name)}</strong>
    </span>
  );
}

function TennisNameMark({ logo, name }: { logo?: null | string; name: string }) {
  const resolvedLogo = logo || getTennisFlagUrl(resolveTennisPlayerCountryCode(name));

  if (resolvedLogo) {
    return (
      <span className="apiTeamLogo tennisAvatar tennisAvatarHasFlag tennisNameMark" title={name}>
        <img alt="" src={resolvedLogo} />
        <strong>{getInitials(name)}</strong>
      </span>
    );
  }

  return <span className="apiTeamLogo textLogo tennisNameMark">{getInitials(name)}</span>;
}

function getTennisTabs(locale: Locale): Array<{ href: string; label: string; tab: TennisTab }> {
  const copy = text[locale];
  const suffixes: Record<Locale, Record<TennisTab, string>> = {
    en: { news: "", matches: "matches", tournaments: "tournaments", rankings: "rankings", players: "players" },
    de: { news: "", matches: "vorhersagen", tournaments: "turniere", rankings: "ranking", players: "spieler" }
  };

  return [
    { tab: "news", label: copy.news, href: localizePath("/tennis", locale) },
    { tab: "matches", label: copy.matches, href: localizePath(`/tennis/${suffixes[locale].matches}`, locale) },
    { tab: "tournaments", label: copy.tournaments, href: localizePath(`/tennis/${suffixes[locale].tournaments}`, locale) },
    { tab: "rankings", label: copy.rankings, href: localizePath(`/tennis/${suffixes[locale].rankings}`, locale) },
    { tab: "players", label: copy.players, href: localizePath(`/tennis/${suffixes[locale].players}`, locale) }
  ];
}

function getTennisRankingHref(locale: Locale) {
  return localizePath(`/tennis/${locale === "de" ? "ranking" : "rankings"}`, locale);
}

function normalizeRankingTop(value?: number) {
  return value && [10, 20, 50, 100].includes(value) ? value : 100;
}

function normalizeRankingCountry(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function filterRankingRows<T extends { countryCode: null | string }>(rows: T[], countryCode: null | string) {
  if (!countryCode) {
    return rows;
  }

  return rows.filter((row) => row.countryCode?.toUpperCase() === countryCode);
}

function getAvailableRankingCountryCodes(...groups: Array<Array<{ countryCode: null | string }>>) {
  const codes = new Set<string>();

  groups.forEach((rows) => {
    rows.forEach((row) => {
      const code = row.countryCode?.toUpperCase();
      if (code && /^[A-Z]{2}$/.test(code)) {
        codes.add(code);
      }
    });
  });

  return [...codes].sort((left, right) => left.localeCompare(right));
}

function buildTennisRankingFilterHref(baseHref: string, top: number, country: null | string) {
  const params = new URLSearchParams();
  params.set("top", String(normalizeRankingTop(top)));

  if (country) {
    params.set("country", country.toLowerCase());
  }

  return `${baseHref}?${params.toString()}`;
}

function getCountryLabel(countryCode: string, locale: Locale) {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

function getTournamentTabs(tournamentSlug: string, locale: Locale): Array<{ href: string; label: string; tab: TennisTournamentTab }> {
  const copy = text[locale];
  const base = getTournamentHref(tournamentSlug, locale);
  const suffixes: Record<Locale, Record<TennisTournamentTab, string>> = {
    en: { results: "", info: "info", players: "players" },
    de: { results: "", info: "info", players: "spieler" }
  };

  return [
    { tab: "results", label: copy.results, href: base },
    { tab: "info", label: copy.info, href: `${base}/${suffixes[locale].info}` },
    { tab: "players", label: copy.players, href: `${base}/${suffixes[locale].players}` }
  ];
}

function getPlayerHref(playerSlug: string, locale: Locale) {
  return localizePath(`/tennis/player/${playerSlug}`, locale);
}

function getTournamentHref(tournamentSlug: string, locale: Locale) {
  return localizePath(`/tennis/${locale === "de" ? "turnier" : "tournament"}/${tournamentSlug}`, locale);
}

function getTournamentRoundHref(tournamentSlug: string, locale: Locale, roundSlug: string) {
  const base = getTournamentHref(tournamentSlug, locale);
  const segment = locale === "de" ? "ergebnisse" : "results";

  return `${base}/${segment}/${roundSlug}`;
}

function hydrateTennisMatches(matches: SportApiMatch[]) {
  return matches.map((match) => {
    const home = findPlayer(match.homeName);
    const away = findPlayer(match.awayName);
    const homeCountryCode = home?.countryCode ?? resolveTennisPlayerCountryCode(match.homeName);
    const awayCountryCode = away?.countryCode ?? resolveTennisPlayerCountryCode(match.awayName);

    return {
      ...match,
      homeLogo: match.homeLogo || getTennisFlagUrl(homeCountryCode),
      homeName: home?.name ?? match.homeName,
      awayLogo: match.awayLogo || getTennisFlagUrl(awayCountryCode),
      awayName: away?.name ?? match.awayName
    };
  });
}

function getUpcomingTennisTournaments(now = new Date()) {
  const nowTimestamp = now.getTime();

  return [...tennisTournaments]
    .map((tournament) => ({
      startTimestamp: getMatchTimestamp(buildTournamentStartDate(tournament)) ?? Number.MAX_SAFE_INTEGER,
      tournament
    }))
    .filter((entry) => entry.startTimestamp >= nowTimestamp)
    .sort((a, b) => {
      const dateDiff = a.startTimestamp - b.startTimestamp;
      return dateDiff !== 0 ? dateDiff : b.tournament.importance - a.tournament.importance;
    })
    .map((entry) => entry.tournament);
}

function getUpcomingTennisMatches(matches: SportApiMatch[]) {
  const now = Date.now();
  const live = matches
    .filter((match) => {
      const timestamp = getMatchTimestamp(match.date);
      return timestamp !== null && timestamp < now && isActiveTennisMatch(match) && !isCompletedTennisMatch(match);
    })
    .sort((a, b) => (getMatchTimestamp(a.date) ?? Number.MAX_SAFE_INTEGER) - (getMatchTimestamp(b.date) ?? Number.MAX_SAFE_INTEGER));
  const scheduled = matches
    .filter((match) => {
      const timestamp = getMatchTimestamp(match.date);
      return timestamp !== null && timestamp >= now && !isCompletedTennisMatch(match);
    })
    .sort((a, b) => (getMatchTimestamp(a.date) ?? Number.MAX_SAFE_INTEGER) - (getMatchTimestamp(b.date) ?? Number.MAX_SAFE_INTEGER));

  return [...live, ...scheduled];
}

function groupTournaments() {
  const order = ["Grand Slam", "Finals", "ATP 1000", "WTA 1000", "Team", "ATP 500", "WTA 500"];

  return order
    .map((category) => ({
      category,
      tournaments: tennisTournaments.filter((tournament) => tournament.category === category)
    }))
    .filter((group) => group.tournaments.length > 0);
}

function getNextTennisTournamentContext(matches: SportApiMatch[]): TennisTournamentContext | null {
  const now = Date.now();
  const upcomingMatches = matches
    .filter((match) => {
      const timestamp = getMatchTimestamp(match.date);
      return timestamp !== null && timestamp >= now && !isCompletedTennisMatch(match);
    })
    .sort((a, b) => (getMatchTimestamp(a.date) ?? Number.MAX_SAFE_INTEGER) - (getMatchTimestamp(b.date) ?? Number.MAX_SAFE_INTEGER));

  if (upcomingMatches.length === 0) {
    return null;
  }

  const nextCompetition = normalize(upcomingMatches[0].competition);
  const tournamentMatches = upcomingMatches.filter((match) => normalize(match.competition) === nextCompetition);
  const featuredMatch = getTopTournamentMatch(tournamentMatches) ?? tournamentMatches[0] ?? null;
  const tournament = findTournamentByCompetition(upcomingMatches[0].competition);

  return {
    featuredMatch,
    startDate: tournamentMatches[0]?.date ?? null,
    tournament: tournament ?? null,
    tournamentLabel: tournament?.name ?? upcomingMatches[0].competition
  };
}

function buildCalendarTournamentContext(tournament: TennisTournament | null): TennisTournamentContext | null {
  if (!tournament) {
    return null;
  }

  return {
    featuredMatch: null,
    startDate: buildTournamentStartDate(tournament),
    tournament,
    tournamentLabel: tournament.name
  };
}

function getUpcomingCalendarTournament(now = new Date()) {
  return getUpcomingTennisTournaments(now)[0] ?? null;
}

function buildModelRankingRows(tour: "ATP" | "WTA", matches: SportApiMatch[]): ModelRankingRow[] {
  const basePlayers = tennisPlayers.filter((player) => player.tour === tour);
  const liveScores = new Map(basePlayers.map((player) => [player.slug, 10000 - player.rank * 100]));

  matches.forEach((match) => {
    const home = findPlayer(match.homeName);
    const away = findPlayer(match.awayName);

    if (!home || !away || home.tour !== tour || away.tour !== tour) {
      return;
    }

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;

    if (homeScore === awayScore && !isActiveTennisMatch(match)) {
      return;
    }

    const tournamentWeight = getTournamentWeightByCompetition(match.competition);
    const resultShift = (homeScore - awayScore) * (isCompletedTennisMatch(match) ? 22 : 12);
    const pressureShift = Math.max(8, Math.round(tournamentWeight / 4));

    liveScores.set(home.slug, (liveScores.get(home.slug) ?? 0) + resultShift + pressureShift);
    liveScores.set(away.slug, (liveScores.get(away.slug) ?? 0) - resultShift - pressureShift);
  });

  return [...basePlayers]
    .sort((a, b) => {
      const scoreDiff = (liveScores.get(b.slug) ?? 0) - (liveScores.get(a.slug) ?? 0);
      return scoreDiff !== 0 ? scoreDiff : a.rank - b.rank;
    })
    .map((player, index) => ({
      age: player.age,
      countryCode: player.countryCode,
      dropping: Math.max(0, Math.round(player.titles * 28 + player.grandSlams * 160 + player.rank * 4)),
      form: player.form.replaceAll(" ", ""),
      movement: player.rank - (index + 1),
      nextBest: Math.max(0, Math.round(30 + (player.hard + player.grass) / 5)),
      playerName: player.name,
      playerSlug: player.slug,
      points: Math.round((liveScores.get(player.slug) ?? 0) + player.titles * 42 + player.grandSlams * 220),
      rank: index + 1,
      tournamentsPlayed: Math.max(15, Math.min(26, player.titles + 16))
    }));
}

function buildTournamentResults(tournament: TennisTournament) {
  const players = getTournamentPlayers(tournament);
  const isTeam = tournament.category === "Team";

  if (isTeam) {
    return [
      createTournamentResult(1, "Quarterfinal", "Germany", "United States", "2:1"),
      createTournamentResult(2, "Quarterfinal", "Spain", "France", "2:0"),
      createTournamentResult(3, "Quarterfinal", "Serbia", "Canada", "2:1"),
      createTournamentResult(4, "Quarterfinal", "Australia", "Netherlands", "2:0"),
      createTournamentResult(5, "Semifinal", "Italy", "Serbia", "2:1"),
      createTournamentResult(6, "Semifinal", "Australia", "Spain", "2:1"),
      createTournamentResult(7, "Final", "Italy", "Australia", "2:0")
    ] satisfies TennisTournamentResult[];
  }

  const bestOfFive = tournament.category === "Grand Slam";
  const drawSize = players.length >= 32 ? 32 : players.length >= 16 ? 16 : 8;
  const draw = players.slice(0, drawSize);
  let match = 1;
  const rows: TennisTournamentResult[] = [];
  const roundLabels = getRoundLabelsForDraw(drawSize);
  let currentRoundPlayers = draw;

  for (const round of roundLabels) {
    const winners: TennisPlayer[] = [];

    for (let index = 0; index < currentRoundPlayers.length; index += 2) {
      const winner = currentRoundPlayers[index];
      const loser = currentRoundPlayers[index + 1] ?? currentRoundPlayers[index];
      winners.push(winner);
      rows.push(createTournamentResult(
        match,
        round,
        winner.name,
        loser.name,
        round === "Final" ? (bestOfFive ? "3:1" : "2:1") : pickTennisScore(bestOfFive, match)
      ));
      match += 1;
    }

    currentRoundPlayers = winners;
  }

  return rows;
}

function createTournamentResult(match: number, round: string, winner: string, loser: string, score: string): TennisTournamentResult {
  return { match, round, roundSlug: getRoundSlug(round), winner, loser, score };
}

function getRoundLabelsForDraw(drawSize: number) {
  if (drawSize >= 32) {
    return ["Round of 32", "Round of 16", "Quarterfinal", "Semifinal", "Final"];
  }

  if (drawSize >= 16) {
    return ["Round of 16", "Quarterfinal", "Semifinal", "Final"];
  }

  return ["Quarterfinal", "Semifinal", "Final"];
}

function getTournamentRoundGroups(results: TennisTournamentResult[], locale: Locale) {
  const order = ["round-of-32", "round-of-16", "quarterfinal", "semifinal", "final"];
  const availableRounds = new Set(results.map((result) => result.roundSlug));

  return order
    .filter((roundSlug) => availableRounds.has(roundSlug))
    .map((roundSlug) => {
      const round = results.find((result) => result.roundSlug === roundSlug)?.round ?? roundSlug;
      return {
        label: getRoundLabel(round, locale),
        slug: roundSlug
      };
    });
}

function getRoundSlug(round: string) {
  const slugs: Record<string, string> = {
    "Round of 32": "round-of-32",
    "Round of 16": "round-of-16",
    Quarterfinal: "quarterfinal",
    Semifinal: "semifinal",
    Final: "final"
  };

  return slugs[round] ?? normalize(round);
}

function getRoundLabel(round: string, locale: Locale) {
  if (locale === "de") {
    const labels: Record<string, string> = {
      "Round of 32": "Sechzehntelfinale",
      "Round of 16": "Achtelfinale",
      Quarterfinal: "Viertelfinale",
      Semifinal: "Halbfinale",
      Final: "Finale"
    };

    return labels[round] ?? round;
  }

  return round;
}

function getTournamentPlayers(tournament: TennisTournament) {
  const tour =
    tournament.category.startsWith("WTA") || tournament.slug === "wta-finals"
      ? "WTA"
      : tournament.category.startsWith("ATP") || tournament.slug === "atp-finals"
        ? "ATP"
        : null;
  const surfaceKey = tournament.surface === "Clay" ? "clay" : tournament.surface === "Grass" ? "grass" : tournament.surface === "Indoor hard" ? "indoor" : "hard";
  const candidates = tour ? tennisPlayers.filter((player) => player.tour === tour) : tennisPlayers;
  const parsedDrawSize = Number(tournament.draw.match(/(\d+)/)?.[1] ?? candidates.length);
  const targetSize = tournament.category === "Finals" ? 8 : parsedDrawSize;

  return [...candidates]
    .sort((a, b) => b[surfaceKey] - a[surfaceKey] || a.rank - b.rank)
    .slice(0, Math.min(targetSize, candidates.length));
}

function getTournamentPreviewPlayers(tournament: TennisTournament) {
  const previewTour =
    tournament.category.startsWith("WTA") || tournament.slug === "wta-finals"
      ? "WTA"
      : tournament.category === "Team"
        ? null
        : "ATP";
  const previewCandidates = previewTour ? tennisPlayers.filter((player) => player.tour === previewTour) : tennisPlayers;
  const surfaceKey = tournament.surface === "Clay" ? "clay" : tournament.surface === "Grass" ? "grass" : tournament.surface === "Indoor hard" ? "indoor" : "hard";

  return [...previewCandidates].sort((a, b) => b[surfaceKey] - a[surfaceKey] || a.rank - b.rank);
}

function pickTennisScore(bestOfFive: boolean, seed: number) {
  if (bestOfFive) {
    return seed % 4 === 0 ? "3:2" : seed % 3 === 0 ? "3:1" : "3:0";
  }

  return seed % 3 === 0 ? "2:1" : "2:0";
}

function getTopTournamentMatch(matches: SportApiMatch[]) {
  return [...matches].sort((a, b) => {
    const scoreDiff = getMatchPowerScore(b) - getMatchPowerScore(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return (getMatchTimestamp(a.date) ?? Number.MAX_SAFE_INTEGER) - (getMatchTimestamp(b.date) ?? Number.MAX_SAFE_INTEGER);
  })[0] ?? null;
}

function getMatchPowerScore(match: SportApiMatch) {
  const home = findPlayer(match.homeName);
  const away = findPlayer(match.awayName);
  const homePower = home ? 120 - home.rank + home.hard / 5 : 0;
  const awayPower = away ? 120 - away.rank + away.hard / 5 : 0;

  return homePower + awayPower + getTournamentWeightByCompetition(match.competition);
}

function getTournamentWeightByCompetition(competitionName: string) {
  return findTournamentByCompetition(competitionName)?.importance ?? 60;
}

function findTournamentByCompetition(competitionName: string) {
  const normalizedCompetition = normalize(competitionName);
  return tennisTournaments.find((tournament) => normalize(tournament.name) === normalizedCompetition) ?? null;
}

function getTournamentMonthIndex(monthLabel: string) {
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const normalizedMonth = normalize(monthLabel.replace("/", " "));
  const monthIndex = months.findIndex((month) => normalizedMonth.includes(month));
  return monthIndex >= 0 ? monthIndex : 11;
}

function buildTournamentStartDate(tournament: TennisTournament) {
  const startMonth = getTournamentMonthIndex(tournament.month);
  const now = new Date();
  const year = startMonth < now.getUTCMonth() ? now.getUTCFullYear() + 1 : now.getUTCFullYear();

  return new Date(Date.UTC(year, startMonth, 7, 12, 0, 0)).toISOString();
}

function isCompletedTennisMatch(match: SportApiMatch) {
  const status = normalize(match.status ?? "");
  return status.includes("finished") || status.includes("final") || status === "ft";
}

function isActiveTennisMatch(match: SportApiMatch) {
  const status = normalize(match.status ?? "");
  return status.includes("live") || status.includes("set") || status.includes("play") || status.includes("progress");
}

function getMatchTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatRankingMovement(movement: number | null) {
  if (movement === null || movement === 0) {
    return "-";
  }

  return movement > 0 ? `+${movement}` : `${movement}`;
}

function formatRankingNumber(value: number | null, locale: Locale) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US").format(value);
}

function getMovementClassName(movement: number | null) {
  if (movement === null || movement === 0) {
    return "";
  }

  return movement > 0 ? "isPositive" : "isNegative";
}

function findPlayer(name: string) {
  return findTennisPlayerByName(name);
}

function formatTennisScore(match: SportApiMatch) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return `${match.homeScore}:${match.awayScore}`;
  }

  if (match.date) {
    const date = new Date(match.date);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
    }
  }

  return "vs";
}

function formatTennisOddsOutcomeLabel(label: "home" | "draw" | "away", match: SportApiMatch, locale: Locale) {
  if (label === "home") {
    return match.homeName;
  }

  if (label === "away") {
    return match.awayName;
  }

  return locale === "de" ? "Remis" : "Draw";
}

function formatCompactTennisOddsOutcomeLabel(label: "home" | "draw" | "away") {
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

function formatTennisDate(value: string | null, locale: Locale) {
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

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}
