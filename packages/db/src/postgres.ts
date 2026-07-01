/**
 * Purpose: Postgres client, migrations, and production repository helpers.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg, { type Pool as PgPool } from "pg";

const { Pool } = pg;

export type PostgresDb = PgPool;

export type JobAttemptStatus = "queued" | "running" | "succeeded" | "failed";

export type BackupArtifactInput = {
  artifactType: "postgres_dump" | "logical_export" | "legacy_archive";
  storageUrl: string;
  bytes: number;
  sha256: string;
  schemaVersion?: string | null;
};

export type BackupVerificationInput = {
  artifactId: string;
  status: "succeeded" | "failed";
  rowCounts?: Record<string, number>;
  errorMessage?: string | null;
};

export type JobAttemptInput = {
  queueName: string;
  jobName: string;
  idempotencyKey: string;
  payload: unknown;
  status: JobAttemptStatus;
  attempt?: number;
  providerResponseId?: string | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  startedAtUtc?: string | null;
  finishedAtUtc?: string | null;
};

export function createPostgresPool(connectionString = getPostgresDatabaseUrl()): PostgresDb {
  return new Pool({
    connectionString,
    ssl: getPostgresSslConfig()
  });
}

export function getPostgresDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for Postgres backend operations.");
  }

  return databaseUrl;
}

export async function checkPostgresHealth(db: PostgresDb): Promise<{ ok: true; now: string }> {
  const result = await db.query<{ now: Date }>("select now() as now");
  return { ok: true, now: result.rows[0]?.now.toISOString() ?? new Date().toISOString() };
}

export async function migratePostgres(db: PostgresDb): Promise<string[]> {
  await db.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const migrations = await listPostgresMigrations();
  const applied: string[] = [];

  for (const migration of migrations) {
    const alreadyApplied = await db.query("select 1 from schema_migrations where id = $1", [migration.id]);
    if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
      continue;
    }

    const client = await db.connect();
    try {
      await client.query("begin");
      await client.query(migration.sql);
      await client.query("insert into schema_migrations (id) values ($1)", [migration.id]);
      await client.query("commit");
      applied.push(migration.id);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  return applied;
}

export async function listDashboardMatches(db: PostgresDb): Promise<unknown[]> {
  const result = await db.query(`
    select
      id,
      utc_date,
      competition,
      home_team,
      away_team,
      venue,
      status,
      home_score,
      away_score,
      home_score_90,
      away_score_90,
      stage,
      group_name,
      is_knockout
    from matches
    order by utc_date asc
  `);

  return result.rows;
}

export async function listBenchmarkPredictionsForApi(db: PostgresDb): Promise<unknown[]> {
  const result = await db.query(`
    select
      bp.*,
      mo.name as model_name,
      mo.provider as model_provider,
      m.home_team,
      m.away_team,
      m.utc_date,
      m.stage,
      m.group_name,
      m.home_score_90,
      m.away_score_90,
      m.home_score_full,
      m.away_score_full,
      m.actual_advancer,
      pe.brier_90,
      pe.log_loss_90,
      pe.top_outcome_correct_90,
      pe.exact_score_90_correct,
      pe.goal_difference_90_correct,
      pe.tendency_90_correct_from_score,
      pe.home_goal_abs_error_90,
      pe.away_goal_abs_error_90,
      pe.total_goals_abs_error_90,
      pe.goal_difference_abs_error_90,
      pe.kicktipp_points_90,
      pe.advancement_accuracy,
      pe.score_result_matches_prob_argmax_90
    from benchmark_predictions bp
    join matches m on m.id = bp.match_id
    left join models mo on mo.id = bp.model_id
    left join prediction_evaluations pe on pe.prediction_id = bp.id
    order by m.utc_date asc, bp.predictor_id asc
  `);

  return result.rows;
}

export async function listSpecialPredictionsForApi(db: PostgresDb): Promise<unknown[]> {
  const result = await db.query(`
    select *
    from special_predictions
    order by question_id asc, predictor_id asc
  `);

  return result.rows;
}

export async function listBackupArtifacts(db: PostgresDb): Promise<unknown[]> {
  const result = await db.query(`
    select
      ba.*,
      bv.status as latest_verification_status,
      bv.verified_at_utc as latest_verified_at_utc
    from backup_artifacts ba
    left join lateral (
      select status, verified_at_utc
      from backup_verifications
      where artifact_id = ba.id
      order by verified_at_utc desc
      limit 1
    ) bv on true
    order by ba.created_at_utc desc
    limit 100
  `);

  return result.rows;
}

export async function insertBackupArtifact(
  db: PostgresDb,
  input: BackupArtifactInput
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `
      insert into backup_artifacts (
        id,
        artifact_type,
        storage_url,
        bytes,
        sha256,
        schema_version
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      id,
      input.artifactType,
      input.storageUrl,
      input.bytes,
      input.sha256,
      input.schemaVersion ?? null
    ]
  );

  return id;
}

export async function insertBackupVerification(
  db: PostgresDb,
  input: BackupVerificationInput
): Promise<string> {
  const id = randomUUID();
  await db.query(
    `
      insert into backup_verifications (
        id,
        artifact_id,
        status,
        row_counts,
        error_message
      )
      values ($1, $2, $3, $4, $5)
    `,
    [
      id,
      input.artifactId,
      input.status,
      JSON.stringify(input.rowCounts ?? {}),
      input.errorMessage ?? null
    ]
  );

  return id;
}

export async function upsertJobAttempt(db: PostgresDb, input: JobAttemptInput): Promise<string> {
  const id = randomUUID();
  const payloadHash = hashJson(input.payload);

  await db.query(
    `
      insert into job_attempts (
        id,
        queue_name,
        job_name,
        idempotency_key,
        payload_hash,
        status,
        attempt,
        provider_response_id,
        error_message,
        error_stack,
        started_at_utc,
        finished_at_utc,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
      on conflict (queue_name, idempotency_key, attempt) do update set
        payload_hash = excluded.payload_hash,
        status = excluded.status,
        provider_response_id = excluded.provider_response_id,
        error_message = excluded.error_message,
        error_stack = excluded.error_stack,
        started_at_utc = coalesce(excluded.started_at_utc, job_attempts.started_at_utc),
        finished_at_utc = excluded.finished_at_utc,
        updated_at = now()
      returning id
    `,
    [
      id,
      input.queueName,
      input.jobName,
      input.idempotencyKey,
      payloadHash,
      input.status,
      input.attempt ?? 1,
      input.providerResponseId ?? null,
      input.errorMessage ?? null,
      input.errorStack ?? null,
      input.startedAtUtc ?? null,
      input.finishedAtUtc ?? null
    ]
  );

  return id;
}

export async function getCriticalTableRowCounts(db: PostgresDb): Promise<Record<string, number>> {
  const tables = [
    "models",
    "matches",
    "benchmark_predictions",
    "prediction_evaluations",
    "special_predictions",
    "special_prediction_options",
    "job_attempts",
    "backup_artifacts"
  ];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    const result = await db.query<{ count: string }>(`select count(*)::text as count from ${table}`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }

  return counts;
}

async function listPostgresMigrations(): Promise<Array<{ id: string; sql: string }>> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = resolve(currentDir, "../migrations/postgres");
  const entries = await readdir(migrationsDir);

  return Promise.all(
    entries
      .filter((entry) => entry.endsWith(".sql"))
      .sort()
      .map(async (entry) => ({
        id: entry,
        sql: await readFile(resolve(migrationsDir, entry), "utf8")
      }))
  );
}

function hashJson(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function getPostgresSslConfig(): boolean | { rejectUnauthorized: boolean } | undefined {
  if (process.env.DATABASE_SSL === "0" || process.env.DATABASE_SSL === "false") {
    return undefined;
  }

  if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "0") {
    return { rejectUnauthorized: false };
  }

  return true;
}
