import type { SportApiMatch } from "@/lib/sports-api-data";
import { findTennisPlayerByName } from "@/lib/tennis-data";
import {
  loadLatestTennisRankingSnapshot,
  storeLatestTennisRankingSnapshot,
  type StoredTennisRankingSnapshot
} from "@/lib/tennis-ranking-db";

export type TennisRankingRow = {
  age: number | null;
  countryCode: null | string;
  dropping: number | null;
  movement: number | null;
  nextBest: number | null;
  playerName: string;
  playerSlug: null | string;
  points: number | null;
  rank: number;
  tournamentsPlayed: number | null;
};

export type TennisRankingSnapshot = {
  asOf: string;
  rows: TennisRankingRow[];
  status: "live" | "stored" | "unavailable";
};

const ATP_RANKINGS_URL = "https://www.atptour.com/en/rankings/singles";
const MINIMUM_VALID_RANKING_ROWS = 10;

declare global {
  var aiSportsLatestAtpRankingSnapshot: StoredTennisRankingSnapshot | undefined;
}

type AtpRankingDependencies = {
  fetchHtml?: () => Promise<null | string>;
  loadLatest?: () => Promise<null | StoredTennisRankingSnapshot>;
  now?: () => Date;
  storeLatest?: (snapshot: StoredTennisRankingSnapshot) => Promise<void>;
};

export async function getAtpRankingSnapshot(
  _matches: SportApiMatch[],
  dependencies: AtpRankingDependencies = {}
): Promise<TennisRankingSnapshot> {
  const now = dependencies.now?.() ?? new Date();
  const refreshSeconds = getRankingRefreshSeconds();
  const latestStored = dependencies.loadLatest
    ? await dependencies.loadLatest().catch(() => null)
    : globalThis.aiSportsLatestAtpRankingSnapshot
      ?? await loadLatestTennisRankingSnapshot("ATP").catch(() => null);

  if (latestStored && isFreshRankingSnapshot(latestStored, now, refreshSeconds)) {
    globalThis.aiSportsLatestAtpRankingSnapshot = latestStored;
    return toStoredRankingSnapshot(latestStored);
  }

  try {
    const html = dependencies.fetchHtml
      ? await dependencies.fetchHtml()
      : await fetchAtpRankingHtml();

    if (html) {
      const rows = parseAtpRankingRows(html);

      if (rows.length >= MINIMUM_VALID_RANKING_ROWS) {
        const storedSnapshot = {
          fetchedAtUtc: now.toISOString(),
          rows
        } satisfies StoredTennisRankingSnapshot;
        globalThis.aiSportsLatestAtpRankingSnapshot = storedSnapshot;
        const storeLatest = dependencies.storeLatest
          ?? ((snapshot: StoredTennisRankingSnapshot) => storeLatestTennisRankingSnapshot("ATP", ATP_RANKINGS_URL, snapshot));
        await storeLatest(storedSnapshot).catch(() => undefined);

        return {
          asOf: formatRankingDate(now),
          rows,
          status: "live"
        };
      }
    }
  } catch {
    // Fall through to the latest successful stored ranking.
  }

  if (latestStored && latestStored.rows.length >= MINIMUM_VALID_RANKING_ROWS) {
    globalThis.aiSportsLatestAtpRankingSnapshot = latestStored;
    return toStoredRankingSnapshot(latestStored);
  }

  return {
    asOf: "",
    rows: [],
    status: "unavailable"
  };
}

async function fetchAtpRankingHtml() {
  const response = await fetch(ATP_RANKINGS_URL, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; AI-Sport-Prediction/1.0)"
    }
  }).catch(() => null);

  return response?.ok ? response.text() : null;
}

function parseAtpRankingRows(html: string): TennisRankingRow[] {
  const text = htmlToText(html);
  const header = "Hidden header Rank Player Age Official Points +/- Tourn Played Dropping Next Best";
  const start = text.indexOf(header);
  const rankingText = start >= 0 ? text.slice(start + header.length) : text;
  const rowPattern = /(\d{1,3})\s+([A-Za-z.'-]+(?:\s+[A-Za-z.'-]+){1,4})\s+(\d{1,2})\s+([\d,]+)\s+([+-]?\d+|-)\s+(\d{1,2})\s+([\d,]+|-)\s+([\d,]+|-)/g;
  const rows: TennisRankingRow[] = [];
  const seenRanks = new Set<number>();
  let match: null | RegExpExecArray = null;

  while ((match = rowPattern.exec(rankingText)) && rows.length < 100) {
    const rank = Number(match[1]);
    if (!Number.isFinite(rank) || rank < 1 || rank > 100 || seenRanks.has(rank)) {
      continue;
    }

    const playerName = match[2].trim();
    const localPlayer = findLocalPlayer(playerName);
    rows.push({
      age: toNumber(match[3]),
      countryCode: localPlayer?.countryCode ?? null,
      dropping: toNumber(match[7]),
      movement: toSignedNumber(match[5]),
      nextBest: toNumber(match[8]),
      playerName,
      playerSlug: localPlayer?.slug ?? null,
      points: toNumber(match[4]),
      rank,
      tournamentsPlayed: toNumber(match[6])
    });
    seenRanks.add(rank);
  }

  return rows;
}

function getRankingRefreshSeconds() {
  const configured = Number(process.env.TENNIS_RANKING_REFRESH_SECONDS ?? 300);
  return Number.isFinite(configured) && configured >= 60 ? configured : 300;
}

function isFreshRankingSnapshot(snapshot: StoredTennisRankingSnapshot, now: Date, refreshSeconds: number) {
  const fetchedAt = Date.parse(snapshot.fetchedAtUtc);
  return snapshot.rows.length >= MINIMUM_VALID_RANKING_ROWS
    && Number.isFinite(fetchedAt)
    && now.getTime() - fetchedAt < refreshSeconds * 1000;
}

function toStoredRankingSnapshot(snapshot: StoredTennisRankingSnapshot): TennisRankingSnapshot {
  return {
    asOf: formatRankingDate(new Date(snapshot.fetchedAtUtc)),
    rows: snapshot.rows,
    status: "stored"
  };
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function findLocalPlayer(name: string) {
  return findTennisPlayerByName(name);
}

function formatRankingDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
}

function toNumber(value: string) {
  if (!value || value === "-") {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toSignedNumber(value: string) {
  if (!value || value === "-") {
    return null;
  }

  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}
