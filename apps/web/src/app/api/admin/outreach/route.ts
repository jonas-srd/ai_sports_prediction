import { Queue } from "bullmq";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-request-auth";
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
  if (!await isAdminRequestAuthorized(request)) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }

  try {
    return json({
      ok: true,
      prospects: await listOutreachProspects(),
      researchConfigured: Boolean(process.env.REDIS_URL?.trim() && (process.env.SERPAPI_API_KEY?.trim() || process.env.BRAVE_SEARCH_API_KEY?.trim())),
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
  if (!await isAdminRequestAuthorized(request)) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "invalid_payload", message: "Ungültige Anfrage." }, 400);
  }

  const body = payload as Record<string, unknown>;
  const action = text(body.action);

  try {
    if (action === "start_research") {
      const countries = readCountries(body.countries);
      const emailLanguage = readEmailLanguage(body.emailLanguage);
      const jobs = await enqueueOutreachResearch(countries, emailLanguage);
      return json({ ok: true, jobs });
    }

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

async function enqueueOutreachResearch(countries: string[], emailLanguage: string): Promise<number> {
  const redisUrl = requireEnv("REDIS_URL");
  const queue = new Queue("outreach", {
    connection: parseRedisConnection(redisUrl),
    prefix: process.env.QUEUE_KEY_PREFIX ?? "{ai-sports-prediction}"
  });
  try {
    for (const country of countries) {
      await queue.add("discover-editorial-prospects", {
        country,
        searchLanguage: COUNTRY_LANGUAGES[country] ?? "en",
        emailLanguage
      }, {
        jobId: `outreach-${country.toLowerCase()}-${Date.now()}`,
        attempts: 2,
        removeOnComplete: 20,
        removeOnFail: 50
      });
    }
    return countries.length;
  } finally {
    await queue.close();
  }
}

const COUNTRY_LANGUAGES: Record<string, string> = {
  DE: "de", AT: "de", CH: "de", GB: "en", US: "en", CA: "en", AU: "en",
  ES: "es", FR: "fr", IT: "it", NL: "nl"
};

function readCountries(value: unknown): string[] {
  const countries = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toUpperCase())
    : [];
  const valid = [...new Set(countries.filter((country) => country in COUNTRY_LANGUAGES))];
  if (!valid.length) throw new Error("Mindestens ein unterstütztes Zielland ist erforderlich.");
  return valid;
}

function readEmailLanguage(value: unknown): string {
  const language = text(value);
  if (!["de", "en", "es", "fr", "it", "nl"].includes(language)) {
    throw new Error("Die E-Mail-Sprache wird nicht unterstützt.");
  }
  return language;
}

function parseRedisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    maxRetriesPerRequest: null,
    tls: url.protocol === "rediss:" ? {} : undefined
  };
}

async function sendApprovedDraft(draftId: string): Promise<string> {
  const draft = await claimOutreachDraftForSend(draftId);
  const apiKey = requireEnv("RESEND_API_KEY");
  const from = requireEnv("OUTREACH_FROM_EMAIL");
  const replyTo = requireEnv("OUTREACH_REPLY_TO_EMAIL");
  const optOut = localizedOptOut(draft.emailLanguage, replyTo);
  const optOutText = `\n\n${optOut.text}`;
  const optOutHtml = `<p>${escapeHtml(optOut.prefix)} <a href="mailto:${escapeHtml(replyTo)}">${escapeHtml(replyTo)}</a>${escapeHtml(optOut.suffix)}</p>`;

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
          "List-Unsubscribe": `<mailto:${replyTo}?subject=${encodeURIComponent(optOut.subject)}>`
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

function localizedOptOut(language: "de" | "en" | "es" | "fr" | "it" | "nl", replyTo: string) {
  const translations = {
    de: { prefix: "Falls Sie keine weiteren Nachrichten von uns wünschen, genügt eine kurze Antwort an", suffix: ".", subject: "Keine weiteren Nachrichten" },
    en: { prefix: "If you do not wish to receive further messages from us, simply reply to", suffix: ".", subject: "No further messages" },
    es: { prefix: "Si no desea recibir más mensajes nuestros, simplemente responda a", suffix: ".", subject: "No recibir más mensajes" },
    fr: { prefix: "Si vous ne souhaitez plus recevoir de messages de notre part, répondez simplement à", suffix: ".", subject: "Plus de messages" },
    it: { prefix: "Se non desidera ricevere altri messaggi da parte nostra, risponda semplicemente a", suffix: ".", subject: "Nessun altro messaggio" },
    nl: { prefix: "Als u geen verdere berichten van ons wilt ontvangen, antwoord dan eenvoudig naar", suffix: ".", subject: "Geen verdere berichten" }
  } as const;
  const selected = translations[language] ?? translations.en;
  return { ...selected, text: `${selected.prefix} ${replyTo}${selected.suffix}` };
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
