/**
 * Purpose: Postgres client, migrations, and production repository helpers.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
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

export type NewsletterSignupInput = {
  email: string;
  locale?: string | null;
  source?: string | null;
  consentText: string;
  ipHash?: string | null;
  userAgent?: string | null;
};

export type NewsletterCampaignInput = {
  subject: string;
  previewText?: string | null;
  htmlBody: string;
  textBody?: string | null;
  provider?: string | null;
};

export type NewsletterCampaignRecipient = {
  recipientId: string;
  subscriberId: string;
  email: string;
  unsubscribeToken: string;
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

export async function upsertNewsletterSubscriber(
  db: PostgresDb,
  input: NewsletterSignupInput
): Promise<{ id: string; email: string; status: string }> {
  await ensureNewsletterSchema(db);

  const id = randomUUID();
  const unsubscribeToken = randomUUID();
  const email = normalizeEmail(input.email);

  const result = await db.query<{ id: string; email: string; status: string }>(
    `
      insert into newsletter_subscribers (
        id,
        email,
        status,
        locale,
        source,
        consent_text,
        consented_at_utc,
        unsubscribe_token,
        ip_hash,
        user_agent,
        updated_at_utc
      )
      values ($1, $2, 'subscribed', $3, $4, $5, now(), $6, $7, $8, now())
      on conflict (email) do update set
        status = 'subscribed',
        locale = coalesce(excluded.locale, newsletter_subscribers.locale),
        source = coalesce(excluded.source, newsletter_subscribers.source),
        consent_text = excluded.consent_text,
        consented_at_utc = now(),
        unsubscribed_at_utc = null,
        ip_hash = excluded.ip_hash,
        user_agent = excluded.user_agent,
        updated_at_utc = now()
      returning id, email, status
    `,
    [
      id,
      email,
      input.locale ?? null,
      input.source ?? null,
      input.consentText,
      unsubscribeToken,
      input.ipHash ?? null,
      input.userAgent ?? null
    ]
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("Newsletter subscriber could not be saved.");
  }

  return row;
}

export async function createNewsletterCampaign(
  db: PostgresDb,
  input: NewsletterCampaignInput
): Promise<string> {
  await ensureNewsletterSchema(db);

  const id = randomUUID();
  await db.query(
    `
      insert into newsletter_campaigns (
        id,
        subject,
        preview_text,
        html_body,
        text_body,
        status,
        provider
      )
      values ($1, $2, $3, $4, $5, 'queued', $6)
    `,
    [
      id,
      input.subject,
      input.previewText ?? null,
      input.htmlBody,
      input.textBody ?? null,
      input.provider ?? null
    ]
  );

  return id;
}

export async function queueNewsletterCampaignRecipients(
  db: PostgresDb,
  campaignId: string
): Promise<NewsletterCampaignRecipient[]> {
  await ensureNewsletterSchema(db);

  await db.query(
    `
      insert into newsletter_campaign_recipients (
        id,
        campaign_id,
        subscriber_id,
        status
      )
      select
        md5(random()::text || clock_timestamp()::text || id),
        $1,
        id,
        'queued'
      from newsletter_subscribers
      where status = 'subscribed'
      on conflict (campaign_id, subscriber_id) do nothing
    `,
    [campaignId]
  );

  const result = await db.query<NewsletterCampaignRecipient>(
    `
      select
        ncr.id as "recipientId",
        ns.id as "subscriberId",
        ns.email,
        ns.unsubscribe_token as "unsubscribeToken"
      from newsletter_campaign_recipients ncr
      join newsletter_subscribers ns on ns.id = ncr.subscriber_id
      where ncr.campaign_id = $1
        and ncr.status = 'queued'
      order by ns.created_at_utc asc
    `,
    [campaignId]
  );

  return result.rows;
}

export async function updateNewsletterCampaignStatus(
  db: PostgresDb,
  campaignId: string,
  status: "sending" | "sent" | "failed"
): Promise<void> {
  await db.query(
    `
      update newsletter_campaigns
      set
        status = $2,
        sent_at_utc = case when $2 = 'sent' then now() else sent_at_utc end
      where id = $1
    `,
    [campaignId, status]
  );
}

export async function markNewsletterRecipientSent(
  db: PostgresDb,
  recipientId: string,
  providerMessageId?: string | null
): Promise<void> {
  await db.query(
    `
      update newsletter_campaign_recipients
      set
        status = 'sent',
        provider_message_id = $2,
        sent_at_utc = now()
      where id = $1
    `,
    [recipientId, providerMessageId ?? null]
  );
}

export async function markNewsletterRecipientFailed(
  db: PostgresDb,
  recipientId: string,
  errorMessage: string
): Promise<void> {
  await db.query(
    `
      update newsletter_campaign_recipients
      set
        status = 'failed',
        error_message = $2
      where id = $1
    `,
    [recipientId, errorMessage]
  );
}

export async function unsubscribeNewsletterSubscriber(
  db: PostgresDb,
  token: string
): Promise<boolean> {
  await ensureNewsletterSchema(db);

  const result = await db.query(
    `
      update newsletter_subscribers
      set
        status = 'unsubscribed',
        unsubscribed_at_utc = now(),
        updated_at_utc = now()
      where unsubscribe_token = $1
    `,
    [token]
  );

  return Boolean(result.rowCount && result.rowCount > 0);
}

async function ensureNewsletterSchema(db: PostgresDb): Promise<void> {
  await db.query(`
    create table if not exists newsletter_subscribers (
      id text primary key,
      email text not null unique,
      status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed', 'bounced')),
      locale text,
      source text,
      consent_text text not null,
      consented_at_utc timestamptz not null default now(),
      unsubscribed_at_utc timestamptz,
      unsubscribe_token text not null unique,
      ip_hash text,
      user_agent text,
      created_at_utc timestamptz not null default now(),
      updated_at_utc timestamptz not null default now()
    );

    create index if not exists newsletter_subscribers_status_idx
      on newsletter_subscribers (status);

    create table if not exists newsletter_campaigns (
      id text primary key,
      subject text not null,
      preview_text text,
      html_body text not null,
      text_body text,
      status text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'sent', 'failed')),
      provider text,
      created_at_utc timestamptz not null default now(),
      sent_at_utc timestamptz
    );

    create table if not exists newsletter_campaign_recipients (
      id text primary key,
      campaign_id text not null references newsletter_campaigns(id) on delete cascade,
      subscriber_id text not null references newsletter_subscribers(id) on delete cascade,
      status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
      provider_message_id text,
      error_message text,
      sent_at_utc timestamptz,
      created_at_utc timestamptz not null default now(),
      unique (campaign_id, subscriber_id)
    );

    create index if not exists newsletter_campaign_recipients_campaign_idx
      on newsletter_campaign_recipients (campaign_id, status);
  `);
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function getPostgresSslConfig(): boolean | { rejectUnauthorized: boolean; ca?: string } | undefined {
  if (process.env.DATABASE_SSL === "0" || process.env.DATABASE_SSL === "false") {
    return undefined;
  }

  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "0";
  const ca = process.env.DATABASE_SSL_CA ?? readOptionalFile(process.env.DATABASE_SSL_CA_FILE);

  if (ca) {
    return { rejectUnauthorized, ca };
  }

  if (!rejectUnauthorized) {
    return { rejectUnauthorized };
  }

  return true;
}

function readOptionalFile(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  return readFileSync(path, "utf8");
}
