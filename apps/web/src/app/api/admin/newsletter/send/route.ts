import {
  createNewsletterCampaign,
  markNewsletterRecipientFailed,
  markNewsletterRecipientSent,
  queueNewsletterCampaignRecipients,
  updateNewsletterCampaignStatus
} from "@ai-sports-prediction/db";
import { NextResponse, type NextRequest } from "next/server";
import { getNewsletterDb } from "@/lib/newsletter-db";

export const runtime = "nodejs";

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const subject = normalizeRequiredText(body.subject);
  const htmlBody = normalizeRequiredText(body.html);
  const textBody = normalizeOptionalText(body.text);
  const previewText = normalizeOptionalText(body.previewText);
  const dryRun = body.dryRun === true;

  if (!subject || !htmlBody) {
    return NextResponse.json({ error: "subject_and_html_required" }, { status: 400 });
  }

  const provider = getNewsletterProvider();
  const db = getNewsletterDb();
  const campaignId = await createNewsletterCampaign(db, {
    htmlBody,
    previewText,
    provider: provider.configured ? provider.name : null,
    subject,
    textBody
  });
  const recipients = await queueNewsletterCampaignRecipients(db, campaignId);

  if (dryRun || !provider.configured) {
    return NextResponse.json({
      campaignId,
      dryRun,
      ok: true,
      providerConfigured: provider.configured,
      queuedRecipients: recipients.length,
      sent: 0
    });
  }

  await updateNewsletterCampaignStatus(db, campaignId, "sending");

  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const unsubscribeUrl = buildUnsubscribeUrl(recipient.unsubscribeToken);
    const html = withUnsubscribeFooter(htmlBody, unsubscribeUrl);
    const text = withUnsubscribeText(textBody, unsubscribeUrl);

    try {
      const providerMessageId = await sendWithResend({
        html,
        subject,
        text,
        to: recipient.email
      });
      await markNewsletterRecipientSent(db, recipient.recipientId, providerMessageId);
      sent += 1;
    } catch (error) {
      await markNewsletterRecipientFailed(db, recipient.recipientId, error instanceof Error ? error.message : "Unknown send error");
      failed += 1;
    }
  }

  await updateNewsletterCampaignStatus(db, campaignId, failed > 0 ? "failed" : "sent");

  return NextResponse.json({
    campaignId,
    failed,
    ok: failed === 0,
    providerConfigured: true,
    queuedRecipients: recipients.length,
    sent
  }, {
    status: failed > 0 ? 207 : 200
  });
}

function isAdminAuthorized(request: NextRequest): boolean {
  const token = process.env.ADMIN_API_TOKEN;
  return Boolean(token && request.headers.get("authorization") === `Bearer ${token}`);
}

function getNewsletterProvider(): { configured: boolean; name: "resend" } {
  return {
    configured: Boolean(process.env.RESEND_API_KEY && process.env.NEWSLETTER_FROM_EMAIL),
    name: "resend"
  };
}

async function sendWithResend({
  html,
  subject,
  text,
  to
}: {
  html: string;
  subject: string;
  text: string;
  to: string;
}): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Newsletter provider is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html,
      subject,
      text,
      to
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    method: "POST"
  });
  const result = await response.json().catch(() => ({} as ResendResponse));

  if (!response.ok) {
    throw new Error(result.message || result.name || "Newsletter provider rejected the email.");
  }

  return typeof result.id === "string" ? result.id : null;
}

function buildUnsubscribeUrl(token: string): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ai-sports-prediction.net";
  return `${origin.replace(/\/$/, "")}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function withUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const body = html.replaceAll("{{unsubscribeUrl}}", unsubscribeUrl);
  if (body.includes(unsubscribeUrl)) {
    return body;
  }

  return `${body}
    <hr style="border:0;border-top:1px solid #d8e0dc;margin:32px 0 16px" />
    <p style="color:#64736c;font-size:12px;line-height:1.5">
      You receive this email because you subscribed to AI Sports Prediction.
      <a href="${unsubscribeUrl}">Unsubscribe</a>
    </p>`;
}

function withUnsubscribeText(text: string | null, unsubscribeUrl: string): string {
  const body = (text || "AI Sports Prediction newsletter").replaceAll("{{unsubscribeUrl}}", unsubscribeUrl);
  if (body.includes(unsubscribeUrl)) {
    return body;
  }

  return `${body}\n\nUnsubscribe: ${unsubscribeUrl}`;
}

function normalizeRequiredText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeOptionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}
