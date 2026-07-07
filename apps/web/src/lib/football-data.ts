export type FootballTeam = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  colors: [string, string];
  rank: number;
  points: number;
  form: string;
  prediction: string;
};

export type FootballCompetition = {
  slug: string;
  country: string;
  countryCode: string;
  name: string;
  type: "league" | "cup";
  description: string;
  modelFocus: string;
  teams: FootballTeam[];
};

const bundesligaTeams: FootballTeam[] = [
  { slug: "fc-bayern", name: "FC Bayern", shortName: "FCB", city: "Munich", colors: ["#dc052d", "#ffffff"], rank: 1, points: 73, form: "W W D W W", prediction: "Title favorite" },
  { slug: "borussia-dortmund", name: "Borussia Dortmund", shortName: "BVB", city: "Dortmund", colors: ["#fde100", "#111111"], rank: 2, points: 67, form: "W D W L W", prediction: "Top 2 race" },
  { slug: "rb-leipzig", name: "RB Leipzig", shortName: "RBL", city: "Leipzig", colors: ["#ffffff", "#dd013f"], rank: 3, points: 61, form: "D W W W L", prediction: "Champions League path" },
  { slug: "bayer-leverkusen", name: "Bayer Leverkusen", shortName: "B04", city: "Leverkusen", colors: ["#e32221", "#111111"], rank: 4, points: 59, form: "W L W D W", prediction: "High press signal" },
  { slug: "eintracht-frankfurt", name: "Eintracht Frankfurt", shortName: "SGE", city: "Frankfurt", colors: ["#e1000f", "#111111"], rank: 5, points: 54, form: "D W L W D", prediction: "Europe contender" },
  { slug: "vfb-stuttgart", name: "VfB Stuttgart", shortName: "VFB", city: "Stuttgart", colors: ["#ffffff", "#e30613"], rank: 6, points: 51, form: "W D L W W", prediction: "Upside attack model" },
  { slug: "borussia-moenchengladbach", name: "Borussia M'gladbach", shortName: "BMG", city: "Monchengladbach", colors: ["#ffffff", "#111111"], rank: 7, points: 47, form: "L W D W D", prediction: "Volatile matchups" },
  { slug: "sc-freiburg", name: "SC Freiburg", shortName: "SCF", city: "Freiburg", colors: ["#111111", "#ffffff"], rank: 8, points: 44, form: "D D W L W", prediction: "Set-piece edge" },
  { slug: "werder-bremen", name: "Werder Bremen", shortName: "SVW", city: "Bremen", colors: ["#1d9053", "#ffffff"], rank: 9, points: 40, form: "L W D D W", prediction: "Mid-table stable" },
  { slug: "hamburger-sv", name: "Hamburger SV", shortName: "HSV", city: "Hamburg", colors: ["#005ca9", "#ffffff"], rank: 10, points: 38, form: "W L L D W", prediction: "Momentum watch" },
  { slug: "fc-augsburg", name: "FC Augsburg", shortName: "FCA", city: "Augsburg", colors: ["#ba3733", "#ffffff"], rank: 11, points: 35, form: "D L W D L", prediction: "Home-form dependent" },
  { slug: "mainz-05", name: "Mainz 05", shortName: "M05", city: "Mainz", colors: ["#c3142d", "#ffffff"], rank: 12, points: 33, form: "L D W L D", prediction: "Relegation pressure" },
  { slug: "vfl-wolfsburg", name: "VfL Wolfsburg", shortName: "WOB", city: "Wolfsburg", colors: ["#65b32e", "#ffffff"], rank: 13, points: 32, form: "D W L D L", prediction: "Transition watch" },
  { slug: "union-berlin", name: "Union Berlin", shortName: "FCU", city: "Berlin", colors: ["#ed1c24", "#ffffff"], rank: 14, points: 31, form: "L D W L D", prediction: "Home intensity" },
  { slug: "tsg-hoffenheim", name: "1899 Hoffenheim", shortName: "TSG", city: "Sinsheim", colors: ["#005aaa", "#ffffff"], rank: 15, points: 30, form: "W L D L L", prediction: "Open-game risk" },
  { slug: "heidenheim", name: "Heidenheim", shortName: "HDH", city: "Heidenheim", colors: ["#d50032", "#0050a4"], rank: 16, points: 29, form: "D L D W L", prediction: "Survival battle" },
  { slug: "st-pauli", name: "St. Pauli", shortName: "STP", city: "Hamburg", colors: ["#6a3b1a", "#ffffff"], rank: 17, points: 27, form: "L D L W D", prediction: "Underdog pressure" },
  { slug: "holstein-kiel", name: "Holstein Kiel", shortName: "KSV", city: "Kiel", colors: ["#005aaa", "#ffffff"], rank: 18, points: 24, form: "L L D L W", prediction: "Relegation pressure" }
];

