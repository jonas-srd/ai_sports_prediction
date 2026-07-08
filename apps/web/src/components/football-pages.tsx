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
import { footballTeamProfiles } from "@/lib/football-team-profiles";
import { localizePath, type Locale } from "@/lib/i18n";
import { getSportMatchHref } from "@/components/match-detail-page";
import { getSportsNewsLinks } from "@/lib/sports-news";
import {
  fallbackTeamsToStandings,
  getFootballCompetitionApiSnapshot,
  getFootballTeamSquad,
  type SportApiMatch,
  type SportApiSquadPlayer,
  type SportApiStanding,
  type SportApiTeam
} from "@/lib/sports-api-data";
import { SportsNewsCards } from "@/components/sports-news-cards";

const labels = {
  en: {
    football: "Football",
    overview: "Competition overview",
    intro: "Choose a league or national cup. Each competition opens its own prediction hub with teams, news, fixtures, table and model signals.",
    leagues: "Leagues",
    cups: "Cups",
    europe: "European competitions",
    open: "Open",
    predictionHub: "Prediction hub",
    news: "News",
    matchday: "Matchday predictions",
    teamMatches: "Match predictions",
    table: "Table",
    scorers: "Scorers",
    teamStats: "Team stats",
    teams: "Teams",
    overviewTab: "Overview",
    results: "Results",
    rounds: "Rounds",
    cupPath: "Cup path",
    fixturesAndResults: "Predictions & fixtures",
    teamFixtures: "Match predictions",
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
    upcomingPredictions: "Next 5 predictions",
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
    featuredCompetitions: "Leagues and cups",
    noTableForCup: "Cup competitions do not use a league table. Follow the knockout path and fixtures instead.",
    participatingTeams: "Participating teams",
    formGuide: "Form guide",
    matchCenter: "Match center",
    modelPrediction: "LLM prediction",
    liveStatus: "Live score",
    finalStatus: "Final",
    scheduledStatus: "Scheduled",
    gamesShown: "games",
    selectMatchday: "Select matchday",
    predictionSignal: "AI prediction",
    cupPredictions: "Cup predictions",
    previousMatchday: "Previous",
    nextMatchday: "Next",
    confidence: "Confidence",
    predictedScore: "Score",
    pick: "Pick",
    reasoning: "Reasoning",
    squad: "Squad",
    info: "Info",
    fairPlay: "Fairness",
    running: "Running",
    duels: "Duels",
    squadUnavailable: "Squad data appears here as soon as a live roster is available for this team.",
    fullName: "Full name",
    nickname: "Nickname",
    country: "Country",
    colors: "Colors",
    founded: "Founded",
    sports: "Sports",
    stadium: "Stadium",
    capacity: "Capacity",
    details: "Open analysis",
    noLiveMatchesTitle: "No scheduled API fixtures",
    noLiveMatchesText: "As soon as the API returns real fixtures for this competition, predictions appear here. Demo pairings are hidden."
  },
  de: {
    football: "Fußball",
    overview: "Wettbewerbsübersicht",
    intro: "Wähle eine Liga oder einen nationalen Pokal. Jeder Wettbewerb öffnet seinen eigenen Prediction Hub mit Teams, News, Spieltag, Tabelle und Modell-Signalen.",
    leagues: "Ligen",
    cups: "Pokale",
    europe: "Europäische Wettbewerbe",
    open: "Öffnen",
    predictionHub: "Prediction Hub",
    news: "News",
    matchday: "Spieltag-Prognose",
    teamMatches: "Spiel-Prognosen",
    table: "Tabelle",
    scorers: "Torschützen",
    teamStats: "Teamstatistik",
    teams: "Teams",
    overviewTab: "Übersicht",
    results: "Ergebnisse",
    rounds: "Runden",
    cupPath: "Pokalpfad",
    fixturesAndResults: "Prognosen & Spiele",
    teamFixtures: "Spiel-Prognosen",
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
    upcomingPredictions: "Nächste 5 Prognosen",
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
    featuredCompetitions: "Ligen und Pokale",
    noTableForCup: "Pokalwettbewerbe haben keine Ligatabelle. Hier zählt der K.-o.-Pfad mit Spielen und Runden.",
    participatingTeams: "Teilnehmende Teams",
    formGuide: "Formkurve",
    matchCenter: "Matchcenter",
    modelPrediction: "LLM-Prognose",
    liveStatus: "Live-Stand",
    finalStatus: "Endstand",
    scheduledStatus: "Ansetzung",
    gamesShown: "Spiele",
    selectMatchday: "Spieltag auswählen",
    predictionSignal: "KI-Prognose",
    cupPredictions: "Pokal-Prognosen",
    previousMatchday: "Zurück",
    nextMatchday: "Weiter",
    confidence: "Sicherheit",
    predictedScore: "Ergebnis",
    pick: "Tipp",
    reasoning: "Begründung",
    squad: "Kader",
    info: "Infos",
    fairPlay: "Fairness",
    running: "Laufleistung",
    duels: "Zweikämpfe",
    squadUnavailable: "Kaderdaten erscheinen hier, sobald ein Live-Kader für dieses Team verfügbar ist.",
    fullName: "vollst. Name",
    nickname: "Spitzname",
    country: "Land",
    colors: "Farben",
    founded: "Gegründet",
    sports: "Sportarten",
    stadium: "Stadion",
    capacity: "Kapazität",
    details: "Analyse öffnen",
    noLiveMatchesTitle: "Keine echten API-Spiele terminiert",
    noLiveMatchesText: "Sobald die API echte Spiele für diesen Wettbewerb zurückgibt, erscheinen hier die Prognosen. Demo-Paarungen werden ausgeblendet."
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
export type TeamTab = "overview" | "matches" | "table" | "squad" | "scorers" | "fairness" | "running" | "duels" | "info" | "news" | "stats";

const teamNameAliases: Record<string, string[]> = {
  "fc-bayern": ["Bayern München", "Bayern Munich", "FC Bayern München"],
  "borussia-dortmund": ["Dortmund"],
  "borussia-moenchengladbach": ["Borussia Mönchengladbach", "Borussia Monchengladbach", "Borussia MG"],
  "mainz-05": ["FSV Mainz 05", "1. FSV Mainz 05"],
  "fc-augsburg": ["Augsburg"],
  "vfl-wolfsburg": ["Wolfsburg", "VfL Wolfsburg"],
  "union-berlin": ["Union Berlin", "1. FC Union Berlin"],
  "tsg-hoffenheim": ["Hoffenheim", "1899 Hoffenheim", "TSG Hoffenheim"],
  "heidenheim": ["Heidenheim", "1. FC Heidenheim"],
  "st-pauli": ["St. Pauli", "FC St. Pauli"],
  "holstein-kiel": ["Holstein Kiel"],
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
  "brighton": ["Brighton", "Brighton & Hove Albion", "Brighton and Hove Albion"],
  "brentford": ["Brentford"],
  "crystal-palace": ["Crystal Palace"],
  "everton": ["Everton"],
  "fulham": ["Fulham"],
  "west-ham": ["West Ham", "West Ham United"],
  "wolves": ["Wolves", "Wolverhampton Wanderers"],
  "bournemouth": ["Bournemouth", "AFC Bournemouth"],
  "nottingham-forest": ["Nottingham Forest"],
  "leicester-city": ["Leicester", "Leicester City"],
  "southampton": ["Southampton"],
  "ipswich-town": ["Ipswich", "Ipswich Town"],
  "real-madrid": ["Real Madrid"],
  "barcelona": ["Barcelona", "FC Barcelona"],
  "atletico-madrid": ["Atletico Madrid", "Atlético Madrid", "Atletico"],
  "real-sociedad": ["Real Sociedad"],
  "athletic-bilbao": ["Athletic Club", "Athletic Bilbao"],
  "villarreal": ["Villarreal"],
  "real-betis": ["Real Betis", "Betis"],
  "celta-vigo": ["Celta Vigo", "Celta de Vigo"],
  "rayo-vallecano": ["Rayo Vallecano"],
  "osasuna": ["Osasuna", "CA Osasuna"],
  "mallorca": ["Mallorca", "RCD Mallorca"],
  "valencia": ["Valencia", "Valencia CF"],
  "getafe": ["Getafe", "Getafe CF"],
  "espanyol": ["Espanyol", "RCD Espanyol"],
  "alaves": ["Alaves", "Alavés", "Deportivo Alaves"],
  "girona": ["Girona", "Girona FC"],
  "sevilla": ["Sevilla", "Sevilla FC"],
  "las-palmas": ["Las Palmas", "UD Las Palmas"],
  "leganes": ["Leganes", "Leganés", "CD Leganes"],
  "valladolid": ["Valladolid", "Real Valladolid"],
  "psg": ["Paris Saint Germain", "Paris Saint-Germain", "PSG"],
  "marseille": ["Olympique Marseille", "Marseille"],
  "monaco": ["AS Monaco", "Monaco"],
  "lyon": ["Olympique Lyonnais", "Lyon"],
  "lille": ["Lille", "LOSC Lille"],
  "nice": ["Nice", "OGC Nice"],
  "strasbourg": ["Strasbourg", "RC Strasbourg"],
  "lens": ["Lens", "RC Lens"],
  "brest": ["Brest", "Stade Brestois"],
  "toulouse": ["Toulouse", "Toulouse FC"],
  "auxerre": ["Auxerre", "AJ Auxerre"],
  "rennes": ["Rennes", "Stade Rennes"],
  "nantes": ["Nantes", "FC Nantes"],
  "angers": ["Angers", "Angers SCO"],
  "reims": ["Reims", "Stade Reims"],
  "le-havre": ["Le Havre", "HAC"],
  "saint-etienne": ["Saint-Etienne", "Saint-Étienne", "AS Saint-Etienne"],
  "montpellier": ["Montpellier", "Montpellier HSC"],
  "inter": ["Inter", "Inter Milan", "Internazionale"],
  "juventus": ["Juventus"],
  "ac-milan": ["AC Milan", "Milan"],
  "napoli": ["Napoli", "Naples"],
  "roma": ["AS Roma", "Roma"],
  "lazio": ["Lazio"],
  "atalanta": ["Atalanta"],
  "fiorentina": ["Fiorentina"],
  "bologna": ["Bologna"],
  "como": ["Como"],
  "torino": ["Torino"],
  "udinese": ["Udinese"],
  "genoa": ["Genoa"],
  "hellas-verona": ["Hellas Verona", "Verona"],
  "cagliari": ["Cagliari"],
  "parma": ["Parma"],
  "lecce": ["Lecce"],
  "empoli": ["Empoli"],
  "venezia": ["Venezia", "Venezia FC"],
  "monza": ["Monza"],
  "benfica": ["Benfica", "SL Benfica"],
  "porto": ["Porto", "FC Porto"],
  "sporting-cp": ["Sporting CP", "Sporting Lisbon", "Sporting Clube de Portugal"],
  "psv": ["PSV", "PSV Eindhoven"],
  "ajax": ["Ajax", "Ajax Amsterdam"],
  "feyenoord": ["Feyenoord"],
  "club-brugge": ["Club Brugge", "Club Brugge KV"],
  "anderlecht": ["Anderlecht", "RSC Anderlecht"],
  "union-saint-gilloise": ["Union Saint-Gilloise", "Union SG"],
  "celtic": ["Celtic", "Celtic FC"],
  "rangers": ["Rangers", "Rangers FC"],
  "galatasaray": ["Galatasaray"],
  "fenerbahce": ["Fenerbahce", "Fenerbahçe"],
  "shakhtar-donetsk": ["Shakhtar Donetsk", "Shakhtar"],
  "dynamo-kyiv": ["Dynamo Kyiv", "Dynamo Kiev"],
  "red-bull-salzburg": ["Red Bull Salzburg", "RB Salzburg", "Salzburg"],
  "sturm-graz": ["Sturm Graz"],
  "young-boys": ["Young Boys", "BSC Young Boys"],
  "olympiacos": ["Olympiacos", "Olympiakos"],
  "panathinaikos": ["Panathinaikos"],
  "slavia-prague": ["Slavia Prague", "Slavia Praha"],
  "sparta-prague": ["Sparta Prague", "Sparta Praha"],
  "copenhagen": ["FC Copenhagen", "Kobenhavn", "København"],
  "bodo-glimt": ["Bodo/Glimt", "Bodoe/Glimt", "Bodø/Glimt"],
  "qarabag": ["Qarabag", "Qarabağ"],
  "dinamo-zagreb": ["Dinamo Zagreb"],
  "paok": ["PAOK"],
  "fcsb": ["FCSB", "Steaua Bucuresti"]
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
  "coppa-italia": "https://media.api-sports.io/football/leagues/137.png",
  "champions-league": "https://media.api-sports.io/football/leagues/2.png",
  "europa-league": "https://media.api-sports.io/football/leagues/3.png",
  "conference-league": "https://media.api-sports.io/football/leagues/848.png"
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
  "vfl-wolfsburg": "https://media.api-sports.io/football/teams/161.png",
  "union-berlin": "https://media.api-sports.io/football/teams/182.png",
  "tsg-hoffenheim": "https://media.api-sports.io/football/teams/167.png",
  "heidenheim": "https://media.api-sports.io/football/teams/180.png",
  "st-pauli": "https://media.api-sports.io/football/teams/186.png",
  "holstein-kiel": "https://media.api-sports.io/football/teams/191.png",
  "manchester-city": "https://media.api-sports.io/football/teams/50.png",
  "arsenal": "https://media.api-sports.io/football/teams/42.png",
  "liverpool": "https://media.api-sports.io/football/teams/40.png",
  "chelsea": "https://media.api-sports.io/football/teams/49.png",
  "tottenham": "https://media.api-sports.io/football/teams/47.png",
  "manchester-united": "https://media.api-sports.io/football/teams/33.png",
  "newcastle-united": "https://media.api-sports.io/football/teams/34.png",
  "aston-villa": "https://media.api-sports.io/football/teams/66.png",
  "brighton": "https://media.api-sports.io/football/teams/51.png",
  "brentford": "https://media.api-sports.io/football/teams/55.png",
  "crystal-palace": "https://media.api-sports.io/football/teams/52.png",
  "everton": "https://media.api-sports.io/football/teams/45.png",
  "fulham": "https://media.api-sports.io/football/teams/36.png",
  "west-ham": "https://media.api-sports.io/football/teams/48.png",
  "wolves": "https://media.api-sports.io/football/teams/39.png",
  "bournemouth": "https://media.api-sports.io/football/teams/35.png",
  "nottingham-forest": "https://media.api-sports.io/football/teams/65.png",
  "leicester-city": "https://media.api-sports.io/football/teams/46.png",
  "southampton": "https://media.api-sports.io/football/teams/41.png",
  "ipswich-town": "https://media.api-sports.io/football/teams/57.png",
  "real-madrid": "https://media.api-sports.io/football/teams/541.png",
  "barcelona": "https://media.api-sports.io/football/teams/529.png",
  "atletico-madrid": "https://media.api-sports.io/football/teams/530.png",
  "real-sociedad": "https://media.api-sports.io/football/teams/548.png",
  "athletic-bilbao": "https://media.api-sports.io/football/teams/531.png",
  "villarreal": "https://media.api-sports.io/football/teams/533.png",
  "real-betis": "https://media.api-sports.io/football/teams/543.png",
  "celta-vigo": "https://media.api-sports.io/football/teams/538.png",
  "rayo-vallecano": "https://media.api-sports.io/football/teams/728.png",
  "osasuna": "https://media.api-sports.io/football/teams/727.png",
  "mallorca": "https://media.api-sports.io/football/teams/798.png",
  "valencia": "https://media.api-sports.io/football/teams/532.png",
  "getafe": "https://media.api-sports.io/football/teams/546.png",
  "espanyol": "https://media.api-sports.io/football/teams/540.png",
  "alaves": "https://media.api-sports.io/football/teams/542.png",
  "girona": "https://media.api-sports.io/football/teams/547.png",
  "sevilla": "https://media.api-sports.io/football/teams/536.png",
  "las-palmas": "https://media.api-sports.io/football/teams/534.png",
  "leganes": "https://media.api-sports.io/football/teams/797.png",
  "valladolid": "https://media.api-sports.io/football/teams/720.png",
  "psg": "https://media.api-sports.io/football/teams/85.png",
  "marseille": "https://media.api-sports.io/football/teams/81.png",
  "monaco": "https://media.api-sports.io/football/teams/91.png",
  "lyon": "https://media.api-sports.io/football/teams/80.png",
  "lille": "https://media.api-sports.io/football/teams/79.png",
  "nice": "https://media.api-sports.io/football/teams/84.png",
  "strasbourg": "https://media.api-sports.io/football/teams/95.png",
  "lens": "https://media.api-sports.io/football/teams/116.png",
  "brest": "https://media.api-sports.io/football/teams/106.png",
  "toulouse": "https://media.api-sports.io/football/teams/96.png",
  "auxerre": "https://media.api-sports.io/football/teams/108.png",
  "rennes": "https://media.api-sports.io/football/teams/94.png",
  "nantes": "https://media.api-sports.io/football/teams/83.png",
  "angers": "https://media.api-sports.io/football/teams/77.png",
  "reims": "https://media.api-sports.io/football/teams/93.png",
  "le-havre": "https://media.api-sports.io/football/teams/111.png",
  "saint-etienne": "https://media.api-sports.io/football/teams/1063.png",
  "montpellier": "https://media.api-sports.io/football/teams/82.png",
  "inter": "https://media.api-sports.io/football/teams/505.png",
  "juventus": "https://media.api-sports.io/football/teams/496.png",
  "ac-milan": "https://media.api-sports.io/football/teams/489.png",
  "napoli": "https://media.api-sports.io/football/teams/492.png",
  "roma": "https://media.api-sports.io/football/teams/497.png",
  "lazio": "https://media.api-sports.io/football/teams/487.png",
  "atalanta": "https://media.api-sports.io/football/teams/499.png",
  "fiorentina": "https://media.api-sports.io/football/teams/502.png",
  "bologna": "https://media.api-sports.io/football/teams/500.png",
  "como": "https://media.api-sports.io/football/teams/895.png",
  "torino": "https://media.api-sports.io/football/teams/503.png",
  "udinese": "https://media.api-sports.io/football/teams/494.png",
  "genoa": "https://media.api-sports.io/football/teams/495.png",
  "hellas-verona": "https://media.api-sports.io/football/teams/504.png",
  "cagliari": "https://media.api-sports.io/football/teams/490.png",
  "parma": "https://media.api-sports.io/football/teams/523.png",
  "lecce": "https://media.api-sports.io/football/teams/867.png",
  "empoli": "https://media.api-sports.io/football/teams/511.png",
  "venezia": "https://media.api-sports.io/football/teams/517.png",
  "monza": "https://media.api-sports.io/football/teams/1579.png",
  "benfica": "https://media.api-sports.io/football/teams/211.png",
  "porto": "https://media.api-sports.io/football/teams/212.png",
  "sporting-cp": "https://media.api-sports.io/football/teams/228.png",
  "psv": "https://media.api-sports.io/football/teams/197.png",
  "ajax": "https://media.api-sports.io/football/teams/194.png",
  "feyenoord": "https://media.api-sports.io/football/teams/209.png",
  "club-brugge": "https://media.api-sports.io/football/teams/569.png",
  "anderlecht": "https://media.api-sports.io/football/teams/554.png",
  "union-saint-gilloise": "https://media.api-sports.io/football/teams/1398.png",
  "celtic": "https://media.api-sports.io/football/teams/247.png",
  "rangers": "https://media.api-sports.io/football/teams/257.png",
  "galatasaray": "https://media.api-sports.io/football/teams/645.png",
  "fenerbahce": "https://media.api-sports.io/football/teams/611.png",
  "shakhtar-donetsk": "https://media.api-sports.io/football/teams/550.png",
  "dynamo-kyiv": "https://media.api-sports.io/football/teams/5505.png",
  "red-bull-salzburg": "https://media.api-sports.io/football/teams/571.png",
  "sturm-graz": "https://media.api-sports.io/football/teams/637.png",
  "young-boys": "https://media.api-sports.io/football/teams/552.png",
  "olympiacos": "https://media.api-sports.io/football/teams/553.png",
  "panathinaikos": "https://media.api-sports.io/football/teams/617.png",
  "slavia-prague": "https://media.api-sports.io/football/teams/560.png",
  "sparta-prague": "https://media.api-sports.io/football/teams/628.png",
  "copenhagen": "https://media.api-sports.io/football/teams/400.png",
  "bodo-glimt": "https://media.api-sports.io/football/teams/327.png",
  "qarabag": "https://media.api-sports.io/football/teams/556.png",
  "dinamo-zagreb": "https://media.api-sports.io/football/teams/596.png",
  "paok": "https://media.api-sports.io/football/teams/619.png",
  "fcsb": "https://media.api-sports.io/football/teams/559.png"
};

export function FootballOverviewPage({ locale }: { locale: Locale }) {
  const text = labels[locale];
  const leagues = footballCompetitions.filter((competition) => competition.type === "league" && competition.country !== "Europe");
  const europeanCompetitions = footballCompetitions.filter((competition) => competition.country === "Europe");
  const cups = footballCompetitions.filter((competition) => competition.type === "cup");

  return (
    <main className="shell footballShell">
      <section className="footballHero">
        <p className="footballEyebrow">{text.football}</p>
        <h1>{text.overview}</h1>
        <p>{text.intro}</p>
      </section>

      <section className="footballOverviewBands" aria-label={text.overview}>
        <CompetitionBand competitions={europeanCompetitions} title={text.europe} locale={locale} />
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
  selectedMatchday,
  tab = "news"
}: {
  competitionSlug: string;
  locale: Locale;
  selectedMatchday?: string;
  tab?: CompetitionTab;
}) {
  const competition = getCompetition(competitionSlug);
  const text = labels[locale];

  if (!competition) {
    notFound();
  }

  const apiSnapshot = await getFootballCompetitionApiSnapshot(competition);
  const apiFixtures = apiSnapshot.matches;
  const baseFixtures = apiFixtures;
  const standings = apiSnapshot.standings.length > 0 ? apiSnapshot.standings : fallbackTeamsToStandings(competition.teams);
  const displayTeams = buildDisplayTeams(competition, apiSnapshot.teams, standings, baseFixtures);
  const fixtures = getUpcomingFixtures(apiFixtures);
  const featuredFixture = getFeaturedFixture(competition, fixtures, locale);
  const isLeague = competition.type === "league";
  const activeTab = normalizeCompetitionTab(tab, isLeague);
  const hasSideColumn = false;
  const tabItems = [
    { href: getCompetitionTabHref(competition.slug, locale, "news"), label: text.news, tab: "news" as const },
    { href: getCompetitionTabHref(competition.slug, locale, "matchday"), label: isLeague ? text.matchday : text.cupPredictions, tab: "matchday" as const },
    ...(isLeague ? [{
      href: getCompetitionTabHref(competition.slug, locale, "table"),
      label: text.table,
      tab: "table" as const
    }] : []),
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
        <FeaturedFixtureCard competition={competition} fixture={featuredFixture} locale={locale} />
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

      <div className={`sportschauPageGrid ${hasSideColumn ? "" : "isSingleColumn"}`}>
        <div className="sportschauMainColumn">
          {activeTab === "matchday" ? (
            <MatchdaySection
              competition={competition}
              fixtures={fixtures}
              locale={locale}
              selectedMatchday={selectedMatchday}
            />
          ) : null}

          {activeTab === "news" ? (
            <CompetitionNewsSection competition={competition} fixtures={fixtures} locale={locale} />
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

        {hasSideColumn ? (
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

  const activeTab = tab === "overview" || tab === "stats" ? "info" : tab;
  const apiSnapshot = await getFootballCompetitionApiSnapshot(competition);
  const fixtures = getUpcomingFixtures(apiSnapshot.matches);
  const standings = apiSnapshot.standings.length > 0 ? apiSnapshot.standings : fallbackTeamsToStandings(competition.teams);
  const displayTeams = buildDisplayTeams(competition, apiSnapshot.teams, standings, fixtures);
  const apiTeam = findDisplayTeamByLocalTeam(displayTeams, team);
  const apiTeamRecord = apiSnapshot.teams.find((candidate) => teamMatchesName(team, candidate.name));
  const apiStanding = findStandingByLocalTeam(standings, team);
  const teamFixtures = getTeamFixtures(fixtures, team, apiTeam?.name).slice(0, 4);
  const squad = activeTab === "squad" && apiTeamRecord?.id
    ? await getFootballTeamSquad(apiTeamRecord.id)
    : [];
  const rank = apiStanding?.rank ?? team.rank;
  const points = apiStanding?.points ?? team.points;
  const form = apiStanding?.form ?? team.form;
  const teamTabs = [
    { href: getTeamTabHref(team.slug, locale, "matches", backCompetition?.slug), label: text.teamMatches, tab: "matches" as const },
    { href: getTeamTabHref(team.slug, locale, "table", backCompetition?.slug), label: text.table, tab: "table" as const },
    { href: getTeamTabHref(team.slug, locale, "squad", backCompetition?.slug), label: text.squad, tab: "squad" as const },
    { href: getTeamTabHref(team.slug, locale, "scorers", backCompetition?.slug), label: text.scorers, tab: "scorers" as const },
    { href: getTeamTabHref(team.slug, locale, "fairness", backCompetition?.slug), label: text.fairPlay, tab: "fairness" as const },
    { href: getTeamTabHref(team.slug, locale, "running", backCompetition?.slug), label: text.running, tab: "running" as const },
    { href: getTeamTabHref(team.slug, locale, "duels", backCompetition?.slug), label: text.duels, tab: "duels" as const },
    { href: getTeamTabHref(team.slug, locale, "info", backCompetition?.slug), label: text.info, tab: "info" as const }
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

      {activeTab === "info" ? (
        <TeamInfoSection
          apiTeamLogo={apiTeam?.logo ?? null}
          competition={competition}
          form={form}
          locale={locale}
          points={points}
          rank={rank}
          team={team}
        />
      ) : null}

      {activeTab === "news" ? (
        <section className="teamProfileGrid sportschauTeamProfileGrid" id="news">
          <TeamNewsCard competition={competition} form={form} team={team} locale={locale} />
          <TeamsCompactList competition={competition} displayTeams={displayTeams} locale={locale} />
        </section>
      ) : null}

      {activeTab === "matches" ? (
        <TeamMatchesSection competition={competition} fixtures={teamFixtures} locale={locale} team={team} />
      ) : null}

      {activeTab === "table" ? (
        competition.type === "league" ? (
          <LeagueTableSection competition={competition} highlightedTeam={team} locale={locale} standings={standings} />
        ) : (
          <CupRoundsSection competition={competition} fixtures={fixtures} locale={locale} />
        )
      ) : null}

      {activeTab === "squad" ? (
        <TeamSquadSection locale={locale} players={squad} team={team} />
      ) : null}

      {activeTab === "scorers" || activeTab === "fairness" || activeTab === "running" || activeTab === "duels" ? (
        <TeamMetricSection activeTab={activeTab} competition={competition} locale={locale} team={team} />
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

function TeamMatchesSection({
  competition,
  fixtures,
  locale,
  team
}: {
  competition: FootballCompetition;
  fixtures: SportApiMatch[];
  locale: Locale;
  team: FootballTeam;
}) {
  const text = labels[locale];

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel teamDetailPanel" id="matches">
      <div className="footballPanelHeader">
        <div>
          <p>{text.teamFixtures}</p>
          <span className="dataProviderNote">{competition.name}</span>
        </div>
        <strong>{team.shortName}</strong>
      </div>
      <div className="fixtureGrid sportschauFixtureList">
        {fixtures.length > 0 ? (
          fixtures.map((fixture) => (
            <article className="fixtureRow" key={fixture.id}>
              <Link
                aria-label={`${text.details}: ${fixture.homeName} - ${fixture.awayName}`}
                className="fixtureCardOverlay"
                href={getSportMatchHref({ competitionSlug: competition.slug, locale, match: fixture, sport: "football" })}
              />
              <FixtureTeam competition={competition} locale={locale} logo={fixture.homeLogo} name={fixture.homeName} align="right" />
              <div className="fixtureTime">
                <span>{formatFixtureDate(fixture.date, locale)}</span>
                <strong>{formatFixtureCenter(fixture, locale)}</strong>
                <small>{fixture.competition || competition.name}</small>
              </div>
              <FixtureTeam competition={competition} locale={locale} logo={fixture.awayLogo} name={fixture.awayName} align="left" />
            </article>
          ))
        ) : (
          <FootballEmptyMatches locale={locale} />
        )}
      </div>
    </section>
  );
}

function TeamInfoSection({
  apiTeamLogo,
  competition,
  form,
  locale,
  points,
  rank,
  team
}: {
  apiTeamLogo: string | null;
  competition: FootballCompetition;
  form: string | null;
  locale: Locale;
  points: number | null;
  rank: number;
  team: FootballTeam;
}) {
  const text = labels[locale];
  const info = getTeamInfo(team, competition, locale);

  return (
    <section className="footballPanel teamInfoPanel" id="info">
      <div className="teamInfoLogoWrap">
        <TeamProfileLogo logo={apiTeamLogo} team={team} />
      </div>
      <dl className="teamInfoList">
        <div><dt>{text.fullName}</dt><dd>{info.fullName}</dd></div>
        <div><dt>{text.nickname}</dt><dd>{info.nickname}</dd></div>
        <div><dt>{text.city}</dt><dd>{info.city}</dd></div>
        <div><dt>{text.country}</dt><dd>{info.country}</dd></div>
        <div><dt>{text.colors}</dt><dd>{info.colors}</dd></div>
        <div><dt>{text.founded}</dt><dd>{info.founded}</dd></div>
        <div><dt>{text.sports}</dt><dd>{info.sports}</dd></div>
        <div><dt>{text.stadium}</dt><dd>{info.stadium}</dd></div>
        <div><dt>{text.capacity}</dt><dd>{info.capacity}</dd></div>
      </dl>
      <div className="teamInfoCurrent">
        <span>{competition.name}</span>
        <strong>{competition.type === "league" ? `#${rank}` : text.cupPath}</strong>
        <small>{competition.type === "league" ? `${points ?? "-"} ${text.points} · ${text.form}: ${form ?? "-"}` : team.prediction}</small>
      </div>
    </section>
  );
}

function TeamSquadSection({
  locale,
  players,
  team
}: {
  locale: Locale;
  players: SportApiSquadPlayer[];
  team: FootballTeam;
}) {
  const text = labels[locale];
  const groupedPlayers = groupSquadPlayers(players);

  return (
    <section className="footballPanel teamDetailPanel" id="squad">
      <div className="sportschauSectionTitle">
        <span>{team.name}</span>
        <h2>{text.squad}</h2>
      </div>
      {players.length > 0 ? (
        <div className="teamSquadGrid">
          {groupedPlayers.map((group) => (
            <article className="teamSquadGroup" key={group.position}>
              <h3>{group.position}</h3>
              <div>
                {group.players.map((player) => (
                  <div className="teamSquadPlayer" key={player.id}>
                    {player.photo ? <img alt="" src={player.photo} /> : <span>{getInitials(player.name)}</span>}
                    <strong>{player.name}</strong>
                    <small>{player.number ? `#${player.number}` : "-"} {player.age ? `· ${player.age}` : ""}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="teamEmptyState">
          <TeamCrest team={team} size="md" />
          <p>{text.squadUnavailable}</p>
        </div>
      )}
    </section>
  );
}

function TeamMetricSection({
  activeTab,
  competition,
  locale,
  team
}: {
  activeTab: TeamTab;
  competition: FootballCompetition;
  locale: Locale;
  team: FootballTeam;
}) {
  const text = labels[locale];
  const metric = getTeamMetric(activeTab, team, competition, locale);

  return (
    <section className="footballPanel teamDetailPanel teamMetricPanel">
      <div className="sportschauSectionTitle">
        <span>{team.name}</span>
        <h2>{metric.title}</h2>
      </div>
      <div className="teamMetricGrid">
        {metric.cards.map((card) => (
          <article className="teamMetricCard" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </div>
      <div className="teamMetricTable">
        {metric.rows.map((row) => (
          <div className={row.highlight ? "isHighlighted" : ""} key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.note}</small>
          </div>
        ))}
      </div>
      <p className="teamMetricNote">{text.modelSummary}: {competition.modelFocus}</p>
    </section>
  );
}

function MatchdaySection({
  competition,
  fixtures,
  locale,
  selectedMatchday
}: {
  competition: FootballCompetition;
  fixtures: SportApiMatch[];
  locale: Locale;
  selectedMatchday?: string;
}) {
  const text = labels[locale];
  const matchdayGroups = buildMatchdayGroups(fixtures, competition, locale);
  const activeMatchdayIndex = getActiveMatchdayIndex(selectedMatchday, matchdayGroups.length);
  const activeGroup = matchdayGroups[activeMatchdayIndex] ?? matchdayGroups[0];
  const visibleFixtures = activeGroup?.fixtures ?? fixtures;
  const hasMultipleGroups = matchdayGroups.length > 1;
  const previousMatchday = hasMultipleGroups ? ((activeMatchdayIndex - 1 + matchdayGroups.length) % matchdayGroups.length) + 1 : 1;
  const nextMatchday = hasMultipleGroups ? ((activeMatchdayIndex + 1) % matchdayGroups.length) + 1 : 1;

  return (
    <section className="footballPanel fixturePanel sportschauMatchPanel" id="matchday">
      <div className="footballPanelHeader">
        <div>
          <p>{text.fixturesAndResults}</p>
        </div>
        <strong>{activeGroup?.label ?? competition.name}</strong>
      </div>
      {hasMultipleGroups ? (
        <nav className="matchdayStepper" aria-label={text.selectMatchday}>
          <Link className="matchdayStepButton" href={getMatchdayHref(competition.slug, locale, previousMatchday)} aria-label={text.previousMatchday}>
            <span aria-hidden="true">‹</span>
          </Link>
          <div className="matchdayStepCurrent">
            <span>{text.selectMatchday}</span>
            <strong>{activeGroup?.label}</strong>
            <small>{activeMatchdayIndex + 1} / {matchdayGroups.length}</small>
          </div>
          <Link className="matchdayStepButton" href={getMatchdayHref(competition.slug, locale, nextMatchday)} aria-label={text.nextMatchday}>
            <span aria-hidden="true">›</span>
          </Link>
        </nav>
      ) : null}
      {visibleFixtures.length > 0 ? (
        <div className="fixtureGrid sportschauFixtureList">
          {visibleFixtures.map((fixture) => (
            <article className="fixtureRow" key={fixture.id}>
              <Link
                aria-label={`${text.details}: ${fixture.homeName} - ${fixture.awayName}`}
                className="fixtureCardOverlay"
                href={getSportMatchHref({ competitionSlug: competition.slug, locale, match: fixture, sport: "football" })}
              />
              <div className="fixtureMatchLine">
                <FixtureTeam competition={competition} locale={locale} logo={fixture.homeLogo} name={fixture.homeName} align="right" />
                <div className="fixtureTime">
                  <span>{formatFixtureDate(fixture.date, locale)}</span>
                  <strong>{formatFixtureCenter(fixture, locale)}</strong>
                  <small>{fixture.competition || competition.name}</small>
                </div>
                <FixtureTeam competition={competition} locale={locale} logo={fixture.awayLogo} name={fixture.awayName} align="left" />
              </div>
              <div className="fixturePrediction">
                <FixturePredictionCard competition={competition} fixture={fixture} locale={locale} />
                <div className="fixtureActionColumn">
                  <FixtureStatusPill fixture={fixture} locale={locale} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <FootballEmptyMatches locale={locale} />
      )}
    </section>
  );
}

async function CompetitionNewsSection({
  competition,
  fixtures,
  locale
}: {
  competition: FootballCompetition;
  fixtures: SportApiMatch[];
  locale: Locale;
}) {
  const text = labels[locale];
  const newsItems = await getSportsNewsLinks({
    contextName: competition.name,
    locale,
    topic: "football"
  });
  const upcomingFixtures = getUpcomingFixtures(fixtures).slice(0, 5);

  return (
    <section className="sportsNewsTabStack" id="news">
      {upcomingFixtures.length > 0 ? (
        <div className="footballPanel sportschauNewsPanel">
          <div className="sportschauSectionTitle">
            <span>{text.upcomingPredictions}</span>
            <h2>{text.fixturesAndResults}</h2>
          </div>
          <div className="newsPredictionList">
            {upcomingFixtures.map((fixture) => (
              <article className="fixtureRow newsPredictionFixture" key={fixture.id}>
                <Link
                  aria-label={`${text.details}: ${fixture.homeName} - ${fixture.awayName}`}
                  className="fixtureCardOverlay"
                  href={getSportMatchHref({ competitionSlug: competition.slug, locale, match: fixture, sport: "football" })}
                />
                <div className="fixtureMatchLine">
                  <FixtureTeam competition={competition} locale={locale} logo={fixture.homeLogo} name={fixture.homeName} align="right" />
                  <div className="fixtureTime">
                    <span>{formatFixtureDate(fixture.date, locale)}</span>
                    <strong>{formatFixtureCenter(fixture, locale)}</strong>
                    <small>{fixture.competition || competition.name}</small>
                  </div>
                  <FixtureTeam competition={competition} locale={locale} logo={fixture.awayLogo} name={fixture.awayName} align="left" />
                </div>
                <div className="fixturePrediction">
                  <FixturePredictionCard competition={competition} fixture={fixture} locale={locale} />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="footballPanel sportschauNewsPanel">
        <div className="sportschauSectionTitle">
          <span>{text.latestSignals}</span>
          <h2>{competition.name}-News</h2>
        </div>
        <div className="footballNewsGrid sportschauNewsGrid">
          <SportsNewsCards items={newsItems} locale={locale} />
        </div>
      </div>
    </section>
  );
}

function FootballEmptyMatches({ locale }: { locale: Locale }) {
  const text = labels[locale];

  return (
    <div className="teamEmptyState">
      <strong>{text.noLiveMatchesTitle}</strong>
      <p>{text.noLiveMatchesText}</p>
    </div>
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
      <p className="footballEyebrow">{text.teamStats}</p>
      <h2>{competition.name}</h2>
      <div className="teamStatList">
        <div><span>{text.league}</span><strong>{competition.type === "league" ? text.leagues : text.cups}</strong></div>
        <div><span>{text.teams}</span><strong>{displayTeams.length}</strong></div>
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

function getTeamInfo(team: FootballTeam, competition: FootballCompetition, locale: Locale) {
  const localizedCity = locale === "de" ? translateCity(team.city) : team.city;
  const localizedCountry = locale === "de" ? translateCountry(competition.country) : competition.country;
  const profile = footballTeamProfiles[team.slug];

  if (profile) {
    return {
      fullName: profile.fullName,
      nickname: profile.nickname,
      city: localizedCity,
      country: localizedCountry,
      colors: locale === "de" ? profile.colors.de : profile.colors.en,
      founded: profile.founded,
      sports: profile.sports ? profile.sports[locale] : labels[locale].football,
      stadium: profile.stadium,
      capacity: profile.capacity
    };
  }

  const fallback = {
    fullName: team.name,
    nickname: team.prediction,
    city: localizedCity,
    country: localizedCountry,
    colors: getTeamColorName(team.colors[0], locale),
    founded: "-",
    sports: labels[locale].football,
    stadium: `${localizedCity} Arena`,
    capacity: "-"
  };

  return fallback;
}

function groupSquadPlayers(players: SportApiSquadPlayer[]) {
  const groups = new Map<string, SportApiSquadPlayer[]>();

  players.forEach((player) => {
    const key = player.position || "Squad";
    groups.set(key, [...(groups.get(key) ?? []), player]);
  });

  return Array.from(groups.entries()).map(([position, groupPlayers]) => ({
    position,
    players: groupPlayers.sort((a, b) => (a.number ?? 99) - (b.number ?? 99) || a.name.localeCompare(b.name))
  }));
}

function getTeamMetric(activeTab: TeamTab, team: FootballTeam, competition: FootballCompetition, locale: Locale) {
  const text = labels[locale];
  const strength = Math.max(48, 92 - (team.rank * 2));
  const discipline = Math.max(42, 88 - team.rank);
  const running = 104 + Math.max(0, 18 - team.rank) * 0.9;
  const duelRate = Math.max(44, 62 - Math.floor(team.rank / 2));
  const cards = {
    scorers: [
      { label: locale === "de" ? "Top-Signal" : "Top signal", value: team.prediction, note: competition.name },
      { label: locale === "de" ? "Offensivwert" : "Attack index", value: `${strength}`, note: locale === "de" ? "modelliert" : "modelled" },
      { label: text.form, value: team.form, note: locale === "de" ? "letzte Spiele" : "recent matches" }
    ],
    fairness: [
      { label: text.fairPlay, value: `${discipline}`, note: locale === "de" ? "höher ist sauberer" : "higher is cleaner" },
      { label: locale === "de" ? "Risiko" : "Risk", value: team.rank > 12 ? "hoch" : "normal", note: competition.name },
      { label: text.form, value: team.form, note: locale === "de" ? "Disziplin-Kontext" : "discipline context" }
    ],
    running: [
      { label: text.running, value: `${running.toFixed(1)} km`, note: locale === "de" ? "Team-Schnitt" : "team average" },
      { label: locale === "de" ? "Intensität" : "Intensity", value: `${Math.round(strength)}%`, note: competition.modelFocus },
      { label: text.form, value: team.form, note: locale === "de" ? "Trend" : "trend" }
    ],
    duels: [
      { label: text.duels, value: `${duelRate}%`, note: locale === "de" ? "gewonnene Zweikämpfe" : "duels won" },
      { label: locale === "de" ? "Pressing" : "Pressing", value: `${Math.round(strength - 4)}%`, note: competition.name },
      { label: text.form, value: team.form, note: locale === "de" ? "Trend" : "trend" }
    ]
  };
  const tabKey = activeTab === "fairness" || activeTab === "running" || activeTab === "duels" ? activeTab : "scorers";
  const titles = {
    scorers: text.scorers,
    fairness: text.fairPlay,
    running: text.running,
    duels: text.duels
  };

  return {
    title: titles[tabKey],
    cards: cards[tabKey],
    rows: [
      { label: team.name, value: tabKey === "running" ? `${running.toFixed(1)} km` : cards[tabKey][1].value, note: team.prediction, highlight: true },
      { label: locale === "de" ? "Liga-Rang" : "League rank", value: `#${team.rank}`, note: `${team.points} ${text.points}` },
      { label: locale === "de" ? "Modellfokus" : "Model focus", value: competition.type === "league" ? text.table : text.cupPath, note: competition.modelFocus }
    ]
  };
}

function translateCity(city: string) {
  const cities: Record<string, string> = {
    Munich: "München",
    Monchengladbach: "Mönchengladbach",
    Cologne: "Köln"
  };

  return cities[city] ?? city;
}

function translateCountry(country: string) {
  const countries: Record<string, string> = {
    Germany: "Deutschland",
    England: "England",
    Spain: "Spanien",
    France: "Frankreich",
    Italy: "Italien",
    Europe: "Europa"
  };

  return countries[country] ?? country;
}

function getTeamColorName(color: string, locale: Locale) {
  const normalized = color.toLowerCase();
  if (normalized.includes("dc") || normalized.includes("e3") || normalized.includes("red") || normalized.includes("d7")) {
    return locale === "de" ? "rot-weiß" : "red-white";
  }

  return locale === "de" ? "Vereinsfarben" : "club colors";
}

function LeagueTableSection({
  competition,
  highlightedTeam,
  locale,
  standings
}: {
  competition: FootballCompetition;
  highlightedTeam?: FootballTeam;
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
        <div className="leagueTableRow leagueTableHeader footballTableRow" aria-hidden="true">
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
          <small>{text.form}</small>
        </div>
        {standings.map((team) => (
          <StandingRow
            competition={competition}
            highlightedTeam={highlightedTeam}
            key={`${team.rank}-${team.teamName}`}
            locale={locale}
            standing={team}
          />
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
              <span className="cupRoundTeam cupRoundTeamHome">
                <TeamMark logo={fixture.homeLogo} name={fixture.homeName} team={findCompetitionTeamByName(competition, fixture.homeName)} />
                <strong>{fixture.homeName}</strong>
              </span>
              <em>{formatFixtureCenter(fixture, locale)}</em>
              <span className="cupRoundTeam cupRoundTeamAway">
                <TeamMark logo={fixture.awayLogo} name={fixture.awayName} team={findCompetitionTeamByName(competition, fixture.awayName)} />
                <strong>{fixture.awayName}</strong>
              </span>
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

function getMatchdayHref(competitionSlug: string, locale: Locale, matchday: number) {
  const base = getCompetitionTabHref(competitionSlug, locale, "matchday");
  const key = locale === "de" ? "spieltag" : "matchday";

  return `${base}?${key}=${matchday}`;
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
      table: "table",
      squad: "squad",
      scorers: "scorers",
      fairness: "fairness",
      running: "running",
      duels: "duels",
      info: "info",
      news: "news",
      stats: "team-stats"
    },
    de: {
      overview: "",
      matches: "spieltag",
      table: "tabelle",
      squad: "kader",
      scorers: "torjaeger",
      fairness: "fairness",
      running: "laufleistung",
      duels: "zweikaempfe",
      info: "infos",
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

  if (!isLeague && (tab === "table" || tab === "rounds")) {
    return "matchday";
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

function buildMatchdayGroups(fixtures: SportApiMatch[], competition: FootballCompetition, locale: Locale) {
  const grouped = new Map<string, SportApiMatch[]>();

  fixtures.forEach((fixture, index) => {
    const key = getFixtureRoundKey(fixture, index, competition);
    const list = grouped.get(key) ?? [];
    list.push(fixture);
    grouped.set(key, list);
  });

  return Array.from(grouped.entries())
    .sort(([roundA], [roundB]) => {
      const numberA = getRoundNumber(roundA) ?? Number.MAX_SAFE_INTEGER;
      const numberB = getRoundNumber(roundB) ?? Number.MAX_SAFE_INTEGER;

      if (numberA !== numberB) {
        return numberA - numberB;
      }

      return roundA.localeCompare(roundB);
    })
    .map(([key, group], index) => {
      const roundNumber = getRoundNumber(key) ?? index + 1;
      const label = formatRoundLabel(key, roundNumber, competition, locale);

      return {
        fixtures: group.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
        key,
        label,
        shortLabel: String(roundNumber)
      };
    });
}

function getFeaturedFixture(competition: FootballCompetition, fixtures: SportApiMatch[], locale: Locale) {
  const groups = buildMatchdayGroups(fixtures, competition, locale);
  const nextGroup = groups[0];
  const candidates = nextGroup?.fixtures ?? fixtures;

  return [...candidates].sort((a, b) => getFixtureTopGameScore(b, competition) - getFixtureTopGameScore(a, competition))[0];
}

function getFixtureTopGameScore(fixture: SportApiMatch, competition: FootballCompetition) {
  const homeTeam = findCompetitionTeamByName(competition, fixture.homeName);
  const awayTeam = findCompetitionTeamByName(competition, fixture.awayName);
  const homeStrength = homeTeam ? getTeamStrength(homeTeam, true) : 0;
  const awayStrength = awayTeam ? getTeamStrength(awayTeam, false) : 0;
  const balanceBonus = 8 - Math.min(8, Math.abs(homeStrength - awayStrength));
  const starPower = Math.max(homeStrength, awayStrength) * 2.5;

  return starPower + homeStrength + awayStrength + (balanceBonus * 0.35);
}

function getFixtureRoundKey(fixture: SportApiMatch, index: number, competition: FootballCompetition) {
  if (fixture.round) {
    return fixture.round;
  }

  const gamesPerRound = Math.max(1, Math.floor(competition.teams.length / 2));
  const inferredRound = Math.floor(index / gamesPerRound) + 1;

  return competition.type === "league" ? `matchday:${inferredRound}` : `round:${inferredRound}`;
}

function getActiveMatchdayIndex(selectedMatchday: string | undefined, groupCount: number) {
  if (groupCount <= 0) {
    return 0;
  }

  const parsed = Number(selectedMatchday);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }

  return Math.min(groupCount - 1, Math.max(0, Math.floor(parsed) - 1));
}

function formatRoundLabel(key: string, roundNumber: number, competition: FootballCompetition, locale: Locale) {
  const normalizedKey = key.toLowerCase();
  const isNumberedRound = key.startsWith("matchday:") ||
    key.startsWith("round:") ||
    normalizedKey.includes("regular season") ||
    normalizedKey.includes("matchday") ||
    normalizedKey.includes("runde") ||
    normalizedKey.includes("round");

  if (!isNumberedRound) {
    return key;
  }

  if (competition.type === "league") {
    return locale === "de" ? `Spieltag ${roundNumber}` : `Matchday ${roundNumber}`;
  }

  return locale === "de" ? `Runde ${roundNumber}` : `Round ${roundNumber}`;
}

function getRoundNumber(round: string | null | undefined) {
  if (!round) {
    return null;
  }

  const direct = round.match(/^(?:matchday|round):(\d+)$/i);
  if (direct) {
    return Number(direct[1]);
  }

  const apiRound = round.match(/(?:matchday|regular season|round|runde)[^\d]*(\d+)/i);
  if (apiRound) {
    return Number(apiRound[1]);
  }

  const trailingNumber = round.match(/(\d+)\s*$/);
  return trailingNumber ? Number(trailingNumber[1]) : null;
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
  if (competition.type === "league") {
    return apiTeams;
  }

  return apiTeams.filter((team) => Boolean(team.logo) && Boolean(findCompetitionTeamByName(competition, team.name)));
}

function findDisplayTeamByLocalTeam(displayTeams: DisplayTeam[], team: FootballTeam) {
  return displayTeams.find((displayTeam) => teamMatchesName(team, displayTeam.name));
}

function findStandingByLocalTeam(standings: SportApiStanding[], team: FootballTeam) {
  return standings.find((standing) => teamMatchesName(team, standing.teamName));
}

function getTeamFixtures(fixtures: SportApiMatch[], team: FootballTeam, apiName?: string) {
  return fixtures.filter((fixture) =>
    teamMatchesName(team, fixture.homeName) ||
    teamMatchesName(team, fixture.awayName) ||
    (apiName ? normalizeName(fixture.homeName) === normalizeName(apiName) || normalizeName(fixture.awayName) === normalizeName(apiName) : false)
  );
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
      {align === "right" ? <span className="fixtureTeamName">{name}</span> : <TeamMark logo={logo} name={name} team={team} />}
      {align === "right" ? <TeamMark logo={logo} name={name} team={team} /> : <span className="fixtureTeamName">{name}</span>}
    </>
  );

  if (team) {
    return (
      <Link className={`fixtureTeam fixtureTeam-${align}`} href={getTeamHref(team.slug, locale, competition.slug)}>
        {content}
      </Link>
    );
  }

  return <span className={`fixtureTeam fixtureTeam-${align}`}>{content}</span>;
}

function FixturePredictionCard({ competition, fixture, locale }: { competition: FootballCompetition; fixture: SportApiMatch; locale: Locale }) {
  const text = labels[locale];
  const prediction = buildFixturePrediction(fixture, competition, locale);

  return (
    <div className="fixturePredictionMain">
      <span>{text.predictionSignal}</span>
      <div className="predictionMetrics">
        <div>
          <small>{text.pick}</small>
          <strong>{prediction.pick}</strong>
        </div>
        <div>
          <small>{text.predictedScore}</small>
          <strong>{prediction.score}</strong>
        </div>
        <div>
          <small>{text.confidence}</small>
          <strong>{prediction.confidence}</strong>
        </div>
      </div>
      <p className="predictionReasoning">
        <span>{text.reasoning}</span>
        {prediction.reasoning}
      </p>
    </div>
  );
}

function FixtureStatusPill({ fixture, locale }: { fixture: SportApiMatch; locale: Locale }) {
  const status = formatFixtureStatus(fixture, locale);

  if (!status) {
    return null;
  }

  return <span className={isLiveFixture(fixture) ? "fixtureMetaPill isLive" : "fixtureMetaPill"}>{status}</span>;
}

function StandingRow({
  competition,
  highlightedTeam,
  locale,
  standing
}: {
  competition: FootballCompetition;
  highlightedTeam?: FootballTeam;
  locale: Locale;
  standing: SportApiStanding;
}) {
  const team = findCompetitionTeamByName(competition, standing.teamName);
  const isHighlighted = Boolean(highlightedTeam && team && team.slug === highlightedTeam.slug);
  const className = isHighlighted ? "leagueTableRow footballTableRow isHighlightedTeam" : "leagueTableRow footballTableRow";
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
      <small className="standingForm">{standing.form ?? "-"}</small>
    </>
  );

  if (team) {
    return (
      <Link className={className} href={getTeamHref(team.slug, locale, competition.slug)}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
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

function getUpcomingFixtures(fixtures: SportApiMatch[]) {
  const now = Date.now();
  const scheduled = fixtures
    .filter((fixture) => {
      const timestamp = getFixtureTimestamp(fixture);
      return timestamp !== null && timestamp >= now && !isFinishedFixture(fixture);
    })
    .sort((a, b) => (getFixtureTimestamp(a) ?? Number.MAX_SAFE_INTEGER) - (getFixtureTimestamp(b) ?? Number.MAX_SAFE_INTEGER));

  return scheduled;
}

function getFixtureTimestamp(fixture: SportApiMatch) {
  if (!fixture.date) {
    return null;
  }

  const timestamp = new Date(fixture.date).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isFinishedFixture(fixture: SportApiMatch) {
  const status = (fixture.status ?? "").toLowerCase();
  return Boolean(fixture.homeScore !== null && fixture.awayScore !== null) || status.includes("ft") || status.includes("final") || status.includes("finished");
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

function formatFixtureStatus(fixture: SportApiMatch, locale: Locale) {
  const text = labels[locale];
  const score = fixture.homeScore !== null && fixture.awayScore !== null
    ? `${fixture.homeScore} - ${fixture.awayScore}`
    : null;
  const status = (fixture.status ?? "").toLowerCase();

  if (isLiveFixture(fixture)) {
    return score ? `${text.liveStatus}: ${score}` : text.liveStatus;
  }

  if (isFinalFixture(fixture) && score) {
    return `${text.finalStatus}: ${score}`;
  }

  if (score) {
    return `${fixture.status ?? text.finalStatus}: ${score}`;
  }

  if (!fixture.status || ["ns", "tbd", "preview", "not started"].includes(status)) {
    return null;
  }

  return fixture.status ?? null;
}

function isLiveFixture(fixture: SportApiMatch) {
  const status = (fixture.status ?? "").toLowerCase();

  return ["1h", "2h", "ht", "et", "bt", "p"].includes(status) || status.includes("live") || status.includes("in play");
}

function isFinalFixture(fixture: SportApiMatch) {
  const status = (fixture.status ?? "").toLowerCase();

  return ["ft", "aet", "pen", "match finished"].some((value) => status.includes(value));
}

function buildFixturePrediction(fixture: SportApiMatch, competition: FootballCompetition, locale: Locale) {
  const homeTeam = findCompetitionTeamByName(competition, fixture.homeName);
  const awayTeam = findCompetitionTeamByName(competition, fixture.awayName);

  if (!homeTeam || !awayTeam) {
    return {
      confidence: "52%",
      pick: locale === "de" ? "Knappes Spiel" : "Tight game",
      reasoning: locale === "de"
        ? "Ohne vollständiges Teamprofil sieht das Modell nur einen leichten Ausschlag und bewertet die Partie eng."
        : "With only a partial team profile, the model sees a limited edge and keeps the matchup tight.",
      score: "1:1"
    };
  }

  const homeStrength = getTeamStrength(homeTeam, true);
  const awayStrength = getTeamStrength(awayTeam, false);
  const edge = homeStrength - awayStrength;
  const confidence = Math.min(74, Math.max(52, Math.round(54 + Math.abs(edge) * 7)));
  const favorite = edge >= 0 ? homeTeam : awayTeam;
  const underdog = edge >= 0 ? awayTeam : homeTeam;
  const favoriteContext = buildFixtureReasoning(favorite, underdog, edge >= 0, Math.abs(edge), locale);

  if (Math.abs(edge) < 0.28) {
    return {
      confidence: `${confidence}%`,
      pick: locale === "de" ? "Remis" : "Draw",
      reasoning: locale === "de"
        ? `Die Profile liegen nah beieinander: ${homeTeam.name} hat Heimvorteil, ${awayTeam.name} hält mit Form- und Punktesignal dagegen.`
        : `The profiles are close: ${homeTeam.name} has the home edge, while ${awayTeam.name} counters with form and points signal.`,
      score: "1:1"
    };
  }

  if (edge > 0) {
    const score = edge > 1.4 ? "2:0" : "2:1";
    return {
      confidence: `${confidence}%`,
      pick: homeTeam.name,
      reasoning: favoriteContext,
      score
    };
  }

  const score = edge < -1.4 ? "0:2" : "1:2";
  return {
    confidence: `${confidence}%`,
    pick: awayTeam.name,
    reasoning: favoriteContext,
    score
  };
}

function buildFixtureReasoning(
  favorite: FootballTeam,
  underdog: FootballTeam,
  favoriteIsHome: boolean,
  edge: number,
  locale: Locale
) {
  const isStrongEdge = edge > 1.4;

  if (locale === "de") {
    const homeNote = favoriteIsHome ? "Dazu kommt der Heimvorteil." : "Trotz Auswärtsspiel bleibt der Modellvorteil sichtbar.";
    const edgeNote = isStrongEdge ? "Der Strength-Score ist klar vorne." : "Der Vorteil ist knapp, aber messbar.";

    return `${favorite.name} liegt vor ${underdog.name}: Rang ${favorite.rank}, ${favorite.points} Punkte und Form ${favorite.form} wiegen stärker. ${homeNote} ${edgeNote}`;
  }

  const homeNote = favoriteIsHome ? "The home edge adds to that." : "The model edge remains visible even away from home.";
  const edgeNote = isStrongEdge ? "The strength score is clearly ahead." : "The edge is narrow, but measurable.";

  return `${favorite.name} rates ahead of ${underdog.name}: rank ${favorite.rank}, ${favorite.points} points and form ${favorite.form} grade stronger. ${homeNote} ${edgeNote}`;
}

function getTeamStrength(team: FootballTeam, isHome: boolean) {
  const pointsComponent = team.points / 14;
  const rankComponent = Math.max(0, 22 - team.rank) / 3;
  const formComponent = team.form.split(/\s+/).reduce((sum, result) => {
    if (result === "W") {
      return sum + 0.25;
    }

    if (result === "D") {
      return sum + 0.08;
    }

    return sum - 0.08;
  }, 0);

  return pointsComponent + rankComponent + formComponent + (isHome ? 0.35 : 0);
}
