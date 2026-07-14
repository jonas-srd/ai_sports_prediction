import { createPostgresPool, migratePostgres } from "@ai-sports-prediction/db";

const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();

if (!outreachUrl) {
  throw new Error("OUTREACH_DATABASE_URL is required for the dedicated outreach migration.");
}

const db = createPostgresPool(outreachUrl, {
  connectionTimeoutMillis: 10_000,
  ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true
});

try {
  const applied = await migratePostgres(db);
  console.log(applied.length ? `Applied outreach migrations: ${applied.join(", ")}` : "Outreach schema is up to date.");
} finally {
  await db.end();
}
