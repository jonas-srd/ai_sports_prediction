import assert from "node:assert/strict";
import test from "node:test";
import {
  createTikTokAuthorizationUrl,
  decryptTikTokToken,
  encryptTikTokToken,
  exchangeTikTokAuthorizationCode,
  fetchTikTokProfile,
  fetchTikTokPublishStatus,
  uploadTikTokPhotoDraft,
  type TikTokServerConfig
} from "./index";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");
const config: TikTokServerConfig = {
  clientKey: "client-key",
  clientSecret: "client-secret",
  redirectUri: "https://residualsports.com/api/tiktok/oauth/callback",
  tokenEncryptionKey: encryptionKey
};

test("encrypts TikTok tokens with randomized authenticated encryption", () => {
  const first = encryptTikTokToken("secret-token", encryptionKey);
  const second = encryptTikTokToken("secret-token", encryptionKey);
  assert.notEqual(first, second);
  assert.equal(decryptTikTokToken(first, encryptionKey), "secret-token");
  assert.equal(decryptTikTokToken(second, encryptionKey), "secret-token");
  assert.throws(() => decryptTikTokToken(`${first}tampered`, encryptionKey));
});

test("builds authorization URL with only required scopes", () => {
  const url = new URL(createTikTokAuthorizationUrl(config, "state-value"));
  assert.equal(url.origin, "https://www.tiktok.com");
  assert.equal(url.searchParams.get("client_key"), "client-key");
  assert.equal(url.searchParams.get("scope"), "user.info.basic,video.upload");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("redirect_uri"), config.redirectUri);
});

test("exchanges an authorization code without exposing tokens to callers other than the server", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return Response.json({
      open_id: "user-1",
      access_token: "access-1",
      refresh_token: "refresh-1",
      scope: "user.info.basic,video.upload",
      expires_in: 86400,
      refresh_expires_in: 31536000,
      token_type: "Bearer"
    });
  };
  try {
    const now = new Date("2026-08-11T12:00:00.000Z");
    const bundle = await exchangeTikTokAuthorizationCode("code-1", config, now);
    assert.equal(bundle.openId, "user-1");
    assert.equal(bundle.accessTokenExpiresAtUtc.toISOString(), "2026-08-12T12:00:00.000Z");
    assert.match(requestBody, /grant_type=authorization_code/u);
    assert.match(requestBody, /client_secret=client-secret/u);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads the authorized profile and uploads an editable photo draft", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({ url, body: String(init?.body ?? "") });
    if (url.includes("/user/info/")) {
      return Response.json({
        data: { user: { open_id: "user-1", display_name: "Residual Sports", avatar_url: "https://example.com/avatar.jpg" } },
        error: { code: "ok", message: "" }
      });
    }
    return Response.json({ data: { publish_id: "publish-1" }, error: { code: "ok", message: "" } });
  };
  try {
    const profile = await fetchTikTokProfile("access-1");
    assert.equal(profile.displayName, "Residual Sports");
    const upload = await uploadTikTokPhotoDraft("access-1", {
      title: "Arsenal vs Liverpool",
      description: "AI prediction, not a guarantee.",
      photoUrl: "https://residualsports.com/api/marketing-assets/draft.jpg"
    });
    assert.equal(upload.publishId, "publish-1");
    const body = JSON.parse(requests[1]!.body) as Record<string, unknown>;
    assert.equal(body.post_mode, "MEDIA_UPLOAD");
    assert.equal(body.media_type, "PHOTO");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("normalizes TikTok upload status", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    data: {
      status: "SEND_TO_USER_INBOX",
      fail_reason: "",
      publicaly_available_post_id: []
    },
    error: { code: "ok", message: "" }
  });
  try {
    const result = await fetchTikTokPublishStatus("access-1", "publish-1");
    assert.equal(result.status, "SEND_TO_USER_INBOX");
    assert.equal(result.failReason, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
