import { NextResponse, type NextRequest } from "next/server";
import { Queue } from "bullmq";
import {
  disconnectTikTokConnection,
  fetchTikTokPublishStatus,
  getTikTokConnection,
  getValidTikTokAccessToken,
  isTikTokServerConfigured,
  readTikTokServerConfig,
  uploadTikTokPhotoDraft
} from "@ai-sports-prediction/tiktok";
import {
  disconnectRedditConnection,
  getRedditConnection,
  getValidRedditAccessToken,
  isRedditServerConfigured,
  publishRedditTextPost,
  readRedditServerConfig
} from "@ai-sports-prediction/reddit";
import { getAuthorizedAdminSession } from "@/lib/admin-request-auth";
import {
  approveAndClaimInstagramPost,
  approveAndClaimTikTokPost,
  approveAndClaimRedditPost,
  getMarketingDb,
  getTikTokPostForStatus,
  listMarketingCampaigns,
  markTikTokDraftFailed,
  markTikTokDraftUploaded,
  markInstagramPostFailed,
  markInstagramPostPublished,
  markRedditPostFailed,
  markRedditPostPublished,
  saveTikTokPostStatus,
  updateTikTokPost,
  updateInstagramPost,
  updateRedditPost
} from "@/lib/marketing-admin-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAuthorizedAdminSession(request)) {
    return json({ error: "unauthorized", message: "Bitte melde dich im Admin-Cockpit an." }, 401);
  }
  try {
    const db = getMarketingDb();
    const [campaigns, tiktokConnection, redditConnection] = await Promise.all([
      listMarketingCampaigns(db),
      getTikTokConnection(db),
      getRedditConnection(db)
    ]);
    return json({
      ok: true,
      campaigns,
      instagramConfigured: isInstagramConfigured(),
      instagramAccountLabel: process.env.INSTAGRAM_ACCOUNT_LABEL?.trim() || "Residual Sports",
      generationConfigured: Boolean(process.env.REDIS_URL?.trim()),
      tiktokConfigured: isTikTokServerConfigured(),
      tiktokConnection,
      redditConfigured: isRedditServerConfigured(),
      redditConnection,
      redditSubreddits: subredditAllowlist(),
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
    if (action === "create_content") {
      const jobId = await enqueueMarketingGeneration(boundedInteger(body.limit, 3, 1, 10));
      return json({ ok: true, jobId });
    }

    if (action === "content_generation_status") {
      return json({ ok: true, ...(await readMarketingGenerationStatus(required(body.jobId, "Job-ID"))) });
    }

    if (action === "update_tiktok_post") {
      const postId = required(body.postId, "Entwurf-ID");
      const title = boundedText(body.title, "Titel", 90);
      const postBody = boundedText(body.body, "Beschreibung", 4000);
      if (!await updateTikTokPost({ postId, title, body: postBody })) {
        return json({ error: "not_editable", message: "Dieser TikTok-Entwurf kann nicht mehr bearbeitet werden." }, 409);
      }
      return json({ ok: true });
    }

    if (action === "update_instagram_post") {
      if (!await updateInstagramPost({
        postId: required(body.postId, "Entwurf-ID"),
        body: boundedText(body.body, "Instagram-Text", 2200)
      })) {
        return json({ error: "not_editable", message: "Dieser Instagram-Entwurf kann nicht mehr bearbeitet werden." }, 409);
      }
      return json({ ok: true });
    }

    if (action === "publish_instagram_post") {
      if (body.confirmed !== true) {
        return json({ error: "confirmation_required", message: "Bitte bestätige die ausdrückliche Freigabe vor der Veröffentlichung." }, 400);
      }
      const config = readInstagramConfig();
      const claimed = await approveAndClaimInstagramPost({
        postId: required(body.postId, "Entwurf-ID"),
        body: boundedText(body.body, "Instagram-Text", 2200),
        reviewer: session.email
      });
      try {
        const publishedId = await publishInstagramPost(config, claimed);
        await markInstagramPostPublished(claimed, publishedId);
        return json({ ok: true, providerPostId: publishedId });
      } catch (error) {
        await markInstagramPostFailed(claimed, error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    if (action === "update_reddit_post") {
      const target = subreddit(body.target);
      assertAllowedSubreddit(target);
      if (!await updateRedditPost({
        postId: required(body.postId, "Entwurf-ID"),
        title: boundedText(body.title, "Titel", 300),
        body: boundedText(body.body, "Text", 40_000),
        target
      })) {
        return json({ error: "not_editable", message: "Dieser Reddit-Entwurf kann nicht mehr bearbeitet werden." }, 409);
      }
      return json({ ok: true });
    }

    if (action === "publish_reddit_post") {
      if (body.confirmed !== true) {
        return json({ error: "confirmation_required", message: "Bitte bestätige die ausdrückliche Freigabe vor der Veröffentlichung." }, 400);
      }
      const target = subreddit(body.target);
      const config = readRedditServerConfig();
      const claimed = await approveAndClaimRedditPost({
        postId: required(body.postId, "Entwurf-ID"),
        title: boundedText(body.title, "Titel", 300),
        body: boundedText(body.body, "Text", 40_000),
        target,
        reviewer: session.email,
        allowedSubreddits: subredditAllowlist()
      });
      try {
        const accessToken = await getValidRedditAccessToken(getMarketingDb(), config);
        const published = await publishRedditTextPost(accessToken, {
          subreddit: claimed.target,
          title: claimed.title,
          body: claimed.body
        }, config.userAgent);
        await markRedditPostPublished(claimed, published.id, published.url);
        return json({ ok: true, providerPostId: published.id, providerPostUrl: published.url });
      } catch (error) {
        await markRedditPostFailed(claimed, error instanceof Error ? error.message : String(error));
        throw error;
      }
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

    if (action === "disconnect_reddit") {
      if (body.confirmed !== true) {
        return json({ error: "confirmation_required", message: "Die Trennung muss ausdrücklich bestätigt werden." }, 400);
      }
      await disconnectRedditConnection(getMarketingDb(), readRedditServerConfig());
      return json({ ok: true });
    }

    return json({ error: "unknown_action", message: "Unbekannte Aktion." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Die Marketing-Aktion ist fehlgeschlagen.";
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

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

type MarketingGenerationResult = {
  selected: number;
  campaignsCreated: number;
  postsCreated: number;
  failed: number;
  campaignIds: string[];
};

async function enqueueMarketingGeneration(limit: number): Promise<string> {
  const queue = createMarketingQueue();
  try {
    const job = await queue.add("generate-marketing-campaigns", {
      source: "admin",
      limit
    }, {
      jobId: `admin-marketing-${Date.now()}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 10_000 },
      removeOnComplete: { age: 60 * 60, count: 50 },
      removeOnFail: { age: 24 * 60 * 60, count: 100 }
    });
    if (!job.id) throw new Error("Der Content-Auftrag hat keine ID erhalten.");
    return job.id;
  } finally {
    await queue.close();
  }
}

async function readMarketingGenerationStatus(jobId: string): Promise<{
  state: string;
  result: MarketingGenerationResult | null;
  failureReason: string | null;
}> {
  const queue = createMarketingQueue();
  try {
    const job = await queue.getJob(jobId);
    if (!job) throw new Error("Der Content-Auftrag wurde nicht gefunden oder ist bereits abgelaufen.");
    const state = await job.getState();
    return {
      state,
      result: state === "completed" ? normalizeGenerationResult(job.returnvalue) : null,
      failureReason: state === "failed" ? job.failedReason || "Die Content-Erstellung ist fehlgeschlagen." : null
    };
  } finally {
    await queue.close();
  }
}

function normalizeGenerationResult(value: unknown): MarketingGenerationResult {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    selected: boundedInteger(row.selected, 0, 0, 100),
    campaignsCreated: boundedInteger(row.campaignsCreated, 0, 0, 100),
    postsCreated: boundedInteger(row.postsCreated, 0, 0, 1000),
    failed: boundedInteger(row.failed, 0, 0, 100),
    campaignIds: Array.isArray(row.campaignIds)
      ? row.campaignIds.filter((id): id is string => typeof id === "string")
      : []
  };
}

function createMarketingQueue(): Queue {
  const redisUrl = required(process.env.REDIS_URL, "Redis-Verbindung");
  const url = new URL(redisUrl);
  return new Queue("marketing", {
    connection: {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      maxRetriesPerRequest: null,
      tls: url.protocol === "rediss:" ? {} : undefined
    },
    prefix: process.env.QUEUE_KEY_PREFIX ?? "{ai-sports-prediction}"
  });
}

type InstagramConfig = {
  accountId: string;
  accessToken: string;
  graphVersion: string;
};

function readInstagramConfig(): InstagramConfig {
  return {
    accountId: required(process.env.INSTAGRAM_ACCOUNT_ID, "Instagram-Konto-ID"),
    accessToken: required(process.env.INSTAGRAM_ACCESS_TOKEN, "Instagram-Zugriffstoken"),
    graphVersion: process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v23.0"
  };
}

function isInstagramConfigured(): boolean {
  try {
    readInstagramConfig();
    return true;
  } catch {
    return false;
  }
}

async function publishInstagramPost(
  config: InstagramConfig,
  post: {
    platform: "instagram_feed" | "instagram_story";
    body: string;
    assetUrl: string;
  }
): Promise<string> {
  const mediaBody = new URLSearchParams({ image_url: post.assetUrl });
  if (post.platform === "instagram_feed") {
    mediaBody.set("caption", post.body);
  } else {
    mediaBody.set("media_type", "STORIES");
  }
  const container = await fetchInstagramJson(
    `https://graph.instagram.com/${encodeURIComponent(config.graphVersion)}/${encodeURIComponent(config.accountId)}/media`,
    config.accessToken,
    mediaBody
  );
  const creationId = responseId(container, "Instagram-Mediencontainer");
  const published = await fetchInstagramJson(
    `https://graph.instagram.com/${encodeURIComponent(config.graphVersion)}/${encodeURIComponent(config.accountId)}/media_publish`,
    config.accessToken,
    new URLSearchParams({ creation_id: creationId })
  );
  return responseId(published, "Instagram-Beitrag");
}

async function fetchInstagramJson(
  url: string,
  accessToken: string,
  body: URLSearchParams
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body,
      cache: "no-store",
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const providerError = payload.error && typeof payload.error === "object"
        ? text((payload.error as Record<string, unknown>).message)
        : "";
      throw new Error(providerError || `Instagram hat HTTP ${response.status} zurückgegeben.`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function responseId(payload: Record<string, unknown>, label: string): string {
  const id = text(payload.id);
  if (!id) throw new Error(`${label} enthält keine ID.`);
  return id;
}

function subredditAllowlist(): string[] {
  return (process.env.MARKETING_REDDIT_SUBREDDITS ?? "")
    .split(",")
    .map((value) => value.trim().replace(/^r\//iu, ""))
    .filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

function subreddit(value: unknown): string {
  const normalized = required(value, "Subreddit").replace(/^r\//iu, "");
  if (!/^[A-Za-z0-9_]{3,21}$/u.test(normalized)) {
    throw new Error("Der Subreddit-Name ist ungültig.");
  }
  return normalized;
}

function assertAllowedSubreddit(target: string): void {
  if (!subredditAllowlist().some((value) => value.toLowerCase() === target.toLowerCase())) {
    throw new Error(`r/${target} ist nicht in MARKETING_REDDIT_SUBREDDITS freigegeben.`);
  }
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
