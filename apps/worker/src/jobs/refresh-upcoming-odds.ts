/**
 * Purpose: Refreshes and persists real bookmaker odds for fixtures starting within seven days.
 */
import {
  insertOddsRefreshCheck,
  listMatchesDueForOddsRefresh,
  type OddsRefreshCandidate,
  type PostgresDb,
  upsertPredictionMatch,
  upsertStoredMatchOdds
} from "@ai-sports-prediction/db";
import { fetchUpcomingFixtures, type SportFixture, type SportId } from "./generate-upcoming-sport-api-predictions";

type TheOddsApiEvent = {
  id?: string;
  sport_key?: string;
  commence_time?: string;
  home_team?: string;
  away_team?: string;
  bookmakers?: TheOddsApiBookmaker[];
};

type TheOddsApiSport = {
  key?: string;
  group?: string;
  title?: string;
  description?: string;
  active?: boolean;
  has_outrights?: boolean;
};

type TheOddsApiBookmaker = {
  key?: string;
  title?: string;
  last_update?: string;
  markets?: Array<{
    key?: string;
    outcomes?: Array<{ name?: string; price?: number }>;
  }>;
};

type StoredOutcome = {
  label: "home" | "draw" | "away";
  name: string;
  price: number;
  bookmaker: string;
};

type ResolvedOdds = {
  event: TheOddsApiEvent;
  bookmakerCount: number;
  outcomes: StoredOutcome[];
  providerLastUpdatedAtUtc: string | null;
};

const PROVIDER = "The Odds API";
const DAY_MS = 24 * 60 * 60 * 1000;

const SPORT_ODDS_KEYS: Record<SportId, string[]> = {
  football: [
    "soccer_germany_bundesliga",
    "soccer_germany_dfb_pokal",
    "soccer_epl",
    "soccer_england_efl_cup",
    "soccer_spain_la_liga",
    "soccer_france_ligue_one",
    "soccer_italy_serie_a",
    "soccer_uefa_champs_league",
    "soccer_uefa_europa_league",
    "soccer_uefa_europa_conference_league"
  ],
  nfl: ["americanfootball_nfl", "americanfootball_nfl_preseason"],
  nba: ["basketball_nba", "basketball_nba_summer_league"],
  tennis: ["tennis_atp", "tennis_wta"]
};

const COMPETITION_ODDS_KEYS: Array<[RegExp, string]> = [
  [/bundesliga/i, "soccer_germany_bundesliga"],
  [/dfb.?pokal/i, "soccer_germany_dfb_pokal"],
  [/premier league/i, "soccer_epl"],
  [/fa cup|efl cup/i, "soccer_england_efl_cup"],
  [/la liga/i, "soccer_spain_la_liga"],
  [/ligue 1/i, "soccer_france_ligue_one"],
  [/serie a/i, "soccer_italy_serie_a"],
  [/champions league/i, "soccer_uefa_champs_league"],
  [/europa conference|conference league/i, "soccer_uefa_europa_conference_league"],
  [/europa league/i, "soccer_uefa_europa_league"],
  [/\bnfl\b/i, "americanfootball_nfl"],
  [/\bnba\b/i, "basketball_nba"],
  [/\batp\b/i, "tennis_atp"],
  [/\bwta\b/i, "tennis_wta"]
];

