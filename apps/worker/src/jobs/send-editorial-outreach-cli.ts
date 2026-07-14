import { sendEditorialOutreach } from "./send-editorial-outreach";

const draftId = process.argv[2] ?? "";

void sendEditorialOutreach(draftId).then((messageId) => {
  console.log(`Editorial outreach sent with provider message id ${messageId}.`);
}).catch((error) => {
  console.error("Editorial outreach send failed:", error);
  process.exitCode = 1;
});
