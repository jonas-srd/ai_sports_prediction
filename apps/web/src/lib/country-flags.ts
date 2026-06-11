/**
 * Purpose: Maps soccer team names to small flag image URLs.
 * The UI receives team names from football-data.org, so this keeps display logic out of pages.
 */
import type { Locale } from "@/lib/i18n";

const TEAM_FLAG_CODES: Record<string, string> = {
  algeria: "dz",
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  bolivia: "bo",
  bosnia_herzegovina: "ba",
  bosnia_and_herzegovina: "ba",
  brazil: "br",
  burkina_faso: "bf",
  cameroon: "cm",
  canada: "ca",
  cape_verde: "cv",
  cape_verde_islands: "cv",
  chile: "cl",
  colombia: "co",
  costa_rica: "cr",
  cote_d_ivoire: "ci",
  congo_dr: "cd",
  croatia: "hr",
  curacao: "cw",
  czech_republic: "cz",
  czechia: "cz",
  dr_congo: "cd",
  democratic_republic_of_the_congo: "cd",
  denmark: "dk",
  ecuador: "ec",
  egypt: "eg",
  el_salvador: "sv",
  england: "gb-eng",
  france: "fr",
  gabon: "ga",
  germany: "de",
  ghana: "gh",
  greece: "gr",
  guatemala: "gt",
  haiti: "ht",
  honduras: "hn",
  hungary: "hu",
  iran: "ir",
  ir_iran: "ir",
  iraq: "iq",
  ireland: "ie",
  italy: "it",
  ivory_coast: "ci",
  jamaica: "jm",
  japan: "jp",
  jordan: "jo",
  korea_dpr: "kp",
  korea_republic: "kr",
  mali: "ml",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  new_caledonia: "nc",
  new_zealand: "nz",
  nigeria: "ng",
  northern_ireland: "gb-nir",
  norway: "no",
  oman: "om",
  panama: "pa",
  paraguay: "py",
  peru: "pe",
  poland: "pl",
  portugal: "pt",
  qatar: "qa",
  republic_of_ireland: "ie",
  romania: "ro",
  saudi_arabia: "sa",
  scotland: "gb-sct",
  senegal: "sn",
  serbia: "rs",
  slovakia: "sk",
  slovenia: "si",
  south_africa: "za",
  south_korea: "kr",
  spain: "es",
  suriname: "sr",
  sweden: "se",
  switzerland: "ch",
  trinidad_and_tobago: "tt",
  tunisia: "tn",
  turkey: "tr",
  turkiye: "tr",
  uae: "ae",
  ukraine: "ua",
  united_arab_emirates: "ae",
  united_states: "us",
  united_states_of_america: "us",
  uruguay: "uy",
  usa: "us",
  uzbekistan: "uz",
  venezuela: "ve",
  wales: "gb-wls",
  zambia: "zm"
};