export async function refreshUpcomingOdds(db: PostgresDb) {
  const sportsApiKey = getFirstEnv(["THE_SPORTS_DB_API_KEY", "THE_SPORTSDB_API_KEY", "THESPORTSDB_API_KEY"]);
  const oddsApiKey = getFirstEnv(["THE_ODDS_API_KEY", "ODDS_API_KEY"]);

  if (!sportsApiKey) {
    throw new Error("THE_SPORTS_DB_API_KEY is required to discover fixtures for odds refresh.");
  }

  if (!oddsApiKey) {
    throw new Error("THE_ODDS_API_KEY is required to refresh bookmaker odds.");
  }

  const lookaheadDays = readPositiveNumber(process.env.ODDS_REFRESH_LOOKAHEAD_DAYS, 7, 1, 30);
  const minRefreshMinutes = readPositiveNumber(process.env.ODDS_REFRESH_MIN_AGE_MINUTES, 60, 5, 24 * 60);
  const maxMatches = readPositiveNumber(process.env.ODDS_REFRESH_MAX_MATCHES_PER_RUN, 250, 1, 2000);
  const fixtures = await fetchUpcomingFixtures(sportsApiKey, lookaheadDays);

  await Promise.all(fixtures.map((fixture) => upsertFixture(db, fixture)));

  const candidates = await listMatchesDueForOddsRefresh(db, {
    lookaheadDays,
    minRefreshMinutes,
    limit: maxMatches
  });

  if (candidates.length === 0) {
    console.log("Odds refresh finished: no fixtures are due for a check.");
    return { available: 0, unavailable: 0, errors: 0, unsupported: 0 };
  }

  const from = new Date().toISOString();
  const to = new Date(Date.now() + lookaheadDays * DAY_MS).toISOString();
  const sportsSnapshot = await fetchOddsSports(oddsApiKey).catch((error) => {
    console.warn("Could not load active Odds API sport keys; using configured fallback keys.", error);
    return { remainingRequests: null, sports: [] };
  });
  if (sportsSnapshot.remainingRequests !== null && sportsSnapshot.remainingRequests <= 0) {
    console.log("Odds refresh paused: provider quota is exhausted. The free status check will retry next interval.");
    return { available: 0, unavailable: 0, errors: 0, unsupported: 0 };
  }
  const activeSports = sportsSnapshot.sports;
  const requestedKeys = unique(candidates.flatMap((candidate) => getCandidateOddsKeys(candidate, activeSports)));
  const discovered = new Map<string, { events: TheOddsApiEvent[]; error: string | null }>();
  const fetched = new Map<string, { events: TheOddsApiEvent[]; error: string | null }>();

  await Promise.all(requestedKeys.map(async (sportKey) => {
    try {
      discovered.set(sportKey, {
        events: await fetchOddsEventCatalog(oddsApiKey, sportKey, from, to),
        error: null
      });
    } catch (error) {
      discovered.set(sportKey, {
        events: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));

  const relevantKeys = requestedKeys.filter((sportKey) => {
    const events = discovered.get(sportKey)?.events ?? [];
    return candidates.some((candidate) =>
      getCandidateOddsKeys(candidate, activeSports).includes(sportKey) &&
      events.some((event) => scoreEvent(candidate, event, new Date(candidate.utcDate).getTime()) > 0)
    );
  });

  await Promise.all(requestedKeys.map(async (sportKey) => {
    const discovery = discovered.get(sportKey);
    if (discovery?.error) {
      fetched.set(sportKey, discovery);
      return;
    }

    if (!relevantKeys.includes(sportKey)) {
      fetched.set(sportKey, { events: [], error: null });
      return;
    }

    try {
      fetched.set(sportKey, {
        events: await fetchOddsEvents(oddsApiKey, sportKey, from, to),
        error: null
      });
    } catch (error) {
      fetched.set(sportKey, {
        events: [],
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }));

  let available = 0;
  let unavailable = 0;
  let errors = 0;
  let unsupported = 0;

  for (const candidate of candidates) {
    const checkedAtUtc = new Date().toISOString();
    const keys = getCandidateOddsKeys(candidate, activeSports);

    if (keys.length === 0) {
      unsupported += 1;
      await insertOddsRefreshCheck(db, {
        matchId: candidate.matchId,
        provider: PROVIDER,
        status: "unsupported",
        checkedAtUtc,
        errorMessage: `No Odds API sport key is configured for ${candidate.competition}.`
      });
      continue;
    }

    const successfulKeys = keys.filter((key) => fetched.get(key)?.error === null);
    const events = successfulKeys.flatMap((key) => fetched.get(key)?.events ?? []);
    const resolved = findBestMatchOdds(candidate, events);

    if (resolved) {
      available += 1;
      await upsertStoredMatchOdds(db, {
        matchId: candidate.matchId,
        provider: PROVIDER,
        market: "h2h",
        sportKey: resolved.event.sport_key ?? null,
        providerEventId: resolved.event.id ?? null,
        eventName: `${resolved.event.home_team ?? candidate.homeTeam} vs ${resolved.event.away_team ?? candidate.awayTeam}`,
        bookmakerCount: resolved.bookmakerCount,
        outcomes: resolved.outcomes,
        providerLastUpdatedAtUtc: resolved.providerLastUpdatedAtUtc,
        checkedAtUtc
      });
      await insertOddsRefreshCheck(db, {
        matchId: candidate.matchId,
        provider: PROVIDER,
        status: "available",
        providerEventId: resolved.event.id ?? null,
        bookmakerCount: resolved.bookmakerCount,
        checkedAtUtc
      });
      continue;
    }

    if (successfulKeys.length > 0) {
      unavailable += 1;
      await insertOddsRefreshCheck(db, {
        matchId: candidate.matchId,
        provider: PROVIDER,
        status: "unavailable",
        checkedAtUtc
      });
      continue;
    }

    errors += 1;
    await insertOddsRefreshCheck(db, {
      matchId: candidate.matchId,
      provider: PROVIDER,
      status: "error",
      checkedAtUtc,
      errorMessage: keys.map((key) => `${key}: ${fetched.get(key)?.error ?? "request failed"}`).join("; ")
    });
  }

  console.log(`Odds refresh finished: ${available} available, ${unavailable} unavailable, ${unsupported} unsupported, ${errors} errors.`);

  if (requestedKeys.length > 0 && [...fetched.values()].every((result) => result.error !== null)) {
    throw new Error("All Odds API requests failed; individual failures were recorded.");
  }

  return { available, unavailable, errors, unsupported };
}

async function upsertFixture(db: PostgresDb, fixture: SportFixture) {
  await upsertPredictionMatch(db, {
    id: `sport-api:${fixture.id}`,
    utcDate: fixture.utcDate,
    competition: fixture.competition,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    venue: fixture.venue,
    status: fixture.status,
    source: "thesportsdb",
    sourceMatchId: fixture.id,
    sport: fixture.sport,
    stage: fixture.round,
    matchday: fixture.matchday
  });
}

async function fetchOddsEvents(apiKey: string, sportKey: string, from: string, to: string): Promise<TheOddsApiEvent[]> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", process.env.THE_ODDS_API_REGIONS ?? "eu,us");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("commenceTimeFrom", from);
  url.searchParams.set("commenceTimeTo", to);

  const controller = new AbortController();
  const timeoutMs = readPositiveNumber(process.env.THE_ODDS_API_FETCH_TIMEOUT_MS, 6000, 1000, 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`Odds API ${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOddsSports(apiKey: string): Promise<{
  remainingRequests: number | null;
  sports: TheOddsApiSport[];
}> {
  const url = new URL("https://api.the-odds-api.com/v4/sports");
  url.searchParams.set("apiKey", apiKey);
  const controller = new AbortController();
  const timeoutMs = readPositiveNumber(process.env.THE_ODDS_API_FETCH_TIMEOUT_MS, 6000, 1000, 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`Odds API ${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
    }
    const payload = await response.json();
    const remaining = Number(response.headers.get("x-requests-remaining"));
    return {
      remainingRequests: Number.isFinite(remaining) ? remaining : null,
      sports: Array.isArray(payload) ? payload : []
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOddsEventCatalog(apiKey: string, sportKey: string, from: string, to: string): Promise<TheOddsApiEvent[]> {
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/events`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("commenceTimeFrom", from);
  url.searchParams.set("commenceTimeTo", to);
  const payload = await fetchOddsJson(url);
  return Array.isArray(payload) ? payload : [];
}

async function fetchOddsJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timeoutMs = readPositiveNumber(process.env.THE_ODDS_API_FETCH_TIMEOUT_MS, 6000, 1000, 30000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`Odds API ${response.status}${message ? `: ${message.slice(0, 240)}` : ""}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function getCandidateOddsKeys(candidate: OddsRefreshCandidate, activeSports: TheOddsApiSport[] = []) {
  const competitionKey = COMPETITION_ODDS_KEYS.find(([pattern]) => pattern.test(candidate.competition))?.[1];
  if (competitionKey) {
    return [competitionKey];
  }

  const sport = normalizeSport(candidate.sport, candidate.competition);
  if (sport === "tennis" && activeSports.length > 0) {
    const tourPrefix = /\batp\b/i.test(candidate.competition)
      ? "tennis_atp_"
      : /\bwta\b/i.test(candidate.competition)
        ? "tennis_wta_"
        : "tennis_";

    return activeSports
      .filter((row) => row.active !== false && !row.has_outrights)
      .filter((row) => String(row.group ?? "").toLowerCase() === "tennis")
      .map((row) => String(row.key ?? ""))
      .filter((key) => key.startsWith(tourPrefix));
  }

  return sport ? SPORT_ODDS_KEYS[sport] : [];
}

function normalizeSport(value: string | null, competition: string): SportId | null {
  if (value === "football" || value === "nfl" || value === "nba" || value === "tennis") {
    return value;
  }

  if (/\batp\b|\bwta\b|tennis/i.test(competition)) return "tennis";
  if (/\bnfl\b/i.test(competition)) return "nfl";
  if (/\bnba\b/i.test(competition)) return "nba";
  if (/bundesliga|pokal|premier|liga|ligue|serie|champions|europa|conference|cup/i.test(competition)) return "football";
  return null;
}

function findBestMatchOdds(candidate: OddsRefreshCandidate, events: TheOddsApiEvent[]): ResolvedOdds | null {
  const matchTime = new Date(candidate.utcDate).getTime();
  const ranked = events
    .map((event) => ({ event, score: scoreEvent(candidate, event, matchTime) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  for (const { event } of ranked) {
    const outcomes = [
      findBestOutcome("home", candidate.homeTeam, event),
      findBestOutcome("draw", "Draw", event),
      findBestOutcome("away", candidate.awayTeam, event)
    ].filter((outcome): outcome is StoredOutcome => Boolean(outcome));

    if (outcomes.length < 2) {
      continue;
    }

    return {
      event,
      bookmakerCount: countBookmakers(event),
      outcomes,
      providerLastUpdatedAtUtc: getLatestBookmakerUpdate(event)
    };
  }

  return null;
}

function scoreEvent(candidate: OddsRefreshCandidate, event: TheOddsApiEvent, matchTime: number) {
  const sameDirection = namesMatch(event.home_team ?? "", candidate.homeTeam) && namesMatch(event.away_team ?? "", candidate.awayTeam);
  const swappedDirection = namesMatch(event.home_team ?? "", candidate.awayTeam) && namesMatch(event.away_team ?? "", candidate.homeTeam);
  if (!sameDirection && !swappedDirection) return 0;

  const eventTime = event.commence_time ? new Date(event.commence_time).getTime() : Number.NaN;
  if (!Number.isFinite(eventTime)) return 108;

  const hoursApart = Math.abs(eventTime - matchTime) / 36e5;
  return hoursApart <= 48 ? 200 - hoursApart : 0;
}

function findBestOutcome(label: StoredOutcome["label"], targetName: string, event: TheOddsApiEvent): StoredOutcome | null {
  let best: StoredOutcome | null = null;

  for (const bookmaker of event.bookmakers ?? []) {
    const market = bookmaker.markets?.find((row) => row.key === "h2h");
    const outcome = market?.outcomes?.find((row) => label === "draw"
      ? ["draw", "x"].includes(normalizeName(row.name ?? ""))
      : namesMatch(row.name ?? "", targetName));
    const price = Number(outcome?.price);

    if (!Number.isFinite(price) || price <= 1) continue;
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

function countBookmakers(event: TheOddsApiEvent) {
  return (event.bookmakers ?? []).filter((bookmaker) => bookmaker.markets?.some((market) => market.key === "h2h")).length;
}

function getLatestBookmakerUpdate(event: TheOddsApiEvent) {
  const latest = (event.bookmakers ?? [])
    .map((bookmaker) => bookmaker.last_update ? new Date(bookmaker.last_update).getTime() : Number.NaN)
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0];
  return latest ? new Date(latest).toISOString() : null;
}

function namesMatch(left: string, right: string) {
  const normalizedLeft = normalizeName(left);
  const normalizedRight = normalizeName(right);
  return Boolean(normalizedLeft && normalizedRight && (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ));
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

function readPositiveNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function getFirstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return "";
}

function unique(values: string[]) {
  return [...new Set(values)];
}
