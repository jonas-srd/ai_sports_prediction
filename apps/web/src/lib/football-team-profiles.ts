export type FootballTeamProfile = {
  fullName: string;
  nickname: string;
  colors: {
    de: string;
    en: string;
  };
  founded: string;
  stadium: string;
  capacity: string;
  sports?: {
    de: string;
    en: string;
  };
};

export const footballTeamProfiles: Record<string, FootballTeamProfile> = {
  "fc-bayern": {
    fullName: "Fußball-Club Bayern München",
    nickname: "Die Roten, Die Bayern, La Bestia Negra",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "27.02.1900",
    sports: {
      de: "Fußball, Handball, Tischtennis, Turnen, Basketball, Kegeln, Schach",
      en: "Football, handball, table tennis, gymnastics, basketball, bowling, chess"
    },
    stadium: "Allianz Arena",
    capacity: "75.024"
  },
  "borussia-dortmund": {
    fullName: "Ballspielverein Borussia 09 e. V. Dortmund",
    nickname: "Die Schwarzgelben",
    colors: { de: "schwarz-gelb", en: "black-yellow" },
    founded: "19.12.1909",
    stadium: "Signal Iduna Park",
    capacity: "81.365"
  },
  "rb-leipzig": {
    fullName: "RasenBallsport Leipzig e. V.",
    nickname: "Die Roten Bullen",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "19.05.2009",
    stadium: "Red Bull Arena",
    capacity: "47.069"
  },
  "bayer-leverkusen": {
    fullName: "Bayer 04 Leverkusen Fußball GmbH",
    nickname: "Die Werkself",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "01.07.1904",
    stadium: "BayArena",
    capacity: "30.210"
  },
  "eintracht-frankfurt": {
    fullName: "Eintracht Frankfurt e. V.",
    nickname: "Die Adler",
    colors: { de: "rot-schwarz-weiß", en: "red-black-white" },
    founded: "08.03.1899",
    stadium: "Deutsche Bank Park",
    capacity: "58.000"
  },
  "vfb-stuttgart": {
    fullName: "Verein für Bewegungsspiele Stuttgart 1893 e. V.",
    nickname: "Die Schwaben",
    colors: { de: "weiß-rot", en: "white-red" },
    founded: "09.09.1893",
    stadium: "MHPArena",
    capacity: "60.449"
  },
  "borussia-moenchengladbach": {
    fullName: "Borussia Verein für Leibesübungen 1900 e. V.",
    nickname: "Die Fohlen",
    colors: { de: "schwarz-weiß-grün", en: "black-white-green" },
    founded: "01.08.1900",
    stadium: "Borussia-Park",
    capacity: "54.057"
  },
  "sc-freiburg": {
    fullName: "Sport-Club Freiburg e. V.",
    nickname: "Breisgau-Brasilianer",
    colors: { de: "rot-weiß-schwarz", en: "red-white-black" },
    founded: "30.05.1904",
    stadium: "Europa-Park Stadion",
    capacity: "34.700"
  },
  "werder-bremen": {
    fullName: "Sportverein Werder Bremen von 1899 e. V.",
    nickname: "Die Werderaner",
    colors: { de: "grün-weiß", en: "green-white" },
    founded: "04.02.1899",
    stadium: "Weserstadion",
    capacity: "42.100"
  },
  "hamburger-sv": {
    fullName: "Hamburger Sport-Verein e. V.",
    nickname: "Die Rothosen",
    colors: { de: "blau-weiß-schwarz", en: "blue-white-black" },
    founded: "29.09.1887",
    stadium: "Volksparkstadion",
    capacity: "57.000"
  },
  "fc-augsburg": {
    fullName: "Fußball-Club Augsburg 1907 e. V.",
    nickname: "Die Fuggerstädter",
    colors: { de: "rot-grün-weiß", en: "red-green-white" },
    founded: "08.08.1907",
    stadium: "WWK Arena",
    capacity: "30.660"
  },
  "mainz-05": {
    fullName: "1. Fußball- und Sportverein Mainz 05 e. V.",
    nickname: "Die Nullfünfer",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "16.03.1905",
    stadium: "MEWA Arena",
    capacity: "33.305"
  },
  "vfl-wolfsburg": {
    fullName: "Verein für Leibesübungen Wolfsburg Fußball GmbH",
    nickname: "Die Wölfe",
    colors: { de: "grün-weiß", en: "green-white" },
    founded: "12.09.1945",
    stadium: "Volkswagen Arena",
    capacity: "30.000"
  },
  "union-berlin": {
    fullName: "1. Fußballclub Union Berlin e. V.",
    nickname: "Die Eisernen",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "20.01.1966",
    stadium: "Stadion An der Alten Försterei",
    capacity: "22.012"
  },
  "tsg-hoffenheim": {
    fullName: "TSG 1899 Hoffenheim Fußball-Spielbetriebs GmbH",
    nickname: "Die Kraichgauer",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "01.07.1899",
    stadium: "PreZero Arena",
    capacity: "30.150"
  },
  "heidenheim": {
    fullName: "1. Fußballclub Heidenheim 1846 e. V.",
    nickname: "FCH",
    colors: { de: "rot-blau-weiß", en: "red-blue-white" },
    founded: "01.01.2007",
    stadium: "Voith-Arena",
    capacity: "15.000"
  },
  "st-pauli": {
    fullName: "Fußball-Club St. Pauli von 1910 e. V.",
    nickname: "Kiezkicker",
    colors: { de: "braun-weiß", en: "brown-white" },
    founded: "15.05.1910",
    stadium: "Millerntor-Stadion",
    capacity: "29.546"
  },
  "holstein-kiel": {
    fullName: "Kieler Sportvereinigung Holstein von 1900 e. V.",
    nickname: "Die Störche",
    colors: { de: "blau-weiß-rot", en: "blue-white-red" },
    founded: "07.10.1900",
    stadium: "Holstein-Stadion",
    capacity: "15.034"
  },
  "manchester-city": {
    fullName: "Manchester City Football Club",
    nickname: "Cityzens, Sky Blues",
    colors: { de: "hellblau-weiß", en: "sky blue-white" },
    founded: "1880",
    stadium: "Etihad Stadium",
    capacity: "53.400"
  },
  "arsenal": {
    fullName: "Arsenal Football Club",
    nickname: "The Gunners",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "1886",
    stadium: "Emirates Stadium",
    capacity: "60.704"
  },
  "liverpool": {
    fullName: "Liverpool Football Club",
    nickname: "The Reds",
    colors: { de: "rot", en: "red" },
    founded: "03.06.1892",
    stadium: "Anfield",
    capacity: "61.276"
  },
  "chelsea": {
    fullName: "Chelsea Football Club",
    nickname: "The Blues",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "10.03.1905",
    stadium: "Stamford Bridge",
    capacity: "40.343"
  },
  "tottenham": {
    fullName: "Tottenham Hotspur Football Club",
    nickname: "Spurs, Lilywhites",
    colors: { de: "weiß-marineblau", en: "white-navy" },
    founded: "05.09.1882",
    stadium: "Tottenham Hotspur Stadium",
    capacity: "62.850"
  },
  "manchester-united": {
    fullName: "Manchester United Football Club",
    nickname: "The Red Devils",
    colors: { de: "rot-weiß-schwarz", en: "red-white-black" },
    founded: "1878",
    stadium: "Old Trafford",
    capacity: "74.310"
  },
  "newcastle-united": {
    fullName: "Newcastle United Football Club",
    nickname: "The Magpies",
    colors: { de: "schwarz-weiß", en: "black-white" },
    founded: "09.12.1892",
    stadium: "St James' Park",
    capacity: "52.305"
  },
  "aston-villa": {
    fullName: "Aston Villa Football Club",
    nickname: "The Villans",
    colors: { de: "weinrot-hellblau", en: "claret-sky blue" },
    founded: "1874",
    stadium: "Villa Park",
    capacity: "42.918"
  },
  "brighton": {
    fullName: "Brighton & Hove Albion Football Club",
    nickname: "The Seagulls",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "24.06.1901",
    stadium: "American Express Stadium",
    capacity: "31.876"
  },
  "brentford": {
    fullName: "Brentford Football Club",
    nickname: "The Bees",
    colors: { de: "rot-weiß-schwarz", en: "red-white-black" },
    founded: "10.10.1889",
    stadium: "Gtech Community Stadium",
    capacity: "17.250"
  },
  "crystal-palace": {
    fullName: "Crystal Palace Football Club",
    nickname: "The Eagles",
    colors: { de: "rot-blau", en: "red-blue" },
    founded: "1905",
    stadium: "Selhurst Park",
    capacity: "25.486"
  },
  "everton": {
    fullName: "Everton Football Club",
    nickname: "The Toffees",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "1878",
    stadium: "Goodison Park",
    capacity: "39.572"
  },
  "fulham": {
    fullName: "Fulham Football Club",
    nickname: "The Cottagers",
    colors: { de: "weiß-schwarz", en: "white-black" },
    founded: "1879",
    stadium: "Craven Cottage",
    capacity: "29.589"
  },
  "west-ham": {
    fullName: "West Ham United Football Club",
    nickname: "The Hammers, The Irons",
    colors: { de: "weinrot-hellblau", en: "claret-sky blue" },
    founded: "29.06.1895",
    stadium: "London Stadium",
    capacity: "62.500"
  },
  "wolves": {
    fullName: "Wolverhampton Wanderers Football Club",
    nickname: "Wolves",
    colors: { de: "gold-schwarz", en: "old gold-black" },
    founded: "1877",
    stadium: "Molineux Stadium",
    capacity: "32.050"
  },
  "bournemouth": {
    fullName: "AFC Bournemouth",
    nickname: "The Cherries",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "1899",
    stadium: "Vitality Stadium",
    capacity: "11.307"
  },
  "nottingham-forest": {
    fullName: "Nottingham Forest Football Club",
    nickname: "The Reds, Tricky Trees",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "1865",
    stadium: "The City Ground",
    capacity: "30.455"
  },
  "leicester-city": {
    fullName: "Leicester City Football Club",
    nickname: "The Foxes",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "1884",
    stadium: "King Power Stadium",
    capacity: "32.312"
  },
  "southampton": {
    fullName: "Southampton Football Club",
    nickname: "The Saints",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "21.11.1885",
    stadium: "St Mary's Stadium",
    capacity: "32.384"
  },
  "ipswich-town": {
    fullName: "Ipswich Town Football Club",
    nickname: "The Tractor Boys",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "1878",
    stadium: "Portman Road",
    capacity: "29.673"
  },
  "real-madrid": {
    fullName: "Real Madrid Club de Fútbol",
    nickname: "Los Blancos",
    colors: { de: "weiß-gold", en: "white-gold" },
    founded: "06.03.1902",
    stadium: "Santiago Bernabéu",
    capacity: "83.186"
  },
  "barcelona": {
    fullName: "Futbol Club Barcelona",
    nickname: "Barça, Blaugrana",
    colors: { de: "blau-granatrot", en: "blue-garnet" },
    founded: "29.11.1899",
    stadium: "Spotify Camp Nou",
    capacity: "105.000"
  },
  "atletico-madrid": {
    fullName: "Club Atlético de Madrid",
    nickname: "Los Colchoneros",
    colors: { de: "rot-weiß-blau", en: "red-white-blue" },
    founded: "26.04.1903",
    stadium: "Riyadh Air Metropolitano",
    capacity: "70.460"
  },
  "real-sociedad": {
    fullName: "Real Sociedad de Fútbol",
    nickname: "Txuri-urdin",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "07.09.1909",
    stadium: "Reale Arena",
    capacity: "39.313"
  },
  "athletic-bilbao": {
    fullName: "Athletic Club",
    nickname: "Los Leones",
    colors: { de: "rot-weiß-schwarz", en: "red-white-black" },
    founded: "1898",
    stadium: "San Mamés",
    capacity: "53.331"
  },
  "villarreal": {
    fullName: "Villarreal Club de Fútbol",
    nickname: "El Submarino Amarillo",
    colors: { de: "gelb-blau", en: "yellow-blue" },
    founded: "10.03.1923",
    stadium: "Estadio de la Cerámica",
    capacity: "23.500"
  },
  "real-betis": {
    fullName: "Real Betis Balompié",
    nickname: "Los Verdiblancos",
    colors: { de: "grün-weiß", en: "green-white" },
    founded: "12.09.1907",
    stadium: "Estadio Benito Villamarín",
    capacity: "60.721"
  },
  "celta-vigo": {
    fullName: "Real Club Celta de Vigo",
    nickname: "Os Celestes",
    colors: { de: "himmelblau-weiß", en: "sky blue-white" },
    founded: "23.08.1923",
    stadium: "Abanca Balaídos",
    capacity: "24.791"
  },
  "rayo-vallecano": {
    fullName: "Rayo Vallecano de Madrid",
    nickname: "Los Franjirrojos",
    colors: { de: "weiß-rot", en: "white-red" },
    founded: "29.05.1924",
    stadium: "Campo de Fútbol de Vallecas",
    capacity: "14.708"
  },
  "osasuna": {
    fullName: "Club Atlético Osasuna",
    nickname: "Los Rojillos",
    colors: { de: "rot-marineblau", en: "red-navy" },
    founded: "24.10.1920",
    stadium: "El Sadar",
    capacity: "23.576"
  },
  "mallorca": {
    fullName: "Real Club Deportivo Mallorca",
    nickname: "Los Bermellones",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "05.03.1916",
    stadium: "Estadi Mallorca Son Moix",
    capacity: "23.142"
  },
  "valencia": {
    fullName: "Valencia Club de Fútbol",
    nickname: "Los Ches",
    colors: { de: "weiß-schwarz-orange", en: "white-black-orange" },
    founded: "18.03.1919",
    stadium: "Mestalla",
    capacity: "49.430"
  },
  "getafe": {
    fullName: "Getafe Club de Fútbol",
    nickname: "Azulones",
    colors: { de: "blau", en: "blue" },
    founded: "08.07.1983",
    stadium: "Coliseum",
    capacity: "16.500"
  },
  "espanyol": {
    fullName: "Reial Club Deportiu Espanyol de Barcelona",
    nickname: "Periquitos",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "28.10.1900",
    stadium: "RCDE Stadium",
    capacity: "40.000"
  },
  "alaves": {
    fullName: "Deportivo Alavés",
    nickname: "Babazorros",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "23.01.1921",
    stadium: "Mendizorrotza",
    capacity: "19.840"
  },
  "girona": {
    fullName: "Girona Futbol Club",
    nickname: "Blanquivermells",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "23.07.1930",
    stadium: "Montilivi",
    capacity: "14.624"
  },
  "sevilla": {
    fullName: "Sevilla Fútbol Club",
    nickname: "Los Nervionenses",
    colors: { de: "weiß-rot", en: "white-red" },
    founded: "25.01.1890",
    stadium: "Ramón Sánchez Pizjuán",
    capacity: "43.883"
  },
  "las-palmas": {
    fullName: "Unión Deportiva Las Palmas",
    nickname: "Los Amarillos",
    colors: { de: "gelb-blau", en: "yellow-blue" },
    founded: "22.08.1949",
    stadium: "Estadio Gran Canaria",
    capacity: "32.400"
  },
  "leganes": {
    fullName: "Club Deportivo Leganés",
    nickname: "Pepineros",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "23.06.1928",
    stadium: "Butarque",
    capacity: "12.454"
  },
  "valladolid": {
    fullName: "Real Valladolid Club de Fútbol",
    nickname: "Pucelanos",
    colors: { de: "violett-weiß", en: "violet-white" },
    founded: "20.06.1928",
    stadium: "José Zorrilla",
    capacity: "27.618"
  },
  "psg": {
    fullName: "Paris Saint-Germain Football Club",
    nickname: "Les Parisiens",
    colors: { de: "blau-rot-weiß", en: "blue-red-white" },
    founded: "12.08.1970",
    stadium: "Parc des Princes",
    capacity: "47.929"
  },
  "marseille": {
    fullName: "Olympique de Marseille",
    nickname: "Les Phocéens",
    colors: { de: "himmelblau-weiß", en: "sky blue-white" },
    founded: "31.08.1899",
    stadium: "Orange Vélodrome",
    capacity: "67.394"
  },
  "monaco": {
    fullName: "Association Sportive de Monaco Football Club",
    nickname: "Les Monégasques",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "23.08.1924",
    stadium: "Stade Louis-II",
    capacity: "18.523"
  },
  "lyon": {
    fullName: "Olympique Lyonnais",
    nickname: "Les Gones",
    colors: { de: "rot-blau-weiß", en: "red-blue-white" },
    founded: "03.08.1950",
    stadium: "Groupama Stadium",
    capacity: "59.186"
  },
  "lille": {
    fullName: "Lille Olympique Sporting Club",
    nickname: "Les Dogues",
    colors: { de: "rot-marineblau-weiß", en: "red-navy-white" },
    founded: "23.09.1944",
    stadium: "Decathlon Arena Stade Pierre-Mauroy",
    capacity: "50.186"
  },
  "nice": {
    fullName: "Olympique Gymnaste Club Nice",
    nickname: "Les Aiglons",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "09.07.1904",
    stadium: "Allianz Riviera",
    capacity: "36.178"
  },
  "strasbourg": {
    fullName: "Racing Club de Strasbourg Alsace",
    nickname: "Le Racing",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "1906",
    stadium: "Stade de la Meinau",
    capacity: "26.109"
  },
  "lens": {
    fullName: "Racing Club de Lens",
    nickname: "Sang et Or",
    colors: { de: "rot-gelb", en: "red-yellow" },
    founded: "1906",
    stadium: "Stade Bollaert-Delelis",
    capacity: "38.223"
  },
  "brest": {
    fullName: "Stade Brestois 29",
    nickname: "Les Pirates",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "1950",
    stadium: "Stade Francis-Le Blé",
    capacity: "15.220"
  },
  "toulouse": {
    fullName: "Toulouse Football Club",
    nickname: "Le Téfécé",
    colors: { de: "violett-weiß", en: "purple-white" },
    founded: "1970",
    stadium: "Stadium de Toulouse",
    capacity: "33.150"
  },
  "auxerre": {
    fullName: "Association de la Jeunesse Auxerroise",
    nickname: "AJA",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "29.12.1905",
    stadium: "Stade de l'Abbé-Deschamps",
    capacity: "18.541"
  },
  "rennes": {
    fullName: "Stade Rennais Football Club",
    nickname: "Les Rouge et Noir",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "10.03.1901",
    stadium: "Roazhon Park",
    capacity: "29.778"
  },
  "nantes": {
    fullName: "Football Club de Nantes",
    nickname: "Les Canaris",
    colors: { de: "gelb-grün", en: "yellow-green" },
    founded: "21.04.1943",
    stadium: "Stade de la Beaujoire",
    capacity: "35.322"
  },
  "angers": {
    fullName: "Angers Sporting Club de l'Ouest",
    nickname: "Le SCO",
    colors: { de: "schwarz-weiß", en: "black-white" },
    founded: "10.10.1919",
    stadium: "Stade Raymond Kopa",
    capacity: "18.752"
  },
  "reims": {
    fullName: "Stade de Reims",
    nickname: "Les Rouges et Blancs",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "18.06.1931",
    stadium: "Stade Auguste-Delaune",
    capacity: "21.029"
  },
  "le-havre": {
    fullName: "Le Havre Athletic Club",
    nickname: "Le HAC",
    colors: { de: "himmelblau-marineblau", en: "sky blue-navy" },
    founded: "1894",
    stadium: "Stade Océane",
    capacity: "25.178"
  },
  "saint-etienne": {
    fullName: "Association Sportive de Saint-Étienne Loire",
    nickname: "Les Verts",
    colors: { de: "grün-weiß", en: "green-white" },
    founded: "1933",
    stadium: "Stade Geoffroy-Guichard",
    capacity: "41.965"
  },
  "montpellier": {
    fullName: "Montpellier Hérault Sport Club",
    nickname: "La Paillade",
    colors: { de: "orange-blau", en: "orange-blue" },
    founded: "1974",
    stadium: "Stade de la Mosson",
    capacity: "32.900"
  },
  "inter": {
    fullName: "Football Club Internazionale Milano",
    nickname: "Nerazzurri",
    colors: { de: "schwarz-blau", en: "black-blue" },
    founded: "09.03.1908",
    stadium: "San Siro",
    capacity: "75.817"
  },
  "juventus": {
    fullName: "Juventus Football Club",
    nickname: "Bianconeri",
    colors: { de: "schwarz-weiß", en: "black-white" },
    founded: "01.11.1897",
    stadium: "Allianz Stadium",
    capacity: "41.507"
  },
  "ac-milan": {
    fullName: "Associazione Calcio Milan",
    nickname: "Rossoneri",
    colors: { de: "rot-schwarz", en: "red-black" },
    founded: "16.12.1899",
    stadium: "San Siro",
    capacity: "75.817"
  },
  "napoli": {
    fullName: "Società Sportiva Calcio Napoli",
    nickname: "Partenopei, Azzurri",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "25.08.1926",
    stadium: "Stadio Diego Armando Maradona",
    capacity: "54.726"
  },
  "roma": {
    fullName: "Associazione Sportiva Roma",
    nickname: "Giallorossi",
    colors: { de: "rot-gold", en: "red-gold" },
    founded: "07.06.1927",
    stadium: "Stadio Olimpico",
    capacity: "70.634"
  },
  "lazio": {
    fullName: "Società Sportiva Lazio",
    nickname: "Biancocelesti",
    colors: { de: "himmelblau-weiß", en: "sky blue-white" },
    founded: "09.01.1900",
    stadium: "Stadio Olimpico",
    capacity: "70.634"
  },
  "atalanta": {
    fullName: "Atalanta Bergamasca Calcio",
    nickname: "La Dea",
    colors: { de: "schwarz-blau", en: "black-blue" },
    founded: "17.10.1907",
    stadium: "Gewiss Stadium",
    capacity: "24.950"
  },
  "fiorentina": {
    fullName: "ACF Fiorentina",
    nickname: "Viola",
    colors: { de: "violett-weiß", en: "purple-white" },
    founded: "29.08.1926",
    stadium: "Stadio Artemio Franchi",
    capacity: "43.147"
  },
  "bologna": {
    fullName: "Bologna Football Club 1909",
    nickname: "Rossoblù",
    colors: { de: "rot-blau", en: "red-blue" },
    founded: "03.10.1909",
    stadium: "Stadio Renato Dall'Ara",
    capacity: "38.279"
  },
  "como": {
    fullName: "Como 1907",
    nickname: "Lariani",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "25.05.1907",
    stadium: "Stadio Giuseppe Sinigaglia",
    capacity: "13.602"
  },
  "torino": {
    fullName: "Torino Football Club",
    nickname: "Il Toro, Granata",
    colors: { de: "granatrot-weiß", en: "maroon-white" },
    founded: "03.12.1906",
    stadium: "Stadio Olimpico Grande Torino",
    capacity: "27.958"
  },
  "udinese": {
    fullName: "Udinese Calcio",
    nickname: "Bianconeri",
    colors: { de: "schwarz-weiß", en: "black-white" },
    founded: "30.11.1896",
    stadium: "Bluenergy Stadium",
    capacity: "25.144"
  },
  "genoa": {
    fullName: "Genoa Cricket and Football Club",
    nickname: "Grifone",
    colors: { de: "rot-blau", en: "red-blue" },
    founded: "07.09.1893",
    stadium: "Stadio Luigi Ferraris",
    capacity: "36.599"
  },
  "hellas-verona": {
    fullName: "Hellas Verona Football Club",
    nickname: "Gialloblù",
    colors: { de: "gelb-blau", en: "yellow-blue" },
    founded: "1903",
    stadium: "Stadio Marcantonio Bentegodi",
    capacity: "39.211"
  },
  "cagliari": {
    fullName: "Cagliari Calcio",
    nickname: "Rossoblù",
    colors: { de: "rot-blau", en: "red-blue" },
    founded: "30.05.1920",
    stadium: "Unipol Domus",
    capacity: "16.416"
  },
  "parma": {
    fullName: "Parma Calcio 1913",
    nickname: "Crociati",
    colors: { de: "gelb-blau", en: "yellow-blue" },
    founded: "16.12.1913",
    stadium: "Stadio Ennio Tardini",
    capacity: "22.352"
  },
  "lecce": {
    fullName: "Unione Sportiva Lecce",
    nickname: "Giallorossi",
    colors: { de: "gelb-rot", en: "yellow-red" },
    founded: "15.03.1908",
    stadium: "Stadio Via del Mare",
    capacity: "31.533"
  },
  "empoli": {
    fullName: "Empoli Football Club",
    nickname: "Azzurri",
    colors: { de: "blau-weiß", en: "blue-white" },
    founded: "1920",
    stadium: "Stadio Carlo Castellani",
    capacity: "16.800"
  },
  "venezia": {
    fullName: "Venezia Football Club",
    nickname: "Arancioneroverdi",
    colors: { de: "orange-schwarz-grün", en: "orange-black-green" },
    founded: "14.12.1907",
    stadium: "Stadio Pier Luigi Penzo",
    capacity: "11.150"
  },
  "monza": {
    fullName: "Associazione Calcio Monza",
    nickname: "Biancorossi",
    colors: { de: "rot-weiß", en: "red-white" },
    founded: "01.09.1912",
    stadium: "U-Power Stadium",
    capacity: "16.917"
  }
};