const premierLeagueTeams: FootballTeam[] = [
  { slug: "manchester-city", name: "Manchester City", shortName: "MCI", city: "Manchester", colors: ["#6cabdd", "#ffffff"], rank: 1, points: 78, form: "W W W D W", prediction: "Title favorite" },
  { slug: "arsenal", name: "Arsenal", shortName: "ARS", city: "London", colors: ["#ef0107", "#ffffff"], rank: 2, points: 75, form: "W D W W L", prediction: "Title pressure" },
  { slug: "liverpool", name: "Liverpool", shortName: "LIV", city: "Liverpool", colors: ["#c8102e", "#ffffff"], rank: 3, points: 72, form: "D W L W W", prediction: "High tempo edge" },
  { slug: "chelsea", name: "Chelsea", shortName: "CHE", city: "London", colors: ["#034694", "#ffffff"], rank: 4, points: 64, form: "W W D L W", prediction: "Top 4 race" },
  { slug: "tottenham", name: "Tottenham", shortName: "TOT", city: "London", colors: ["#ffffff", "#132257"], rank: 5, points: 61, form: "L W W D L", prediction: "Transition model" },
  { slug: "manchester-united", name: "Manchester United", shortName: "MUN", city: "Manchester", colors: ["#da291c", "#fbe122"], rank: 6, points: 58, form: "D L W W D", prediction: "Volatile signal" },
  { slug: "newcastle-united", name: "Newcastle United", shortName: "NEW", city: "Newcastle", colors: ["#111111", "#ffffff"], rank: 7, points: 55, form: "W D D L W", prediction: "Home power" },
  { slug: "aston-villa", name: "Aston Villa", shortName: "AVL", city: "Birmingham", colors: ["#95bfe5", "#670e36"], rank: 8, points: 52, form: "L W D W D", prediction: "Europe contender" },
  { slug: "brighton", name: "Brighton", shortName: "BHA", city: "Brighton", colors: ["#0057b8", "#ffffff"], rank: 9, points: 48, form: "W D L W D", prediction: "Possession upside" },
  { slug: "brentford", name: "Brentford", shortName: "BRE", city: "London", colors: ["#e30613", "#ffffff"], rank: 10, points: 45, form: "D W W L D", prediction: "Set-piece pressure" },
  { slug: "crystal-palace", name: "Crystal Palace", shortName: "CRY", city: "London", colors: ["#1b458f", "#c4122e"], rank: 11, points: 43, form: "W L D W L", prediction: "Transition threat" },
  { slug: "everton", name: "Everton", shortName: "EVE", city: "Liverpool", colors: ["#003399", "#ffffff"], rank: 12, points: 41, form: "D L W D W", prediction: "Defensive block" },
  { slug: "fulham", name: "Fulham", shortName: "FUL", city: "London", colors: ["#ffffff", "#111111"], rank: 13, points: 39, form: "L W D L W", prediction: "Home-form watch" },
  { slug: "west-ham", name: "West Ham", shortName: "WHU", city: "London", colors: ["#7a263a", "#1bb1e7"], rank: 14, points: 37, form: "D L D W L", prediction: "Counter model" },
  { slug: "wolves", name: "Wolves", shortName: "WOL", city: "Wolverhampton", colors: ["#fdb913", "#231f20"], rank: 15, points: 36, form: "L D W L D", prediction: "Low-margin profile" },
  { slug: "bournemouth", name: "Bournemouth", shortName: "BOU", city: "Bournemouth", colors: ["#da291c", "#000000"], rank: 16, points: 35, form: "W L L D W", prediction: "Pressing variance" },
  { slug: "nottingham-forest", name: "Nottingham Forest", shortName: "NFO", city: "Nottingham", colors: ["#dd0000", "#ffffff"], rank: 17, points: 33, form: "L D W L L", prediction: "Survival pressure" },
  { slug: "leicester-city", name: "Leicester City", shortName: "LEI", city: "Leicester", colors: ["#003090", "#fdbe11"], rank: 18, points: 30, form: "D L L W L", prediction: "Promotion volatility" },
  { slug: "southampton", name: "Southampton", shortName: "SOU", city: "Southampton", colors: ["#d71920", "#ffffff"], rank: 19, points: 27, form: "L L D L W", prediction: "Relegation pressure" },
  { slug: "ipswich-town", name: "Ipswich Town", shortName: "IPS", city: "Ipswich", colors: ["#0033a0", "#ffffff"], rank: 20, points: 24, form: "L D L W L", prediction: "Underdog watch" }
];

