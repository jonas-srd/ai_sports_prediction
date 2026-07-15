import { createPostgresPool } from "@ai-sports-prediction/db";
import { runMarketingCampaignGeneration } from "../marketing-agent";

const db = createPostgresPool();

void runMarketingCampaignGeneration(db).then((result) => {
  console.log("Marketing campaign generation finished:", result);
}).catch((error) => {
  console.error("Marketing campaign generation failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
