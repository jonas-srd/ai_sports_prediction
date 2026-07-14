import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import {
  approveOutreachDraft,
  claimOutreachDraftForSend,
  listOutreachProspects,
  markOutreachDraftFailed,
  markOutreachDraftSent,
  rejectOutreachProspect,
  suppressOutreachProspect,
  updateOutreachDraft
} from "@/lib/outreach-admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return json({ error: "unauthorized", message: "Admin-Token fehlt oder ist ungültig." }, 401);
  }

  try {
    return json({
      ok: true,
      prospects: await listOutreachProspects(),
      sendConfigured: isSendConfigured(),
      generatedAtUtc: new Date().toISOString()
    });
  } catch (error) {
    console.error("Could not list editorial outreach prospects:", error);
    return json({
      error: "outreach_unavailable",
      message: "Outreach-Daten sind nicht verfügbar. Bitte Datenbankmigration prüfen."
    }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return json({ error: "unauthorized", message: "Admin-Token fehlt oder ist ungültig." }, 401);
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "invalid_payload", message: "Ungültige Anfrage." }, 400);
  }

  const body = payload as Record<string, unknown>;
  const action = text(body.action);

  try {
    if (action === "update_draft") {
      const draftId = required(body.draftId, "Entwurf-ID");
      const subject = required(body.subject, "Betreff").slice(0, 180);
      const textBody = required(body.textBody, "E-Mail-Text").slice(0, 6000);
      if (!await updateOutreachDraft(draftId, subject, textBody)) {
        return json({ error: "draft_not_editable", message: "Dieser Entwurf kann nicht mehr bearbeitet werden." }, 409);
      }
      return json({ ok: true });
    }

    if (action === "approve_draft") {
      const consentStatus = text(body.consentStatus);
      if (consentStatus !== "explicit_consent" && consentStatus !== "existing_customer_exception") {
        return json({ error: "invalid_consent", message: "Ein zulässiger Einwilligungsstatus ist erforderlich." }, 400);
      }
      await approveOutreachDraft({
        draftId: required(body.draftId, "Entwurf-ID"),
        consentStatus,
        consentEvidence: required(body.consentEvidence, "Einwilligungsnachweis").slice(0, 2000),
        reviewer: required(body.reviewer, "Prüfer").slice(0, 200)
      });
      return json({ ok: true });
    }

    if (action === "reject_prospect") {
      await rejectOutreachProspect(required(body.prospectId, "Prospect-ID"));
      return json({ ok: true });
    }

    if (action === "suppress_prospect") {
      await suppressOutreachProspect(required(body.prospectId, "Prospect-ID"));
      return json({ ok: true });
    }

    if (action === "send_draft") {
      if (!isSendConfigured()) {
        return json({
          error: "send_not_configured",
          message: "Resend-Absender und Antwortadresse sind noch nicht vollständig konfiguriert."
        }, 409);
      }
      const messageId = await sendApprovedDraft(required(body.draftId, "Entwurf-ID"));
      return json({ ok: true, messageId });
    }

    return json({ error: "unknown_action", message: "Unbekannte Aktion." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Aktion ist fehlgeschlagen.";
    console.error(`Editorial outreach action ${action || "unknown"} failed:`, error);
    return json({ error: "action_failed", message }, 409);
  }
}

async function sendApprovedDraft(draftId: string): Promise<string> {
  const draft = await claimOutreachDraftForSend(draftId);
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("OUTREACH_FROM_EMAIL");
  const replyTo = requireEnv("OUTREACH_REPLY_TO_EMAIL");
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
    const result = await response.json().catch(() => null) as { id?: unknown; message?: unknown } | null;
    if (!response.ok || typeof result?.id !== "string") {
      throw new Error(typeof result?.message === "string" ? result.message : `Resend-Fehler ${response.status}`);
    }
    await markOutreachDraftSent(draft.id, result.id);
    return result.id;
  } catch (error) {
    await markOutreachDraftFailed(draft.id, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || !provided) {
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function isSendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim()
    && process.env.OUTREACH_FROM_EMAIL?.trim()
    && process.env.OUTREACH_REPLY_TO_EMAIL?.trim()
  );
}

function required(value: unknown, label: string): string {
  const normalized = text(value);
  if (!normalized) {
    throw new Error(`${label} fehlt.`);
  }
  return normalized;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} ist nicht konfiguriert.`);
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

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" }
  });
}