const laLigaTeams: FootballTeam[] = [
  { slug: "real-madrid", name: "Real Madrid", shortName: "RMA", city: "Madrid", colors: ["#ffffff", "#febe10"], rank: 1, points: 80, form: "W W D W W", prediction: "Title favorite" },
  { slug: "barcelona", name: "FC Barcelona", shortName: "BAR", city: "Barcelona", colors: ["#a50044", "#004d98"], rank: 2, points: 73, form: "W L W W D", prediction: "Chase model" },
  { slug: "atletico-madrid", name: "Atletico Madrid", shortName: "ATM", city: "Madrid", colors: ["#cb3524", "#ffffff"], rank: 3, points: 68, form: "D W W L W", prediction: "Defensive edge" },
  { slug: "real-sociedad", name: "Real Sociedad", shortName: "RSO", city: "San Sebastian", colors: ["#0067b1", "#ffffff"], rank: 4, points: 60, form: "W D L W D", prediction: "Europe race" },
  { slug: "athletic-bilbao", name: "Athletic Bilbao", shortName: "ATH", city: "Bilbao", colors: ["#ee2523", "#ffffff"], rank: 5, points: 57, form: "L W D W W", prediction: "Cup strength" },
  { slug: "villarreal", name: "Villarreal", shortName: "VIL", city: "Villarreal", colors: ["#fff200", "#005bac"], rank: 6, points: 53, form: "W D D L W", prediction: "Attack watch" },
  { slug: "real-betis", name: "Real Betis", shortName: "BET", city: "Seville", colors: ["#00954c", "#ffffff"], rank: 7, points: 50, form: "W D W L D", prediction: "Europe push" },
  { slug: "celta-vigo", name: "Celta Vigo", shortName: "CEL", city: "Vigo", colors: ["#8ac3ee", "#ffffff"], rank: 8, points: 47, form: "D W D L W", prediction: "Possession variance" },
  { slug: "rayo-vallecano", name: "Rayo Vallecano", shortName: "RAY", city: "Madrid", colors: ["#ffffff", "#e30613"], rank: 9, points: 44, form: "L D W D W", prediction: "Low-margin edge" },
  { slug: "osasuna", name: "Osasuna", shortName: "OSA", city: "Pamplona", colors: ["#0a346f", "#d91a21"], rank: 10, points: 42, form: "D L W D L", prediction: "Home-form dependent" },
  { slug: "mallorca", name: "Mallorca", shortName: "MLL", city: "Palma", colors: ["#e30613", "#111111"], rank: 11, points: 40, form: "W L D D L", prediction: "Compact block" },
  { slug: "valencia", name: "Valencia", shortName: "VAL", city: "Valencia", colors: ["#ffffff", "#f58220"], rank: 12, points: 39, form: "D L D W L", prediction: "Volatile attack" },
  { slug: "getafe", name: "Getafe", shortName: "GET", city: "Getafe", colors: ["#0052a5", "#ffffff"], rank: 13, points: 38, form: "L W D L D", prediction: "Defensive pressure" },
  { slug: "espanyol", name: "Espanyol", shortName: "ESP", city: "Barcelona", colors: ["#0057b8", "#ffffff"], rank: 14, points: 36, form: "D L W L D", prediction: "Survival watch" },
  { slug: "alaves", name: "Alaves", shortName: "ALA", city: "Vitoria-Gasteiz", colors: ["#005bac", "#ffffff"], rank: 15, points: 35, form: "L D D W L", prediction: "Low-score profile" },
  { slug: "girona", name: "Girona", shortName: "GIR", city: "Girona", colors: ["#d71920", "#ffffff"], rank: 16, points: 34, form: "W L L D L", prediction: "Transition upside" },
  { slug: "sevilla", name: "Sevilla", shortName: "SEV", city: "Seville", colors: ["#ffffff", "#d00027"], rank: 17, points: 33, form: "L D W L L", prediction: "Pressure profile" },
  { slug: "las-palmas", name: "Las Palmas", shortName: "LPA", city: "Las Palmas", colors: ["#ffe500", "#0057b8"], rank: 18, points: 30, form: "D L L D W", prediction: "Relegation pressure" },
  { slug: "leganes", name: "Leganes", shortName: "LEG", city: "Leganes", colors: ["#0057b8", "#ffffff"], rank: 19, points: 28, form: "L D L W L", prediction: "Underdog watch" },
  { slug: "valladolid", name: "Valladolid", shortName: "VLL", city: "Valladolid", colors: ["#7b2cbf", "#ffffff"], rank: 20, points: 24, form: "L L D L D", prediction: "Survival pressure" }
];

