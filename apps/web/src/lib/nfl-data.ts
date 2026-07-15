import { createTeamFallbackLogo } from "@/lib/team-logo-fallback";

export type NflTeam = {
  slug: string;
  name: string;
  shortName: string;
  city: string;
  conference: "AFC" | "NFC";
  division: "East" | "North" | "South" | "West";
  colors: [string, string];
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  form: string;
  prediction: string;
  logo: string;
};

function teamFallbackLogo(code: string) {
  return createTeamFallbackLogo(code);
}

export const nflTeams: NflTeam[] = [
  { slug: "kansas-city-chiefs", name: "Kansas City Chiefs", shortName: "KC", city: "Kansas City", conference: "AFC", division: "West", colors: ["#e31837", "#ffb81c"], rank: 1, wins: 15, losses: 2, ties: 0, pointsFor: 385, pointsAgainst: 326, form: "W W W W W", prediction: "Super Bowl contender", logo: teamFallbackLogo("kc") },
  { slug: "buffalo-bills", name: "Buffalo Bills", shortName: "BUF", city: "Buffalo", conference: "AFC", division: "East", colors: ["#00338d", "#c60c30"], rank: 2, wins: 13, losses: 4, ties: 0, pointsFor: 525, pointsAgainst: 368, form: "W W L W W", prediction: "AFC title path", logo: teamFallbackLogo("buf") },
  { slug: "baltimore-ravens", name: "Baltimore Ravens", shortName: "BAL", city: "Baltimore", conference: "AFC", division: "North", colors: ["#241773", "#9e7c0c"], rank: 3, wins: 12, losses: 5, ties: 0, pointsFor: 518, pointsAgainst: 361, form: "W L W W L", prediction: "Explosive offense", logo: teamFallbackLogo("bal") },
  { slug: "houston-texans", name: "Houston Texans", shortName: "HOU", city: "Houston", conference: "AFC", division: "South", colors: ["#03202f", "#a71930"], rank: 4, wins: 10, losses: 7, ties: 0, pointsFor: 372, pointsAgainst: 372, form: "W W L L W", prediction: "Division pressure", logo: teamFallbackLogo("hou") },
  { slug: "los-angeles-chargers", name: "Los Angeles Chargers", shortName: "LAC", city: "Los Angeles", conference: "AFC", division: "West", colors: ["#0080c6", "#ffc20e"], rank: 5, wins: 11, losses: 6, ties: 0, pointsFor: 402, pointsAgainst: 301, form: "W W W L W", prediction: "Wildcard upside", logo: teamFallbackLogo("lac") },
  { slug: "pittsburgh-steelers", name: "Pittsburgh Steelers", shortName: "PIT", city: "Pittsburgh", conference: "AFC", division: "North", colors: ["#ffb612", "#101820"], rank: 6, wins: 10, losses: 7, ties: 0, pointsFor: 380, pointsAgainst: 347, form: "L L W L W", prediction: "Defense-led volatility", logo: teamFallbackLogo("pit") },
  { slug: "denver-broncos", name: "Denver Broncos", shortName: "DEN", city: "Denver", conference: "AFC", division: "West", colors: ["#fb4f14", "#002244"], rank: 7, wins: 10, losses: 7, ties: 0, pointsFor: 425, pointsAgainst: 311, form: "W L W W W", prediction: "Young QB signal", logo: teamFallbackLogo("den") },
  { slug: "cincinnati-bengals", name: "Cincinnati Bengals", shortName: "CIN", city: "Cincinnati", conference: "AFC", division: "North", colors: ["#fb4f14", "#000000"], rank: 8, wins: 9, losses: 8, ties: 0, pointsFor: 472, pointsAgainst: 434, form: "W W W W L", prediction: "Late surge watch", logo: teamFallbackLogo("cin") },
  { slug: "miami-dolphins", name: "Miami Dolphins", shortName: "MIA", city: "Miami", conference: "AFC", division: "East", colors: ["#008e97", "#fc4c02"], rank: 9, wins: 8, losses: 9, ties: 0, pointsFor: 345, pointsAgainst: 364, form: "L W L W L", prediction: "Pace dependent", logo: teamFallbackLogo("mia") },
  { slug: "indianapolis-colts", name: "Indianapolis Colts", shortName: "IND", city: "Indianapolis", conference: "AFC", division: "South", colors: ["#002c5f", "#a2aaad"], rank: 10, wins: 8, losses: 9, ties: 0, pointsFor: 377, pointsAgainst: 427, form: "W L L W L", prediction: "Margin swing team", logo: teamFallbackLogo("ind") },
  { slug: "new-york-jets", name: "New York Jets", shortName: "NYJ", city: "New York", conference: "AFC", division: "East", colors: ["#125740", "#ffffff"], rank: 11, wins: 5, losses: 12, ties: 0, pointsFor: 338, pointsAgainst: 404, form: "L W L L L", prediction: "Low-trust offense", logo: teamFallbackLogo("nyj") },
  { slug: "jacksonville-jaguars", name: "Jacksonville Jaguars", shortName: "JAX", city: "Jacksonville", conference: "AFC", division: "South", colors: ["#006778", "#d7a22a"], rank: 12, wins: 4, losses: 13, ties: 0, pointsFor: 320, pointsAgainst: 435, form: "L L W L L", prediction: "Rebuild profile", logo: teamFallbackLogo("jax") },
  { slug: "new-england-patriots", name: "New England Patriots", shortName: "NE", city: "Foxborough", conference: "AFC", division: "East", colors: ["#002244", "#c60c30"], rank: 13, wins: 4, losses: 13, ties: 0, pointsFor: 289, pointsAgainst: 417, form: "L L L W L", prediction: "Roster reset", logo: teamFallbackLogo("ne") },
  { slug: "las-vegas-raiders", name: "Las Vegas Raiders", shortName: "LV", city: "Las Vegas", conference: "AFC", division: "West", colors: ["#000000", "#a5acaf"], rank: 14, wins: 4, losses: 13, ties: 0, pointsFor: 309, pointsAgainst: 434, form: "L L L L W", prediction: "QB uncertainty", logo: teamFallbackLogo("lv") },
  { slug: "cleveland-browns", name: "Cleveland Browns", shortName: "CLE", city: "Cleveland", conference: "AFC", division: "North", colors: ["#311d00", "#ff3c00"], rank: 15, wins: 3, losses: 14, ties: 0, pointsFor: 258, pointsAgainst: 435, form: "L L L L L", prediction: "Offensive reset", logo: teamFallbackLogo("cle") },
  { slug: "tennessee-titans", name: "Tennessee Titans", shortName: "TEN", city: "Nashville", conference: "AFC", division: "South", colors: ["#0c2340", "#4b92db"], rank: 16, wins: 3, losses: 14, ties: 0, pointsFor: 311, pointsAgainst: 460, form: "L L L W L", prediction: "Draft-value profile", logo: teamFallbackLogo("ten") },
  { slug: "detroit-lions", name: "Detroit Lions", shortName: "DET", city: "Detroit", conference: "NFC", division: "North", colors: ["#0076b6", "#b0b7bc"], rank: 1, wins: 15, losses: 2, ties: 0, pointsFor: 564, pointsAgainst: 342, form: "W W W W W", prediction: "NFC favorite", logo: teamFallbackLogo("det") },
  { slug: "philadelphia-eagles", name: "Philadelphia Eagles", shortName: "PHI", city: "Philadelphia", conference: "NFC", division: "East", colors: ["#004c54", "#a5acaf"], rank: 2, wins: 14, losses: 3, ties: 0, pointsFor: 463, pointsAgainst: 303, form: "W W W L W", prediction: "Elite roster balance", logo: teamFallbackLogo("phi") },
  { slug: "tampa-bay-buccaneers", name: "Tampa Bay Buccaneers", shortName: "TB", city: "Tampa", conference: "NFC", division: "South", colors: ["#d50a0a", "#34302b"], rank: 3, wins: 10, losses: 7, ties: 0, pointsFor: 502, pointsAgainst: 385, form: "W W W W L", prediction: "Passing ceiling", logo: teamFallbackLogo("tb") },
  { slug: "los-angeles-rams", name: "Los Angeles Rams", shortName: "LAR", city: "Los Angeles", conference: "NFC", division: "West", colors: ["#003594", "#ffd100"], rank: 4, wins: 10, losses: 7, ties: 0, pointsFor: 367, pointsAgainst: 386, form: "W W W W L", prediction: "Playoff matchup edge", logo: teamFallbackLogo("lar") },
  { slug: "minnesota-vikings", name: "Minnesota Vikings", shortName: "MIN", city: "Minneapolis", conference: "NFC", division: "North", colors: ["#4f2683", "#ffc62f"], rank: 5, wins: 14, losses: 3, ties: 0, pointsFor: 432, pointsAgainst: 332, form: "L W W W W", prediction: "High-floor defense", logo: teamFallbackLogo("min") },
  { slug: "washington-commanders", name: "Washington Commanders", shortName: "WAS", city: "Washington", conference: "NFC", division: "East", colors: ["#5a1414", "#ffb612"], rank: 6, wins: 12, losses: 5, ties: 0, pointsFor: 485, pointsAgainst: 391, form: "W W W W W", prediction: "Explosive rookie curve", logo: teamFallbackLogo("wsh") },
  { slug: "green-bay-packers", name: "Green Bay Packers", shortName: "GB", city: "Green Bay", conference: "NFC", division: "North", colors: ["#203731", "#ffb612"], rank: 7, wins: 11, losses: 6, ties: 0, pointsFor: 460, pointsAgainst: 338, form: "L L W W W", prediction: "Efficiency contender", logo: teamFallbackLogo("gb") },
  { slug: "seattle-seahawks", name: "Seattle Seahawks", shortName: "SEA", city: "Seattle", conference: "NFC", division: "West", colors: ["#002244", "#69be28"], rank: 8, wins: 10, losses: 7, ties: 0, pointsFor: 375, pointsAgainst: 368, form: "W L W L W", prediction: "Narrow-margin team", logo: teamFallbackLogo("sea") },
  { slug: "atlanta-falcons", name: "Atlanta Falcons", shortName: "ATL", city: "Atlanta", conference: "NFC", division: "South", colors: ["#a71930", "#000000"], rank: 9, wins: 8, losses: 9, ties: 0, pointsFor: 389, pointsAgainst: 423, form: "L W L W L", prediction: "QB variance", logo: teamFallbackLogo("atl") },
  { slug: "arizona-cardinals", name: "Arizona Cardinals", shortName: "ARI", city: "Glendale", conference: "NFC", division: "West", colors: ["#97233f", "#ffb612"], rank: 10, wins: 8, losses: 9, ties: 0, pointsFor: 400, pointsAgainst: 379, form: "W L L W L", prediction: "Offensive growth", logo: teamFallbackLogo("ari") },
  { slug: "dallas-cowboys", name: "Dallas Cowboys", shortName: "DAL", city: "Dallas", conference: "NFC", division: "East", colors: ["#003594", "#869397"], rank: 11, wins: 7, losses: 10, ties: 0, pointsFor: 350, pointsAgainst: 468, form: "L L W L W", prediction: "Injury rebound watch", logo: teamFallbackLogo("dal") },
  { slug: "san-francisco-49ers", name: "San Francisco 49ers", shortName: "SF", city: "Santa Clara", conference: "NFC", division: "West", colors: ["#aa0000", "#b3995d"], rank: 12, wins: 6, losses: 11, ties: 0, pointsFor: 389, pointsAgainst: 436, form: "L L L W L", prediction: "Health-dependent ceiling", logo: teamFallbackLogo("sf") },
  { slug: "chicago-bears", name: "Chicago Bears", shortName: "CHI", city: "Chicago", conference: "NFC", division: "North", colors: ["#0b162a", "#c83803"], rank: 13, wins: 5, losses: 12, ties: 0, pointsFor: 310, pointsAgainst: 370, form: "W L L L L", prediction: "Young core watch", logo: teamFallbackLogo("chi") },
  { slug: "carolina-panthers", name: "Carolina Panthers", shortName: "CAR", city: "Charlotte", conference: "NFC", division: "South", colors: ["#0085ca", "#101820"], rank: 14, wins: 5, losses: 12, ties: 0, pointsFor: 341, pointsAgainst: 534, form: "W L W L L", prediction: "Volatile defense", logo: teamFallbackLogo("car") },
  { slug: "new-orleans-saints", name: "New Orleans Saints", shortName: "NO", city: "New Orleans", conference: "NFC", division: "South", colors: ["#d3bc8d", "#101820"], rank: 15, wins: 5, losses: 12, ties: 0, pointsFor: 338, pointsAgainst: 398, form: "L L L W L", prediction: "Roster transition", logo: teamFallbackLogo("no") },
  { slug: "new-york-giants", name: "New York Giants", shortName: "NYG", city: "New York", conference: "NFC", division: "East", colors: ["#0b2265", "#a71930"], rank: 16, wins: 3, losses: 14, ties: 0, pointsFor: 273, pointsAgainst: 415, form: "L W L L L", prediction: "Rebuild pressure", logo: teamFallbackLogo("nyg") }
];

export function getNflTeam(slug: string) {
  return nflTeams.find((team) => team.slug === slug);
}
