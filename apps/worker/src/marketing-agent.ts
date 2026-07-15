/**
 * Purpose: Turns upcoming predictions into reviewable, platform-specific marketing campaigns.
 * The pipeline selects predictions, creates copy, renders branded JPEG assets, validates claims,
 * and stores drafts. Publishing is deliberately handled by a separate module.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { PostgresDb } from "@ai-sports-prediction/db";
import { OpenRouterClient } from "@ai-sports-prediction/llm";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

export type MarketingPlatform = "instagram_feed" | "instagram_story" | "x" | "reddit" | "tiktok";

export type MarketingPrediction = {
  predictionId: string;
  matchId: string;
  modelId: string;
  sport: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  utcDate: string;
  predictedHome: number;
  predictedAway: number;
  confidence: number;
  reason: string;
};

export type MarketingCopy = {
  instagramCaption: string;
  xText: string;
  redditTitle: string;
  redditBody: string;
  tiktokCaption: string;
  visualHook: string;
  hashtags: string[];
  modelId: string | null;
  providerResponseId: string | null;
};

export type MarketingGenerationResult = {
  selected: number;
  campaignsCreated: number;
  postsCreated: number;
  failed: number;
  campaignIds: string[];
};

type GeneratedAsset = {
  platform: "instagram_feed" | "instagram_story" | "social_landscape" | "tiktok_photo";
  path: string;
  url: string | null;
};

const CLAIM_DISCLOSURE = "AI prediction, not a guarantee.";
const BLOCKED_CLAIMS = [
  /garantiert(?:er|e|es)?\s+(?:gewinn|sieg|treffer)/iu,
  /sicher(?:er|e|es)?\s+(?:gewinn|sieg|tipp)/iu,
  /risikofrei/iu,
  /100\s*%\s*sicher/iu,
  /(?:bet|wette)\s+(?:now|jetzt)/iu,
  /free\s+money/iu
];

export async function runMarketingCampaignGeneration(
  db: PostgresDb
): Promise<MarketingGenerationResult> {
  const limit = boundedInteger(process.env.MARKETING_MAX_CAMPAIGNS_PER_RUN, 5, 1, 50);
  const candidates = await selectMarketingPredictions(db, limit);
  const result: MarketingGenerationResult = {
    selected: candidates.length,
    campaignsCreated: 0,
    postsCreated: 0,
    failed: 0,
    campaignIds: []
  };

  for (const prediction of candidates) {
    try {
      const generatedCopy = await createMarketingCopy(prediction);
      const generatedValidation = validateMarketingCopy(generatedCopy);
      const copy = generatedValidation.ok ? generatedCopy : createFallbackMarketingCopy(prediction);
      const validation = validateMarketingCopy(copy);
      if (!validation.ok) {
        throw new Error(`Marketing compliance rejected the draft: ${validation.errors.join(" ")}`);
      }

      const campaignId = randomUUID();
      const assets = await renderMarketingAssets(campaignId, prediction, copy.visualHook);
      const posts = buildMarketingPosts(campaignId, prediction, copy, assets);

      const client = await db.connect();
      try {
        await client.query("begin");
        const inserted = await client.query(
          `
            insert into marketing_campaigns (
              id, prediction_id, match_id, campaign_data, model_id, provider_response_id
            ) values ($1, $2, $3, $4::jsonb, $5, $6)
            on conflict (prediction_id) do nothing
            returning id
          `,
          [
            campaignId,
            prediction.predictionId,
            prediction.matchId,
            JSON.stringify({ prediction, visualHook: copy.visualHook, hashtags: copy.hashtags }),
            copy.modelId,
            copy.providerResponseId
          ]
        );

        if (!inserted.rowCount) {
          await client.query("rollback");
          continue;
        }

        for (const post of posts) {
          await client.query(
            `
              insert into marketing_posts (
                id, campaign_id, platform, target, title, body, asset_path, asset_url
              ) values ($1, $2, $3, $4, $5, $6, $7, $8)
            `,
            [
              randomUUID(),
              campaignId,
              post.platform,
              post.target,
              post.title,
              post.body,
              post.assetPath,
              post.assetUrl
            ]
          );
        }

        await client.query("commit");
        result.campaignsCreated += 1;
        result.postsCreated += posts.length;
        result.campaignIds.push(campaignId);
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      result.failed += 1;
      console.error(`Marketing campaign generation failed for ${prediction.matchId}:`, error);
    }
  }

  return result;
}

export async function selectMarketingPredictions(
  db: PostgresDb,
  limit: number
): Promise<MarketingPrediction[]> {
  const lookaheadDays = boundedInteger(process.env.MARKETING_LOOKAHEAD_DAYS, 3, 1, 30);
  const minimumConfidence = boundedNumber(process.env.MARKETING_MIN_CONFIDENCE, 55, 0, 100);
  const query = await db.query<{
    prediction_id: string;
    match_id: string;
    model_id: string;
    sport: string | null;
    competition: string;
    home_team: string;
    away_team: string;
    utc_date: Date | string;
    predicted_home: number;
    predicted_away: number;
    confidence: number | null;
    reason: string | null;
  }>(
    `
      select
        p.id as prediction_id,
        p.match_id,
        p.model_id,
        m.sport,
        m.competition,
        m.home_team,
        m.away_team,
        m.utc_date,
        p.predicted_home,
        p.predicted_away,
        p.confidence,
        p.reason
      from predictions p
      join matches m on m.id = p.match_id
      where m.utc_date >= now()
        and m.utc_date <= now() + ($1::text || ' days')::interval
        and upper(coalesce(m.status, 'SCHEDULED')) not in ('FINISHED', 'FT', 'CANCELLED', 'CANCELED', 'POSTPONED')
        and not exists (
          select 1 from marketing_campaigns c where c.prediction_id = p.id
        )
      order by coalesce(p.confidence, 0) desc, m.utc_date asc
      limit $2
    `,
    [lookaheadDays, Math.max(limit * 4, limit)]
  );

  return query.rows
    .map((row) => ({
      predictionId: row.prediction_id,
      matchId: row.match_id,
      modelId: row.model_id,
      sport: row.sport?.trim() || "sport",
      competition: row.competition,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      utcDate: new Date(row.utc_date).toISOString(),
      predictedHome: Number(row.predicted_home),
      predictedAway: Number(row.predicted_away),
      confidence: normalizeConfidence(row.confidence),
      reason: row.reason?.trim() || "Form, matchup, and current competition context."
    }))
    .filter((prediction) => prediction.confidence >= minimumConfidence)
    .slice(0, limit);
}

export async function createMarketingCopy(prediction: MarketingPrediction): Promise<MarketingCopy> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const modelId = process.env.MARKETING_OPENROUTER_MODEL?.trim()
    || process.env.OPENROUTER_TEST_MODEL?.trim()
    || "openai/gpt-oss-20b:free";

  if (!apiKey) {
    return createFallbackMarketingCopy(prediction);
  }

  const client = new OpenRouterClient({
    apiKey,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME
  });

  try {
    const response = await client.createChatCompletion(modelId, buildCopyPrompt(prediction), {
      temperature: 0.35,
      maxTokens: 1200,
      responseFormat: { type: "json_object" }
    });
    const parsed = parseMarketingCopy(response.content, prediction);
    return {
      ...parsed,
      modelId,
      providerResponseId: response.responseId
    };
  } catch (error) {
    console.warn("Marketing copy model failed; using the deterministic fallback:", error);
    return createFallbackMarketingCopy(prediction);
  }
}

export function parseMarketingCopy(raw: string, prediction: MarketingPrediction): MarketingCopy {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  const value = JSON.parse(cleaned) as Record<string, unknown>;
  const fallback = createFallbackMarketingCopy(prediction);
  const hashtags = Array.isArray(value.hashtags)
    ? value.hashtags.filter((item): item is string => typeof item === "string")
    : fallback.hashtags;

  return finalizeCopy({
    instagramCaption: readText(value.instagramCaption, fallback.instagramCaption),
    xText: readText(value.xText, fallback.xText),
    redditTitle: readText(value.redditTitle, fallback.redditTitle),
    redditBody: readText(value.redditBody, fallback.redditBody),
    tiktokCaption: readText(value.tiktokCaption, fallback.tiktokCaption),
    visualHook: readText(value.visualHook, fallback.visualHook),
    hashtags,
    modelId: null,
    providerResponseId: null
  });
}

export function createFallbackMarketingCopy(prediction: MarketingPrediction): MarketingCopy {
  const winner = getPredictionWinner(prediction);
  const score = `${prediction.predictedHome}:${prediction.predictedAway}`;
  const date = formatMatchDate(prediction.utcDate);
  const hashtags = normalizeHashtags([
    "AISportsPrediction",
    prediction.sport,
    prediction.competition.replace(/[^\p{L}\p{N}]+/gu, "")
  ]);
  const tagLine = hashtags.map((tag) => `#${tag}`).join(" ");

  return finalizeCopy({
    instagramCaption: [
      `Our AI prediction for ${prediction.homeTeam} vs ${prediction.awayTeam}: ${score}.`,
      `Model pick: ${winner} · Confidence: ${Math.round(prediction.confidence)}%.`,
      "The model weighs form, matchup context, and the available competition data.",
      `Kick-off: ${date}.`,
      CLAIM_DISCLOSURE,
      tagLine
    ].join("\n\n"),
    xText: `AI match prediction: ${prediction.homeTeam} – ${prediction.awayTeam} ${score}. Pick: ${winner}, confidence ${Math.round(prediction.confidence)}%. ${CLAIM_DISCLOSURE} ${tagLine}`,
    redditTitle: `AI prediction: ${prediction.homeTeam} vs ${prediction.awayTeam} (${score})`,
    redditBody: [
      `For ${prediction.competition}, our model predicts ${score}, giving **${winner}** the edge.`,
      `Confidence: **${Math.round(prediction.confidence)}%**`,
      "The model weighs form, matchup context, and the available competition data.",
      `Kick-off: ${date}`,
      CLAIM_DISCLOSURE,
      "How do you see this matchup playing out?"
    ].join("\n\n"),
    tiktokCaption: [
      `${prediction.homeTeam} vs ${prediction.awayTeam}: our model predicts ${score}.`,
      `Pick: ${winner} · Confidence: ${Math.round(prediction.confidence)}%.`,
      CLAIM_DISCLOSURE,
      tagLine
    ].join("\n\n"),
    visualHook: `${winner} with ${Math.round(prediction.confidence)}% model confidence`,
    hashtags,
    modelId: null,
    providerResponseId: null
  });
}

export function validateMarketingCopy(copy: MarketingCopy): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const combined = [copy.instagramCaption, copy.xText, copy.redditTitle, copy.redditBody, copy.tiktokCaption, copy.visualHook].join(" ");
  if (BLOCKED_CLAIMS.some((pattern) => pattern.test(combined))) {
    errors.push("The draft contains a guaranteed, risk-free, or direct betting claim.");
  }
  if (!copy.instagramCaption.includes(CLAIM_DISCLOSURE)
    || !copy.xText.includes(CLAIM_DISCLOSURE)
    || !copy.tiktokCaption.includes(CLAIM_DISCLOSURE)) {
    errors.push("Instagram, X, and TikTok must include the AI prediction disclosure.");
  }
  if (Array.from(copy.xText).length > 280) {
    errors.push("The X post exceeds 280 characters.");
  }
  if (Array.from(copy.instagramCaption).length > 2200) {
    errors.push("The Instagram caption exceeds 2,200 characters.");
  }
  if (Array.from(copy.tiktokCaption).length > 4000) {
    errors.push("The TikTok caption exceeds 4,000 characters.");
  }
  if (Array.from(copy.redditTitle).length > 300) {
    errors.push("The Reddit title exceeds 300 characters.");
  }
  return { ok: errors.length === 0, errors };
}

export async function renderMarketingAssets(
  campaignId: string,
  prediction: MarketingPrediction,
  visualHook: string
): Promise<GeneratedAsset[]> {
  const configuredDir = process.env.MARKETING_ASSET_DIR?.trim() || "exports/marketing-assets";
  const assetDir = resolve(process.cwd(), configuredDir);
  const baseUrl = process.env.MARKETING_PUBLIC_ASSET_BASE_URL?.trim().replace(/\/$/u, "") || null;
  await mkdir(assetDir, { recursive: true });

  const formats = [
    { platform: "instagram_feed" as const, width: 1080, height: 1080 },
    { platform: "instagram_story" as const, width: 1080, height: 1920 },
    { platform: "social_landscape" as const, width: 1200, height: 675 },
    { platform: "tiktok_photo" as const, width: 1080, height: 1350, tiktokClean: true }
  ];

  return Promise.all(formats.map(async (format) => {
    const fileName = `${campaignId}-${format.platform}.jpg`;
    const path = resolve(assetDir, fileName);
    const svg = renderPredictionSvg(prediction, visualHook, format.width, format.height, {
      tiktokClean: format.tiktokClean ?? false
    });
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
    await writeFile(path, jpeg);
    await uploadMarketingAsset(fileName, jpeg);
    return {
      platform: format.platform,
      path,
      url: baseUrl ? `${baseUrl}/${encodeURIComponent(fileName)}` : null
    };
  }));
}

async function uploadMarketingAsset(fileName: string, bytes: Buffer): Promise<void> {
  const bucket = process.env.MARKETING_ASSET_S3_BUCKET?.trim();
  if (!bucket) return;

  const prefix = (process.env.MARKETING_ASSET_S3_PREFIX?.trim() || "marketing-assets")
    .replace(/^\/+|\/+$/gu, "");
  const endpoint = process.env.MARKETING_ASSET_S3_ENDPOINT?.trim();
  const client = new S3Client({
    region: process.env.MARKETING_ASSET_S3_REGION?.trim() || "eu-central-1",
    ...(endpoint ? { endpoint } : {}),
    forcePathStyle: ["1", "true", "yes"].includes(
      (process.env.MARKETING_ASSET_S3_FORCE_PATH_STYLE ?? "").trim().toLowerCase()
    )
  });
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `${prefix}/${fileName}`,
      Body: bytes,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable"
    }));
  } finally {
    client.destroy();
  }
}

export function renderPredictionSvg(
  prediction: MarketingPrediction,
  visualHook: string,
  width: number,
  height: number,
  options: { tiktokClean?: boolean } = {}
): string {
  const compact = height < 900;
  const story = height > width * 1.3;
  const pad = Math.round(Math.min(width, height) * 0.075);
  const headingY = compact ? 70 : Math.round(height * 0.12);
  const teamsY = compact ? 220 : Math.round(height * (story ? 0.30 : 0.32));
  const scoreY = compact ? 440 : Math.round(height * (story ? 0.47 : 0.62));
  const hookY = compact ? 525 : Math.round(height * (story ? 0.62 : 0.76));
  const footerY = height - pad - 24;
  const scoreSize = compact ? 98 : Math.round(width * 0.15);
  const teamSize = compact ? 43 : Math.round(width * 0.048);
  const winner = getPredictionWinner(prediction);
  const tiktokClean = options.tiktokClean === true;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#061b21"/>
          <stop offset="1" stop-color="#102131"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.8" cy="0.15" r="0.8">
          <stop offset="0" stop-color="#5ff1c0" stop-opacity="0.25"/>
          <stop offset="1" stop-color="#5ff1c0" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect width="${width}" height="${height}" fill="url(#glow)"/>
      <rect x="${pad}" y="${pad}" width="${width - 2 * pad}" height="${height - 2 * pad}" rx="32" fill="none" stroke="#5ff1c0" stroke-opacity="0.42" stroke-width="3"/>
      <text x="${pad + 34}" y="${headingY}" fill="#5ff1c0" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 24 : 30}" font-weight="800" letter-spacing="5">${tiktokClean ? "MODEL MATCH PREVIEW" : "AI SPORTS PREDICTION"}</text>
      <text x="${pad + 34}" y="${headingY + (compact ? 42 : 54)}" fill="#ffca5c" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 19 : 24}" font-weight="700" letter-spacing="3">${escapeXml(prediction.competition.toUpperCase())}</text>
      <text x="${width / 2}" y="${teamsY}" text-anchor="middle" fill="#f4f8fb" font-family="Arial, Helvetica, sans-serif" font-size="${teamSize}" font-weight="800">${escapeXml(shorten(prediction.homeTeam, 25))}</text>
      <text x="${width / 2}" y="${teamsY + Math.round(teamSize * 1.45)}" text-anchor="middle" fill="#9babb5" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(teamSize * 0.58)}" font-weight="700">VS</text>
      <text x="${width / 2}" y="${teamsY + Math.round(teamSize * 2.55)}" text-anchor="middle" fill="#f4f8fb" font-family="Arial, Helvetica, sans-serif" font-size="${teamSize}" font-weight="800">${escapeXml(shorten(prediction.awayTeam, 25))}</text>
      <text x="${width / 2}" y="${scoreY}" text-anchor="middle" fill="#ffca5c" font-family="Arial, Helvetica, sans-serif" font-size="${scoreSize}" font-weight="900">${prediction.predictedHome}:${prediction.predictedAway}</text>
      <text x="${width / 2}" y="${hookY}" text-anchor="middle" fill="#f4f8fb" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 30 : 38}" font-weight="700">${escapeXml(shorten(visualHook, compact ? 52 : 42))}</text>
      ${compact ? "" : `<rect x="${width / 2 - 175}" y="${hookY + 60}" width="350" height="58" rx="29" fill="#5ff1c0" fill-opacity="0.14" stroke="#5ff1c0" stroke-opacity="0.55"/>
      <text x="${width / 2}" y="${hookY + 99}" text-anchor="middle" fill="#5ff1c0" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="800">PICK: ${escapeXml(shorten(winner.toUpperCase(), 24))}</text>`}
      ${story && !tiktokClean ? `<text x="${width / 2}" y="${Math.round(height * 0.82)}" text-anchor="middle" fill="#ffca5c" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="800" letter-spacing="2">MORE AI PREDICTIONS ON OUR WEBSITE</text>` : ""}
      <text x="${pad + 34}" y="${footerY}" fill="#9babb5" font-family="Arial, Helvetica, sans-serif" font-size="${compact ? 18 : 22}" font-weight="600">${escapeXml(formatMatchDate(prediction.utcDate))} · AI prediction, not a guarantee</text>
    </svg>
  `.trim();
}

function buildMarketingPosts(
  campaignId: string,
  prediction: MarketingPrediction,
  copy: MarketingCopy,
  assets: GeneratedAsset[]
) {
  const findAsset = (platform: GeneratedAsset["platform"]) => assets.find((asset) => asset.platform === platform);
  const feed = findAsset("instagram_feed");
  const story = findAsset("instagram_story");
  const landscape = findAsset("social_landscape");
  const tiktokPhoto = findAsset("tiktok_photo");
  const websiteUrl = process.env.MARKETING_PREDICTION_URL?.trim() || "https://www.ai-sports-prediction.net";
  const posts: Array<{
    campaignId: string;
    platform: MarketingPlatform;
    target: string;
    title: string | null;
    body: string;
    assetPath: string | null;
    assetUrl: string | null;
  }> = [
    { campaignId, platform: "instagram_feed", target: "owned-account", title: null, body: copy.instagramCaption, assetPath: feed?.path ?? null, assetUrl: feed?.url ?? null },
    { campaignId, platform: "instagram_story", target: "owned-account", title: null, body: `${prediction.homeTeam} vs. ${prediction.awayTeam} · ${websiteUrl}`, assetPath: story?.path ?? null, assetUrl: story?.url ?? null },
    { campaignId, platform: "x", target: "owned-account", title: null, body: copy.xText, assetPath: landscape?.path ?? null, assetUrl: landscape?.url ?? null },
    { campaignId, platform: "tiktok", target: "owned-account:draft", title: `${prediction.homeTeam} vs ${prediction.awayTeam}`, body: copy.tiktokCaption, assetPath: tiktokPhoto?.path ?? null, assetUrl: tiktokPhoto?.url ?? null }
  ];

  for (const subreddit of parseSubredditAllowlist(process.env.MARKETING_REDDIT_SUBREDDITS)) {
    posts.push({
      campaignId,
      platform: "reddit",
      target: subreddit,
      title: copy.redditTitle,
      body: copy.redditBody,
      assetPath: landscape?.path ?? null,
      assetUrl: landscape?.url ?? null
    });
  }

  return posts;
}

function buildCopyPrompt(prediction: MarketingPrediction): string {
  return `You are the social copy agent for AI Sports Prediction. Create factual social posts in English for this model prediction. Every generated field must be English, even if the source reason is in another language.

Facts:
- Sport: ${prediction.sport}
- Competition: ${prediction.competition}
- Match: ${prediction.homeTeam} vs ${prediction.awayTeam}
- Start UTC: ${prediction.utcDate}
- Predicted score: ${prediction.predictedHome}:${prediction.predictedAway}
- Model confidence: ${Math.round(prediction.confidence)}%
- Source model reason: ${prediction.reason}

Rules:
- Do not invent facts, injuries, odds, or statistics.
- No betting call to action and no win or accuracy guarantee.
- Instagram, X, and TikTok must contain the exact disclosure "${CLAIM_DISCLOSURE}".
- X maximum 280 characters, Instagram maximum 2,200, TikTok maximum 4,000, Reddit title maximum 300.
- Reddit must contain a genuine discussion question and must not read like an advertisement.
- Transparently describe the content as an AI/model prediction.
- Return only one JSON object with: instagramCaption, xText, redditTitle, redditBody, tiktokCaption, visualHook, hashtags (array without #).`;
}

function finalizeCopy(copy: MarketingCopy): MarketingCopy {
  const hashtags = normalizeHashtags(copy.hashtags);
  const instagramCaption = truncate(copy.instagramCaption.trim(), 2200);
  const redditTitle = truncate(copy.redditTitle.trim(), 300);
  const redditBody = truncate(copy.redditBody.trim(), 10_000);
  const tiktokCaption = truncateKeepingDisclosure(copy.tiktokCaption.trim(), 4000);
  const visualHook = truncate(copy.visualHook.trim(), 90);
  const xText = truncateKeepingDisclosure(copy.xText.trim(), 280);
  return { ...copy, instagramCaption, xText, redditTitle, redditBody, tiktokCaption, visualHook, hashtags };
}

function truncateKeepingDisclosure(value: string, max: number): string {
  if (Array.from(value).length <= max) {
    return value;
  }
  const withoutDisclosure = value.replace(CLAIM_DISCLOSURE, "").replace(/\s+/gu, " ").trim();
  const available = max - Array.from(`… ${CLAIM_DISCLOSURE}`).length;
  return `${truncate(withoutDisclosure, available)} ${CLAIM_DISCLOSURE}`;
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value);
  if (chars.length <= max) {
    return value;
  }
  return `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}

function normalizeHashtags(values: string[]): string[] {
  return [...new Set(values
    .map((value) => value.replace(/^#+/u, "").replace(/[^\p{L}\p{N}_]/gu, "").trim())
    .filter(Boolean))]
    .slice(0, 8);
}

export function parseSubredditAllowlist(value: string | undefined): string[] {
  return [...new Set((value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/^r\//iu, ""))
    .filter((item) => /^[A-Za-z0-9_]{2,21}$/u.test(item)))];
}

function getPredictionWinner(prediction: MarketingPrediction): string {
  if (prediction.predictedHome > prediction.predictedAway) return prediction.homeTeam;
  if (prediction.predictedAway > prediction.predictedHome) return prediction.awayTeam;
  return "Draw";
}

function normalizeConfidence(value: number | null): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric));
}

function formatMatchDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.MARKETING_TIMEZONE?.trim() || "Europe/Berlin"
  }).format(new Date(value));
}

function shorten(value: string, max: number): string {
  return truncate(value.replace(/\s+/gu, " ").trim(), max);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");
}

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? fallback);
  return Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function boundedNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  const value = Number(raw ?? fallback);
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
