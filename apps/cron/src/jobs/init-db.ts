/**
 * Purpose: Initializes the local SQLite database without fetching external data.
 * Use this to create data/world-cup.db and all required tables.
 */
import "../load-env";
import { createSqliteDb, getDefaultDbPath } from "@llm-kicktipp/db";

const db = createSqliteDb();
db.close();

console.log(`Initialized SQLite DB: ${getDefaultDbPath()}`);
