import { createPostgresPool } from "@ai-sports-prediction/db";
import { publishApprovedMarketingCampaigns } from "../marketing-publishers";

const db = createPostgresPool();

void publishApprovedMarketingCampaigns(db).then((results) => {
  console.log("Approved marketing campaigns publishing finished:", results);
}).catch((error) => {
  console.error("Approved marketing campaign publishing failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
