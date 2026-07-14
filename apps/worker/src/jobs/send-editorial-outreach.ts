/** Purpose: Sends exactly one human-approved, consent-backed editorial outreach draft. */
import { createPostgresPool } from "@ai-sports-prediction/db";

type ApprovedDraft = {
  id: string;
  email: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
};

export async function sendEditorialOutreach(draftId: string): Promise<string> {
  if (!draftId.trim()) {
    throw new Error("A draft id is required. Bulk sending is intentionally unsupported.");
  }
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("OUTREACH_FROM_EMAIL");
  const replyTo = requireEnv("OUTREACH_REPLY_TO_EMAIL");
  const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();
  const db = createPostgresPool(outreachUrl || undefined, {
    connectionTimeoutMillis: 10_000,
    ...(outreachUrl ? { ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true } : {})
  });
  const client = await db.connect();
  let draft: ApprovedDraft;

  try {
    await client.query("begin");
    const selected = await client.query<ApprovedDraft>(
      `
        select
          d.id,
          c.value as email,
          d.subject,
          d.text_body as "textBody",
          d.html_body as "htmlBody"
        from editorial_outreach_drafts d
        join editorial_prospects p on p.id = d.prospect_id
        join editorial_contacts c on c.id = d.contact_id
        where d.id = $1
          and d.status = 'approved'
          and d.approved_at_utc is not null
          and nullif(trim(d.approved_by), '') is not null
          and p.consent_status in ('explicit_consent', 'existing_customer_exception')
          and nullif(trim(p.consent_evidence), '') is not null
          and p.suppressed_at_utc is null
          and c.kind = 'generic_email'
          and c.is_role_address = true
        for update of d
      `,
      [draftId]
    );
    const row = selected.rows[0];
    if (!row) {
      throw new Error("Draft is not eligible: approval, permission evidence, role address, or suppression checks failed.");
    }
    draft = row;
    await client.query(
      "update editorial_outreach_drafts set status = 'sending', error_message = null where id = $1",
      [draftId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    client.release();
    await db.end();
    throw error;
  }
  client.release();

  const optOutText = `\n\nFalls Sie keine weiteren Nachrichten von uns wünschen, genügt eine kurze Antwort an ${replyTo}.`;
  const optOutHtml = `<p>Falls Sie keine weiteren Nachrichten von uns wünschen, genügt eine kurze Antwort an <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>.</p>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": `editorial-outreach-${draft.id}`
      },
      body: JSON.stringify({
        from,
        to: [draft.email],
        reply_to: replyTo,
        subject: draft.subject,
        text: `${draft.textBody}${optOutText}`,
        html: `${draft.htmlBody ?? textToHtml(draft.textBody)}${optOutHtml}`,
        headers: {
          "List-Unsubscribe": `<mailto:${replyTo}?subject=${encodeURIComponent("Keine weiteren Nachrichten")}>`
        }
      })
    });
    const payload = await response.json().catch(() => null) as { id?: unknown; message?: unknown } | null;
    if (!response.ok || typeof payload?.id !== "string") {
      throw new Error(`Resend returned ${response.status}: ${JSON.stringify(payload)}`);
    }

    await db.query(
      `
        update editorial_outreach_drafts
        set status = 'sent', sent_at_utc = now(), provider_message_id = $2, error_message = null
        where id = $1 and status = 'sending'
      `,
      [draft.id, payload.id]
    );
    return payload.id;
  } catch (error) {
    await db.query(
      `
        update editorial_outreach_drafts
        set status = 'failed', error_message = $2, updated_at_utc = now()
        where id = $1 and status = 'sending'
      `,
      [draft.id, error instanceof Error ? error.message : String(error)]
    );
    throw error;
  } finally {
    await db.end();
  }
}


function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function textToHtml(value: string): string {
  return value.split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
