/**
 * Purpose: Server-only The Odds API adapter for pre-match bookmaker odds.
 */
import type { ApiSportId, SportApiMatch, SportApiOdds, SportApiOddsOutcome } from "@/lib/sports-api-data";

type OddsSportContext = {
  footballSlug?: string;
  competitionName?: string;
};

type TheOddsApiEvent = {
  id?: string;
  sport_key?: string;
  sport_title?: string;
  commence_time?: string;
  home_team?: string;
  away_team?: string;
  bookmakers?: TheOddsApiBookmaker[];
};

type TheOddsApiBookmaker = {
  key?: string;
  title?: string;
  last_update?: string;
  markets?: TheOddsApiMarket[];
};

type TheOddsApiMarket = {
  key?: string;
  outcomes?: TheOddsApiOutcome[];
};

type TheOddsApiOutcome = {
  name?: string;
  price?: number;
};

const FOOTBALL_ODDS_KEYS: Record<string, string[]> = {
  "bundesliga": ["soccer_germany_bundesliga"],
  "dfb-pokal": ["soccer_germany_dfb_pokal"],
  "premier-league": ["soccer_epl"],
  "fa-cup": ["soccer_england_efl_cup"],
  "la-liga": ["soccer_spain_la_liga"],
  "ligue-1": ["soccer_france_ligue_one"],
  "serie-a": ["soccer_italy_serie_a"],
  "champions-league": ["soccer_uefa_champs_league"],
  "europa-league": ["soccer_uefa_europa_league"],
  "conference-league": ["soccer_uefa_europa_conference_league"]
};

const SPORT_ODDS_KEYS: Record<ApiSportId, string[]> = {
  football: ["soccer_epl"],
  nfl: ["americanfootball_nfl", "americanfootball_nfl_preseason"],
  nba: ["basketball_nba", "basketball_nba_summer_league"],
  tennis: ["tennis_atp", "tennis_wta"]
};

export async function hydrateMatchesWithOdds(
  sport: ApiSportId,
  matches: SportApiMatch[],
  context: OddsSportContext = {}
): Promise<SportApiMatch[]> {
  const apiKey = getTheOddsApiKey();
  if (!apiKey || matches.length === 0) {
    return withModelFallbackOdds(sport, matches);
  }

  const sportKeys = getOddsSportKeys(sport, context);
  if (sportKeys.length === 0) {
    return withModelFallbackOdds(sport, matches);
  }

  const events = (await Promise.all(sportKeys.map((sportKey) => fetchOddsEvents(sportKey).catch(() => [])))).flat();
  if (events.length === 0) {
    return withModelFallbackOdds(sport, matches);
  }

  return matches.map((match) => ({
    ...match,
    odds: findBestMatchOdds(match, events) ?? buildModelFallbackOdds(sport, match)
  }));
}

function getOddsSportKeys(sport: ApiSportId, context: OddsSportContext) {
  if (sport === "football" && context.footballSlug) {
    return FOOTBALL_ODDS_KEYS[context.footballSlug] ?? SPORT_ODDS_KEYS.football;
  }

  return SPORT_ODDS_KEYS[sport] ?? [];
}

