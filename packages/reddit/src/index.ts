/** Server-only Reddit OAuth, encrypted token storage, profile lookup and reviewed text posting. */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID
} from "node:crypto";
import type { PostgresDb } from "@ai-sports-prediction/db";

const AUTHORIZE_URL = "https://www.reddit.com/api/v1/authorize";
const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REVOKE_URL = "https://www.reddit.com/api/v1/revoke_token";
const PROFILE_URL = "https://oauth.reddit.com/api/v1/me";
const SUBMIT_URL = "https://oauth.reddit.com/api/submit";
const REQUIRED_SCOPES = ["identity", "submit"] as const;

export type RedditServerConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tokenEncryptionKey: string;
  userAgent: string;
};

export type RedditTokenBundle = {
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  accessTokenExpiresAtUtc: Date;
};

export type RedditProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type RedditConnectionView = {
  id: string;
  providerUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  scopes: string[];
  status: "connected" | "refresh_failed" | "disconnected";
  accessTokenExpiresAtUtc: string;
  connectedAtUtc: string;
  updatedAtUtc: string;
  lastError: string | null;
};

type ConnectionRow = {
  id: string;
  provider_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  scopes: string[] | null;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  access_token_expires_at_utc: Date | string;
  status: "connected" | "refresh_failed" | "disconnected";
  connected_at_utc: Date | string;
  updated_at_utc: Date | string;
  last_error: string | null;
};

export function readRedditServerConfig(
  environment: NodeJS.ProcessEnv = process.env
): RedditServerConfig {
  const publicSiteUrl = (environment.PUBLIC_SITE_URL
    ?? environment.NEXT_PUBLIC_SITE_URL
    ?? "https://residualsports.com").replace(/\/$/u, "");
  return {
    clientId: required(environment.REDDIT_CLIENT_ID, "REDDIT_CLIENT_ID"),
    clientSecret: required(environment.REDDIT_CLIENT_SECRET, "REDDIT_CLIENT_SECRET"),
    redirectUri: environment.REDDIT_REDIRECT_URI?.trim()
      || `${publicSiteUrl}/api/reddit/oauth/callback`,
    tokenEncryptionKey: required(
      environment.REDDIT_TOKEN_ENCRYPTION_KEY,
      "REDDIT_TOKEN_ENCRYPTION_KEY"
    ),
    userAgent: environment.REDDIT_USER_AGENT?.trim()
      || "web:residual-sports-marketing:v1.0 (by /u/residualsports)"
  };
}

export function isRedditServerConfigured(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  try {
    readRedditServerConfig(environment);
    return true;
  } catch {
    return false;
  }
}

export function createRedditAuthorizationUrl(
  config: Pick<RedditServerConfig, "clientId" | "redirectUri">,
  state: string
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("duration", "permanent");
  url.searchParams.set("scope", REQUIRED_SCOPES.join(" "));
  return url.toString();
}

export async function exchangeRedditAuthorizationCode(
  code: string,
  config: RedditServerConfig,
  now = new Date()
): Promise<RedditTokenBundle> {
  const payload = await redditJson(TOKEN_URL, {
    method: "POST",
    headers: tokenHeaders(config),
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri
    })
  });
  return parseToken(payload, now, { requireRefreshToken: true });
}

export async function fetchRedditProfile(
  accessToken: string,
  userAgent: string
): Promise<RedditProfile> {
  const payload = await redditJson(PROFILE_URL, {
    headers: { authorization: `Bearer ${accessToken}`, "user-agent": userAgent }
  });
  const id = text(payload.id);
  const username = text(payload.name);
  if (!id || !username) throw new Error("Reddit profile response was incomplete.");
  return {
    id,
    username,
    avatarUrl: cleanAvatar(text(payload.snoovatar_img) || text(payload.icon_img))
  };
}

