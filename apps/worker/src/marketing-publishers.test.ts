import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { publishInstagram, publishReddit, publishTikTok, publishX } from "./marketing-publishers";

const originalFetch = globalThis.fetch;

async function testXPublishingWithImage(): Promise<void> {
  process.env.X_USER_ACCESS_TOKEN = "test-x-token";
  const assetPath = `/tmp/marketing-publisher-${process.pid}.jpg`;
  await writeFile(assetPath, Buffer.from("fake-jpeg"));
  const requests: Array<{ url: string; body: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, body: String(init?.body ?? "") });
    return Response.json(url.endsWith("/media/upload")
      ? { data: { id: "media-1" } }
      : { data: { id: "post-1" } }, { status: url.endsWith("/media/upload") ? 200 : 201 });
  };

  const result = await publishX(makePost({ platform: "x", asset_path: assetPath }));
  assert.equal(result.providerPostId, "post-1");
  assert.equal(requests.length, 2);
  assert.match(requests[0]!.body, /tweet_image/u);
  assert.deepEqual(JSON.parse(requests[1]!.body), {
    text: "Test post",
    made_with_ai: true,
    media: { media_ids: ["media-1"] }
  });
}

async function testInstagramStoryPublishing(): Promise<void> {
  process.env.INSTAGRAM_ACCOUNT_ID = "ig-account";
  process.env.INSTAGRAM_ACCESS_TOKEN = "ig-token";
  process.env.INSTAGRAM_GRAPH_API_VERSION = "v23.0";
  const bodies: string[] = [];
  globalThis.fetch = async (_input, init) => {
    bodies.push(String(init?.body ?? ""));
    return Response.json({ id: bodies.length === 1 ? "container-1" : "media-1" });
  };

  const result = await publishInstagram(makePost({
    platform: "instagram_story",
    asset_url: "https://assets.example/story.jpg"
  }));
  assert.equal(result.providerPostId, "media-1");
  assert.match(bodies[0]!, /media_type=STORIES/u);
  assert.match(bodies[1]!, /creation_id=container-1/u);
}

async function testRedditPublishing(): Promise<void> {
  process.env.REDDIT_CLIENT_ID = "reddit-client";
  process.env.REDDIT_CLIENT_SECRET = "reddit-secret";
  process.env.REDDIT_REFRESH_TOKEN = "reddit-refresh";
  process.env.REDDIT_USER_AGENT = "test:marketing:v1 (by /u/test)";
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    return Response.json(url.includes("access_token")
      ? { access_token: "reddit-access" }
      : { json: { errors: [], data: { url: "https://reddit.com/r/sports/comments/abc" } } });
  };

  const result = await publishReddit(makePost({ platform: "reddit", target: "sports", title: "Test title" }));
  assert.equal(result.providerPostUrl, "https://reddit.com/r/sports/comments/abc");
  assert.equal(requests.length, 2);
}

async function testTikTokDraftUpload(): Promise<void> {
  process.env.TIKTOK_ACCESS_TOKEN = "tiktok-token";
  delete process.env.TIKTOK_POST_MODE;
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> });
    return Response.json({ data: { publish_id: "tiktok-publish-1" }, error: { code: "ok", message: "" } });
  };

  const result = await publishTikTok(makePost({
    platform: "tiktok",
    title: "Arsenal vs Liverpool",
    asset_url: "https://assets.example/tiktok.jpg"
  }));
  assert.equal(result.providerPostId, "tiktok-publish-1");
  assert.equal(requests.length, 1);
  assert.match(requests[0]!.url, /content\/init/u);
  assert.equal(requests[0]!.body.post_mode, "MEDIA_UPLOAD");
  assert.deepEqual(requests[0]!.body.source_info, {
    source: "PULL_FROM_URL",
    photo_cover_index: 0,
    photo_images: ["https://assets.example/tiktok.jpg"]
  });
}

function makePost(overrides: Record<string, unknown>) {
  return {
    id: "post-id",
    campaign_id: "campaign-id",
    platform: "x" as const,
    target: "owned-account",
    title: null,
    body: "Test post",
    asset_path: null,
    asset_url: null,
    status: "approved",
    ...overrides
  };
}

try {
  await testXPublishingWithImage();
  await testInstagramStoryPublishing();
  await testRedditPublishing();
  await testTikTokDraftUpload();
  console.log("Marketing publisher tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
