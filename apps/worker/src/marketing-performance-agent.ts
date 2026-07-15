/**
 * Purpose: Collects reach/click/engagement snapshots for published marketing posts and turns
 * them into explainable recommendations. Missing platform metrics remain null instead of being inferred.
 */
import { randomUUID } from "node:crypto";
import type { PostgresDb } from "@ai-sports-prediction/db";
import { OpenRouterClient } from "@ai-sports-prediction/llm";
import type { MarketingPlatform } from "./marketing-agent";

export type MarketingMetricSnapshot = {
  postId: string;
  campaignId: string;
  platform: MarketingPlatform;
  title: string | null;
  body: string;
  publishedAtUtc: string;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  engagementTotal: number | null;
  source: "instagram" | "x" | "reddit" | "tiktok" | "manual";
  rawMetrics: unknown;
};

export type PerformanceRecommendation = {
  priority: "high" | "medium" | "low";
  title: string;
  action: string;
  evidence: string;
};

export type MarketingPerformanceSummary = {
  postsMeasured: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagements: number;
  clickThroughRate: number | null;
  engagementRate: number | null;
  bestPlatform: string | null;
};

export type MarketingPerformanceResult = {
  collected: number;
  failed: number;
  reportId: string;
  summary: MarketingPerformanceSummary;
  recommendations: PerformanceRecommendation[];
};

type PublishedPostRow = {
  id: string;
  campaign_id: string;
  platform: MarketingPlatform;
  title: string | null;
  body: string;
  provider_post_id: string;
  published_at_utc: Date | string;
};

export async function runMarketingPerformanceAgent(db: PostgresDb): Promise<MarketingPerformanceResult> {
  const days = boundedInteger(process.env.MARKETING_ANALYTICS_LOOKBACK_DAYS, 30, 1, 90);
  const limit = boundedInteger(process.env.MARKETING_ANALYTICS_MAX_POSTS_PER_RUN, 100, 1, 500);
  const published = await db.query<PublishedPostRow>(
    `
      select id, campaign_id, platform, title, body, provider_post_id, published_at_utc
      from marketing_posts
      where status = 'published'
        and provider_post_id is not null
        and published_at_utc >= now() - ($1::text || ' days')::interval
      order by published_at_utc desc
      limit $2
    `,
    [days, limit]
  );

  let collected = 0;
  let failed = 0;
  for (const post of published.rows) {
    try {
      const metric = await collectPostMetrics(post);
      await storeMetricSnapshot(db, metric);
      collected += 1;
    } catch (error) {
      failed += 1;
      console.error(`Marketing analytics failed for ${post.platform} post ${post.id}:`, error);
    }
  }

  const latestMetrics = await listLatestMetrics(db, days);
  const summary = summarizeMarketingPerformance(latestMetrics);
  const recommendations = await createPerformanceRecommendations(summary, latestMetrics);
  const reportId = randomUUID();
  const now = new Date();
  await db.query(
    `
      insert into marketing_performance_reports (
        id, window_start_utc, window_end_utc, summary, recommendations, model_id, provider_response_id
      ) values ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7)
    `,
    [
      reportId,
      new Date(now.getTime() - days * 86_400_000).toISOString(),
      now.toISOString(),
      JSON.stringify(summary),
      JSON.stringify(recommendations.items),
      recommendations.modelId,
      recommendations.providerResponseId
    ]
  );

  return { collected, failed, reportId, summary, recommendations: recommendations.items };
}

export async function collectPostMetrics(post: PublishedPostRow): Promise<MarketingMetricSnapshot> {
  if (post.platform === "instagram_feed" || post.platform === "instagram_story") {
    return collectInstagramMetrics(post);
  }
  if (post.platform === "x") {
    return collectXMetrics(post);
  }
  if (post.platform === "tiktok") {
    return collectTikTokMetrics(post);
  }
  return collectRedditMetrics(post);
}

export function parseInstagramMetrics(payload: Record<string, any>) {
  const metrics = new Map<string, number>();
  for (const item of Array.isArray(payload.data) ? payload.data : []) {
    const value = readMetricValue(item);
    if (typeof item?.name === "string" && value !== null) metrics.set(item.name, value);
  }
  return {
    impressions: metrics.get("views") ?? metrics.get("impressions") ?? null,
    reach: metrics.get("reach") ?? null,
    clicks: metrics.get("profile_links_taps") ?? null,
    likes: metrics.get("likes") ?? null,
    comments: metrics.get("comments") ?? null,
    shares: metrics.get("shares") ?? null,
    saves: metrics.get("saved") ?? metrics.get("saves") ?? null,
    engagementTotal: metrics.get("total_interactions") ?? null
  };
}

