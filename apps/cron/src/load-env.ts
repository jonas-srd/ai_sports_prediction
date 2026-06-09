/**
 * Purpose: Loads environment variables for local cron scripts.
 * It reads the repository root `.env` file first, then optionally `apps/cron/.env`.
 */
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const cronSrcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(cronSrcDir, "../../..");
const cronRoot = resolve(cronSrcDir, "..");

for (const envPath of [resolve(repoRoot, ".env"), resolve(cronRoot, ".env")]) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}
