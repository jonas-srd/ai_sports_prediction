import { createPostgresPool } from "@ai-sports-prediction/db";
import { rejectMarketingCampaign } from "../marketing-publishers";

const [campaignId = "", reviewer = ""] = process.argv.slice(2);
const db = createPostgresPool();

void rejectMarketingCampaign(db, campaignId, reviewer).then(() => {
  console.log(`Marketing campaign ${campaignId} rejected.`);
}).catch((error) => {
  console.error("Marketing campaign rejection failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
