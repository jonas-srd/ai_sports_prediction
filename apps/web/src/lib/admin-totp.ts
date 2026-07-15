import { createHmac, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DUMMY_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";

export function getAdminTotpSecrets(
  environment: NodeJS.ProcessEnv = process.env
): ReadonlyMap<string, string> {
  try {
    const parsed = JSON.parse(environment.ADMIN_TOTP_SECRETS ?? "{}") as Record<string, unknown>;
    return new Map(
      Object.entries(parsed)
        .map(([email, secret]) => [normalizeEmail(email), normalizeSecret(String(secret ?? ""))] as const)
        .filter(([email, secret]) => email && isValidBase32Secret(secret))
    );
  } catch {
    return new Map();
  }
}

export function verifyAdminTotp(input: {
  code: string;
  secret: string;
  nowMs?: number;
  window?: number;
}): boolean {
  const code = input.code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code) || !isValidBase32Secret(input.secret)) {
    return false;
  }

  const nowMs = input.nowMs ?? Date.now();
  const window = Math.min(Math.max(input.window ?? 1, 0), 2);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = generateTotp(input.secret, nowMs + offset * 30_000);
    if (safeStringEqual(code, expected)) {
      return true;
    }
  }
  return false;
}

export function generateTotp(secret: string, nowMs = Date.now()): string {
  const counter = Math.floor(nowMs / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function buildTotpUri(email: string, secret: string): string {
  const issuer = "AI Sports Prediction";
  const label = `${issuer}:${normalizeEmail(email)}`;
  const query = new URLSearchParams({
    algorithm: "SHA1",
    digits: "6",
    issuer,
    period: "30",
    secret: normalizeSecret(secret)
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${query.toString()}`;
}

export function getTotpSecretOrDummy(email: string, secrets: ReadonlyMap<string, string>): string {
  return secrets.get(normalizeEmail(email)) ?? DUMMY_SECRET;
}

function decodeBase32(value: string): Buffer {
  const normalized = normalizeSecret(value);
  let bits = 0;
  let bitCount = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) {
      throw new Error("Invalid base32 secret.");
    }
    bits = (bits << 5) | index;
    bitCount += 5;
    if (bitCount >= 8) {
      bytes.push((bits >>> (bitCount - 8)) & 0xff);
      bitCount -= 8;
    }
  }
  return Buffer.from(bytes);
}

function isValidBase32Secret(value: string): boolean {
  return value.length >= 16 && /^[A-Z2-7]+$/.test(value);
}

function normalizeSecret(value: string): string {
  return value.toUpperCase().replace(/[\s=-]/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function safeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
