/**
 * Purpose: Applies Postgres migrations as an explicit deploy step.
 */
import { createPostgresPool, migratePostgres } from "@ai-sports-prediction/db";

async function main() {
  const db = createPostgresPool();
  try {
    const applied = await migratePostgres(db);
    if (applied.length === 0) {
      console.log("Postgres schema is already up to date.");
      return;
    }

    console.log(`Applied Postgres migrations: ${applied.join(", ")}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
