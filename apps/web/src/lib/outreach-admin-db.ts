import { createPostgresPool, type PostgresDb } from "@ai-sports-prediction/db";
import type {
  OutreachContactView,
  OutreachDraftView,
  OutreachProspectView
} from "@/lib/outreach-admin-types";

declare global {
  var aiSportsOutreachDb: PostgresDb | undefined;
}

type ProspectRow = Omit<OutreachProspectView, "contacts" | "drafts" | "fitReasons"> & {
  fitReasons: unknown;
};

export type SendableOutreachDraft = {
  id: string;
  email: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
};

export function getOutreachDb(): PostgresDb {
  if (!globalThis.aiSportsOutreachDb) {
    const outreachUrl = process.env.OUTREACH_DATABASE_URL?.trim();
    globalThis.aiSportsOutreachDb = createPostgresPool(outreachUrl || undefined, {
      connectionTimeoutMillis: 10_000,
      ...(outreachUrl ? { ssl: process.env.OUTREACH_DATABASE_SSL === "0" ? false : true } : {})
    });
  }
  return globalThis.aiSportsOutreachDb;
}

export async function listOutreachProspects(db = getOutreachDb()): Promise<OutreachProspectView[]> {
  const [prospectsResult, contactsResult, draftsResult] = await Promise.all([
    db.query<ProspectRow>(`
      select
        id,
        publication_name as "publicationName",
        domain,
        website_url as "websiteUrl",
        country,
        language,
        source_query as "sourceQuery",
        source_url as "sourceUrl",
        summary,
        fit_score as "fitScore",
        fit_reasons as "fitReasons",
        status,
        consent_status as "consentStatus",
        consent_evidence as "consentEvidence",
        suppressed_at_utc as "suppressedAtUtc",
        discovered_at_utc as "discoveredAtUtc",
        researched_at_utc as "researchedAtUtc"
      from editorial_prospects
      order by
        case status when 'pending_review' then 0 when 'qualified' then 1 when 'discovered' then 2 else 3 end,
        fit_score desc,
        discovered_at_utc desc
      limit 250
    `),
    db.query<OutreachContactView>(`
      select
        id,
        prospect_id as "prospectId",
        kind,
        value,
        role,
        source_url as "sourceUrl",
        is_role_address as "isRoleAddress"
      from editorial_contacts
      order by created_at_utc asc
    `),
    db.query<OutreachDraftView & { prospectId: string }>(`
      select
        id,
        prospect_id as "prospectId",
        contact_id as "contactId",
        subject,
        text_body as "textBody",
        status,
        model_id as "modelId",
        approved_by as "approvedBy",
        approved_at_utc as "approvedAtUtc",
        sent_at_utc as "sentAtUtc",
        provider_message_id as "providerMessageId",
        error_message as "errorMessage",
        created_at_utc as "createdAtUtc"
      from editorial_outreach_drafts
      order by created_at_utc desc
    `)
  ]);

  const contactsByProspect = groupByProspect(contactsResult.rows as Array<OutreachContactView & { prospectId: string }>);
  const draftsByProspect = groupByProspect(draftsResult.rows);

  return prospectsResult.rows.map((row) => ({
    ...row,
    discoveredAtUtc: toIso(row.discoveredAtUtc),
    researchedAtUtc: toNullableIso(row.researchedAtUtc),
    suppressedAtUtc: toNullableIso(row.suppressedAtUtc),
    fitReasons: readStringArray(row.fitReasons),
    contacts: (contactsByProspect.get(row.id) ?? []).map(({ prospectId: _prospectId, ...contact }) => contact),
    drafts: (draftsByProspect.get(row.id) ?? []).map(({ prospectId: _prospectId, ...draft }) => ({
      ...draft,
      approvedAtUtc: toNullableIso(draft.approvedAtUtc),
      sentAtUtc: toNullableIso(draft.sentAtUtc),
      createdAtUtc: toIso(draft.createdAtUtc)
    }))
  }));
}