const ligue1Teams: FootballTeam[] = [
  { slug: "psg", name: "Paris Saint-Germain", shortName: "PSG", city: "Paris", colors: ["#004170", "#da291c"], rank: 1, points: 76, form: "W W W D W", prediction: "Title favorite" },
  { slug: "marseille", name: "Marseille", shortName: "OM", city: "Marseille", colors: ["#2faee0", "#ffffff"], rank: 2, points: 65, form: "W D L W W", prediction: "Chaser" },
  { slug: "monaco", name: "Monaco", shortName: "ASM", city: "Monaco", colors: ["#ed1a3b", "#ffffff"], rank: 3, points: 62, form: "D W W D L", prediction: "Top 3 signal" },
  { slug: "lyon", name: "Lyon", shortName: "OL", city: "Lyon", colors: ["#0055a4", "#ffffff"], rank: 4, points: 56, form: "W L D W D", prediction: "Form rebound" },
  { slug: "lille", name: "Lille", shortName: "LOSC", city: "Lille", colors: ["#e01e13", "#0b1f36"], rank: 5, points: 53, form: "D W L W W", prediction: "Europe edge" },
  { slug: "nice", name: "Nice", shortName: "OGCN", city: "Nice", colors: ["#d71920", "#111111"], rank: 6, points: 49, form: "L D W D W", prediction: "Low-score model" },
  { slug: "strasbourg", name: "Strasbourg", shortName: "RCSA", city: "Strasbourg", colors: ["#009fe3", "#ffffff"], rank: 7, points: 46, form: "W D L W D", prediction: "Youth upside" },
  { slug: "lens", name: "Lens", shortName: "RCL", city: "Lens", colors: ["#d6001c", "#f6d000"], rank: 8, points: 45, form: "D W D L W", prediction: "Pressing edge" },
  { slug: "brest", name: "Brest", shortName: "SB29", city: "Brest", colors: ["#e30613", "#ffffff"], rank: 9, points: 43, form: "L D W W L", prediction: "Set-piece watch" },
  { slug: "toulouse", name: "Toulouse", shortName: "TFC", city: "Toulouse", colors: ["#4b0082", "#ffffff"], rank: 10, points: 41, form: "W L D D W", prediction: "Mid-table stable" },
  { slug: "auxerre", name: "Auxerre", shortName: "AJA", city: "Auxerre", colors: ["#0055a4", "#ffffff"], rank: 11, points: 39, form: "D L W D L", prediction: "Home-form watch" },
  { slug: "rennes", name: "Rennes", shortName: "SRFC", city: "Rennes", colors: ["#e30613", "#111111"], rank: 12, points: 38, form: "L W D L D", prediction: "Volatile signal" },
  { slug: "nantes", name: "Nantes", shortName: "FCN", city: "Nantes", colors: ["#ffde00", "#00843d"], rank: 13, points: 36, form: "D L D W L", prediction: "Survival buffer" },
  { slug: "angers", name: "Angers", shortName: "SCO", city: "Angers", colors: ["#111111", "#ffffff"], rank: 14, points: 34, form: "W L L D D", prediction: "Low-margin profile" },
  { slug: "reims", name: "Reims", shortName: "SDR", city: "Reims", colors: ["#e30613", "#ffffff"], rank: 15, points: 33, form: "L D W L L", prediction: "Pressure watch" },
  { slug: "le-havre", name: "Le Havre", shortName: "HAC", city: "Le Havre", colors: ["#6ec6ff", "#001f54"], rank: 16, points: 31, form: "D L L W D", prediction: "Survival battle" },
  { slug: "saint-etienne", name: "Saint-Etienne", shortName: "ASSE", city: "Saint-Etienne", colors: ["#00843d", "#ffffff"], rank: 17, points: 29, form: "L D L W L", prediction: "Underdog pressure" },
  { slug: "montpellier", name: "Montpellier", shortName: "MHSC", city: "Montpellier", colors: ["#f58220", "#005baa"], rank: 18, points: 25, form: "L L D L W", prediction: "Relegation pressure" }
];

