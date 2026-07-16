/**
 * Purpose: Resolves country codes for tennis players that are not yet in our local player catalogue.
 *
 * TheSportsDB sometimes exposes tennis participants by surname only and without a player id.
 * TheSportsDB player search is the first external source because it exposes a canonical player
 * name and nationality. Multilingual Wikipedia and Wikidata provide structured fallbacks.
 * Next.js caches every request.
 */
import {
  findTennisPlayerByName,
  resolveTennisPlayerCountryCode
} from "./tennis-data";
import { getCountryFlagCode } from "./country-flags";
import {
  loadStoredTennisPlayerCountryProfiles,
  storeTennisPlayerCountryProfiles
} from "./tennis-country-db";

const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const MAX_PARALLEL_SEARCHES = 6;
const MAX_DETAILED_PROVIDER_SEARCHES = 60;
const DEFAULT_MAX_ITF_SEARCHES_PER_RUN = 40;
const WIKIMEDIA_USER_AGENT = "AI-Sports-Prediction/1.0 (tennis flag enrichment)";
const WIKIPEDIA_SOURCES = [
  { language: "en", querySuffix: "tennis player" },
  { language: "es", querySuffix: "tenista" },
  { language: "de", querySuffix: "Tennisspieler" },
  { language: "fr", querySuffix: "joueur tennis" },
  { language: "it", querySuffix: "tennista" }
] as const;

export type TennisPlayerCountryProfile = {
  canonicalName: string;
  countryCode: string;
};

declare global {
  var aiSportsTennisCountryProfiles: Map<string, TennisPlayerCountryProfile | null> | undefined;
  var aiSportsTennisCountryRetryAfter: Map<string, number> | undefined;
  var aiSportsTennisCountryResolverVersion: number | undefined;
}

const resolvedCountryProfiles = globalThis.aiSportsTennisCountryProfiles ??= new Map();
const unresolvedRetryAfter = globalThis.aiSportsTennisCountryRetryAfter ??= new Map();
const UNRESOLVED_RETRY_MS = 6 * 60 * 60 * 1000;
const RESOLVER_VERSION = 5;
if (globalThis.aiSportsTennisCountryResolverVersion !== RESOLVER_VERSION) {
  unresolvedRetryAfter.clear();
  globalThis.aiSportsTennisCountryResolverVersion = RESOLVER_VERSION;
}

type WikipediaPage = {
  index?: number;
  title?: string;
  extract?: string;
  pageprops?: {
    wikibase_item?: string;
  };
};

type WikipediaSearchResponse = {
  query?: {
    pages?: Record<string, WikipediaPage>;
  };
};

type WikidataSearchResult = {
  description?: string;
  id?: string;
  label?: string;
};

type WikidataSearchResponse = {
  search?: WikidataSearchResult[];
};

type WikidataSnak = {
  datavalue?: {
    value?: unknown;
  };
};

type WikidataClaim = {
  rank?: string;
  mainsnak?: WikidataSnak;
};

type WikidataEntity = {
  claims?: Record<string, WikidataClaim[]>;
};

type WikidataEntitiesResponse = {
  entities?: Record<string, WikidataEntity>;
};

type TheSportsDbPlayerListRow = {
  idPlayer?: number | string;
  strPlayer?: string;
};

type TheSportsDbPlayerListResponse = {
  list?: TheSportsDbPlayerListRow[];
};

type TheSportsDbPlayerReference = {
  id: string;
  name: string;
};

type TheSportsDbDetailedPlayer = TheSportsDbPlayerListRow & {
  strNationality?: string;
  strSport?: string;
  strTeam?: string;
};

type TheSportsDbDetailedSearchResponse = {
  lookup?: TheSportsDbDetailedPlayer[];
  player?: TheSportsDbDetailedPlayer[];
  players?: TheSportsDbDetailedPlayer[];
  search?: TheSportsDbDetailedPlayer[];
};

type SerpApiOrganicResult = {
  link?: string;
  title?: string;
};

type SerpApiSearchResponse = {
  organic_results?: SerpApiOrganicResult[];
};

