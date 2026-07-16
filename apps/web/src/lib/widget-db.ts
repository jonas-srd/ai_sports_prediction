import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";

declare global {
  var aiSportsWidgetDb: PostgresDb | undefined;
}

export function getWidgetDb(): PostgresDb {
  if (!globalThis.aiSportsWidgetDb) {
    globalThis.aiSportsWidgetDb = createPostgresPool(
      process.env.WIDGET_DATABASE_URL?.trim() || undefined,
      { connectionTimeoutMillis: 4_000 }
    );
  }

  return globalThis.aiSportsWidgetDb;
}
