/**
 * Purpose: Writes a verified logical Postgres export and records backup metadata.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import {
  createPostgresPool,
  getCriticalTableRowCounts,
  insertBackupArtifact,
  insertBackupVerification
} from "@ai-sports-prediction/db";
import { downloadStoredArtifact, storeBackupArtifact } from "../backup-storage";

const EXPORT_TABLES = [
  "schema_migrations",
  "models",
  "matches",
  "match_odds",
  "odds_refresh_checks",
  "predictions",
  "scores",
  "benchmark_predictions",
  "prediction_evaluations",
  "special_prediction_runs",
  "special_predictions",
  "special_prediction_options",
  "scheduler_locks",
  "job_attempts",
  "backup_artifacts",
  "backup_verifications",
  "newsletter_subscribers",
  "newsletter_campaigns",
  "newsletter_campaign_recipients",
  "editorial_prospects",
  "editorial_contacts",
  "editorial_outreach_drafts",
  "marketing_campaigns",
  "marketing_posts",
  "marketing_post_metrics",
  "marketing_performance_reports",
  "tennis_player_country_profiles",
  "widget_customers",
  "widget_customer_domains",
  "widget_leads",
  "widget_billing_events",
  "widget_usage_monthly",
  "widget_usage_daily",
  "widget_invoices"
] as const;

type ExportEnvelope = {
  type: "table";
  table: string;
  row: unknown;
};

export async function main() {
  const db = createPostgresPool();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = resolve(process.env.POSTGRES_BACKUP_DIR ?? "exports/postgres-backups");
  const basePath = resolve(outputDir, `postgres-logical-${timestamp}`);
  const jsonlPath = `${basePath}.jsonl`;
  const gzPath = `${jsonlPath}.gz`;
  const manifestPath = `${gzPath}.manifest.json`;
  const downloadedPath = `${basePath}.downloaded.jsonl.gz`;

  await mkdir(outputDir, { recursive: true });

  try {
    await exportJsonl(db, jsonlPath);
    await pipeline(
      createReadStream(jsonlPath),
      createGzip({ level: 9 }),
      createWriteStream(gzPath)
    );

    const verification = await verifyGzipJsonl(gzPath);
    const sha256 = await sha256File(gzPath);
    const bytes = (await stat(gzPath)).size;
    const stored = await storeBackupArtifact(gzPath);
    await downloadStoredArtifact(stored.storageUrl, downloadedPath);
    const downloadedSha256 = await sha256File(downloadedPath);
    if (downloadedSha256 !== sha256) {
      throw new Error("Stored backup checksum does not match the uploaded artifact.");
    }
    const restoredRowCounts = await runRestoreDrill(db, downloadedPath);
    const rowCounts = await getCriticalTableRowCounts(db);
    const artifactId = await insertBackupArtifact(db, {
      artifactType: "logical_export",
      storageUrl: stored.storageUrl,
      bytes,
      sha256,
      schemaVersion: await currentSchemaVersion(db)
    });
    await insertBackupVerification(db, {
      artifactId,
      status: "succeeded",
      rowCounts
    });

    const manifest = {
      id: randomUUID(),
      createdAtUtc: new Date().toISOString(),
      artifactId,
      storageUrl: stored.storageUrl,
      bytes,
      sha256,
      tables: verification,
      rowCounts,
      restoreDrill: {
        status: "succeeded",
        downloadedSha256,
        restoredRowCounts
      }
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log(`Wrote verified Postgres logical export: ${gzPath}`);
    console.log(`Wrote manifest: ${manifestPath}`);
  } finally {
    await unlink(jsonlPath).catch(() => undefined);
    await unlink(downloadedPath).catch(() => undefined);
    await db.end();
  }
}

async function runRestoreDrill(
  db: ReturnType<typeof createPostgresPool>,
  gzPath: string
): Promise<Record<string, number>> {
  const client = await db.connect();
  const restoredCounts: Record<string, number> = {};
  const tempTables = new Map<string, string>();
  const input = createReadStream(gzPath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });

  try {
    await client.query("begin");
    for (const [index, table] of EXPORT_TABLES.entries()) {
      const tempTable = `restore_drill_${index}`;
      tempTables.set(table, tempTable);
      await client.query(
        `create temporary table ${quoteIdentifier(tempTable)}
         (like public.${quoteIdentifier(table)} including defaults)
         on commit drop`
      );
    }

    for await (const line of lines) {
      if (!line.trim()) continue;
      const parsed = JSON.parse(line) as ExportEnvelope;
      const tempTable = tempTables.get(parsed.table);
      if (!tempTable) throw new Error(`Backup contains unknown table ${parsed.table}.`);
      await client.query(
        `insert into ${quoteIdentifier(tempTable)}
         select * from json_populate_record(null::public.${quoteIdentifier(parsed.table)}, $1::json)`,
        [JSON.stringify(parsed.row)]
      );
      restoredCounts[parsed.table] = (restoredCounts[parsed.table] ?? 0) + 1;
    }

    for (const table of EXPORT_TABLES) {
      const expected = restoredCounts[table] ?? 0;
      const result = await client.query<{ count: string }>(
        `select count(*)::text as count from ${quoteIdentifier(tempTables.get(table) ?? "")}`
      );
      if (Number(result.rows[0]?.count ?? -1) !== expected) {
        throw new Error(`Restore drill count mismatch for ${table}.`);
      }
    }
    await client.query("rollback");
    return restoredCounts;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    lines.close();
    client.release();
  }
}

async function exportJsonl(db: ReturnType<typeof createPostgresPool>, jsonlPath: string): Promise<void> {
  const stream = createWriteStream(jsonlPath, { encoding: "utf8" });

  try {
    for (const table of EXPORT_TABLES) {
      const result = await db.query(`select * from ${table} order by 1`);
      for (const row of result.rows) {
        const envelope: ExportEnvelope = { type: "table", table, row };
        stream.write(`${JSON.stringify(envelope)}\n`);
      }
    }
  } finally {
    stream.end();
    await new Promise<void>((resolvePromise, reject) => {
      stream.once("finish", resolvePromise);
      stream.once("error", reject);
    });
  }
}

async function verifyGzipJsonl(gzPath: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  let buffer = "";

  await pipeline(
    createReadStream(gzPath),
    createGunzip(),
    async function (source) {
      for await (const chunk of source) {
        buffer += chunk.toString("utf8");
        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.trim()) {
            const parsed = JSON.parse(line) as ExportEnvelope;
            counts[parsed.table] = (counts[parsed.table] ?? 0) + 1;
          }
          newlineIndex = buffer.indexOf("\n");
        }
      }
      if (buffer.trim()) {
        const parsed = JSON.parse(buffer) as ExportEnvelope;
        counts[parsed.table] = (counts[parsed.table] ?? 0) + 1;
      }
    }
  );

  return counts;
}

async function currentSchemaVersion(db: ReturnType<typeof createPostgresPool>): Promise<string | null> {
  const result = await db.query<{ id: string }>("select id from schema_migrations order by id desc limit 1");
  return result.rows[0]?.id ?? null;
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
