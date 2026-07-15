import { createPostgresPool } from "@ai-sports-prediction/db";
import { runMarketingPerformanceAgent } from "../marketing-performance-agent";

const db = createPostgresPool();

void runMarketingPerformanceAgent(db).then((result) => {
  console.log("Marketing performance analysis finished:", result);
}).catch((error) => {
  console.error("Marketing performance analysis failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