export async function resolveTennisPlayerCountryCodes(names: string[]) {
  const profiles = await resolveTennisPlayerCountryProfiles(names);
  const countryCodes = new Map<string, string>();

  for (const [name, profile] of profiles) {
    countryCodes.set(name, profile.countryCode);
  }

  return countryCodes;
}

export async function resolveTennisPlayerCountryProfiles(names: string[]) {
  const profiles = new Map<string, TennisPlayerCountryProfile>();
  const externalNames = new Map<string, string>();

  for (const name of names) {
    const key = normalizePlayerName(name);
    if (!key) {
      continue;
    }

    const localProfile = findLocalCountryProfile(name);
    if (localProfile) {
      profiles.set(name, localProfile);
      resolvedCountryProfiles.set(key, localProfile);
      continue;
    }

    if (resolvedCountryProfiles.has(key)) {
      const cachedProfile = resolvedCountryProfiles.get(key);
      if (cachedProfile && profileMatchesRequestedName(cachedProfile, name)) {
        profiles.set(name, cachedProfile);
      } else if (cachedProfile) {
        resolvedCountryProfiles.delete(key);
      } else {
        continue;
      }
      if (profiles.has(name)) {
        continue;
      }
    }

    if ((unresolvedRetryAfter.get(key) ?? 0) > Date.now()) {
      continue;
    }

    if (!externalNames.has(key)) {
      externalNames.set(key, name);
    }
  }

  const storedProfiles = await loadStoredTennisPlayerCountryProfiles([...externalNames.keys()])
    .catch(() => new Map<string, TennisPlayerCountryProfile>());
  for (const [key, originalName] of externalNames) {
    const storedProfile = storedProfiles.get(key);
    if (!storedProfile || !profileMatchesRequestedName(storedProfile, originalName)) {
      continue;
    }

    resolvedCountryProfiles.set(key, storedProfile);
    unresolvedRetryAfter.delete(key);
    profiles.set(originalName, storedProfile);
    externalNames.delete(key);
  }

  const externalEntries = [...externalNames.entries()];
  const providerPlayers = await getTheSportsDbTennisPlayers().catch(() => []);
  const searchEntries = externalEntries.map(([key, name]) => {
    const providerPlayer = findCanonicalProviderPlayer(name, providerPlayers);
    return [key, providerPlayer?.name ?? name, providerPlayer?.id ?? null] as const;
  });
  const firstPass = await mapWithConcurrency(
    searchEntries,
    MAX_PARALLEL_SEARCHES,
    async ([key, name]) => [key, await findTennisPlayerEntity(name).catch(() => null)] as const
  );
  const unresolvedEntries = searchEntries.filter(([key]) =>
    !firstPass.some(([resolvedKey, entity]) => resolvedKey === key && Boolean(entity))
  );
  const retryPass = await mapWithConcurrency(
    unresolvedEntries,
    2,
    async ([key, name]) => [key, await findTennisPlayerEntity(name).catch(() => null)] as const
  );
  const playerEntities = [
    ...firstPass.filter(([, entity]) => Boolean(entity)),
    ...retryPass
  ];
  const entityByName = new Map(playerEntities.filter(
    (entry): entry is readonly [string, { canonicalName: string; entityId: string }] => Boolean(entry[1])
  ));
  const playerEntityIds = [...new Set([...entityByName.values()].map((entry) => entry.entityId))];
  const playerEntityRows = await fetchWikidataEntities(playerEntityIds);
  const countryEntityIdsByPlayer = new Map<string, string[]>();

  for (const playerEntityId of playerEntityIds) {
    const claims = playerEntityRows[playerEntityId]?.claims;
    const countryEntityIds = [
      getPreferredEntityId(claims?.P1532),
      getPreferredEntityId(claims?.P27)
    ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
    if (countryEntityIds.length) {
      countryEntityIdsByPlayer.set(playerEntityId, countryEntityIds);
    }
  }

  const countryEntityRows = await fetchWikidataEntities([
    ...new Set([...countryEntityIdsByPlayer.values()].flat())
  ]);

  const stillUnresolved: Array<readonly [string, string]> = [];
  for (const [key, originalName] of externalNames) {
    const entity = entityByName.get(key);
    const playerEntityId = entity?.entityId;
    const countryEntityIds = playerEntityId ? countryEntityIdsByPlayer.get(playerEntityId) ?? [] : [];
    const countryCode = countryEntityIds
      .map((countryEntityId) => getIsoCountryCode(countryEntityRows[countryEntityId]?.claims?.P297))
      .find((value): value is string => Boolean(value)) ?? null;

    if (countryCode) {
      const profile = {
        canonicalName: cleanCanonicalPlayerName(entity?.canonicalName) || originalName,
        countryCode
      };
      resolvedCountryProfiles.set(key, profile);
      unresolvedRetryAfter.delete(key);
      profiles.set(originalName, profile);
    } else {
      stillUnresolved.push([key, originalName]);
    }
  }

  const detailedProfiles = await mapWithConcurrency(
    stillUnresolved.slice(0, MAX_DETAILED_PROVIDER_SEARCHES),
    2,
    async ([key, name]) => {
      const providerPlayerId = searchEntries.find(([entryKey]) => entryKey === key)?.[2] ?? null;
      return [
        key,
        await findDetailedTheSportsDbPlayerProfile(name, providerPlayerId).catch(() => null)
      ] as const;
    }
  );
  const detailedProfileByKey = new Map(detailedProfiles.filter(
    (entry): entry is readonly [string, TennisPlayerCountryProfile] => Boolean(entry[1])
  ));
  const unresolvedAfterProvider = stillUnresolved.filter(([key]) => !detailedProfileByKey.has(key));
  const itfProfiles = await mapWithConcurrency(
    unresolvedAfterProvider.slice(0, getMaxItfSearchesPerRun()),
    2,
    async ([key, name]) => [key, await findOfficialItfPlayerProfile(name).catch(() => null)] as const
  );
  const itfProfileByKey = new Map(itfProfiles.filter(
    (entry): entry is readonly [string, TennisPlayerCountryProfile] => Boolean(entry[1])
  ));
  const attemptedDetailedKeys = new Set(detailedProfiles.map(([key]) => key));
  const attemptedItfKeys = new Set(itfProfiles.map(([key]) => key));
  const profilesToStore: Array<TennisPlayerCountryProfile & { normalizedName: string }> = [];

  for (const [key, originalName] of stillUnresolved) {
    const profile = detailedProfileByKey.get(key) ?? itfProfileByKey.get(key);
    if (profile) {
      resolvedCountryProfiles.set(key, profile);
      unresolvedRetryAfter.delete(key);
      profiles.set(originalName, profile);
      profilesToStore.push({ ...profile, normalizedName: key });
    } else if (attemptedDetailedKeys.has(key) || attemptedItfKeys.has(key)) {
      unresolvedRetryAfter.set(key, Date.now() + UNRESOLVED_RETRY_MS);
    }
  }
  for (const [key, originalName] of externalNames) {
    const profile = profiles.get(originalName);
    if (profile && !profilesToStore.some((candidate) => candidate.normalizedName === key)) {
      profilesToStore.push({ ...profile, normalizedName: key });
    }
  }
  await storeTennisPlayerCountryProfiles(profilesToStore).catch(() => undefined);

  for (const name of names) {
    if (profiles.has(name)) {
      continue;
    }

    const cachedProfile = resolvedCountryProfiles.get(normalizePlayerName(name));
    if (cachedProfile) {
      profiles.set(name, cachedProfile);
    }
  }

  return profiles;
}

async function getTheSportsDbTennisPlayers(): Promise<TheSportsDbPlayerReference[]> {
  const apiKey = getTheSportsDbKey();
  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://www.thesportsdb.com/api/v2/json/list/players/ATP%20Mens", {
    headers: { "X-API-KEY": apiKey, accept: "application/json" },
    next: { revalidate: CACHE_SECONDS }
  });
  if (!response.ok) {
    return [];
  }
  const payload = await response.json().catch(() => null) as TheSportsDbPlayerListResponse | null;
  return [...new Map((payload?.list ?? [])
    .map((row) => ({
      id: String(row.idPlayer ?? "").trim(),
      name: cleanCanonicalPlayerName(row.strPlayer)
    }))
    .filter((row) => row.id && row.name)
    .map((row) => [row.id, row])).values()];
}