const serieATeams: FootballTeam[] = [
  { slug: "inter", name: "Inter", shortName: "INT", city: "Milan", colors: ["#0068a8", "#111111"], rank: 1, points: 79, form: "W W D W W", prediction: "Title favorite" },
  { slug: "juventus", name: "Juventus", shortName: "JUV", city: "Turin", colors: ["#ffffff", "#111111"], rank: 2, points: 70, form: "D W W L W", prediction: "Top 2 race" },
  { slug: "ac-milan", name: "AC Milan", shortName: "MIL", city: "Milan", colors: ["#fb090b", "#111111"], rank: 3, points: 67, form: "W L W W D", prediction: "Derby volatility" },
  { slug: "napoli", name: "Napoli", shortName: "NAP", city: "Naples", colors: ["#12a0d7", "#ffffff"], rank: 4, points: 61, form: "L W D W W", prediction: "Attack signal" },
  { slug: "roma", name: "Roma", shortName: "ROM", city: "Rome", colors: ["#8e1f2f", "#f0bc42"], rank: 5, points: 56, form: "D W L D W", prediction: "Europe race" },
  { slug: "lazio", name: "Lazio", shortName: "LAZ", city: "Rome", colors: ["#87d8f7", "#ffffff"], rank: 6, points: 52, form: "W D L W L", prediction: "Cup threat" },
  { slug: "atalanta", name: "Atalanta", shortName: "ATA", city: "Bergamo", colors: ["#0057b8", "#111111"], rank: 7, points: 51, form: "W W D L W", prediction: "High-tempo edge" },
  { slug: "fiorentina", name: "Fiorentina", shortName: "FIO", city: "Florence", colors: ["#5f259f", "#ffffff"], rank: 8, points: 49, form: "D W L W D", prediction: "Europe push" },
  { slug: "bologna", name: "Bologna", shortName: "BOL", city: "Bologna", colors: ["#a71930", "#1f2a44"], rank: 9, points: 47, form: "W D D L W", prediction: "Structured attack" },
  { slug: "como", name: "Como", shortName: "COM", city: "Como", colors: ["#005baa", "#ffffff"], rank: 10, points: 44, form: "D W L D W", prediction: "Possession upside" },
  { slug: "torino", name: "Torino", shortName: "TOR", city: "Turin", colors: ["#7c1f2b", "#ffffff"], rank: 11, points: 42, form: "L D W D L", prediction: "Defensive block" },
  { slug: "udinese", name: "Udinese", shortName: "UDI", city: "Udine", colors: ["#111111", "#ffffff"], rank: 12, points: 40, form: "D L D W L", prediction: "Low-score profile" },
  { slug: "genoa", name: "Genoa", shortName: "GEN", city: "Genoa", colors: ["#b00020", "#0033a0"], rank: 13, points: 38, form: "W L D L D", prediction: "Home-form watch" },
  { slug: "hellas-verona", name: "Hellas Verona", shortName: "VER", city: "Verona", colors: ["#ffcc00", "#0033a0"], rank: 14, points: 36, form: "L W D L D", prediction: "Survival buffer" },
  { slug: "cagliari", name: "Cagliari", shortName: "CAG", city: "Cagliari", colors: ["#003b7a", "#b00020"], rank: 15, points: 35, form: "D L W L L", prediction: "Low-margin profile" },
  { slug: "parma", name: "Parma", shortName: "PAR", city: "Parma", colors: ["#ffdd00", "#0055a4"], rank: 16, points: 33, form: "L D D W L", prediction: "Transition watch" },
  { slug: "lecce", name: "Lecce", shortName: "LEC", city: "Lecce", colors: ["#ffdd00", "#d71920"], rank: 17, points: 31, form: "D L L W D", prediction: "Survival battle" },
  { slug: "empoli", name: "Empoli", shortName: "EMP", city: "Empoli", colors: ["#0055a4", "#ffffff"], rank: 18, points: 29, form: "L D L L W", prediction: "Relegation pressure" },
  { slug: "venezia", name: "Venezia", shortName: "VEN", city: "Venice", colors: ["#f58220", "#00843d"], rank: 19, points: 27, form: "L L D W L", prediction: "Underdog watch" },
  { slug: "monza", name: "Monza", shortName: "MON", city: "Monza", colors: ["#e30613", "#ffffff"], rank: 20, points: 24, form: "L D L L D", prediction: "Survival pressure" }
];

