/**
 * Purpose: Publishes approved marketing drafts to owned Instagram/X/TikTok accounts and
 * explicitly allowlisted subreddits. This module never generates or approves content by itself.
 */
import { readFile } from "node:fs/promises";
import type { PostgresDb } from "@ai-sports-prediction/db";
import { parseSubredditAllowlist, type MarketingPlatform } from "./marketing-agent";

type MarketingPostRow = {
  id: string;
  campaign_id: string;
  platform: MarketingPlatform;
  target: string;
  title: string | null;
  body: string;
  asset_path: string | null;
  asset_url: string | null;
  status: string;
};

type PublishedPost = {
  providerPostId: string;
  providerPostUrl: string | null;
};

export type MarketingPublishResult = {
  campaignId: string;
  published: number;
  failed: number;
  skipped: number;
};

export async function approveMarketingCampaign(
  db: PostgresDb,
  campaignId: string,
  reviewer: string
): Promise<number> {
  if (!campaignId.trim()) throw new Error("A campaign id is required.");
  if (!reviewer.trim()) throw new Error("A reviewer name is required.");

  const client = await db.connect();
  try {
    await client.query("begin");
    const campaign = await client.query(
      `
        update marketing_campaigns
        set status = 'approved', approved_by = $2, approved_at_utc = now()
        where id = $1 and status in ('pending_review', 'failed', 'partially_published')
        returning id
      `,
      [campaignId.trim(), reviewer.trim()]
    );
    if (!campaign.rowCount) {
      throw new Error("Campaign was not found, already published, rejected, or currently publishing.");
    }
    const posts = await client.query(
      `
        update marketing_posts
        set status = 'approved', approved_by = $2, approved_at_utc = now(), error_message = null
        where campaign_id = $1 and status in ('pending_review', 'failed')
        returning id
      `,
      [campaignId.trim(), reviewer.trim()]
    );
    await client.query("commit");
    return posts.rowCount ?? 0;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectMarketingCampaign(
  db: PostgresDb,
  campaignId: string,
  reviewer: string
): Promise<void> {
  if (!campaignId.trim() || !reviewer.trim()) {
    throw new Error("Campaign id and reviewer are required.");
  }
  await db.query(
    `
      update marketing_campaigns
      set status = 'rejected', approved_by = $2, approved_at_utc = now()
      where id = $1 and status = 'pending_review'
    `,
    [campaignId.trim(), reviewer.trim()]
  );
  await db.query(
    `update marketing_posts set status = 'rejected' where campaign_id = $1 and status = 'pending_review'`,
    [campaignId.trim()]
  );
}

export async function publishMarketingCampaign(
  db: PostgresDb,
  campaignId: string
): Promise<MarketingPublishResult> {
  const campaign = await db.query<{ id: string; status: string; approved_at_utc: Date | null }>(
    `select id, status, approved_at_utc from marketing_campaigns where id = $1`,
    [campaignId]
  );
  const campaignRow = campaign.rows[0];
  if (!campaignRow) throw new Error("Marketing campaign not found.");
  if (campaignRow.status !== "approved" || !campaignRow.approved_at_utc) {
    throw new Error("Marketing campaign must be approved before publishing.");
  }

  const rows = await db.query<MarketingPostRow>(
    `
      select id, campaign_id, platform, target, title, body, asset_path, asset_url, status
      from marketing_posts
      where campaign_id = $1 and status = 'approved'
      order by created_at_utc asc
    `,
    [campaignId]
  );
  if (rows.rows.length === 0) {
    throw new Error("The campaign has no approved posts to publish.");
  }

  await db.query("update marketing_campaigns set status = 'publishing' where id = $1", [campaignId]);
  const result: MarketingPublishResult = { campaignId, published: 0, failed: 0, skipped: 0 };

  for (const post of rows.rows) {
    try {
      assertConfiguredTarget(post);
      await db.query(
        "update marketing_posts set status = 'publishing', error_message = null where id = $1",
        [post.id]
      );
      const published = await publishPost(post);
      await db.query(
        `
          update marketing_posts
          set status = 'published', provider_post_id = $2, provider_post_url = $3,
              published_at_utc = now(), error_message = null
          where id = $1
        `,
        [post.id, published.providerPostId, published.providerPostUrl]
      );
      result.published += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.query(
        "update marketing_posts set status = 'failed', error_message = $2 where id = $1",
        [post.id, message]
      );
      result.failed += 1;
      console.error(`Publishing ${post.platform} post ${post.id} failed:`, error);
    }
  }

  const finalStatus = result.failed === 0
    ? "published"
    : result.published > 0
      ? "partially_published"
      : "failed";
  await db.query(
    `
      update marketing_campaigns
      set status = $2, published_at_utc = case when $2 = 'published' then now() else published_at_utc end
      where id = $1
    `,
    [campaignId, finalStatus]
  );
  return result;
}

export async function publishApprovedMarketingCampaigns(
  db: PostgresDb,
  limit = 10
): Promise<MarketingPublishResult[]> {
  const campaigns = await db.query<{ id: string }>(
    `select id from marketing_campaigns where status = 'approved' order by approved_at_utc asc limit $1`,
    [Math.max(1, Math.min(100, limit))]
  );
  const results: MarketingPublishResult[] = [];
  for (const campaign of campaigns.rows) {
    results.push(await publishMarketingCampaign(db, campaign.id));
  }
  return results;
}

async function publishPost(post: MarketingPostRow): Promise<PublishedPost> {
  if (post.platform === "instagram_feed" || post.platform === "instagram_story") {
    return publishInstagram(post);
  }
  if (post.platform === "x") {
    return publishX(post);
  }
  if (post.platform === "tiktok") {
    return publishTikTok(post);
  }
  return publishReddit(post);
}

export async function publishInstagram(post: MarketingPostRow): Promise<PublishedPost> {
  const accountId = requireEnv("INSTAGRAM_ACCOUNT_ID");
  const accessToken = requireEnv("INSTAGRAM_ACCESS_TOKEN");
  const graphVersion = process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v23.0";
  if (!post.asset_url) {
    throw new Error("Instagram requires MARKETING_PUBLIC_ASSET_BASE_URL so Meta can fetch the JPEG.");
  }

  const mediaBody = new URLSearchParams({ image_url: post.asset_url });
  if (post.platform === "instagram_feed") {
    mediaBody.set("caption", post.body);
  } else {
    mediaBody.set("media_type", "STORIES");
  }

  const container = await fetchJson(
    `https://graph.instagram.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: mediaBody
    }
  );
  const creationId = readResponseId(container, "Instagram media container");
  const published = await fetchJson(
    `https://graph.instagram.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(accountId)}/media_publish`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ creation_id: creationId })
    }
  );
  return { providerPostId: readResponseId(published, "Instagram published media"), providerPostUrl: null };
}

export async function publishX(post: MarketingPostRow): Promise<PublishedPost> {
  const accessToken = requireEnv("X_USER_ACCESS_TOKEN");
  let mediaId: string | null = null;

  if (post.asset_path) {
    const bytes = await readFile(post.asset_path);
    const upload = await fetchJson("https://api.x.com/2/media/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        media: bytes.toString("base64"),
        media_category: "tweet_image",
        media_type: "image/jpeg",
        shared: false
      })
    });
    mediaId = readNestedResponseId(upload, "X uploaded media");
  }

  const payload: Record<string, unknown> = { text: post.body, made_with_ai: true };
  if (mediaId) payload.media = { media_ids: [mediaId] };
  const created = await fetchJson("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const id = readNestedResponseId(created, "X post");
  return { providerPostId: id, providerPostUrl: `https://x.com/i/web/status/${id}` };
}