function findCanonicalProviderPlayer(name: string, providerPlayers: TheSportsDbPlayerReference[]) {
  for (const candidate of getTennisPlayerLookupCandidates(name)) {
    const requestedTokens = normalizePlayerName(candidate).split(" ").filter(Boolean);
    const matches = providerPlayers.filter((providerPlayer) =>
      nameTokensMatch(providerPlayer.name, requestedTokens)
    );
    if (matches.length === 1) {
      return matches[0];
    }
  }
  return null;
}

async function findDetailedTheSportsDbPlayerProfile(
  name: string,
  providerPlayerId: string | null
): Promise<TennisPlayerCountryProfile | null> {
  const apiKey = getTheSportsDbKey();
  if (!apiKey) {
    return null;
  }

  if (providerPlayerId) {
    const url = `https://www.thesportsdb.com/api/v2/json/lookup/player/${encodeURIComponent(providerPlayerId)}`;
    const response = await fetch(url, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: CACHE_SECONDS }
    });
    if (response.ok) {
      const payload = await response.json().catch(() => null) as TheSportsDbDetailedSearchResponse | null;
      const profile = findUniqueDetailedTennisProfile(
        payload?.lookup ?? payload?.player ?? payload?.players ?? [],
        name
      );
      if (profile) {
        return profile;
      }
    }
  }

  for (const candidate of getTennisPlayerLookupCandidates(name)) {
    const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php`);
    url.searchParams.set("p", candidate);
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: CACHE_SECONDS }
    });
    if (!response.ok) {
      continue;
    }
    const payload = await response.json().catch(() => null) as TheSportsDbDetailedSearchResponse | null;
    const profile = findUniqueDetailedTennisProfile(
      payload?.player ?? payload?.players ?? [],
      candidate
    );
    if (profile) {
      return profile;
    }
  }

  return null;
}

function findUniqueDetailedTennisProfile(players: TheSportsDbDetailedPlayer[], name: string) {
  const requestedTokens = normalizePlayerName(name).split(" ").filter(Boolean);
  const matches = players.filter((player) =>
    isDetailedTennisPlayer(player)
    && nameTokensMatch(player.strPlayer ?? "", requestedTokens)
    && Boolean(getCountryFlagCode(player.strNationality))
  );
  if (matches.length !== 1) {
    return null;
  }
  const countryCode = getCountryFlagCode(matches[0].strNationality);
  return matches[0].strPlayer && countryCode ? {
    canonicalName: cleanCanonicalPlayerName(matches[0].strPlayer),
    countryCode
  } : null;
}

async function findOfficialItfPlayerProfile(name: string): Promise<TennisPlayerCountryProfile | null> {
  const apiKey = process.env.SERPAPI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  for (const candidate of getTennisPlayerLookupCandidates(name)) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", `site:itftennis.com/en/players "${candidate}" "Tennis Player Profile"`);
    url.searchParams.set("num", "5");
    url.searchParams.set("api_key", apiKey);
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: CACHE_SECONDS }
    });
    if (!response.ok) {
      continue;
    }
    const payload = await response.json().catch(() => null) as SerpApiSearchResponse | null;
    const profiles = (payload?.organic_results ?? [])
      .map((result) => parseOfficialItfPlayerProfile(result, candidate))
      .filter((profile): profile is TennisPlayerCountryProfile => Boolean(profile));
    const uniqueProfiles = [...new Map(
      profiles.map((profile) => [`${normalizePlayerName(profile.canonicalName)}:${profile.countryCode}`, profile])
    ).values()];

    if (uniqueProfiles.length === 1) {
      return uniqueProfiles[0];
    }
  }

  return null;
}

export function parseOfficialItfPlayerProfile(
  result: SerpApiOrganicResult,
  requestedName: string
): TennisPlayerCountryProfile | null {
  if (!result.link || !result.title) {
    return null;
  }

  let profileUrl: URL;
  try {
    profileUrl = new URL(result.link);
  } catch {
    return null;
  }
  if (!ITF_HOSTNAMES.has(profileUrl.hostname.toLowerCase())) {
    return null;
  }

  const pathMatch = profileUrl.pathname.match(
    /^\/en\/players\/[^/]+\/\d+\/([a-z]{3})\/(?:mt|wt)\/s\/overview\/?$/i
  );
  const countryCode = pathMatch ? ISO3_TO_ISO2[pathMatch[1].toLowerCase()] : null;
  const canonicalName = cleanCanonicalPlayerName(
    result.title
      .replace(/\s*[-|]\s*(?:Tennis Player Profile.*|ITF.*)$/i, "")
      .replace(/\s*Tennis Player Profile.*$/i, "")
  );
  const requestedTokens = normalizePlayerName(requestedName).split(" ").filter(Boolean);

  if (!countryCode || !canonicalName || !nameTokensMatch(canonicalName, requestedTokens)) {
    return null;
  }

  return { canonicalName, countryCode };
}

function isDetailedTennisPlayer(player: TheSportsDbDetailedPlayer) {
  const sport = normalizePlayerName(player.strSport ?? "");
  const team = normalizePlayerName(player.strTeam ?? "");
  return sport === "tennis" || team.includes("atp") || team.includes("wta");
}

function findLocalCountryProfile(name: string): TennisPlayerCountryProfile | null {
  for (const candidate of getTennisPlayerLookupCandidates(name)) {
    const localPlayer = findTennisPlayerByName(candidate);
    const countryCode = localPlayer?.countryCode ?? resolveTennisPlayerCountryCode(candidate);
    if (countryCode) {
      return {
        canonicalName: localPlayer?.name ?? candidate,
        countryCode
      };
    }
  }

  return null;
}

async function findTennisPlayerEntity(name: string) {
  const candidates = getTennisPlayerLookupCandidates(name);

  for (const candidate of candidates) {
    const wikipediaEntity = await findWikipediaTennisPlayerEntity(candidate).catch(() => null);
    if (wikipediaEntity) {
      return wikipediaEntity;
    }
  }

  for (const candidate of candidates) {
    const wikidataEntity = await findWikidataTennisPlayerEntity(candidate).catch(() => null);
    if (wikidataEntity) {
      return wikidataEntity;
    }
  }

  return null;
}

async function findWikipediaTennisPlayerEntity(name: string) {
  const requestedTokens = normalizePlayerName(name).split(" ").filter(Boolean);

  for (const source of WIKIPEDIA_SOURCES) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrnamespace: "0",
      gsrsearch: `${name} ${source.querySuffix}`,
      gsrlimit: "5",
      prop: "pageprops|extracts",
      ppprop: "wikibase_item",
      exintro: "1",
      explaintext: "1",
      origin: "*"
    });
    const payload = await fetchWikimediaJson<WikipediaSearchResponse>(
      `https://${source.language}.wikipedia.org/w/api.php?${params}`
    );
    const pages = Object.values(payload?.query?.pages ?? {})
      .sort((left, right) => (left.index ?? 999) - (right.index ?? 999));
    const candidate = pages.find((page) =>
      isTennisPlayerPage(page) && nameTokensMatch(page.title ?? "", requestedTokens)
    ) ?? pages.find((page) => isMatchingTennisPlayerPage(page, requestedTokens));
    const entityId = candidate?.pageprops?.wikibase_item;
    if (entityId && /^Q\d+$/.test(entityId)) {
      return {
        canonicalName: candidate?.title ?? name,
        entityId
      };
    }
  }

  return null;
}

