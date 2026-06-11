import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type BackupFile = {
  name: string;
  bytes: number;
  modifiedAt: string;
  url: string;
};

const BACKUP_FILE_PATTERN = /^world-cup-\d{4}-\d{2}-\d{2}T[\w-]+\.db\.gz$/;

export function isBackupDownloadAuthorized(request: Request): boolean {
  const token = process.env.BACKUP_DOWNLOAD_TOKEN;
  if (!token) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  return authorization === `Bearer ${token}`;
}

export function getBackupDirectory(): string {
  if (process.env.SQLITE_BACKUP_DIR) {
    return resolve(process.env.SQLITE_BACKUP_DIR);
  }

  if (process.env.SQLITE_DB_PATH) {
    return resolve(dirname(process.env.SQLITE_DB_PATH), "backups");
  }

  return resolve(process.cwd(), "data/backups");
}

export async function listBackupFiles(): Promise<BackupFile[]> {
  const backupDir = getBackupDirectory();
  const entries = await readdir(backupDir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && isSafeBackupFilename(entry.name))
      .map(async (entry) => {
        const filePath = resolve(backupDir, entry.name);
        const fileStat = await stat(filePath);

        return {
          name: entry.name,
          bytes: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString(),
          url: `/api/admin/backups/${encodeURIComponent(entry.name)}`
        };
      })
  );

  return files.sort((left, right) => right.name.localeCompare(left.name));
}

export async function getBackupDownload(filename: string): Promise<{
  stream: ReturnType<typeof createReadStream>;
  bytes: number;
  path: string;
} | null> {
  if (!isSafeBackupFilename(filename)) {
    return null;
  }

  const backupDir = getBackupDirectory();
  const path = resolve(backupDir, filename);
  const fileStat = await stat(path).catch(() => null);

  if (!fileStat?.isFile()) {
    return null;
  }

  return {
    stream: createReadStream(path),
    bytes: fileStat.size,
    path
  };
}

function isSafeBackupFilename(filename: string): boolean {
  return BACKUP_FILE_PATTERN.test(filename);
}
