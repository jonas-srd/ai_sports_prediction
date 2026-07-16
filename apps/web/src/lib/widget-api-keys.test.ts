import assert from "node:assert/strict";
import test from "node:test";
import {
  createWidgetApiKey,
  decryptWidgetApiKey,
  encryptWidgetApiKey,
  getWidgetApiKeyPreview,
  hashWidgetApiKey
} from "./widget-api-keys";

test("creates, encrypts and decrypts a publisher key without exposing it in the preview", () => {
  process.env.WIDGET_API_KEY_ENCRYPTION_KEY = "test-only-widget-key-encryption-secret";
  const key = createWidgetApiKey();
  const encrypted = encryptWidgetApiKey(key);

  assert.match(key, /^asp_live_[A-Za-z0-9_-]+$/);
  assert.notEqual(encrypted, key);
  assert.equal(decryptWidgetApiKey(encrypted), key);
  assert.match(hashWidgetApiKey(key), /^[a-f0-9]{64}$/);
  assert.ok(!getWidgetApiKeyPreview(key).includes(key));
});
