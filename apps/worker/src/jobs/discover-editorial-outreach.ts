/** Purpose: Manually runs the sports-publisher research and draft workflow. */
import { createPostgresPool } from "@ai-sports-prediction/db";
import { runEditorialOutreachResearch } from "../editorial-outreach-agent";

export async function main(): Promise<void> {
  const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();
  const db = createPostgresPool(outreachUrl || undefined, {
    connectionTimeoutMillis: 10_000,
    ...(outreachUrl ? { ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true } : {})
  });
  try {
    const result = await runEditorialOutreachResearch(db);
    console.log("Editorial outreach research finished:", result);
  } finally {
    await db.end();
  }
}
