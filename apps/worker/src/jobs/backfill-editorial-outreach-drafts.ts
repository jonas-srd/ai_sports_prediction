import { randomUUID } from "node:crypto";
import { createPostgresPool } from "@ai-sports-prediction/db";
import { buildFallbackDraftForPublication } from "../editorial-outreach-agent";

const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();
const db = createPostgresPool(outreachUrl || undefined, {
  connectionTimeoutMillis: 10_000,
  ...(outreachUrl ? { ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true } : {})
});

try {
  const result = await db.query<{ id: string; publicationName: string }>(`
    select distinct on (p.id)
      p.id,
      p.publication_name as "publicationName",
      c.id as "contactId"
    from editorial_prospects p
    join editorial_contacts c on c.prospect_id = p.id
    where p.status = 'pending_review'
      and p.suppressed_at_utc is null
      and p.fit_score >= 45
      and c.kind = 'generic_email'
      and c.is_role_address = true
      and not exists (
        select 1 from editorial_outreach_drafts d
        where d.prospect_id = p.id and d.status in ('pending_review', 'approved', 'sending', 'sent')
      )
    order by p.id, c.created_at_utc asc
  `);

  let created = 0;
  for (const row of result.rows as Array<{ id: string; publicationName: string; contactId: string }>) {
    const draft = buildFallbackDraftForPublication(row.publicationName);
    await db.query(
      `
        insert into editorial_outreach_drafts (
          id, prospect_id, contact_id, subject, text_body, html_body, status
        )
        values ($1, $2, $3, $4, $5, $6, 'pending_review')
      `,
      [randomUUID(), row.id, row.contactId, draft.subject, draft.textBody, textToHtml(draft.textBody)]
    );
    created += 1;
  }

  console.log(`Created ${created} fallback outreach drafts from existing reviewed prospects.`);
} finally {
  await db.end();
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
