#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const region = process.env.AWS_REGION ?? "eu-central-1";
const env = loadEnvFiles([resolve(".env"), resolve("apps/web/.env.local")]);
const parameters = {
  "stripe-secret-key": "STRIPE_SECRET_KEY",
  "stripe-webhook-secret": "STRIPE_WEBHOOK_SECRET",
  "stripe-price-starter-monthly": "STRIPE_PRICE_STARTER_MONTHLY",
  "stripe-price-starter-annual": "STRIPE_PRICE_STARTER_ANNUAL",
  "stripe-price-growth-monthly": "STRIPE_PRICE_GROWTH_MONTHLY",
  "stripe-price-growth-annual": "STRIPE_PRICE_GROWTH_ANNUAL",
  "stripe-customer-portal-configuration-id": "STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID"
};

for (const [shortName, envName] of Object.entries(parameters)) {
  const value = env[envName]?.trim();
  if (!value) throw new Error(`Missing local Stripe setting: ${envName}`);
  execFileSync("aws", [
    "--region", region,
    "ssm", "put-parameter",
    "--name", `/ai-sports-prediction/${shortName}`,
    "--type", "SecureString",
    "--value", value,
    "--overwrite"
  ], { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`Synchronized ${envName} to encrypted runtime storage.`);
}

function loadEnvFiles(paths) {
  const result = {};
  for (const path of paths) {
    let contents;
    try { contents = readFileSync(path, "utf8"); } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}