export function parseXMetrics(payload: Record<string, any>) {
  const publicMetrics = isRecord(payload.data?.public_metrics) ? payload.data.public_metrics : {};
  const privateMetrics = isRecord(payload.data?.non_public_metrics) ? payload.data.non_public_metrics : {};
  return {
    impressions: readNumber(publicMetrics.impression_count) ?? readNumber(privateMetrics.impression_count),
    reach: null,
    clicks: readNumber(privateMetrics.url_link_clicks),
    likes: readNumber(publicMetrics.like_count),
    comments: readNumber(publicMetrics.reply_count),
    shares: sumNullable(readNumber(publicMetrics.retweet_count), readNumber(publicMetrics.quote_count)),
    saves: readNumber(publicMetrics.bookmark_count),
    engagementTotal: readNumber(privateMetrics.engagements)
  };
}

export function parseRedditMetrics(payload: Record<string, any>) {
  const item = payload.data?.children?.[0]?.data;
  return {
    impressions: readNumber(item?.view_count),
    reach: null,
    clicks: null,
    likes: readNumber(item?.ups) ?? readNumber(item?.score),
    comments: readNumber(item?.num_comments),
    shares: null,
    saves: null,
    engagementTotal: sumNullable(readNumber(item?.ups) ?? readNumber(item?.score), readNumber(item?.num_comments))
  };
}

export function summarizeMarketingPerformance(
  metrics: MarketingMetricSnapshot[]
): MarketingPerformanceSummary {
  const totals = metrics.reduce((acc, item) => {
    acc.impressions += item.impressions ?? 0;
    acc.reach += item.reach ?? 0;
    acc.clicks += item.clicks ?? 0;
    acc.engagements += item.engagementTotal
      ?? ((item.likes ?? 0) + (item.comments ?? 0) + (item.shares ?? 0) + (item.saves ?? 0));
    return acc;
  }, { impressions: 0, reach: 0, clicks: 0, engagements: 0 });
  const platformRates = new Map<string, { impressions: number; engagements: number }>();
  for (const item of metrics) {
    const current = platformRates.get(item.platform) ?? { impressions: 0, engagements: 0 };
    current.impressions += item.impressions ?? 0;
    current.engagements += item.engagementTotal
      ?? ((item.likes ?? 0) + (item.comments ?? 0) + (item.shares ?? 0) + (item.saves ?? 0));
    platformRates.set(item.platform, current);
  }
  const bestPlatform = [...platformRates.entries()]
    .filter(([, value]) => value.impressions > 0)
    .sort((left, right) => (right[1].engagements / right[1].impressions) - (left[1].engagements / left[1].impressions))[0]?.[0] ?? null;

  return {
    postsMeasured: metrics.length,
    ...totals,
    clickThroughRate: totals.impressions > 0 ? roundRate(totals.clicks / totals.impressions) : null,
    engagementRate: totals.impressions > 0 ? roundRate(totals.engagements / totals.impressions) : null,
    bestPlatform
  };
}

export function buildFallbackRecommendations(
  summary: MarketingPerformanceSummary,
  metrics: MarketingMetricSnapshot[]
): PerformanceRecommendation[] {
  if (!summary.postsMeasured) {
    return [{
      priority: "medium",
      title: "Build the first performance baseline",
      action: "Publish at least three approved posts and measure them again after 24 hours.",
      evidence: "No platform snapshots are available yet."
    }];
  }

  const items: PerformanceRecommendation[] = [];
  if (summary.clickThroughRate !== null && summary.clickThroughRate < 0.015) {
    items.push({
      priority: "high",
      title: "Strengthen the CTA and link hook",
      action: "State the concrete value of the match analysis before the link on X and Reddit, then test two hook variants.",
      evidence: `The current click-through rate is ${(summary.clickThroughRate * 100).toFixed(1)}%.`
    });
  }
  if (summary.bestPlatform) {
    items.push({
      priority: "medium",
      title: `Use ${platformLabel(summary.bestPlatform)} as the lead format`,
      action: "Adapt the strongest visual and discussion hook for the other platforms without copying the text verbatim.",
      evidence: `${platformLabel(summary.bestPlatform)} currently has the strongest engagement rate.`
    });
  }
  const bestPost = [...metrics]
    .filter((item) => (item.impressions ?? 0) > 0)
    .sort((a, b) => metricEngagementRate(b) - metricEngagementRate(a))[0];
  if (bestPost) {
    items.push({
      priority: "low",
      title: "Reuse the winning hook structure",
      action: `Create a variation of “${shorten(bestPost.title || bestPost.body, 72)}” for the next campaign.`,
      evidence: `This ${platformLabel(bestPost.platform)} post has the best engagement rate among the measured posts.`
    });
  }
  return items.slice(0, 4);
}

