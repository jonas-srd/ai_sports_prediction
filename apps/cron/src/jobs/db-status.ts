/**
 * Purpose: Prints local SQLite row counts and a few recent predictions for debugging.
 * Use this when the website does not show expected matches or predictions.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath } from "@llm-kicktipp/db";

type CountRow = {
  count: number;
};

type PredictionPreviewRow = {
  match: string;
  model: string;
  prediction: string;
  created_at: string;
};

const db = createSqliteDb();

const matches = db.prepare("select count(*) as count from matches").get() as CountRow;
const models = db.prepare("select count(*) as count from models").get() as CountRow;
const predictions = db.prepare("select count(*) as count from predictions").get() as CountRow;
const scores = db.prepare("select count(*) as count from scores").get() as CountRow;

console.log(`SQLite DB: ${getDefaultDbPath()}`);
console.log(`matches: ${matches.count}`);
console.log(`models: ${models.count}`);
console.log(`predictions: ${predictions.count}`);
console.log(`scores: ${scores.count}`);

const previews = db.prepare(`
  select
    m.home_team || ' vs ' || m.away_team as match,
    mo.name as model,
    p.predicted_home || '-' || p.predicted_away as prediction,
    p.created_at
  from predictions p
  inner join matches m on m.id = p.match_id
  inner join models mo on mo.id = p.model_id
  order by p.created_at desc
  limit 10
`).all() as PredictionPreviewRow[];

if (previews.length === 0) {
  console.log("No predictions stored yet.");
} else {
  console.log("Recent predictions:");
  for (const row of previews) {
    console.log(`${row.created_at} | ${row.match} | ${row.model}: ${row.prediction}`);
  }
}

db.close();