async function findWikidataTennisPlayerEntity(name: string) {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    limit: "8",
    search: `${name} tennis`
  });
  const payload = await fetchWikimediaJson<WikidataSearchResponse>(`${WIKIDATA_API_URL}?${params}`);
  const requestedTokens = normalizePlayerName(name).split(" ").filter(Boolean);
  const candidate = payload.search?.find((item) =>
    Boolean(
      item.id
      && /^Q\d+$/.test(item.id)
      && normalizePlayerName(item.description ?? "").includes("tennis player")
      && nameTokensMatch(item.label ?? "", requestedTokens)
    )
  );

  return candidate?.id ? {
    canonicalName: candidate.label ?? name,
    entityId: candidate.id
  } : null;
}

function isMatchingTennisPlayerPage(page: WikipediaPage, requestedTokens: string[]) {
  const identityText = `${page.title ?? ""} ${String(page.extract ?? "").split(/[.!?]/, 1)[0] ?? ""}`;

  return Boolean(
    isTennisPlayerPage(page) &&
      requestedTokens.length > 0 &&
      nameTokensMatch(identityText, requestedTokens)
  );
}

function isTennisPlayerPage(page: WikipediaPage) {
  const extract = normalizePlayerName(page.extract ?? "");
  return Boolean(
    page.pageprops?.wikibase_item
    && TENNIS_PLAYER_DESCRIPTION_PATTERN.test(extract)
    && !NON_PLAYER_PAGE_PATTERN.test(extract)
  );
}

