#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const region = process.env.AWS_REGION ?? "eu-central-1";
const requiredSecrets = [
  "database-url",
  "redis-url",
  "admin-api-token",
  "admin-access-emails",
  "admin-session-secret",
  "admin-totp-secrets",
  "openrouter-api-key",
  "resend-api-key",
  "the-odds-api-key",
  "the-sports-db-api-key",
  "cloudflare-tunnel-token",
  "serpapi-api-key",
  "widget-api-key-encryption-key",
  "widget-customer-session-secret"
];
const optionalSecrets = ["ga4-api-secret", "instagram-access-token", "tiktok-access-token"];

for (const name of requiredSecrets) {
  migrate(name, true);
}
for (const name of optionalSecrets) {
  migrate(name, false);
}

console.log("Runtime parameters are synchronized without printing secret values.");

function migrate(shortName, required) {
  const secretId = `ai-sports-prediction/${shortName}`;
  const parameterName = `/${secretId}`;
  let value;
  try {
    value = aws([
      "secretsmanager",
      "get-secret-value",
      "--secret-id",
      secretId,
      "--query",
      "SecretString",
      "--output",
      "text"
    ]);
  } catch (error) {
    if (!required) {
      console.log(`Optional secret not present, skipped: ${secretId}`);
      return;
    }
    throw error;
  }

  const exists = parameterExists(parameterName);
  putParameter({
    Name: parameterName,
    Type: "SecureString",
    Tier: "Standard",
    Value: value,
    Overwrite: exists,
    ...(exists ? {} : {
      Tags: [
        { Key: "Application", Value: "ai-sports-prediction" },
        { Key: "ManagedBy", Value: "deployment" }
      ]
    })
  });
  console.log(`${exists ? "Updated" : "Created"}: ${parameterName}`);
}

function parameterExists(name) {
  try {
    aws(["ssm", "get-parameter", "--name", name, "--query", "Parameter.Name", "--output", "text"]);
    return true;
  } catch {
    return false;
  }
}

function aws(args) {
  return execFileSync("aws", [
    "--region",
    region,
    "--cli-connect-timeout",
    "5",
    "--cli-read-timeout",
    "60",
    ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function putParameter(input) {
  const directory = mkdtempSync(join(tmpdir(), "ai-sports-ssm-"));
  const inputFile = join(directory, "parameter.json");
  writeFileSync(inputFile, JSON.stringify(input), { encoding: "utf8", mode: 0o600 });
  try {
    execFileSync("aws", [
      "--region",
      region,
      "--cli-connect-timeout",
      "5",
      "--cli-read-timeout",
      "60",
      "ssm",
      "put-parameter",
      "--cli-input-json",
      `file://${inputFile}`
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
