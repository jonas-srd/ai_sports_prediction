#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const region = env("AWS_REGION", "eu-central-1");
const cacheName = env("ELASTICACHE_SERVERLESS_CACHE", "ai-sports-prediction-queue");
const appSecurityGroup = env("ECS_APP_SECURITY_GROUP", "sg-0ff92d788326fd9ac");
const subnetIds = env(
  "ECS_SUBNET_IDS",
  "subnet-0cc8d0aa15263d1ef,subnet-06ed8c8d5be7ac04c,subnet-0f5eb9f5765d627ee"
).split(",").map((value) => value.trim()).filter(Boolean);

assertCallerCanProvision();
const vpcId = aws([
  "ec2", "describe-security-groups", "--group-ids", appSecurityGroup,
  "--query", "SecurityGroups[0].VpcId", "--output", "text"
]);
if (!vpcId || vpcId === "None") throw new Error("Could not resolve the ECS application VPC.");

const redisSecurityGroup = ensureRedisSecurityGroup(vpcId);
ensureRedisIngress(redisSecurityGroup);
const endpoint = ensureServerlessCache(redisSecurityGroup);
const redisUrl = `rediss://${endpoint}:6379`;

putSecret("ai-sports-prediction/redis-url", redisUrl, "TLS URL for the private BullMQ and API cache backend");
putRequiredLocalSecret("ai-sports-prediction/widget-customer-session-secret", "WIDGET_CUSTOMER_SESSION_SECRET");
putRequiredLocalSecret("ai-sports-prediction/widget-api-key-encryption-key", "WIDGET_API_KEY_ENCRYPTION_KEY");

console.log(`ElastiCache serverless cache is ready: ${cacheName}`);
console.log(`Private endpoint stored in Secrets Manager: ai-sports-prediction/redis-url`);
console.log(`Security group: ${redisSecurityGroup} (port 6379 only from ${appSecurityGroup})`);

function assertCallerCanProvision() {
  const arn = aws(["sts", "get-caller-identity", "--query", "Arn", "--output", "text"]);
  console.log(`Provisioning as ${arn}`);
}

function ensureRedisSecurityGroup(vpcId) {
  const existing = aws([
    "ec2", "describe-security-groups",
    "--filters", "Name=vpc-id,Values=" + vpcId, "Name=group-name,Values=ai-sports-prediction-redis-access",
    "--query", "SecurityGroups[0].GroupId", "--output", "text"
  ]);
  if (existing && existing !== "None") return existing;
  return aws([
    "ec2", "create-security-group",
    "--group-name", "ai-sports-prediction-redis-access",
    "--description", "Private Valkey access from AI Sports Prediction ECS tasks",
    "--vpc-id", vpcId, "--query", "GroupId", "--output", "text"
  ]);
}

function ensureRedisIngress(redisSecurityGroup) {
  const permission = JSON.stringify([{
    IpProtocol: "tcp",
    FromPort: 6379,
    ToPort: 6379,
    UserIdGroupPairs: [{ GroupId: appSecurityGroup, Description: "ECS app and worker tasks" }]
  }]);
  try {
    aws(["ec2", "authorize-security-group-ingress", "--group-id", redisSecurityGroup, "--ip-permissions", permission]);
  } catch (error) {
    if (!String(error).includes("InvalidPermission.Duplicate")) throw error;
  }
}

function ensureServerlessCache(redisSecurityGroup) {
  let endpoint = describeCache("Endpoint.Address");
  if (!endpoint || endpoint === "None") {
    aws([
      "elasticache", "create-serverless-cache",
      "--serverless-cache-name", cacheName,
      "--description", "Private BullMQ and API cache for AI Sports Prediction",
      "--engine", "valkey",
      "--security-group-ids", redisSecurityGroup,
      "--subnet-ids", ...subnetIds,
      "--tags", "Key=Application,Value=ai-sports-prediction", "Key=Purpose,Value=queue-cache"
    ]);
    waitForServerlessCache();
    endpoint = describeCache("Endpoint.Address");
  }
  if (!endpoint || endpoint === "None") throw new Error("ElastiCache endpoint is unavailable.");
  return endpoint;
}

function waitForServerlessCache() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const status = describeCache("Status");
    if (status === "available") return;
    if (status && !["creating", "modifying"].includes(status)) {
      throw new Error(`ElastiCache entered unexpected status: ${status}`);
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10_000);
  }
  throw new Error("Timed out waiting for ElastiCache serverless cache.");
}

function describeCache(field) {
  try {
    return aws([
      "elasticache", "describe-serverless-caches", "--serverless-cache-name", cacheName,
      "--query", `ServerlessCaches[0].${field}`, "--output", "text"
    ]);
  } catch (error) {
    if (String(error).includes("ServerlessCacheNotFoundFault")) return null;
    throw error;
  }
}

function putRequiredLocalSecret(name, environmentName) {
  const value = process.env[environmentName]?.trim();
  if (!value) throw new Error(`${environmentName} is required before provisioning.`);
  putSecret(name, value, `${environmentName} for the widget customer platform`);
}

function putSecret(name, value, description) {
  try {
    aws(["secretsmanager", "describe-secret", "--secret-id", name]);
    aws(["secretsmanager", "put-secret-value", "--secret-id", name, "--secret-string", value]);
  } catch (error) {
    if (!String(error).includes("ResourceNotFoundException")) throw error;
    aws(["secretsmanager", "create-secret", "--name", name, "--description", description, "--secret-string", value]);
  }
}

function env(name, fallback) {
  return process.env[name]?.trim() || fallback;
}

function aws(args) {
  try {
    return execFileSync("aws", [
      "--region", region,
      "--cli-connect-timeout", "10",
      "--cli-read-timeout", "120",
      ...args
    ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    const detail = error?.stderr?.toString().trim() || error?.message || String(error);
    throw new Error(detail);
  }
}