export async function updateOutreachDraft(
  draftId: string,
  subject: string,
  textBody: string,
  db = getOutreachDb()
): Promise<boolean> {
  const result = await db.query(
    `
      update editorial_outreach_drafts
      set
        subject = $2,
        text_body = $3,
        html_body = $4,
        status = 'pending_review',
        approved_by = null,
        approved_at_utc = null,
        error_message = null,
        updated_at_utc = now()
      where id = $1 and status in ('pending_review', 'approved', 'failed')
    `,
    [draftId, subject, textBody, textToHtml(textBody)]
  );
  return Boolean(result.rowCount);
}

export async function approveOutreachDraft(input: {
  draftId: string;
  consentStatus: "explicit_consent" | "existing_customer_exception";
  consentEvidence: string;
  reviewer: string;
}, db = getOutreachDb()): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<{ prospectId: string }>(
      `select prospect_id as "prospectId" from editorial_outreach_drafts where id = $1 and status = 'pending_review' for update`,
      [input.draftId]
    );
    const prospectId = selected.rows[0]?.prospectId;
    if (!prospectId) {
      throw new Error("Der Entwurf ist nicht mehr freigabebereit.");
    }
    const prospect = await client.query(
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
      [prospectId, input.consentStatus, input.consentEvidence]
    );
    if (!prospect.rowCount) {
      throw new Error("Der Kontakt ist gesperrt und kann nicht freigegeben werden.");
    }
    await client.query(
      `
        update editorial_outreach_drafts
        set status = 'approved', approved_by = $2, approved_at_utc = now(), updated_at_utc = now()
        where id = $1
      `,
      [input.draftId, input.reviewer]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectOutreachProspect(prospectId: string, db = getOutreachDb()): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      "update editorial_prospects set status = 'rejected', updated_at_utc = now() where id = $1",
      [prospectId]
    );
    await client.query(
      "update editorial_outreach_drafts set status = 'rejected', updated_at_utc = now() where prospect_id = $1 and status not in ('sent', 'sending')",
      [prospectId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function suppressOutreachProspect(prospectId: string, db = getOutreachDb()): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      `
        update editorial_prospects
        set status = 'rejected', consent_status = 'declined', suppressed_at_utc = now(), updated_at_utc = now()
        where id = $1
      `,
      [prospectId]
    );
    await client.query(
      "update editorial_outreach_drafts set status = 'rejected', updated_at_utc = now() where prospect_id = $1 and status not in ('sent', 'sending')",
      [prospectId]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function claimOutreachDraftForSend(draftId: string, db = getOutreachDb()): Promise<SendableOutreachDraft> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<SendableOutreachDraft>(
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
    const draft = selected.rows[0];
    if (!draft) {
      throw new Error("Freigabe, Einwilligungsnachweis oder Kontaktprüfung ist nicht vollständig.");
    }
    await client.query(
      "update editorial_outreach_drafts set status = 'sending', error_message = null where id = $1",
      [draftId]
    );
    await client.query("commit");
    return draft;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markOutreachDraftSent(draftId: string, providerMessageId: string, db = getOutreachDb()): Promise<void> {
  await db.query(
    `update editorial_outreach_drafts set status = 'sent', sent_at_utc = now(), provider_message_id = $2, error_message = null where id = $1 and status = 'sending'`,
    [draftId, providerMessageId]
  );
}

export async function markOutreachDraftFailed(draftId: string, errorMessage: string, db = getOutreachDb()): Promise<void> {
  await db.query(
    `update editorial_outreach_drafts set status = 'failed', error_message = $2, updated_at_utc = now() where id = $1 and status = 'sending'`,
    [draftId, errorMessage]
  );
}

function groupByProspect<T extends { prospectId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const items = grouped.get(row.prospectId) ?? [];
    items.push(row);
    grouped.set(row.prospectId, items);
  }
  return grouped;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNullableIso(value: string | Date | null): string | null {
  return value === null ? null : toIso(value);
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
