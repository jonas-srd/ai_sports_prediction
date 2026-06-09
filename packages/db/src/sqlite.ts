/**
 * Purpose: Opens and initializes the local SQLite database used by the MVP.
 * The default database file is data/world-cup.db and can be overridden with SQLITE_DB_PATH.
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type SqliteDb = Database.Database;

export function createSqliteDb(dbPath = getDefaultDbPath()): SqliteDb {
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initializeSchema(db);

  return db;
}

export function getDefaultDbPath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return resolve(process.env.SQLITE_DB_PATH);
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(currentDir, "../../..");

  return resolve(repoRoot, "data/world-cup.db");
}

function initializeSchema(db: SqliteDb): void {
  db.exec(`
    create table if not exists models (
      id text primary key,
      name text not null,
      provider text not null,
      active integer not null default 1,
      created_at text not null default current_timestamp
    );

    create table if not exists matches (
      id text primary key,
      utc_date text not null,
      competition text not null,
      home_team text not null,
      away_team text not null,
      status text not null default 'SCHEDULED',
      home_score integer,
      away_score integer,
      created_at text not null default current_timestamp,
      updated_at text not null default current_timestamp
    );

    create table if not exists predictions (
      id text primary key,
      match_id text not null references matches(id) on delete cascade,
      model_id text not null references models(id) on delete cascade,
      predicted_home integer not null,
      predicted_away integer not null,
      confidence real,
      reason text,
      raw_response text not null,
      created_at text not null default current_timestamp,
      unique (match_id, model_id)
    );

    create table if not exists scores (
      id text primary key,
      prediction_id text not null references predictions(id) on delete cascade,
      points integer not null,
      reason text not null,
      scored_at text not null default current_timestamp,
      unique (prediction_id)
    );
  `);
}
