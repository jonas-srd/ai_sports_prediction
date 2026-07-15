import assert from "node:assert/strict";
import sharp from "sharp";
import {
  createFallbackMarketingCopy,
  parseMarketingCopy,
  parseSubredditAllowlist,
  renderMarketingAssets,
  renderPredictionSvg,
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
    hashtags: ["#AI Sports", "football", "football"]
  });
  const parsed = parseMarketingCopy(raw, prediction);
  assert.ok(Array.from(parsed.instagramCaption).length <= 2200);
  assert.ok(Array.from(parsed.xText).length <= 280);
  assert.match(parsed.xText, /AI prediction, not a guarantee\.$/u);
  assert.ok(Array.from(parsed.tiktokCaption).length <= 4000);
  assert.match(parsed.tiktokCaption, /AI prediction, not a guarantee\.$/u);
  assert.deepEqual(parsed.hashtags, ["AISports", "football"]);
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
  process.env.MARKETING_ASSET_DIR = `/tmp/ai-sports-marketing-test-${process.pid}`;
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

testFallbackCompliance();
testAiCopyParsingAndLimits();
testBlockedClaims();
testSvgEscaping();
testSubredditAllowlist();
await testRenderedJpegs();
console.log("Marketing agent tests passed.");