function nameTokensMatch(value: string, requestedTokens: string[]) {
  const title = normalizePlayerName(value);
  const titleTokens = title.split(" ").filter(Boolean);
  const compactTitle = titleTokens.join("");
  const compactRequested = requestedTokens.join("");

  return requestedTokens.every((token) => titleTokens.includes(token))
    || (compactRequested.length >= 4 && compactTitle.includes(compactRequested));
}

async function fetchWikidataEntities(ids: string[]) {
  const entities: Record<string, WikidataEntity> = {};

  for (let index = 0; index < ids.length; index += 50) {
    const batch = ids.slice(index, index + 50);
    if (batch.length === 0) {
      continue;
    }

    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      ids: batch.join("|"),
      props: "claims"
    });
    const payload = await fetchWikimediaJson<WikidataEntitiesResponse>(
      `${WIKIDATA_API_URL}?${params}`,
      false
    ).catch(() => null);
    Object.assign(entities, payload?.entities ?? {});
  }

  return entities;
}

function getPreferredEntityId(claims: WikidataClaim[] | undefined) {
  const orderedClaims = [...(claims ?? [])].sort((left, right) => rankWeight(right.rank) - rankWeight(left.rank));

  for (const claim of orderedClaims) {
    const value = claim.mainsnak?.datavalue?.value;
    if (isObject(value) && typeof value.id === "string" && /^Q\d+$/.test(value.id)) {
      return value.id;
    }
  }

  return null;
}

