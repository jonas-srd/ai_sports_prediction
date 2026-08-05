import assert from "node:assert/strict";
import test from "node:test";
import { getAtpRankingSnapshot, type TennisRankingRow } from "./tennis-rankings";

const fetchedAtUtc = "2026-08-05T10:00:00.000Z";
const storedRows = buildRows("Stored");

test("stores and returns a valid freshly read ATP ranking", async () => {
  const storedSnapshots: Array<{ fetchedAtUtc: string; rows: TennisRankingRow[] }> = [];
  const result = await getAtpRankingSnapshot([], {
    fetchHtml: async () => buildRankingHtml("Live"),
    loadLatest: async () => null,
    now: () => new Date(fetchedAtUtc),
    storeLatest: async (snapshot) => {
      storedSnapshots.push(snapshot);
    }
  });

  assert.equal(result.status, "live");
  assert.equal(result.asOf, "2026.08.05");
  assert.equal(result.rows.length, 10);
  assert.equal(storedSnapshots[0]?.fetchedAtUtc, fetchedAtUtc);
  assert.equal(storedSnapshots[0]?.rows.length, 10);
});

test("uses the latest successful stored ranking when the ATP read fails", async () => {
  const result = await getAtpRankingSnapshot([], {
    fetchHtml: async () => null,
    loadLatest: async () => ({ fetchedAtUtc, rows: storedRows }),
    now: () => new Date("2026-08-05T11:00:00.000Z")
  });

  assert.equal(result.status, "stored");
  assert.equal(result.asOf, "2026.08.05");
  assert.deepEqual(result.rows, storedRows);
});

test("reuses a recent successful ranking without requesting ATP again", async () => {
  let fetchAttempted = false;
  const result = await getAtpRankingSnapshot([], {
    fetchHtml: async () => {
      fetchAttempted = true;
      return null;
    },
    loadLatest: async () => ({ fetchedAtUtc, rows: storedRows }),
    now: () => new Date("2026-08-05T10:04:00.000Z")
  });

  assert.equal(fetchAttempted, false);
  assert.equal(result.status, "stored");
  assert.deepEqual(result.rows, storedRows);
});

test("returns no ranking instead of a fixed fallback before the first successful read", async () => {
  const result = await getAtpRankingSnapshot([], {
    fetchHtml: async () => null,
    loadLatest: async () => null,
    now: () => new Date("2026-08-05T11:00:00.000Z")
  });

  assert.equal(result.status, "unavailable");
  assert.equal(result.asOf, "");
  assert.deepEqual(result.rows, []);
});

function buildRankingHtml(prefix: string) {
  const rows = Array.from({ length: 10 }, (_, index) =>
    `${index + 1} ${prefix} Player${String.fromCharCode(65 + index)} ${20 + index} ${(10000 - index * 100).toLocaleString("en-US")} +1 20 100 50`
  ).join(" ");
  return `Hidden header Rank Player Age Official Points +/- Tourn Played Dropping Next Best ${rows}`;
}

function buildRows(prefix: string): TennisRankingRow[] {
  return Array.from({ length: 10 }, (_, index) => ({
    age: 20 + index,
    countryCode: null,
    dropping: 100,
    movement: 1,
    nextBest: 50,
    playerName: `${prefix} Player${index + 1}`,
    playerSlug: null,
    points: 10000 - index * 100,
    rank: index + 1,
    tournamentsPlayed: 20
  }));
}