export async function saveRedditConnection(
  db: PostgresDb,
  config: RedditServerConfig,
  bundle: RedditTokenBundle,
  profile: RedditProfile,
  connectedBy: string
): Promise<RedditConnectionView> {
  const client = await db.connect();
  try {
    await client.query("begin");
    await client.query(
      `update social_connections
       set status = 'disconnected', disconnected_at_utc = now(), updated_at_utc = now()
       where provider = 'reddit'
         and status in ('connected', 'refresh_failed')
         and provider_user_id <> $1`,
      [profile.id]
    );
    const result = await client.query<ConnectionRow>(
      `insert into social_connections (
         id, provider, provider_user_id, display_name, avatar_url, scopes,
         encrypted_access_token, encrypted_refresh_token,
         access_token_expires_at_utc, refresh_token_expires_at_utc,
         status, connected_by, last_error, connected_at_utc,
         disconnected_at_utc, updated_at_utc
       ) values (
         $1, 'reddit', $2, $3, $4, $5::text[], $6, $7, $8, $9,
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
         status = 'connected', connected_by = excluded.connected_by,
         last_error = null, connected_at_utc = now(), disconnected_at_utc = null,
         updated_at_utc = now()
       returning *`,
      [
        randomUUID(),
        profile.id,
        profile.username,
        profile.avatarUrl,
        bundle.scopes,
        encrypt(bundle.accessToken, config.tokenEncryptionKey),
        encrypt(bundle.refreshToken, config.tokenEncryptionKey),
        bundle.accessTokenExpiresAtUtc,
        new Date("9999-12-31T23:59:59.000Z"),
        connectedBy.trim() || null
      ]
    );
    await client.query("commit");
    return view(result.rows[0]!);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getRedditConnection(
  db: PostgresDb
): Promise<RedditConnectionView | null> {
  const result = await db.query<ConnectionRow>(
    `select * from social_connections
     where provider = 'reddit' and status in ('connected', 'refresh_failed')
     order by case status when 'connected' then 0 else 1 end, updated_at_utc desc
     limit 1`
  );
  return result.rows[0] ? view(result.rows[0]) : null;
}

export async function getValidRedditAccessToken(
  db: PostgresDb,
  config: RedditServerConfig,
  now = new Date()
): Promise<string> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const selected = await client.query<ConnectionRow>(
      `select * from social_connections
       where provider = 'reddit' and status = 'connected'
       order by updated_at_utc desc limit 1 for update`
    );
    const row = selected.rows[0];
    if (!row) throw new Error("No connected Reddit account was found.");
    if (new Date(row.access_token_expires_at_utc).getTime() > now.getTime() + 5 * 60_000) {
      const token = decrypt(row.encrypted_access_token, config.tokenEncryptionKey);
      await client.query("commit");
      return token;
    }

    const payload = await redditJson(TOKEN_URL, {
      method: "POST",
      headers: tokenHeaders(config),
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decrypt(row.encrypted_refresh_token, config.tokenEncryptionKey)
      })
    });
    const refreshed = parseToken(payload, now, { fallbackScopes: row.scopes ?? [] });
    await client.query(
      `update social_connections set
         encrypted_access_token = $2, access_token_expires_at_utc = $3,
         scopes = $4::text[], status = 'connected', last_error = null,
         updated_at_utc = now()
       where id = $1`,
      [
        row.id,
        encrypt(refreshed.accessToken, config.tokenEncryptionKey),
        refreshed.accessTokenExpiresAtUtc,
        refreshed.scopes
      ]
    );
    await client.query("commit");
    return refreshed.accessToken;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    await db.query(
      `update social_connections
       set status = 'refresh_failed', last_error = $1, updated_at_utc = now()
       where provider = 'reddit' and status = 'connected'`,
      [error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000)]
    ).catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function disconnectRedditConnection(
  db: PostgresDb,
  config: RedditServerConfig
): Promise<void> {
  const result = await db.query<ConnectionRow>(
    `select * from social_connections
     where provider = 'reddit' and status in ('connected', 'refresh_failed')
     order by updated_at_utc desc limit 1`
  );
  const row = result.rows[0];
  if (!row) return;
  try {
    await redditJson(REVOKE_URL, {
      method: "POST",
      headers: tokenHeaders(config),
      body: new URLSearchParams({
        token: decrypt(row.encrypted_refresh_token, config.tokenEncryptionKey),
        token_type_hint: "refresh_token"
      })
    });
  } finally {
    await db.query(
      `update social_connections
       set status = 'disconnected', disconnected_at_utc = now(), updated_at_utc = now()
       where id = $1`,
      [row.id]
    );
  }
}