export async function publishTikTok(post: MarketingPostRow): Promise<PublishedPost> {
  const accessToken = requireEnv("TIKTOK_ACCESS_TOKEN");
  if (!post.asset_url || !post.asset_url.startsWith("https://")) {
    throw new Error("TikTok requires a public HTTPS asset URL from MARKETING_PUBLIC_ASSET_BASE_URL.");
  }

  const configuredMode = process.env.TIKTOK_POST_MODE?.trim().toUpperCase();
  const directPost = configuredMode === "DIRECT_POST";
  const postInfo: Record<string, unknown> = {
    title: truncate(post.title?.trim() || "AI match prediction", 90),
    description: truncate(post.body, 4000)
  };

  if (directPost) {
    const creatorInfo = await fetchJson("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: "{}"
    });
    assertTikTokSuccess(creatorInfo, "TikTok creator info");
    const privacyOptions = Array.isArray(creatorInfo.data?.privacy_level_options)
      ? creatorInfo.data.privacy_level_options.filter((value: unknown): value is string => typeof value === "string")
      : [];
    const privacyLevel = process.env.TIKTOK_PRIVACY_LEVEL?.trim() || "SELF_ONLY";
    if (!privacyOptions.includes(privacyLevel)) {
      throw new Error(`TikTok privacy level ${privacyLevel} is not available for this creator.`);
    }
    Object.assign(postInfo, {
      privacy_level: privacyLevel,
      disable_comment: false,
      auto_add_music: true,
      brand_content_toggle: false,
      brand_organic_toggle: true
    });
  }

  const created = await fetchJson("https://open.tiktokapis.com/v2/post/publish/content/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      post_info: postInfo,
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [post.asset_url]
      },
      post_mode: directPost ? "DIRECT_POST" : "MEDIA_UPLOAD",
      media_type: "PHOTO"
    })
  });
  assertTikTokSuccess(created, "TikTok content posting");
  const publishId = created.data?.publish_id;
  if (typeof publishId !== "string" || !publishId) {
    throw new Error("TikTok accepted the request but returned no publish_id.");
  }
  return { providerPostId: publishId, providerPostUrl: null };
}

