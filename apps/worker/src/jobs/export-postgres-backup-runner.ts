/**
 * Purpose: Queue handler wrapper for the logical export job.
 */
import { main as exportPostgresBackup } from "./export-postgres-backup";

export async function main(): Promise<void> {
  await exportPostgresBackup();
}
