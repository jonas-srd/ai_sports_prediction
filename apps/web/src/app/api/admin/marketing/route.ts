import { NextResponse, type NextRequest } from "next/server";
import {
  disconnectTikTokConnection,
  fetchTikTokPublishStatus,
  getTikTokConnection,
  getValidTikTokAccessToken,
  isTikTokServerConfigured,
  readTikTokServerConfig,
  uploadTikTokPhotoDraft
} from "@ai-sports-prediction/tiktok";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";
import {
  approveAndClaimTikTokPost,
  getMarketingDb,
  getTikTokPostForStatus,
  listMarketingCampaigns,
  markTikTokDraftFailed,
  markTikTokDraftUploaded,
  saveTikTokPostStatus,
  updateTikTokPost
} from "@/lib/marketing-admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminSession(request)) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }
  try {
    const db = getMarketingDb();
    const [campaigns, tiktokConnection] = await Promise.all([
      listMarketingCampaigns(db),
      getTikTokConnection(db)
    ]);
    return json({
      ok: true,
      campaigns,
      tiktokConfigured: isTikTokServerConfigured(),
      tiktokConnection,
      generatedAtUtc: new Date().toISOString()
    });
  } catch (error) {
    console.error("Could not load Marketing Studio:", error);
    return json({
      error: "marketing_unavailable",
      message: "Marketing-Daten sind nicht verfügbar. Bitte Datenbankmigration und Konfiguration prüfen."
    }, 503);
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAuthorizedAdminSession(request);
  if (!session) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "invalid_origin", message: "Die Anfrage wurde aus Sicherheitsgründen abgelehnt." }, 403);
  }
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return json({ error: "invalid_payload", message: "Ungültige Anfrage." }, 400);
  }
  const body = payload as Record<string, unknown>;
  const action = text(body.action);

  try {
    if (action === "update_tiktok_post") {
      const postId = required(body.postId, "Entwurf-ID");
      const title = boundedText(body.title, "Titel", 90);
      const postBody = boundedText(body.body, "Beschreibung", 4000);
      if (!await updateTikTokPost({ postId, title, body: postBody })) {
        return json({ error: "not_editable", message: "Dieser TikTok-Entwurf kann nicht mehr bearbeitet werden." }, 409);
      }
      return json({ ok: true });
    }

    if (action === "upload_tiktok_draft") {
      if (body.confirmed !== true) {
        return json({ error: "confirmation_required", message: "Bitte bestätige die ausdrückliche Freigabe vor dem Upload." }, 400);
      }
      const config = readTikTokServerConfig();
      const claimed = await approveAndClaimTikTokPost({
        postId: required(body.postId, "Entwurf-ID"),
        title: boundedText(body.title, "Titel", 90),
        body: boundedText(body.body, "Beschreibung", 4000),
        reviewer: session.email
      });
      try {
        const accessToken = await getValidTikTokAccessToken(getMarketingDb(), config);
        const upload = await uploadTikTokPhotoDraft(accessToken, {
          title: claimed.title,
          description: claimed.body,
          photoUrl: claimed.assetUrl
        });
        await markTikTokDraftUploaded(claimed, upload.publishId);
        const providerStatus = await refreshStatus(claimed.id, accessToken).catch(() => null);
        return json({ ok: true, publishId: upload.publishId, providerStatus });
      } catch (error) {
        await markTikTokDraftFailed(
          claimed,
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    }

    if (action === "refresh_tiktok_status") {
      const config = readTikTokServerConfig();
      const accessToken = await getValidTikTokAccessToken(getMarketingDb(), config);
      const providerStatus = await refreshStatus(
        required(body.postId, "Entwurf-ID"),
        accessToken
      );
      return json({ ok: true, providerStatus });
    }

    if (action === "disconnect_tiktok") {
      if (body.confirmed !== true) {
        return json({ error: "confirmation_required", message: "Die Trennung muss ausdrücklich bestätigt werden." }, 400);
      }
      await disconnectTikTokConnection(getMarketingDb(), readTikTokServerConfig());
      return json({ ok: true });
    }

    return json({ error: "unknown_action", message: "Unbekannte Aktion." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die TikTok-Aktion ist fehlgeschlagen.";
    console.error(`Marketing action ${action || "unknown"} failed:`, error);
    return json({ error: "action_failed", message }, 409);
  }
}

async function refreshStatus(postId: string, accessToken: string): Promise<string> {
  const post = await getTikTokPostForStatus(postId);
  if (!post) throw new Error("Für diesen Entwurf wurde noch keine TikTok-Upload-ID gespeichert.");
  const status = await fetchTikTokPublishStatus(accessToken, post.publishId);
  await saveTikTokPostStatus({
    postId,
    status: status.status,
    failReason: status.failReason,
    publicPostIds: status.publicPostIds,
    raw: status.raw
  });
  return status.status;
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) return false;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()
    || request.nextUrl.protocol.replace(":", "");
  return origin === `${protocol}://${host}`;
}

function boundedText(value: unknown, label: string, max: number): string {
  const normalized = required(value, label);
  if (Array.from(normalized).length > max) {
    throw new Error(`${label} darf höchstens ${max} Zeichen enthalten.`);
  }
  return normalized;
}

function required(value: unknown, label: string): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`${label} fehlt.`);
  return normalized;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function json(payload: unknown, status = 200) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("cache-control", "no-store");
  return response;
}