export async function publishReddit(post: MarketingPostRow): Promise<PublishedPost> {
  const clientId = requireEnv("REDDIT_CLIENT_ID");
  const clientSecret = requireEnv("REDDIT_CLIENT_SECRET");
  const refreshToken = requireEnv("REDDIT_REFRESH_TOKEN");
  const userAgent = process.env.REDDIT_USER_AGENT?.trim()
    || "web:ai-sports-prediction-marketing:v1.0 (by /u/configure-owner)";
  const tokenResponse = await fetchJson("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  });
  const accessToken = typeof tokenResponse.access_token === "string" ? tokenResponse.access_token : null;
  if (!accessToken) throw new Error("Reddit token refresh did not return an access token.");

  const body = new URLSearchParams({
    api_type: "json",
    kind: "self",
    sr: post.target,
    title: post.title ?? "AI-Sportprognose",
    text: post.body,
    resubmit: "false",
    sendreplies: "false"
  });
  const created = await fetchJson("https://oauth.reddit.com/api/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent
    },
    body
  });
  const errors = readRedditErrors(created);
  if (errors.length) throw new Error(`Reddit rejected the post: ${errors.join("; ")}`);
  const url = readRedditUrl(created);
  const providerPostId = readRedditPostId(created) ?? url;
  if (!providerPostId) throw new Error("Reddit accepted the request but returned no post identifier.");
  return { providerPostId, providerPostUrl: url };
}

function assertConfiguredTarget(post: MarketingPostRow): void {
  if (post.platform !== "reddit") return;
  const allowed = new Set(parseSubredditAllowlist(process.env.MARKETING_REDDIT_SUBREDDITS).map((item) => item.toLowerCase()));
  if (!allowed.has(post.target.toLowerCase())) {
    throw new Error(`Subreddit r/${post.target} is not in MARKETING_REDDIT_SUBREDDITS.`);
  }
}

async function fetchJson(url: string, init: RequestInit): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) {
      throw new Error(`${new URL(url).hostname} returned ${response.status}: ${JSON.stringify(payload)}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function readResponseId(payload: Record<string, any>, label: string): string {
  if (typeof payload.id !== "string" || !payload.id) throw new Error(`${label} response did not contain an id.`);
  return payload.id;
}

function readNestedResponseId(payload: Record<string, any>, label: string): string {
  const id = payload.data?.id;
  if (typeof id !== "string" || !id) throw new Error(`${label} response did not contain data.id.`);
  return id;
}

function readRedditErrors(payload: Record<string, any>): string[] {
  const errors = payload.json?.errors;
  return Array.isArray(errors) ? errors.map((error) => Array.isArray(error) ? error.join(": ") : String(error)) : [];
}

function readRedditUrl(payload: Record<string, any>): string | null {
  const url = payload.json?.data?.url;
  return typeof url === "string" && url ? url : null;
}

function readRedditPostId(payload: Record<string, any>): string | null {
  const value = payload.json?.data?.name ?? payload.json?.data?.id;
  return typeof value === "string" && value ? value : null;
}

function assertTikTokSuccess(payload: Record<string, any>, label: string): void {
  const code = payload.error?.code;
  if (typeof code === "string" && code !== "ok") {
    throw new Error(`${label} failed (${code}): ${String(payload.error?.message ?? "Unknown TikTok error")}`);
  }
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value.trim());
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to publish this platform.`);
  return value;
}
