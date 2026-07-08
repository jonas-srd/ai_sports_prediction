import type { SportApiMatch } from "@/lib/sports-api-data";
import { tennisPlayers } from "@/lib/tennis-data";

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
  status: "live" | "snapshot";
};

const ATP_RANKINGS_URL = "https://www.atptour.com/en/rankings/singles";
const ATP_OFFICIAL_SNAPSHOT_DATE = "2026.07.08";
const ATP_OFFICIAL_SNAPSHOT_ROWS = [
  { age: 24, countryCode: "it", dropping: 2000, movement: null, name: "Jannik Sinner", nextBest: null, points: 13450, rank: 1, tournamentsPlayed: 18 },
  { age: 23, countryCode: "es", dropping: 1300, movement: null, name: "Carlos Alcaraz", nextBest: null, points: 9460, rank: 2, tournamentsPlayed: 17 },
  { age: 29, countryCode: "de", dropping: 10, movement: null, name: "Alexander Zverev", nextBest: 40, points: 7190, rank: 3, tournamentsPlayed: 20 },
  { age: 25, countryCode: "ca", dropping: 50, movement: -50, name: "Felix Auger-Aliassime", nextBest: 50, points: 4390, rank: 4, tournamentsPlayed: 23 },
  { age: 23, countryCode: "us", dropping: 400, movement: null, name: "Ben Shelton", nextBest: 10, points: 4160, rank: 5, tournamentsPlayed: 22 },
  { age: 27, countryCode: "au", dropping: 200, movement: null, name: "Alex de Minaur", nextBest: 50, points: 4110, rank: 6, tournamentsPlayed: 24 },
  { age: 28, countryCode: "us", dropping: 800, movement: -150, name: "Taylor Fritz", nextBest: 35, points: 3765, rank: 7, tournamentsPlayed: 22 },
  { age: 39, countryCode: "rs", dropping: 800, movement: null, name: "Novak Djokovic", nextBest: null, points: 3760, rank: 8, tournamentsPlayed: 16 },
  { age: 30, countryCode: "un", dropping: 10, movement: null, name: "Daniil Medvedev", nextBest: 50, points: 3580, rank: 9, tournamentsPlayed: 24 },
  { age: 24, countryCode: "it", dropping: 400, movement: null, name: "Flavio Cobolli", nextBest: 10, points: 3460, rank: 10, tournamentsPlayed: 26 },
  { age: 29, countryCode: "kz", dropping: 10, movement: null, name: "Alexander Bublik", nextBest: 50, points: 2620, rank: 11, tournamentsPlayed: 26 },
  { age: 27, countryCode: "no", dropping: null, movement: null, name: "Casper Ruud", nextBest: null, points: 2425, rank: 12, tournamentsPlayed: 22 },
  { age: 28, countryCode: "un", dropping: 200, movement: null, name: "Andrey Rublev", nextBest: null, points: 2420, rank: 13, tournamentsPlayed: 23 },
  { age: 24, countryCode: "cz", dropping: 50, movement: null, name: "Jiri Lehecka", nextBest: 10, points: 2360, rank: 14, tournamentsPlayed: 21 },
  { age: 24, countryCode: "it", dropping: 10, movement: null, name: "Lorenzo Musetti", nextBest: 10, points: 2325, rank: 15, tournamentsPlayed: 22 },
  { age: 24, countryCode: "it", dropping: 100, movement: null, name: "Luciano Darderi", nextBest: 50, points: 2300, rank: 16, tournamentsPlayed: 30 },
  { age: 20, countryCode: "us", dropping: 50, movement: -20, name: "Learner Tien", nextBest: 25, points: 2270, rank: 17, tournamentsPlayed: 22 },
  { age: 20, countryCode: "cz", dropping: 100, movement: -40, name: "Jakub Mensik", nextBest: 10, points: 2255, rank: 18, tournamentsPlayed: 20 },
  { age: 28, countryCode: "us", dropping: 50, movement: null, name: "Frances Tiafoe", nextBest: 50, points: 2180, rank: 19, tournamentsPlayed: 22 },
  { age: 27, countryCode: "mc", dropping: null, movement: null, name: "Valentin Vacherot", nextBest: null, points: 2138, rank: 20, tournamentsPlayed: 20 },
  { age: 27, countryCode: "ar", dropping: 10, movement: null, name: "Francisco Cerundolo", nextBest: 50, points: 2110, rank: 21, tournamentsPlayed: 24 },
  { age: 30, countryCode: "un", dropping: 400, movement: null, name: "Karen Khachanov", nextBest: null, points: 2080, rank: 22, tournamentsPlayed: 23 },
  { age: 27, countryCode: "es", dropping: 100, movement: 150, name: "Alejandro Davidovich Fokina", nextBest: 50, points: 2060, rank: 23, tournamentsPlayed: 25 },
  { age: 22, countryCode: "fr", dropping: null, movement: null, name: "Arthur Fils", nextBest: null, points: 1940, rank: 24, tournamentsPlayed: 17 },
  { age: 29, countryCode: "us", dropping: 50, movement: null, name: "Tommy Paul", nextBest: 50, points: 1925, rank: 25, tournamentsPlayed: 22 }
] satisfies Array<{
  age: number;
  countryCode: string;
  dropping: null | number;
  movement: null | number;
  name: string;
  nextBest: null | number;
  points: number;
  rank: number;
  tournamentsPlayed: number;
}>;

export async function getAtpRankingSnapshot(_matches: SportApiMatch[]): Promise<TennisRankingSnapshot> {
  try {
    const response = await fetch(ATP_RANKINGS_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; AI-Sport-Prediction/1.0)"
      },
      next: { revalidate: Number(process.env.API_TENNIS_CACHE_SECONDS ?? 60) }
    }).catch(() => null);

    if (response?.ok) {
      const html = await response.text();
      const rows = parseAtpRankingRows(html);

      if (rows.length >= 10) {
        return {
          asOf: formatRankingDate(new Date()),
          rows,
          status: "live"
        };
      }
    }
  } catch {
    // Fall through to local live fallback.
  }

  return {
    asOf: ATP_OFFICIAL_SNAPSHOT_DATE,
    rows: buildOfficialSnapshotRows(),
    status: "snapshot"
  };
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

function buildOfficialSnapshotRows(): TennisRankingRow[] {
  return ATP_OFFICIAL_SNAPSHOT_ROWS.map((row) => {
    const localPlayer = findLocalPlayer(row.name);

    return {
      age: row.age,
      countryCode: localPlayer?.countryCode ?? row.countryCode,
      dropping: row.dropping,
      movement: row.movement,
      nextBest: row.nextBest,
      playerName: localPlayer?.name ?? row.name,
      playerSlug: localPlayer?.slug ?? null,
      points: row.points,
      rank: row.rank,
      tournamentsPlayed: row.tournamentsPlayed
    };
  });
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
  const normalized = normalize(name);
  return tennisPlayers.find((player) => normalize(player.name) === normalized || normalize(player.shortName) === normalized);
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
