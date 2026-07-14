/**
 * Purpose: Records a human approval and documented permission before outreach.
 * Usage: <draft-id> <explicit_consent|existing_customer_exception> <evidence> <reviewer>
 */
import { createPostgresPool } from "@ai-sports-prediction/db";

type AllowedConsent = "explicit_consent" | "existing_customer_exception";

export async function approveEditorialOutreach(
  draftId: string,
  consentStatus: AllowedConsent,
  evidence: string,
  reviewer: string
): Promise<void> {
  if (!draftId.trim() || !evidence.trim() || !reviewer.trim()) {
    throw new Error("Draft id, concrete consent evidence, and reviewer are required.");
  }
  if (!(["explicit_consent", "existing_customer_exception"] as string[]).includes(consentStatus)) {
    throw new Error("Consent must be explicit_consent or existing_customer_exception.");
  }

  const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();
  const db = createPostgresPool(outreachUrl || undefined, {
    connectionTimeoutMillis: 10_000,
    ...(outreachUrl ? { ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true } : {})
  });
  const client = await db.connect();
  try {
    await client.query("begin");
    const draft = await client.query<{ prospectId: string }>(
      `
        select prospect_id as "prospectId"
        from editorial_outreach_drafts
        where id = $1 and status = 'pending_review'
        for update
      `,
      [draftId]
    );
    const prospectId = draft.rows[0]?.prospectId;
    if (!prospectId) {
      throw new Error("A pending-review draft with this id was not found.");
    }

    const updatedProspect = await client.query(
      `
        update editorial_prospects
        set
          consent_status = $2,
          consent_evidence = $3,
          consent_recorded_at_utc = now(),
          status = 'qualified',
          updated_at_utc = now()
        where id = $1 and suppressed_at_utc is null
      `,
      [prospectId, consentStatus, evidence.trim()]
    );
    if (!updatedProspect.rowCount) {
      throw new Error("The prospect is suppressed and cannot be approved.");
    }
    await client.query(
      `
        update editorial_outreach_drafts
        set status = 'approved', approved_by = $2, approved_at_utc = now(), updated_at_utc = now()
        where id = $1
      `,
      [draftId, reviewer.trim()]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}