async function collectInstagramMetrics(post: PublishedPostRow): Promise<MarketingMetricSnapshot> {
  const token = requireEnv("INSTAGRAM_ACCESS_TOKEN");
  const version = process.env.INSTAGRAM_GRAPH_API_VERSION?.trim() || "v23.0";
  const url = new URL(`https://graph.instagram.com/${version}/${encodeURIComponent(post.provider_post_id)}/insights`);
  url.searchParams.set("metric", "reach,views,likes,comments,shares,saved,total_interactions");
  const payload = await fetchJson(url, { headers: { Authorization: `Bearer ${token}` } });
  return makeSnapshot(post, "instagram", parseInstagramMetrics(payload), payload);
}

async function collectXMetrics(post: PublishedPostRow): Promise<MarketingMetricSnapshot> {
  const token = requireEnv("X_USER_ACCESS_TOKEN");
  const url = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(post.provider_post_id)}`);
  url.searchParams.set("tweet.fields", "public_metrics,non_public_metrics,organic_metrics");
  const payload = await fetchJson(url, { headers: { Authorization: `Bearer ${token}` } });
  return makeSnapshot(post, "x", parseXMetrics(payload), payload);
}

async function collectRedditMetrics(post: PublishedPostRow): Promise<MarketingMetricSnapshot> {
  const token = await getRedditAccessToken();
  const id = post.provider_post_id.replace(/^t3_/u, "").replace(/^.*comments\//u, "").split("/")[0];
  const url = new URL("https://oauth.reddit.com/api/info");
  url.searchParams.set("id", `t3_${id}`);
  url.searchParams.set("raw_json", "1");
  const payload = await fetchJson(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": redditUserAgent() }
  });
  return makeSnapshot(post, "reddit", parseRedditMetrics(payload), payload);
}

async function collectTikTokMetrics(post: PublishedPostRow): Promise<MarketingMetricSnapshot> {
  return makeSnapshot(post, "tiktok", {
    impressions: null,
    reach: null,
    clicks: null,
    likes: null,
    comments: null,
    shares: null,
    saves: null,
    engagementTotal: null
  }, {
    note: "TikTok publishing is connected; performance fields remain empty until analytics scopes are approved."
  });
}

async function storeMetricSnapshot(db: PostgresDb, metric: MarketingMetricSnapshot): Promise<void> {
  await db.query(
    `
      insert into marketing_post_metrics (
        id, post_id, source, impressions, reach, clicks, likes, comments, shares, saves,
        engagement_total, raw_metrics
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
    `,
    [randomUUID(), metric.postId, metric.source, metric.impressions, metric.reach, metric.clicks,
      metric.likes, metric.comments, metric.shares, metric.saves, metric.engagementTotal,
      JSON.stringify(metric.rawMetrics)]
  );
}

async function listLatestMetrics(db: PostgresDb, days: number): Promise<MarketingMetricSnapshot[]> {
  const result = await db.query<any>(
    `
      select distinct on (mpm.post_id)
        mpm.post_id as "postId", mp.campaign_id as "campaignId", mp.platform, mp.title, mp.body,
        mp.published_at_utc as "publishedAtUtc", mpm.impressions, mpm.reach, mpm.clicks,
        mpm.likes, mpm.comments, mpm.shares, mpm.saves,
        mpm.engagement_total as "engagementTotal", mpm.source, mpm.raw_metrics as "rawMetrics"
      from marketing_post_metrics mpm
      join marketing_posts mp on mp.id = mpm.post_id
      where mpm.collected_at_utc >= now() - ($1::text || ' days')::interval
      order by mpm.post_id, mpm.collected_at_utc desc
    `,
    [days]
  );
  return result.rows.map((row: any) => ({ ...row, publishedAtUtc: new Date(row.publishedAtUtc).toISOString() }));
}

async function createPerformanceRecommendations(
  summary: MarketingPerformanceSummary,
  metrics: MarketingMetricSnapshot[]
): Promise<{ items: PerformanceRecommendation[]; modelId: string | null; providerResponseId: string | null }> {
  const fallback = buildFallbackRecommendations(summary, metrics);
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || !summary.postsMeasured) return { items: fallback, modelId: null, providerResponseId: null };
  const modelId = process.env.MARKETING_ANALYTICS_OPENROUTER_MODEL?.trim()
    || process.env.MARKETING_OPENROUTER_MODEL?.trim()
    || process.env.OPENROUTER_TEST_MODEL?.trim()
    || "openai/gpt-oss-20b:free";
  const client = new OpenRouterClient({ apiKey, siteUrl: process.env.OPENROUTER_SITE_URL, siteName: process.env.OPENROUTER_SITE_NAME });
  try {
    const response = await client.createChatCompletion(modelId, `You are the performance agent for AI Sports Prediction. Analyse only these aggregated social media metrics, do not invent missing values, and write every recommendation in English. Return JSON: {"recommendations":[{"priority":"high|medium|low","title":"...","action":"...","evidence":"..."}]}. Return at most four specific recommendations.\n\nSummary: ${JSON.stringify(summary)}\nPosts: ${JSON.stringify(metrics.map(({ rawMetrics: _raw, ...item }) => item))}`, {
      temperature: 0.2,
      maxTokens: 1000,
      responseFormat: { type: "json_object" }
    });
    const parsed = parseRecommendationJson(response.content);
    return { items: parsed.length ? parsed : fallback, modelId, providerResponseId: response.responseId };
  } catch (error) {
    console.warn("Marketing performance model failed; using deterministic recommendations:", error);
    return { items: fallback, modelId: null, providerResponseId: null };
  }
}

function parseRecommendationJson(raw: string): PerformanceRecommendation[] {
  const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "")) as any;
  return (Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
    .filter((item: any) => ["high", "medium", "low"].includes(item?.priority)
      && typeof item?.title === "string" && typeof item?.action === "string" && typeof item?.evidence === "string")
    .slice(0, 4);
}

function makeSnapshot(post: PublishedPostRow, source: MarketingMetricSnapshot["source"], values: Omit<MarketingMetricSnapshot, "postId" | "campaignId" | "platform" | "title" | "body" | "publishedAtUtc" | "source" | "rawMetrics">, rawMetrics: unknown): MarketingMetricSnapshot {
  return {
    postId: post.id,
    campaignId: post.campaign_id,
    platform: post.platform,
    title: post.title,
    body: post.body,
    publishedAtUtc: new Date(post.published_at_utc).toISOString(),
    source,
    rawMetrics,
    ...values
  };
}

let redditTokenCache: { token: string; expiresAt: number } | null = null;
async function getRedditAccessToken(): Promise<string> {
  if (redditTokenCache && redditTokenCache.expiresAt > Date.now() + 60_000) return redditTokenCache.token;
  const clientId = requireEnv("REDDIT_CLIENT_ID");
  const clientSecret = requireEnv("REDDIT_CLIENT_SECRET");
  const refreshToken = requireEnv("REDDIT_REFRESH_TOKEN");
  const payload = await fetchJson(new URL("https://www.reddit.com/api/v1/access_token"), {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": redditUserAgent()
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  });
  if (typeof payload.access_token !== "string") throw new Error("Reddit token refresh returned no access token.");
  redditTokenCache = { token: payload.access_token, expiresAt: Date.now() + (readNumber(payload.expires_in) ?? 3600) * 1000 };
  return payload.access_token;
}

async function fetchJson(url: URL, init: RequestInit): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(`${url.hostname} returned ${response.status}: ${JSON.stringify(payload)}`);
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function readMetricValue(item: any): number | null {
  const direct = readNumber(item?.values?.[0]?.value) ?? readNumber(item?.total_value?.value);
  return direct ?? readNumber(item?.value);
}

function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function sumNullable(...values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? present.reduce((sum, value) => sum + value, 0) : null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function metricEngagementRate(item: MarketingMetricSnapshot): number {
  const impressions = item.impressions ?? 0;
  const engagements = item.engagementTotal ?? ((item.likes ?? 0) + (item.comments ?? 0) + (item.shares ?? 0) + (item.saves ?? 0));
  return impressions > 0 ? engagements / impressions : 0;
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function platformLabel(value: string): string {
  return ({ instagram_feed: "Instagram Feed", instagram_story: "Instagram Story", x: "X", reddit: "Reddit", tiktok: "TikTok" } as Record<string, string>)[value] ?? value;
}

function shorten(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function redditUserAgent(): string {
  return process.env.REDDIT_USER_AGENT?.trim() || "web:ai-sports-prediction-marketing:v1.0 (by /u/configure-owner)";
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for marketing analytics.`);
  return value;
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? fallback);
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
