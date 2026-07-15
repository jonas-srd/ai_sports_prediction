import assert from "node:assert/strict";
import {
  buildFallbackRecommendations,
  parseInstagramMetrics,
  parseRedditMetrics,
  parseXMetrics,
  summarizeMarketingPerformance,
  type MarketingMetricSnapshot
} from "./marketing-performance-agent";

const instagram = parseInstagramMetrics({ data: [
  { name: "reach", values: [{ value: 1200 }] },
  { name: "views", values: [{ value: 1800 }] },
  { name: "likes", values: [{ value: 130 }] },
  { name: "comments", values: [{ value: 12 }] },
  { name: "shares", values: [{ value: 25 }] },
  { name: "saved", values: [{ value: 18 }] },
  { name: "total_interactions", values: [{ value: 185 }] }
] });
assert.equal(instagram.reach, 1200);
assert.equal(instagram.engagementTotal, 185);

const x = parseXMetrics({ data: {
  public_metrics: { impression_count: 2400, like_count: 80, reply_count: 10, retweet_count: 12, quote_count: 3, bookmark_count: 7 },
  non_public_metrics: { url_link_clicks: 96, engagements: 208 }
} });
assert.equal(x.clicks, 96);
assert.equal(x.shares, 15);

const reddit = parseRedditMetrics({ data: { children: [{ data: { ups: 44, num_comments: 16 } }] } });
assert.equal(reddit.engagementTotal, 60);
assert.equal(reddit.impressions, null);

const metrics: MarketingMetricSnapshot[] = [
  makeMetric("instagram_feed", instagram),
  makeMetric("x", x)
];
const summary = summarizeMarketingPerformance(metrics);
assert.equal(summary.postsMeasured, 2);
assert.equal(summary.impressions, 4200);
assert.equal(summary.clicks, 96);
assert.equal(summary.bestPlatform, "instagram_feed");
assert.ok(summary.engagementRate !== null && summary.engagementRate > 0);
assert.ok(buildFallbackRecommendations(summary, metrics).length >= 1);

type MetricValues = Pick<MarketingMetricSnapshot,
  "impressions" | "reach" | "clicks" | "likes" | "comments" | "shares" | "saves" | "engagementTotal">;

function makeMetric(platform: MarketingMetricSnapshot["platform"], values: MetricValues): MarketingMetricSnapshot {
  return {
    postId: `post-${platform}`,
    campaignId: "campaign-1",
    platform,
    title: null,
    body: "KI-Prognose für das nächste Spiel",
    publishedAtUtc: "2026-07-15T10:00:00.000Z",
    source: platform === "x" ? "x" : "instagram",
    rawMetrics: {},
    ...values
  };
}

console.log("Marketing performance agent tests passed.");
