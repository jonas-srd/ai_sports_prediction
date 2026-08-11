/**
 * Purpose: Server-only TikTok OAuth, encrypted connection storage, token refresh,
 * editable draft upload, and upload-status polling for the owned Residual Sports account.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID
} from "node:crypto";
import type { PostgresDb } from "@ai-sports-prediction/db";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/";
const USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url";
const CONTENT_INIT_URL = "https://open.tiktokapis.com/v2/post/publish/content/init/";
const STATUS_URL = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";
const REQUIRED_SCOPES = ["user.info.basic", "video.upload"] as const;

export type TikTokServerConfig = {
  clientKey: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
};

export type TikTokTokenBundle = {
  openId: string;
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  accessTokenExpiresAtUtc: Date;
  refreshTokenExpiresAtUtc: Date;
};

export type TikTokProfile = {
  openId: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type TikTokConnectionView = {
  id: string;
  providerUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  scopes: string[];
  status: "connected" | "refresh_failed" | "disconnected";
  accessTokenExpiresAtUtc: string;
  refreshTokenExpiresAtUtc: string;
  connectedAtUtc: string;
  updatedAtUtc: string;
  lastError: string | null;
};

type TikTokConnectionRow = {
  id: string;
  provider_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  scopes: string[] | null;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  access_token_expires_at_utc: Date | string;
  refresh_token_expires_at_utc: Date | string;
  status: "connected" | "refresh_failed" | "disconnected";
  connected_at_utc: Date | string;
  updated_at_utc: Date | string;
  last_error: string | null;
};

export type TikTokDraftInput = {
  title: string;
  description: string;
  photoUrl: string;
};

export type TikTokPublishStatus = {
  status: string;
  failReason: string | null;
  publicPostIds: string[];
  raw: Record<string, unknown>;
};

export function readTikTokServerConfig(
  environment: NodeJS.ProcessEnv = process.env
): TikTokServerConfig {
  const publicSiteUrl = (environment.PUBLIC_SITE_URL
    ?? environment.NEXT_PUBLIC_SITE_URL
    ?? "https://residualsports.com").replace(/\/$/u, "");
  return {
    clientKey: requireValue(environment.TIKTOK_CLIENT_KEY, "TIKTOK_CLIENT_KEY"),
    clientSecret: requireValue(environment.TIKTOK_CLIENT_SECRET, "TIKTOK_CLIENT_SECRET"),
    redirectUri: environment.TIKTOK_REDIRECT_URI?.trim()
      || `${publicSiteUrl}/api/tiktok/oauth/callback`,
    tokenEncryptionKey: requireValue(
      environment.TIKTOK_TOKEN_ENCRYPTION_KEY,
      "TIKTOK_TOKEN_ENCRYPTION_KEY"
    )
  };
}

export function isTikTokServerConfigured(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  try {
    readTikTokServerConfig(environment);
    return true;
  } catch {
    return false;
  }
}

export function createTikTokAuthorizationUrl(
  config: Pick<TikTokServerConfig, "clientKey" | "redirectUri">,
  state: string
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_key", config.clientKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", REQUIRED_SCOPES.join(","));
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeTikTokAuthorizationCode(
  code: string,
  config: TikTokServerConfig,
  now = new Date()
): Promise<TikTokTokenBundle> {
  const response = await fetchTikTokJson(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri
    })
  });
  return parseTokenBundle(response, now);
}

export async function fetchTikTokProfile(accessToken: string): Promise<TikTokProfile> {
  const payload = await fetchTikTokJson(USER_INFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  assertTikTokSuccess(payload, "TikTok profile");
  const user = isRecord(payload.data) && isRecord(payload.data.user)
    ? payload.data.user
    : null;
  const openId = readString(user?.open_id);
  if (!openId) throw new Error("TikTok profile response did not contain open_id.");
  return {
    openId,
    displayName: readString(user?.display_name),
    avatarUrl: readString(user?.avatar_url)
  };
}

export async function saveTikTokConnection(
  db: PostgresDb,
  config: TikTokServerConfig,
  tokenBundle: TikTokTokenBundle,
  profile: TikTokProfile,
  connectedBy: string
): Promise<TikTokConnectionView> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      `
        update social_connections
        set status = 'disconnected', disconnected_at_utc = now(), updated_at_utc = now()
        where provider = 'tiktok'
          and status in ('connected', 'refresh_failed')
          and provider_user_id <> $1
      `,
      [tokenBundle.openId]
    );
    const result = await client.query<TikTokConnectionRow>(
      `
        insert into social_connections (
          id, provider, provider_user_id, display_name, avatar_url, scopes,
          encrypted_access_token, encrypted_refresh_token,
          access_token_expires_at_utc, refresh_token_expires_at_utc,
          status, connected_by, last_error, connected_at_utc,
          disconnected_at_utc, updated_at_utc
        ) values (
          $1, 'tiktok', $2, $3, $4, $5::text[], $6, $7, $8, $9,
          'connected', $10, null, now(), null, now()
        )
        on conflict (provider, provider_user_id) do update set
          display_name = excluded.display_name,
          avatar_url = excluded.avatar_url,
          scopes = excluded.scopes,
          encrypted_access_token = excluded.encrypted_access_token,
          encrypted_refresh_token = excluded.encrypted_refresh_token,
          access_token_expires_at_utc = excluded.access_token_expires_at_utc,
          refresh_token_expires_at_utc = excluded.refresh_token_expires_at_utc,
          status = 'connected',
          connected_by = excluded.connected_by,
          last_error = null,
          connected_at_utc = now(),
          disconnected_at_utc = null,
          updated_at_utc = now()
        returning *
      `,
      [
        randomUUID(),
        tokenBundle.openId,
        profile.displayName,
        profile.avatarUrl,
        tokenBundle.scopes,
        encryptTikTokToken(tokenBundle.accessToken, config.tokenEncryptionKey),
        encryptTikTokToken(tokenBundle.refreshToken, config.tokenEncryptionKey),
        tokenBundle.accessTokenExpiresAtUtc,
        tokenBundle.refreshTokenExpiresAtUtc,
        connectedBy.trim() || null
      ]
    );
    await client.query("commit");
    return toConnectionView(result.rows[0]!);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getTikTokConnection(
  db: PostgresDb
): Promise<TikTokConnectionView | null> {
  const result = await db.query<TikTokConnectionRow>(
    `
      select * from social_connections
      where provider = 'tiktok' and status in ('connected', 'refresh_failed')
      order by case status when 'connected' then 0 else 1 end, updated_at_utc desc
      limit 1
    `
  );
  return result.rows[0] ? toConnectionView(result.rows[0]) : null;
}

export async function getValidTikTokAccessToken(
  db: PostgresDb,
  config: TikTokServerConfig,
  now = new Date()
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<TikTokConnectionRow>(
      `
        select * from social_connections
        where provider = 'tiktok' and status = 'connected'
        order by updated_at_utc desc
        limit 1
        for update
      `
    );
    const connection = selected.rows[0];
    if (!connection) throw new Error("No connected TikTok account was found.");

    const accessExpiry = new Date(connection.access_token_expires_at_utc);
    if (accessExpiry.getTime() > now.getTime() + 5 * 60_000) {
      const token = decryptTikTokToken(
        connection.encrypted_access_token,
        config.tokenEncryptionKey
      );
      await client.query("commit");
      return token;
    }

    if (new Date(connection.refresh_token_expires_at_utc).getTime() <= now.getTime()) {
      throw new Error("TikTok refresh token has expired. Reconnect the account.");
    }

    const refreshed = await refreshTikTokToken(
      decryptTikTokToken(connection.encrypted_refresh_token, config.tokenEncryptionKey),
      config,
      now
    );
    await client.query(
      `
        update social_connections set
          provider_user_id = $2,
          scopes = $3::text[],
          encrypted_access_token = $4,
          encrypted_refresh_token = $5,
          access_token_expires_at_utc = $6,
          refresh_token_expires_at_utc = $7,
          status = 'connected',
          last_error = null,
          updated_at_utc = now()
        where id = $1
      `,
      [
        connection.id,
        refreshed.openId,
        refreshed.scopes,
        encryptTikTokToken(refreshed.accessToken, config.tokenEncryptionKey),
        encryptTikTokToken(refreshed.refreshToken, config.tokenEncryptionKey),
        refreshed.accessTokenExpiresAtUtc,
        refreshed.refreshTokenExpiresAtUtc
      ]
    );
    await client.query("commit");
    return refreshed.accessToken;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    const message = error instanceof Error ? error.message : String(error);
    await markRefreshFailure(db, message).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function disconnectTikTokConnection(
  db: PostgresDb,
  config: TikTokServerConfig
): Promise<void> {
  const result = await db.query<TikTokConnectionRow>(
    `select * from social_connections where provider = 'tiktok' and status in ('connected', 'refresh_failed') order by updated_at_utc desc limit 1`
  );
  const connection = result.rows[0];
  if (!connection) return;
  try {
    await fetchTikTokJson(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: config.clientKey,
        client_secret: config.clientSecret,
        token: decryptTikTokToken(connection.encrypted_access_token, config.tokenEncryptionKey)
      })
    });
  } finally {
    await db.query(
      `
        update social_connections set
          status = 'disconnected', disconnected_at_utc = now(), updated_at_utc = now()
        where id = $1
      `,
      [connection.id]
    );
  }
}

export async function uploadTikTokPhotoDraft(
  accessToken: string,
  input: TikTokDraftInput
): Promise<{ publishId: string }> {
  if (!input.photoUrl.startsWith("https://")) {
    throw new Error("TikTok requires a public HTTPS photo URL.");
  }
  const payload = await fetchTikTokJson(CONTENT_INIT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({
      post_info: {
        title: truncate(input.title || "AI match prediction", 90),
        description: truncate(input.description, 4000)
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [input.photoUrl]
      },
      post_mode: "MEDIA_UPLOAD",
      media_type: "PHOTO"
    })
  });
  assertTikTokSuccess(payload, "TikTok draft upload");
  const publishId = isRecord(payload.data) ? readString(payload.data.publish_id) : null;
  if (!publishId) throw new Error("TikTok accepted the draft but returned no publish_id.");
  return { publishId };
}

export async function fetchTikTokPublishStatus(
  accessToken: string,
  publishId: string
): Promise<TikTokPublishStatus> {
  const payload = await fetchTikTokJson(STATUS_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({ publish_id: publishId })
  });
  assertTikTokSuccess(payload, "TikTok publish status");
  const data = isRecord(payload.data) ? payload.data : {};
  return {
    status: readString(data.status) || "UNKNOWN",
    failReason: readString(data.fail_reason),
    publicPostIds: Array.isArray(data.publicaly_available_post_id)
      ? data.publicaly_available_post_id.map(String)
      : [],
    raw: payload
  };
}

export function encryptTikTokToken(token: string, encodedKey: string): string {
  const key = decodeEncryptionKey(encodedKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTikTokToken(value: string, encodedKey: string): string {
  const [version, ivValue, tagValue, ciphertextValue, extra] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue || extra) {
    throw new Error("Stored TikTok token has an unsupported encryption format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    decodeEncryptionKey(encodedKey),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

async function refreshTikTokToken(
  refreshToken: string,
  config: TikTokServerConfig,
  now: Date
): Promise<TikTokTokenBundle> {
  const payload = await fetchTikTokJson(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.clientKey,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });
  return parseTokenBundle(payload, now);
}

function parseTokenBundle(
  payload: Record<string, unknown>,
  now: Date
): TikTokTokenBundle {
  const openId = readString(payload.open_id);
  const accessToken = readString(payload.access_token);
  const refreshToken = readString(payload.refresh_token);
  const expiresIn = readPositiveInteger(payload.expires_in);
  const refreshExpiresIn = readPositiveInteger(payload.refresh_expires_in);
  const scopes = readString(payload.scope)?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  if (!openId || !accessToken || !refreshToken || !expiresIn || !refreshExpiresIn) {
    const errorDescription = readString(payload.error_description) || readString(payload.error);
    throw new Error(errorDescription || "TikTok token response was incomplete.");
  }
  const missingScopes = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length) {
    throw new Error(`TikTok authorization is missing scopes: ${missingScopes.join(", ")}.`);
  }
  return {
    openId,
    accessToken,
    refreshToken,
    scopes,
    accessTokenExpiresAtUtc: new Date(now.getTime() + expiresIn * 1000),
    refreshTokenExpiresAtUtc: new Date(now.getTime() + refreshExpiresIn * 1000)
  };
}

async function fetchTikTokJson(
  url: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      const message = readString(payload.error_description)
        || (isRecord(payload.error) ? readString(payload.error.message) : null)
        || `TikTok returned HTTP ${response.status}.`;
      throw new Error(message);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function assertTikTokSuccess(payload: Record<string, unknown>, label: string): void {
  if (!isRecord(payload.error)) return;
  const code = readString(payload.error.code);
  if (code && code !== "ok") {
    throw new Error(`${label} failed (${code}): ${readString(payload.error.message) || "Unknown TikTok error"}`);
  }
}

async function markRefreshFailure(db: PostgresDb, message: string): Promise<void> {
  await db.query(
    `
      update social_connections set status = 'refresh_failed', last_error = $1, updated_at_utc = now()
      where provider = 'tiktok' and status = 'connected'
    `,
    [truncate(message, 1000)]
  );
}

function toConnectionView(row: TikTokConnectionRow): TikTokConnectionView {
  return {
    id: row.id,
    providerUserId: row.provider_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    scopes: row.scopes ?? [],
    status: row.status,
    accessTokenExpiresAtUtc: new Date(row.access_token_expires_at_utc).toISOString(),
    refreshTokenExpiresAtUtc: new Date(row.refresh_token_expires_at_utc).toISOString(),
    connectedAtUtc: new Date(row.connected_at_utc).toISOString(),
    updatedAtUtc: new Date(row.updated_at_utc).toISOString(),
    lastError: row.last_error
  };
}

function decodeEncryptionKey(value: string): Buffer {
  const trimmed = value.trim();
  const decoded = /^[a-f\d]{64}$/iu.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (decoded.length !== 32) {
    throw new Error("TIKTOK_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return decoded;
}

function requireValue(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is not configured.`);
  return normalized;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveInteger(value: unknown): number | null {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function truncate(value: string, max: number): string {
  const chars = Array.from(value.trim());
  return chars.length <= max
    ? chars.join("")
    : `${chars.slice(0, Math.max(0, max - 1)).join("").trimEnd()}…`;
}
