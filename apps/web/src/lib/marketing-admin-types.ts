import type { TikTokConnectionView } from "@ai-sports-prediction/tiktok";
import type { RedditConnectionView } from "@ai-sports-prediction/reddit";

export type MarketingAdminPostView = {
  id: string;
  platform: "instagram_feed" | "instagram_story" | "x" | "reddit" | "tiktok";
  target: string;
  title: string | null;
  body: string;
  assetUrl: string | null;
  status: string;
  approvedBy: string | null;
  approvedAtUtc: string | null;
  providerPostId: string | null;
  providerPostUrl: string | null;
  providerStatus: string | null;
  providerStatusUpdatedAtUtc: string | null;
  errorMessage: string | null;
  publishedAtUtc: string | null;
};

export type MarketingAdminCampaignView = {
  id: string;
  status: string;
  sport: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  predictedHome: number;
  predictedAway: number;
  confidence: number | null;
  createdAtUtc: string;
  posts: MarketingAdminPostView[];
};

export type MarketingAdminResponse = {
  ok: true;
  campaigns: MarketingAdminCampaignView[];
  instagramConfigured: boolean;
  instagramAccountLabel: string;
  tiktokConfigured: boolean;
  tiktokConnection: TikTokConnectionView | null;
  redditConfigured: boolean;
  redditConnection: RedditConnectionView | null;
  redditSubreddits: string[];
  generatedAtUtc: string;
};