export const footballCompetitions: FootballCompetition[] = [
  {
    slug: "bundesliga",
    country: "Germany",
    countryCode: "DE",
    name: "Bundesliga",
    type: "league",
    description: "Germany's top league with title race, European spots and relegation pressure.",
    modelFocus: "xG trend, pressing profile, home advantage and injury-sensitive volatility.",
    teams: bundesligaTeams
  },
  {
    slug: "dfb-pokal",
    country: "Germany",
    countryCode: "DE",
    name: "DFB-Pokal",
    type: "cup",
    description: "Germany's national cup with knockout paths and upset-heavy matchups.",
    modelFocus: "Rotation risk, league gap, travel and one-game knockout pressure.",
    teams: bundesligaTeams
  },
  {
    slug: "premier-league",
    country: "England",
    countryCode: "GB",
    name: "Premier League",
    type: "league",
    description: "England's first division with high-tempo matchup forecasting.",
    modelFocus: "Shot quality, schedule density, pressing intensity and game state control.",
    teams: premierLeagueTeams
  },
  {
    slug: "fa-cup",
    country: "England",
    countryCode: "GB",
    name: "FA Cup",
    type: "cup",
    description: "England's national cup with draw paths, rotation reads and upset alerts.",
    modelFocus: "Squad rotation, venue effects and lower-division upset probability.",
    teams: premierLeagueTeams
  },
  {
    slug: "la-liga",
    country: "Spain",
    countryCode: "ES",
    name: "LaLiga / BBVA",
    type: "league",
    description: "Spain's first division with possession control and exact-score scenarios.",
    modelFocus: "Chance suppression, possession value, shot locations and set-piece quality.",
    teams: laLigaTeams
  },
  {
    slug: "copa-del-rey",
    country: "Spain",
    countryCode: "ES",
    name: "Copa del Rey",
    type: "cup",
    description: "Spain's national cup for knockout forecast paths and surprise candidates.",
    modelFocus: "Rotation strength, away pressure and one-leg upset risk.",
    teams: laLigaTeams
  },
  {
    slug: "ligue-1",
    country: "France",
    countryCode: "FR",
    name: "Ligue 1",
    type: "league",
    description: "France's first division with pace, chance quality and low-score profiles.",
    modelFocus: "Transition chances, defensive compactness and finishing variance.",
    teams: ligue1Teams
  },
  {
    slug: "coupe-de-france",
    country: "France",
    countryCode: "FR",
    name: "Coupe de France",
    type: "cup",
    description: "France's national cup with broad draw context and upset detection.",
    modelFocus: "League mismatch, rotation and travel-adjusted knockout pressure.",
    teams: ligue1Teams
  },
  {
    slug: "serie-a",
    country: "Italy",
    countryCode: "IT",
    name: "Serie A",
    type: "league",
    description: "Italy's first division with tactical profile, defensive strength and title paths.",
    modelFocus: "Shot prevention, field tilt, set pieces and opponent-specific tempo.",
    teams: serieATeams
  },
  {
    slug: "coppa-italia",
    country: "Italy",
    countryCode: "IT",
    name: "Coppa Italia",
    type: "cup",
    description: "Italy's national cup with knockout paths and tactical matchup forecasts.",
    modelFocus: "Rotation, tactical pace and cup-specific upset probability.",
    teams: serieATeams
  }
];

export function getCompetition(slug: string) {
  return footballCompetitions.find((competition) => competition.slug === slug);
}

export function getTeam(competitionSlug: string, teamSlug: string) {
  return getCompetition(competitionSlug)?.teams.find((team) => team.slug === teamSlug);
}

export function getCompetitionGroups() {
  return footballCompetitions.reduce<Array<{ country: string; countryCode: string; competitions: FootballCompetition[] }>>(
    (groups, competition) => {
      const group = groups.find((item) => item.country === competition.country);
      if (group) {
        group.competitions.push(competition);
      } else {
        groups.push({
          country: competition.country,
          countryCode: competition.countryCode,
          competitions: [competition]
        });
      }
      return groups;
    },
    []
  );
}