async function fetchOddsEvents(sportKey: string): Promise<TheOddsApiEvent[]> {
  const apiKey = getTheOddsApiKey();
  if (!apiKey) {
    return [];
  }

  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", process.env.THE_ODDS_API_REGIONS ?? "eu,us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");

  const controller = new AbortController();
  const timeoutMs = Number(process.env.THE_ODDS_API_FETCH_TIMEOUT_MS ?? 6000);
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 6000);

  const response = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: getTheOddsApiCacheSeconds() },
    signal: controller.signal
  }).catch(() => null).finally(() => clearTimeout(timeout));

  if (!response?.ok) {
    return [];
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function findBestMatchOdds(match: SportApiMatch, events: TheOddsApiEvent[]): SportApiOdds | null {
  const matchTime = match.date ? new Date(match.date).getTime() : null;
  const candidates = events
    .map((event) => ({
      event,
      score: scoreOddsEvent(match, event, matchTime)
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  for (const candidate of candidates) {
    const odds = buildSportApiOdds(match, candidate.event);
    if (odds) {
      return odds;
    }
  }

  return null;
}

function withModelFallbackOdds(sport: ApiSportId, matches: SportApiMatch[]) {
  return matches.map((match) => ({
    ...match,
    odds: match.odds ?? buildModelFallbackOdds(sport, match)
  }));
}

function buildModelFallbackOdds(sport: ApiSportId, match: SportApiMatch): SportApiOdds {
  const homeStrength = estimateNameStrength(match.homeName);
  const awayStrength = estimateNameStrength(match.awayName);
  const edge = homeStrength - awayStrength;
  const hasDraw = sport === "football";
  const outcomes = hasDraw
    ? buildThreeWayModelOutcomes(match, edge)
    : buildTwoWayModelOutcomes(match, edge);

  return {
    provider: "Model fair odds",
    market: "h2h",
    sportKey: null,
    eventId: null,
    eventName: `${match.homeName} vs ${match.awayName}`,
    bookmakerCount: 0,
    lastUpdated: null,
    outcomes
  };
}

function buildThreeWayModelOutcomes(match: SportApiMatch, edge: number): SportApiOddsOutcome[] {
  const drawProbability = 0.25;
  const homeProbability = clamp(0.375 + edge * 0.2, 0.18, 0.62);
  const awayProbability = Math.max(0.13, 1 - drawProbability - homeProbability);
  const normalizedTotal = homeProbability + drawProbability + awayProbability;

  return [
    { label: "home", name: match.homeName, price: probabilityToDecimalOdds(homeProbability / normalizedTotal), bookmaker: "Model" },
    { label: "draw", name: "Draw", price: probabilityToDecimalOdds(drawProbability / normalizedTotal), bookmaker: "Model" },
    { label: "away", name: match.awayName, price: probabilityToDecimalOdds(awayProbability / normalizedTotal), bookmaker: "Model" }
  ];
}

function buildTwoWayModelOutcomes(match: SportApiMatch, edge: number): SportApiOddsOutcome[] {
  const homeProbability = clamp(0.5 + edge * 0.24, 0.32, 0.72);
  const awayProbability = 1 - homeProbability;

  return [
    { label: "home", name: match.homeName, price: probabilityToDecimalOdds(homeProbability), bookmaker: "Model" },
    { label: "away", name: match.awayName, price: probabilityToDecimalOdds(awayProbability), bookmaker: "Model" }
  ];
}

function estimateNameStrength(name: string) {
  const normalized = normalizeName(name);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) % 997;
  }

  return hash / 997;
}

function probabilityToDecimalOdds(probability: number) {
  return Math.round(clamp(1 / probability, 1.15, 12) * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreOddsEvent(match: SportApiMatch, event: TheOddsApiEvent, matchTime: number | null) {
  const home = event.home_team ?? "";
  const away = event.away_team ?? "";
  const sameDirection = teamNamesMatch(home, match.homeName) && teamNamesMatch(away, match.awayName);
  const swappedDirection = teamNamesMatch(home, match.awayName) && teamNamesMatch(away, match.homeName);

  if (!sameDirection && !swappedDirection) {
    return 0;
  }

  const eventTime = event.commence_time ? new Date(event.commence_time).getTime() : null;
  const timeScore = matchTime !== null && eventTime !== null
    ? Math.max(0, 72 - Math.abs(eventTime - matchTime) / 36e5)
    : 8;

  return 100 + timeScore;
}

function buildSportApiOdds(match: SportApiMatch, event: TheOddsApiEvent): SportApiOdds | null {
  const outcomes = [
    findBestOutcome("home", match.homeName, event),
    findBestOutcome("draw", "Draw", event),
    findBestOutcome("away", match.awayName, event)
  ].filter((outcome): outcome is SportApiOddsOutcome => Boolean(outcome));

  if (outcomes.length < 2) {
    return null;
  }

  const bookmakerCount = countBookmakersWithH2h(event);

  return {
    provider: "The Odds API",
    market: "h2h",
    sportKey: event.sport_key ?? null,
    eventId: event.id ?? null,
    eventName: `${event.home_team ?? match.homeName} vs ${event.away_team ?? match.awayName}`,
    bookmakerCount,
    lastUpdated: getLatestBookmakerUpdate(event),
    outcomes
  };
}

function findBestOutcome(label: SportApiOddsOutcome["label"], targetName: string, event: TheOddsApiEvent): SportApiOddsOutcome | null {
  let best: SportApiOddsOutcome | null = null;

  for (const bookmaker of event.bookmakers ?? []) {
    const market = bookmaker.markets?.find((row) => row.key === "h2h");
    const outcome = market?.outcomes?.find((row) => oddsOutcomeMatches(row.name ?? "", targetName, label));
    const price = Number(outcome?.price);

    if (!Number.isFinite(price) || price <= 1) {
      continue;
    }

    if (!best || price > best.price) {
      best = {
        label,
        name: targetName,
        price,
        bookmaker: bookmaker.title || bookmaker.key || "Bookmaker"
      };
    }
  }

  return best;
}

function countBookmakersWithH2h(event: TheOddsApiEvent) {
  return (event.bookmakers ?? []).filter((bookmaker) => bookmaker.markets?.some((market) => market.key === "h2h")).length;
}

function getLatestBookmakerUpdate(event: TheOddsApiEvent) {
  const latest = (event.bookmakers ?? [])
    .map((bookmaker) => bookmaker.last_update ? new Date(bookmaker.last_update).getTime() : null)
    .filter((timestamp): timestamp is number => timestamp !== null && Number.isFinite(timestamp))
    .sort((left, right) => right - left)[0];

  return latest ? new Date(latest).toISOString() : null;
}

function oddsOutcomeMatches(value: string, targetName: string, label: SportApiOddsOutcome["label"]) {
  if (label === "draw") {
    return normalizeName(value) === "draw" || normalizeName(value) === "x";
  }

  return teamNamesMatch(value, targetName);
}

function teamNamesMatch(left: string, right: string) {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);

  return Boolean(
    normalizedLeft &&
    normalizedRight &&
    (normalizedLeft === normalizedRight ||
      normalizedLeft.includes(normalizedRight) ||
      normalizedRight.includes(normalizedLeft))
  );
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/\b(fc|cf|sc|afc|bc|bk|basketball|club|the)\b/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function getTheOddsApiKey() {
  return process.env.THE_ODDS_API_KEY || process.env.ODDS_API_KEY || "";
}

function getTheOddsApiCacheSeconds() {
  const seconds = Number(process.env.THE_ODDS_API_CACHE_SECONDS ?? 300);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : 300;
}
