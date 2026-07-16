import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getAdminSessionSecret } from "./admin-session";

const KEY_PREFIX = "asp_live_";

export function createWidgetApiKey() {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function hashWidgetApiKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getWidgetApiKeyPreview(value: string) {
  return `${value.slice(0, KEY_PREFIX.length + 4)}…${value.slice(-4)}`;
}

export function encryptWidgetApiKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptWidgetApiKey(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("invalid_widget_api_key_ciphertext");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function getEncryptionKey() {
  const secret = process.env.WIDGET_API_KEY_ENCRYPTION_KEY?.trim() || getAdminSessionSecret();
  if (!secret) {
    throw new Error("WIDGET_API_KEY_ENCRYPTION_KEY or ADMIN_SESSION_SECRET is required.");
  }
  return createHash("sha256").update(`widget-api-key:${secret}`).digest();
}
