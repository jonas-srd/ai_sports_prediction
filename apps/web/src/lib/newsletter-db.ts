import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";

declare global {
  var aiSportsNewsletterDb: PostgresDb | undefined;
}

export function getNewsletterDb(): PostgresDb {
  if (!globalThis.aiSportsNewsletterDb) {
    globalThis.aiSportsNewsletterDb = createPostgresPool();
  }

  return globalThis.aiSportsNewsletterDb;
}