export async function publishRedditTextPost(
  accessToken: string,
  input: { subreddit: string; title: string; body: string },
  userAgent: string
): Promise<{ id: string; url: string | null }> {
  const payload = await redditJson(SUBMIT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": userAgent
    },
    body: new URLSearchParams({
      api_type: "json",
      kind: "self",
      sr: input.subreddit,
      title: input.title,
      text: input.body,
      resubmit: "false",
      sendreplies: "false"
    })
  });
  const errors = Array.isArray((payload as { json?: { errors?: unknown[] } }).json?.errors)
    ? (payload as { json: { errors: unknown[] } }).json.errors
    : [];
  if (errors.length) {
    throw new Error(`Reddit rejected the post: ${errors.map(formatRedditError).join("; ")}`);
  }
  const data = (payload as { json?: { data?: Record<string, unknown> } }).json?.data;
  const url = text(data?.url);
  const id = text(data?.name) || text(data?.id) || url;
  if (!id) throw new Error("Reddit returned no post identifier.");
  return { id, url };
}

function parseToken(
  payload: Record<string, unknown>,
  now: Date,
  options: { requireRefreshToken?: boolean; fallbackScopes?: string[] }
): RedditTokenBundle {
  const accessToken = text(payload.access_token);
  const refreshToken = text(payload.refresh_token);
  const expiresIn = Number(payload.expires_in);
  const returnedScopes = (text(payload.scope) || "").split(/[ ,]+/u).filter(Boolean);
  const scopes = returnedScopes.length ? returnedScopes : options.fallbackScopes ?? [];
  if (!accessToken || !Number.isFinite(expiresIn) || (options.requireRefreshToken && !refreshToken)) {
    throw new Error(text(payload.error) || "Reddit token response was incomplete.");
  }
  const missing = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missing.length) {
    throw new Error(`Reddit authorization is missing scopes: ${missing.join(", ")}.`);
  }
  return {
    accessToken,
    refreshToken: refreshToken || "",
    scopes,
    accessTokenExpiresAtUtc: new Date(now.getTime() + expiresIn * 1000)
  };
}

async function redditJson(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(text(payload.message) || text(payload.error)
        || `Reddit returned HTTP ${response.status}.`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function tokenHeaders(config: Pick<RedditServerConfig, "clientId" | "clientSecret" | "userAgent">) {
  return {
    authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    "content-type": "application/x-www-form-urlencoded",
    "user-agent": config.userAgent
  };
}

function encrypt(value: string, keyValue: string): string {
  const key = keyBytes(keyValue);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url")
  ].join(".");
}

function decrypt(value: string, keyValue: string): string {
  const [, iv, tag, data] = value.split(".");
  if (!iv || !tag || !data) throw new Error("Stored Reddit token is invalid.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(keyValue),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function keyBytes(value: string): Buffer {
  const trimmed = value.trim();
  const decoded = /^[a-f\d]{64}$/iu.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (decoded.length !== 32) {
    throw new Error("REDDIT_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }
  return decoded;
}

function view(row: ConnectionRow): RedditConnectionView {
  return {
    id: row.id,
    providerUserId: row.provider_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    scopes: row.scopes ?? [],
    status: row.status,
    accessTokenExpiresAtUtc: new Date(row.access_token_expires_at_utc).toISOString(),
    connectedAtUtc: new Date(row.connected_at_utc).toISOString(),
    updatedAtUtc: new Date(row.updated_at_utc).toISOString(),
    lastError: row.last_error
  };
}

function formatRedditError(value: unknown): string {
  return Array.isArray(value) ? value.map(String).join(": ") : String(value);
}

function cleanAvatar(value: string | null): string | null {
  return value ? value.replace(/&amp;/gu, "&") : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function required(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is not configured.`);
  return normalized;
}