function getIsoCountryCode(claims: WikidataClaim[] | undefined) {
  const orderedClaims = [...(claims ?? [])].sort((left, right) => rankWeight(right.rank) - rankWeight(left.rank));

  for (const claim of orderedClaims) {
    const value = claim.mainsnak?.datavalue?.value;
    if (typeof value === "string" && /^[A-Za-z]{2}$/.test(value)) {
      return value.toLowerCase();
    }
  }

  return null;
}

function rankWeight(rank: string | undefined) {
  if (rank === "preferred") {
    return 2;
  }
  if (rank === "normal") {
    return 1;
  }
  return 0;
}

async function fetchWikimediaJson<T>(url: string, cacheResponse = true) {
  const response = await fetch(url, {
    cache: cacheResponse ? "force-cache" : "no-store",
    headers: {
      Accept: "application/json",
      "Api-User-Agent": WIKIMEDIA_USER_AGENT,
      "User-Agent": WIKIMEDIA_USER_AGENT
    },
    ...(cacheResponse ? { next: { revalidate: CACHE_SECONDS } } : {})
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function getTennisPlayerLookupCandidates(value: string) {
  const normalized = cleanCanonicalPlayerName(value);
  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length) {
    return [];
  }

  const tournamentPrefixed = tokens.length > 1 && TOURNAMENT_CONTEXT_PATTERN.test(normalized);
  const suffixTwo = tokens.slice(-2);
  const allowSingleTokenSuffix = tournamentPrefixed
    && suffixTwo.length > 1
    && TOURNAMENT_TRAILING_CONTEXT_PATTERN.test(suffixTwo[0]);
  const suffixes = tournamentPrefixed
    ? [suffixTwo, tokens.slice(-3), ...(allowSingleTokenSuffix ? [tokens.slice(-1)] : []), tokens]
    : tokens.length > 1 && tokens[tokens.length - 1].length === 1
      ? [tokens, tokens.slice(0, -1)]
      : [tokens];

  return [...new Set(suffixes
    .map((parts) => parts.join(" ").trim())
    .filter((candidate) => candidate.length >= 2))];
}

function profileMatchesRequestedName(profile: TennisPlayerCountryProfile, requestedName: string) {
  return getTennisPlayerLookupCandidates(requestedName).some((candidate) =>
    nameTokensMatch(
      profile.canonicalName,
      normalizePlayerName(candidate).split(" ").filter(Boolean)
    )
  );
}

function cleanCanonicalPlayerName(value: string | undefined) {
  return String(value ?? "")
    .replace(/\s+\([^)]*tennis[^)]*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/^O\s+([A-Z])/i, "O'$1")
    .trim();
}

const TOURNAMENT_CONTEXT_PATTERN = /\b(?:abierto|championships?|internazionali|masters?|open|prix|tournament|tour)\b/i;
const TOURNAMENT_TRAILING_CONTEXT_PATTERN = /^(?:abierto|bnl|championships?|d'?italia|ii|internazionali|masters?|mexicano|open|prix)$/i;
const TENNIS_PLAYER_DESCRIPTION_PATTERN = /\b(?:joueur de tennis|tenis profesional|tenista|tennis player|tennisspieler)\b/i;
const NON_PLAYER_PAGE_PATTERN = /\b(?:is a list of|may refer to|surname)\b/i;
const ITF_HOSTNAMES = new Set(["itftennis.com", "www.itftennis.com"]);

const ISO3_TO_ISO2: Record<string, string> = {
  alb: "al",
  alg: "dz",
  and: "ad",
  ang: "ao",
  arg: "ar",
  arm: "am",
  aus: "au",
  aut: "at",
  aze: "az",
  bah: "bs",
  bar: "bb",
  bel: "be",
  ben: "bj",
  bih: "ba",
  blr: "by",
  bol: "bo",
  bra: "br",
  bul: "bg",
  bur: "bf",
  can: "ca",
  chi: "cl",
  chn: "cn",
  col: "co",
  crc: "cr",
  cro: "hr",
  cub: "cu",
  cyp: "cy",
  cze: "cz",
  den: "dk",
  dom: "do",
  ecu: "ec",
  egy: "eg",
  esa: "sv",
  esp: "es",
  est: "ee",
  fin: "fi",
  fra: "fr",
  gbr: "gb",
  geo: "ge",
  ger: "de",
  gha: "gh",
  gre: "gr",
  gua: "gt",
  hkg: "hk",
  hun: "hu",
  ina: "id",
  ind: "in",
  iri: "ir",
  irl: "ie",
  isl: "is",
  isr: "il",
  ita: "it",
  jam: "jm",
  jpn: "jp",
  kaz: "kz",
  ken: "ke",
  kor: "kr",
  kos: "xk",
  kuw: "kw",
  lat: "lv",
  lbn: "lb",
  ltu: "lt",
  lux: "lu",
  mar: "ma",
  mda: "md",
  mex: "mx",
  mkd: "mk",
  mlt: "mt",
  mne: "me",
  mon: "mc",
  ned: "nl",
  ngr: "ng",
  nor: "no",
  nzl: "nz",
  pak: "pk",
  par: "py",
  per: "pe",
  phi: "ph",
  pol: "pl",
  por: "pt",
  pur: "pr",
  rou: "ro",
  rsa: "za",
  rus: "ru",
  sen: "sn",
  srb: "rs",
  sui: "ch",
  svk: "sk",
  slo: "si",
  swe: "se",
  tha: "th",
  tpe: "tw",
  tun: "tn",
  tur: "tr",
  uae: "ae",
  ukr: "ua",
  uru: "uy",
  usa: "us",
  uzb: "uz",
  ven: "ve",
  vie: "vn",
  zim: "zw"
};

function getTheSportsDbKey() {
  return [
    process.env.THE_SPORTS_DB_API_KEY,
    process.env.THE_SPORTSDB_API_KEY,
    process.env.THESPORTSDB_API_KEY
  ].map((value) => value?.trim()).find(Boolean) ?? "";
}

function getMaxItfSearchesPerRun() {
  const value = Number(process.env.TENNIS_FLAG_SEARCH_MAX_PER_RUN);
  return Number.isFinite(value) && value >= 0
    ? Math.min(Math.floor(value), 100)
    : DEFAULT_MAX_ITF_SEARCHES_PER_RUN;
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function normalizePlayerName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
