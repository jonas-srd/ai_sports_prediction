/**
 * Purpose: Writes a verified logical Postgres export and records backup metadata.
 */
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";
import {
  createPostgresPool,
  getCriticalTableRowCounts,
  insertBackupArtifact,
  insertBackupVerification
} from "@ai-sports-prediction/db";
import { storeBackupArtifact } from "../backup-storage";

const EXPORT_TABLES = [
  "schema_migrations",
  "models",
  "matches",
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
  "backup_verifications"
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
      rowCounts
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log(`Wrote verified Postgres logical export: ${gzPath}`);
    console.log(`Wrote manifest: ${manifestPath}`);
  } finally {
    await db.end();
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