const TEAM_NAME_DE: Record<string, string> = {
  algeria: "Algerien",
  argentina: "Argentinien",
  australia: "Australien",
  austria: "\u00d6sterreich",
  belgium: "Belgien",
  bolivia: "Bolivien",
  bosnia_herzegovina: "Bosnien und Herzegowina",
  bosnia_and_herzegovina: "Bosnien und Herzegowina",
  brazil: "Brasilien",
  burkina_faso: "Burkina Faso",
  cameroon: "Kamerun",
  canada: "Kanada",
  cape_verde: "Kap Verde",
  cape_verde_islands: "Kap Verde",
  chile: "Chile",
  colombia: "Kolumbien",
  costa_rica: "Costa Rica",
  cote_d_ivoire: "Elfenbeink\u00fcste",
  congo_dr: "DR Kongo",
  croatia: "Kroatien",
  curacao: "Cura\u00e7ao",
  czech_republic: "Tschechien",
  czechia: "Tschechien",
  dr_congo: "DR Kongo",
  democratic_republic_of_the_congo: "Demokratische Republik Kongo",
  denmark: "D\u00e4nemark",
  ecuador: "Ecuador",
  egypt: "\u00c4gypten",
  el_salvador: "El Salvador",
  england: "England",
  france: "Frankreich",
  gabon: "Gabun",
  germany: "Deutschland",
  ghana: "Ghana",
  greece: "Griechenland",
  guatemala: "Guatemala",
  haiti: "Haiti",
  honduras: "Honduras",
  hungary: "Ungarn",
  iran: "Iran",
  ir_iran: "Iran",
  iraq: "Irak",
  ireland: "Irland",
  italy: "Italien",
  ivory_coast: "Elfenbeink\u00fcste",
  jamaica: "Jamaika",
  japan: "Japan",
  jordan: "Jordanien",
  korea_dpr: "Nordkorea",
  korea_republic: "S\u00fcdkorea",
  mali: "Mali",
  mexico: "Mexiko",
  morocco: "Marokko",
  netherlands: "Niederlande",
  new_caledonia: "Neukaledonien",
  new_zealand: "Neuseeland",
  nigeria: "Nigeria",
  northern_ireland: "Nordirland",
  norway: "Norwegen",
  oman: "Oman",
  panama: "Panama",
  paraguay: "Paraguay",
  peru: "Peru",
  poland: "Polen",
  portugal: "Portugal",
  qatar: "Katar",
  republic_of_ireland: "Irland",
  romania: "Rum\u00e4nien",
  saudi_arabia: "Saudi-Arabien",
  scotland: "Schottland",
  senegal: "Senegal",
  serbia: "Serbien",
  slovakia: "Slowakei",
  slovenia: "Slowenien",
  south_africa: "S\u00fcdafrika",
  south_korea: "S\u00fcdkorea",
  spain: "Spanien",
  suriname: "Suriname",
  sweden: "Schweden",
  switzerland: "Schweiz",
  trinidad_and_tobago: "Trinidad und Tobago",
  tunisia: "Tunesien",
  turkey: "T\u00fcrkei",
  turkiye: "T\u00fcrkei",
  uae: "Vereinigte Arabische Emirate",
  ukraine: "Ukraine",
  united_arab_emirates: "Vereinigte Arabische Emirate",
  united_states: "Vereinigte Staaten",
  united_states_of_america: "Vereinigte Staaten",
  uruguay: "Uruguay",
  usa: "USA",
  uzbekistan: "Usbekistan",
  venezuela: "Venezuela",
  wales: "Wales",
  zambia: "Sambia"
};

export type TeamFlag = {
  src: string;
  srcSet: string;
  alt: string;
};

export function getTeamFlag(teamName: string): TeamFlag | null {
  const code = TEAM_FLAG_CODES[normalizeTeamName(teamName)];
  if (!code) {
    return null;
  }

  return {
    src: `https://flagcdn.com/w40/${code}.png`,
    srcSet: `https://flagcdn.com/w80/${code}.png 2x`,
    alt: `${teamName} flag`
  };
}

export function formatTeamName(teamName: string, locale: Locale): string {
  if (locale !== "de") {
    return teamName;
  }

  const winnerGroup = teamName.match(/^Winner Group ([A-L])$/);
  if (winnerGroup) return `Sieger Gruppe ${winnerGroup[1]}`;

  const runnerUpGroup = teamName.match(/^Runner-up Group ([A-L])$/);
  if (runnerUpGroup) return `Zweiter Gruppe ${runnerUpGroup[1]}`;

  const bestThird = teamName.match(/^Best Third (.+)$/);
  if (bestThird) return `Bester Dritter ${bestThird[1]}`;

  const winnerMatch = teamName.match(/^Winner Match (\d+)$/);
  if (winnerMatch) return `Sieger Spiel ${winnerMatch[1]}`;

  const loserMatch = teamName.match(/^Loser Match (\d+)$/);
  if (loserMatch) return `Verlierer Spiel ${loserMatch[1]}`;

  if (teamName === "TBD") return "Offen";

  return TEAM_NAME_DE[normalizeTeamName(teamName)] ?? teamName;
}

function normalizeTeamName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
