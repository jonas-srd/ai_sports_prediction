import assert from "node:assert/strict";
import sharp from "sharp";
import type { PostgresDb } from "@ai-sports-prediction/db";
import {
  createFallbackMarketingCopy,
  parseMarketingCopy,
  parseSubredditAllowlist,
  renderMarketingAssets,
  renderPredictionSvg,
  selectMarketingPredictions,
  validateMarketingCopy,
  type MarketingPrediction
} from "./marketing-agent";

const prediction: MarketingPrediction = {
  predictionId: "prediction-1",
  matchId: "match-1",
  modelId: "openrouter:test",
  sport: "football",
  competition: "FA Cup",
  homeTeam: "Arsenal & Friends",
  awayTeam: "Liverpool <FC>",
  utcDate: "2026-07-20T18:00:00.000Z",
  predictedHome: 2,
  predictedAway: 1,
  confidence: 68,
  reason: "Das Modell gewichtet Form und Heimvorteil."
};

function testFallbackCompliance(): void {
  const copy = createFallbackMarketingCopy(prediction);
  const validation = validateMarketingCopy(copy);
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.ok(Array.from(copy.xText).length <= 280);
  assert.match(copy.instagramCaption, /AI prediction, not a guarantee\./u);
  assert.match(copy.tiktokCaption, /AI prediction, not a guarantee\./u);
  assert.doesNotMatch(copy.instagramCaption, /Unsere|Konfidenz|Anstoß/u);
}

function testAiCopyParsingAndLimits(): void {
  const raw = JSON.stringify({
    instagramCaption: `A model view of the match. AI prediction, not a guarantee. ${"x".repeat(2300)}`,
    xText: `${"Very long text ".repeat(40)} AI prediction, not a guarantee.`,
    redditTitle: "Discuss the model prediction",
    redditBody: "How do you rate this prediction?",
    tiktokCaption: `${"Long TikTok copy ".repeat(300)} AI prediction, not a guarantee.`,
    visualHook: "Arsenal with the model edge",
    hashtags: ["#Residual Sports", "football", "football"]
  });
  const parsed = parseMarketingCopy(raw, prediction);
  assert.ok(Array.from(parsed.instagramCaption).length <= 2200);
  assert.ok(Array.from(parsed.xText).length <= 280);
  assert.match(parsed.xText, /AI prediction, not a guarantee\.$/u);
  assert.ok(Array.from(parsed.tiktokCaption).length <= 4000);
  assert.match(parsed.tiktokCaption, /AI prediction, not a guarantee\.$/u);
  assert.deepEqual(parsed.hashtags, ["ResidualSports", "football"]);
}

function testBlockedClaims(): void {
  const copy = createFallbackMarketingCopy(prediction);
  copy.redditBody += " Das ist ein garantierter Gewinn.";
  assert.equal(validateMarketingCopy(copy).ok, false);
}

function testSvgEscaping(): void {
  const svg = renderPredictionSvg(prediction, "Modell < Vorteil", 1080, 1080);
  assert.match(svg, /Arsenal &amp; Friends/u);
  assert.match(svg, /Liverpool &lt;FC&gt;/u);
  assert.doesNotMatch(svg, /Liverpool <FC>/u);
}

function testSubredditAllowlist(): void {
  assert.deepEqual(parseSubredditAllowlist("r/soccer, sports,not-valid!,soccer"), ["soccer", "sports"]);
}

async function testRenderedJpegs(): Promise<void> {
  process.env.MARKETING_ASSET_DIR = `/tmp/residual-sports-marketing-test-${process.pid}`;
  delete process.env.MARKETING_ASSET_S3_BUCKET;
  const assets = await renderMarketingAssets("campaign-test", prediction, "Arsenal with 68% model confidence");
  assert.equal(assets.length, 4);
  const metadata = await Promise.all(assets.map((asset) => sharp(asset.path).metadata()));
  assert.deepEqual(metadata.map((item) => [item.width, item.height]), [
    [1080, 1080],
    [1080, 1920],
    [1200, 675],
    [1080, 1350]
  ]);
  assert.ok(metadata.every((item) => item.format === "jpeg"));
}

async function testManualSevenDaySelection(): Promise<void> {
  let sql = "";
  let parameters: unknown[] = [];
  const db = {
    query: async (statement: string, values: unknown[]) => {
      sql = statement;
      parameters = values;
      return { rows: [] };
    }
  } as unknown as PostgresDb;
  assert.deepEqual(await selectMarketingPredictions(db, 3, 7), []);
  assert.deepEqual(parameters, [7, 12]);
  assert.match(sql, /partition by p\.match_id/u);
  assert.match(sql, /where c\.match_id = p\.match_id/u);
  assert.match(sql, /when 'nexus' then 0/u);
}

testFallbackCompliance();
testAiCopyParsingAndLimits();
testBlockedClaims();
testSvgEscaping();
testSubredditAllowlist();
await testRenderedJpegs();
await testManualSevenDaySelection();
console.log("Marketing agent tests passed.");
