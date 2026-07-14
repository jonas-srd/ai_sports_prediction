import { approveEditorialOutreach } from "./approve-editorial-outreach";

const [draftId, rawConsent, evidence, reviewer] = process.argv.slice(2);

void approveEditorialOutreach(
  draftId ?? "",
  rawConsent as "explicit_consent" | "existing_customer_exception",
  evidence ?? "",
  reviewer ?? ""
).then(() => {
  console.log(`Editorial outreach draft ${draftId} approved.`);
}).catch((error) => {
  console.error("Editorial outreach approval failed:", error);
  process.exitCode = 1;
});
