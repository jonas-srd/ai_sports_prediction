/**
 * Purpose: Maps football team names to small flag image URLs.
 * The UI receives team names from football-data.org, so this keeps display logic out of pages.
 */
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

function normalizeTeamName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
