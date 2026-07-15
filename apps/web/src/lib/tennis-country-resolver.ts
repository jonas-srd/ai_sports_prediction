/**
 * Purpose: Resolves country codes for tennis players that are not yet in our local player catalogue.
 *
 * TheSportsDB sometimes exposes tennis participants by surname only and without a player id.
 * Wikipedia resolves that search name to a player entity; Wikidata then supplies structured
 * sporting country (P1532), citizenship (P27) and ISO 3166-1 alpha-2 (P297) values.
 * Next.js caches every request.
 */
import { resolveTennisPlayerCountryCode } from "@/lib/tennis-data";

const WIKIPEDIA_API_URL = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const CACHE_SECONDS = 60 * 60 * 24 * 30;
const MAX_PARALLEL_SEARCHES = 6;
const WIKIMEDIA_USER_AGENT = "AI-Sports-Prediction/1.0 (tennis flag enrichment)";

const resolvedCountryCodes = new Map<string, string | null>();

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

export async function resolveTennisPlayerCountryCodes(names: string[]) {
  const countryCodes = new Map<string, string>();
  const externalNames = new Map<string, string>();

  for (const name of names) {
    const key = normalizePlayerName(name);
    if (!key) {
      continue;
    }

    const localCountryCode = resolveTennisPlayerCountryCode(name);
    if (localCountryCode) {
      countryCodes.set(name, localCountryCode);
      continue;
    }

    if (resolvedCountryCodes.has(key)) {
      const cachedCountryCode = resolvedCountryCodes.get(key);
      if (cachedCountryCode) {
        countryCodes.set(name, cachedCountryCode);
      }
      continue;
    }

    if (!externalNames.has(key)) {
      externalNames.set(key, name);
    }
  }

  const playerEntities = await mapWithConcurrency(
    [...externalNames.entries()],
    MAX_PARALLEL_SEARCHES,
    async ([key, name]) => [key, await findTennisPlayerEntityId(name).catch(() => null)] as const
  );
  const entityIdByName = new Map(playerEntities.filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
  const playerEntityIds = [...new Set(entityIdByName.values())];
  const playerEntityRows = await fetchWikidataEntities(playerEntityIds);
  const countryEntityIdByPlayer = new Map<string, string>();

  for (const playerEntityId of playerEntityIds) {
    const claims = playerEntityRows[playerEntityId]?.claims;
    const countryEntityId = getPreferredEntityId(claims?.P1532) ?? getPreferredEntityId(claims?.P27);
    if (countryEntityId) {
      countryEntityIdByPlayer.set(playerEntityId, countryEntityId);
    }
  }

  const countryEntityRows = await fetchWikidataEntities([...new Set(countryEntityIdByPlayer.values())]);

  for (const [key, originalName] of externalNames) {
    const playerEntityId = entityIdByName.get(key);
    const countryEntityId = playerEntityId ? countryEntityIdByPlayer.get(playerEntityId) : undefined;
    const countryCode = countryEntityId ? getIsoCountryCode(countryEntityRows[countryEntityId]?.claims?.P297) : null;

    if (countryCode) {
      resolvedCountryCodes.set(key, countryCode);
      countryCodes.set(originalName, countryCode);
    }
  }

  for (const name of names) {
    if (countryCodes.has(name)) {
      continue;
    }

    const cachedCountryCode = resolvedCountryCodes.get(normalizePlayerName(name));
    if (cachedCountryCode) {
      countryCodes.set(name, cachedCountryCode);
    }
  }

  return countryCodes;
}

async function findTennisPlayerEntityId(name: string) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "0",
    gsrsearch: `${name} tennis player`,
    gsrlimit: "5",
    prop: "pageprops|extracts",
    ppprop: "wikibase_item",
    exintro: "1",
    explaintext: "1",
    origin: "*"
  });
  const payload = await fetchWikimediaJson<WikipediaSearchResponse>(`${WIKIPEDIA_API_URL}?${params}`);
  const pages = Object.values(payload?.query?.pages ?? {}).sort((left, right) => (left.index ?? 999) - (right.index ?? 999));
  const requestedTokens = normalizePlayerName(name).split(" ").filter(Boolean);
  const candidate = pages.find((page) => isMatchingTennisPlayerPage(page, requestedTokens));
  const entityId = candidate?.pageprops?.wikibase_item;

  return entityId && /^Q\d+$/.test(entityId) ? entityId : null;
}

function isMatchingTennisPlayerPage(page: WikipediaPage, requestedTokens: string[]) {
  const titleTokens = normalizePlayerName(page.title ?? "").split(" ").filter(Boolean);
  const extract = normalizePlayerName(page.extract ?? "");

  return Boolean(
    page.pageprops?.wikibase_item &&
      requestedTokens.length > 0 &&
      requestedTokens.every((token) => titleTokens.includes(token)) &&
      extract.includes("tennis player")
  );
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
    const payload = await fetchWikimediaJson<WikidataEntitiesResponse>(`${WIKIDATA_API_URL}?${params}`).catch(() => null);
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

async function fetchWikimediaJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Api-User-Agent": WIKIMEDIA_USER_AGENT,
      "User-Agent": WIKIMEDIA_USER_AGENT
    },
    next: { revalidate: CACHE_SECONDS }
  });

  if (!response.ok) {
    throw new Error(`Wikimedia request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
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
