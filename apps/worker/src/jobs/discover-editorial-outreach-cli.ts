import { main } from "./discover-editorial-outreach";

void main().catch((error) => {
  console.error("Editorial outreach research failed:", error);
  process.exitCode = 1;
});
