import { createPostgresPool } from "@ai-sports-prediction/db";
import { publishMarketingCampaign } from "../marketing-publishers";

const [campaignId = ""] = process.argv.slice(2);
const db = createPostgresPool();

void publishMarketingCampaign(db, campaignId).then((result) => {
  console.log("Marketing campaign publishing finished:", result);
}).catch((error) => {
  console.error("Marketing campaign publishing failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
