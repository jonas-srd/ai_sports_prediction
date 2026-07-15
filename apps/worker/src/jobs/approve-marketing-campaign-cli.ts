import { createPostgresPool } from "@ai-sports-prediction/db";
import { approveMarketingCampaign } from "../marketing-publishers";

const [campaignId = "", reviewer = ""] = process.argv.slice(2);
const db = createPostgresPool();

void approveMarketingCampaign(db, campaignId, reviewer).then((postCount) => {
  console.log(`Marketing campaign ${campaignId} approved with ${postCount} posts.`);
}).catch((error) => {
  console.error("Marketing campaign approval failed:", error);
  process.exitCode = 1;
}).finally(() => db.end());
