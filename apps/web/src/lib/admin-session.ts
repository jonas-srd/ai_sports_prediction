export const ADMIN_SESSION_COOKIE = "ai_sports_admin_session";

export type AdminSession = {
  email: string;
  expiresAt: number;
};

type SessionPayload = {
  email?: unknown;
  exp?: unknown;
  iat?: unknown;
  version?: unknown;
};

export function getAllowedAdminEmails(
  environment: NodeJS.ProcessEnv = process.env
): ReadonlySet<string> {
  return new Set(
    (environment.ADMIN_ACCESS_EMAILS ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean)
  );
}

export function getAdminSessionSecret(
  environment: NodeJS.ProcessEnv = process.env
): string | null {
  const secret = environment.ADMIN_SESSION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

export function getAdminSessionTtlSeconds(
  environment: NodeJS.ProcessEnv = process.env
): number {
  const hours = Number(environment.ADMIN_SESSION_TTL_HOURS ?? 168);
  const normalizedHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 24 * 30) : 168;
  return Math.round(normalizedHours * 60 * 60);
}

export async function createAdminSession(
  email: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  ttlSeconds = 7 * 24 * 60 * 60
): Promise<string> {
  const payload = encodeJson({
    email: normalizeEmail(email),
    exp: nowSeconds + ttlSeconds,
    iat: nowSeconds,
    version: 1
  });
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyAdminSession(
  token: string,
  secret: string,
  allowedEmails: ReadonlySet<string>,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<AdminSession | null> {
  try {
    const [payloadPart, signaturePart, extra] = token.split(".");
    if (!payloadPart || !signaturePart || extra) {
      return null;
    }
    const expectedSignature = await sign(payloadPart, secret);
    if (!constantTimeEqual(signaturePart, expectedSignature)) {
      return null;
    }

    const payload = decodeJson<SessionPayload>(payloadPart);
    const email = typeof payload.email === "string" ? normalizeEmail(payload.email) : "";
    const expiresAt = typeof payload.exp === "number" ? payload.exp : 0;
    const issuedAt = typeof payload.iat === "number" ? payload.iat : 0;
    if (
      payload.version !== 1
      || !email
      || !allowedEmails.has(email)
      || expiresAt <= nowSeconds
      || issuedAt > nowSeconds + 30
    ) {
      return null;
    }

    return { email, expiresAt };
  } catch {
    return null;
  }
}

export function isSafeAdminRedirect(value: string | null | undefined): value is string {
  return Boolean(
    value
    && (value === "/admin" || value.startsWith("/admin/"))
    && !value.startsWith("//")
    && !value.includes("\\")
  );
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(new TextEncoder().encode(value))
  );
  return encodeBase64Url(new Uint8Array(signature));
}

function encodeJson(value: unknown): string {
  return encodeBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
