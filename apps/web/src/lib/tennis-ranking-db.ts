import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";
import type { TennisRankingRow } from "@/lib/tennis-rankings";

export type StoredTennisRankingSnapshot = {
  fetchedAtUtc: string;
  rows: TennisRankingRow[];
};

declare global {
  var aiSportsTennisRankingDb: PostgresDb | undefined;
  var aiSportsTennisRankingDbDisabledUntil: number | undefined;
}

export async function loadLatestTennisRankingSnapshot(tour: "ATP"): Promise<null | StoredTennisRankingSnapshot> {
  if (!hasDatabaseConfiguration() || isDatabaseTemporarilyDisabled()) {
    return null;
  }

  try {
    const result = await getTennisRankingDb().query<{
      fetched_at_utc: Date | string;
      rows: unknown;
    }>(`
      select fetched_at_utc, rows
      from tennis_ranking_snapshots
      where tour = $1
      limit 1
    `, [tour]);
    const row = result.rows[0];
    if (!row || !Array.isArray(row.rows)) {
      return null;
    }

    const fetchedAtUtc = row.fetched_at_utc instanceof Date
      ? row.fetched_at_utc.toISOString()
      : new Date(row.fetched_at_utc).toISOString();
    return { fetchedAtUtc, rows: row.rows as TennisRankingRow[] };
  } catch {
    disableDatabaseTemporarily();
    return null;
  }
}

export async function storeLatestTennisRankingSnapshot(
  tour: "ATP",
  sourceUrl: string,
  snapshot: StoredTennisRankingSnapshot
) {
  if (!hasDatabaseConfiguration() || isDatabaseTemporarilyDisabled()) {
    return;
  }

  try {
    await getTennisRankingDb().query(`
      insert into tennis_ranking_snapshots (
        tour,
        source_url,
        fetched_at_utc,
        rows,
        row_count
      ) values ($1, $2, $3, $4::jsonb, $5)
      on conflict (tour) do update set
        source_url = excluded.source_url,
        fetched_at_utc = excluded.fetched_at_utc,
        rows = excluded.rows,
        row_count = excluded.row_count,
        updated_at_utc = now()
      where tennis_ranking_snapshots.fetched_at_utc <= excluded.fetched_at_utc
    `, [tour, sourceUrl, snapshot.fetchedAtUtc, JSON.stringify(snapshot.rows), snapshot.rows.length]);
  } catch {
    disableDatabaseTemporarily();
  }
}

function getTennisRankingDb() {
  return globalThis.aiSportsTennisRankingDb ??= createPostgresPool(undefined, {
    connectionTimeoutMillis: 2_000
  });
}

function hasDatabaseConfiguration() {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());
}

function isDatabaseTemporarilyDisabled() {
  return (globalThis.aiSportsTennisRankingDbDisabledUntil ?? 0) > Date.now();
}

function disableDatabaseTemporarily() {
  globalThis.aiSportsTennisRankingDbDisabledUntil = Date.now() + 5 * 60 * 1000;
}
