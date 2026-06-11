/**
 * Purpose: Creates one compressed SQLite backup per UTC day on the persistent volume.
 */
import "../load-env";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createSqliteDb, getDefaultDbPath } from "@llm-kicktipp/db";

type CliArgs = {
  force: boolean;
};

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const dbPath = getDefaultDbPath();
  const backupDir = getBackupDir(dbPath);
  const day = new Date().toISOString().slice(0, 10);

  mkdirSync(backupDir, { recursive: true });

  const existing = findExistingBackup(backupDir, day);
  if (existing && !args.force) {
    console.log(`SQLite backup already exists for ${day}: ${existing}`);
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tmpDbPath = resolve(backupDir, `world-cup-${timestamp}.db`);
  const gzPath = `${tmpDbPath}.gz`;
  const db = createSqliteDb(dbPath);

  try {
    await db.backup(tmpDbPath);
  } finally {
    db.close();
  }

  try {
    await pipeline(
      createReadStream(tmpDbPath),
      createGzip({ level: 9 }),
      createWriteStream(gzPath)
    );
  } finally {
    rmSync(tmpDbPath, { force: true });
  }

  const bytes = existsSync(gzPath) ? statSync(gzPath).size : 0;
  console.log(`SQLite DB: ${dbPath}`);
  console.log(`Wrote SQLite backup: ${gzPath} (${bytes} bytes)`);
}

function parseCliArgs(args: string[]): CliArgs {
  return {
    force: args.includes("--force")
  };
}

function getBackupDir(dbPath: string): string {
  if (process.env.SQLITE_BACKUP_DIR) {
    return resolve(process.env.SQLITE_BACKUP_DIR);
  }

  return resolve(dirname(dbPath), "backups");
}

function findExistingBackup(backupDir: string, day: string): string | null {
  if (!existsSync(backupDir)) {
    return null;
  }

  const prefix = `world-cup-${day}T`;
  const match = readdirSync(backupDir)
    .filter((entry) => entry.startsWith(prefix) && entry.endsWith(".db.gz"))
    .sort()
    .at(-1);

  return match ? resolve(backupDir, match) : null;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
