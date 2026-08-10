#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const region = env("AWS_REGION", "eu-central-1");
const accountId = env("AWS_ACCOUNT_ID", aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"]));
const cluster = env("ECS_CLUSTER", "ai-sports-prediction");
const serviceName = env("ECS_WORKER_SERVICE", "ai-sports-prediction-worker");
const family = env("ECS_WORKER_TASK_FAMILY", "ai-sports-prediction-worker");
const logGroup = env("ECS_LOG_GROUP", "/ecs/ai-sports-prediction");
const securityGroup = env("ECS_APP_SECURITY_GROUP", "sg-0ff92d788326fd9ac");
const subnets = env(
  "ECS_SUBNET_IDS",
  "subnet-0cc8d0aa15263d1ef,subnet-06ed8c8d5be7ac04c,subnet-0f5eb9f5765d627ee"
).split(",").map((value) => value.trim()).filter(Boolean);
const image = env("ECR_IMAGE_URI", `${accountId}.dkr.ecr.${region}.amazonaws.com/ai-sports-prediction:latest`);
const executionRoleArn = env(
  "ECS_EXECUTION_ROLE_ARN",
  `arn:aws:iam::${accountId}:role/ai-sports-prediction-ecs-execution-role`
);
const taskRoleArn = env(
  "ECS_TASK_ROLE_ARN",
  `arn:aws:iam::${accountId}:role/ai-sports-prediction-ecs-task-role`
);

const secrets = {
  databaseUrl: runtimeSecretReference("ai-sports-prediction/database-url"),
  redisUrl: runtimeSecretReference("ai-sports-prediction/redis-url"),
  openrouterApiKey: runtimeSecretReference("ai-sports-prediction/openrouter-api-key"),
  sportsDbApiKey: runtimeSecretReference("ai-sports-prediction/the-sports-db-api-key"),
  oddsApiKey: runtimeSecretReference("ai-sports-prediction/the-odds-api-key"),
  serpApiKey: runtimeSecretReference("ai-sports-prediction/serpapi-api-key")
  ,resendApiKey: runtimeSecretReference("ai-sports-prediction/resend-api-key")
  ,ga4ApiSecret: optionalRuntimeSecretReference("ai-sports-prediction/ga4-api-secret")
  ,instagramAccessToken: optionalRuntimeSecretReference("ai-sports-prediction/instagram-access-token")
};

const definition = {
  family,
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  cpu: env("ECS_WORKER_CPU", "512"),
  memory: env("ECS_WORKER_MEMORY", "1024"),
  executionRoleArn,
  taskRoleArn,
  runtimePlatform: { operatingSystemFamily: "LINUX", cpuArchitecture: "ARM64" },
  containerDefinitions: [{
    name: "worker",
    image,
    essential: true,
    environment: [
      ["NODE_ENV", "production"],
      ["SERVICE_ROLE", "worker"],
      ["QUEUE_KEY_PREFIX", "{ai-sports-prediction}"],
      ["DATABASE_SSL", "1"],
      ["DATABASE_SSL_REJECT_UNAUTHORIZED", env("DATABASE_SSL_REJECT_UNAUTHORIZED", "1")],
      ["DATABASE_SSL_CA_FILE", "/etc/ssl/certs/aws-rds-global-bundle.pem"],
      ["OPENROUTER_MODEL_IDS", env("OPENROUTER_MODEL_IDS", "openai/gpt-oss-20b:free")],
      ["OPENROUTER_SITE_URL", "https://residualsports.com"],
      ["OPENROUTER_SITE_NAME", "Residual Sports"],
      ["FIXTURE_SYNC_INTERVAL_MINUTES", env("FIXTURE_SYNC_INTERVAL_MINUTES", "15")],
      ["LIVE_SCORE_SYNC_INTERVAL_MINUTES", env("LIVE_SCORE_SYNC_INTERVAL_MINUTES", "2")],
      ["PREDICTION_AUTOMATION_INTERVAL_MINUTES", env("PREDICTION_AUTOMATION_INTERVAL_MINUTES", "60")],
      ["PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN", env("PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN", "50")],
      ["ODDS_REFRESH_LOOKAHEAD_DAYS", env("ODDS_REFRESH_LOOKAHEAD_DAYS", "7")],
      ["ODDS_REFRESH_INTERVAL_MINUTES", env("ODDS_REFRESH_INTERVAL_MINUTES", "60")],
      ["ODDS_REFRESH_DAILY_INTERVAL_MINUTES", env("ODDS_REFRESH_DAILY_INTERVAL_MINUTES", "1440")],
      ["ODDS_REFRESH_PRE_MATCH_MINUTES", env("ODDS_REFRESH_PRE_MATCH_MINUTES", "60")],
      ["ODDS_REFRESH_MAX_MATCHES_PER_RUN", env("ODDS_REFRESH_MAX_MATCHES_PER_RUN", "250")],
      ["BACKUP_AUTOMATION_ENABLED", "1"],
      ["BACKUP_AUTOMATION_INTERVAL_HOURS", env("BACKUP_AUTOMATION_INTERVAL_HOURS", "12")],
      ["BACKUP_S3_BUCKET", env("BACKUP_S3_BUCKET", "ai-sports-prediction")],
      ["BACKUP_S3_REGION", region],
      ["BACKUP_S3_PREFIX", env("BACKUP_S3_PREFIX", "ai-sports-prediction/backups")],
      ["POSTGRES_BACKUP_DIR", "/tmp/postgres-backups"],
      ["OPS_ALERT_EMAILS", env("OPS_ALERT_EMAILS", "")],
      ["OPS_ALERT_FROM_EMAIL", env("OPS_ALERT_FROM_EMAIL", "Residual Sports <ops@residualsports.com>")],
      ["NEWSLETTER_FROM_EMAIL", env("NEWSLETTER_FROM_EMAIL", "Residual Sports <hello@residualsports.com>")],
      ["MARKETING_AUTOMATION_ENABLED", env("MARKETING_AUTOMATION_ENABLED", "0")],
      ["MARKETING_PUBLISH_MODE", env("MARKETING_PUBLISH_MODE", "review")],
      ["MARKETING_ANALYTICS_ENABLED", env("MARKETING_ANALYTICS_ENABLED", "1")]
      ,["MARKETING_PUBLIC_ASSET_BASE_URL", env("MARKETING_PUBLIC_ASSET_BASE_URL", "https://residualsports.com/api/marketing-assets")]
      ,["MARKETING_ASSET_S3_BUCKET", env("MARKETING_ASSET_S3_BUCKET", "ai-sports-prediction")]
      ,["MARKETING_ASSET_S3_PREFIX", env("MARKETING_ASSET_S3_PREFIX", "marketing-assets")]
      ,["MARKETING_ASSET_S3_REGION", env("MARKETING_ASSET_S3_REGION", region)]
      ,["INSTAGRAM_ACCOUNT_ID", env("INSTAGRAM_ACCOUNT_ID", "17841438107091610")]
      ,["INSTAGRAM_GRAPH_API_VERSION", env("INSTAGRAM_GRAPH_API_VERSION", "v23.0")]
      ,["GA4_MEASUREMENT_ID", env("GA4_MEASUREMENT_ID", "G-KSGFX9TKD8")]
      ,["REVENUE_AUTOMATION_ENABLED", env("REVENUE_AUTOMATION_ENABLED", "1")]
      ,["REVENUE_AUTOMATION_INTERVAL_MINUTES", env("REVENUE_AUTOMATION_INTERVAL_MINUTES", "60")]
      ,["PUBLIC_SITE_URL", env("PUBLIC_SITE_URL", "https://residualsports.com")]
      ,["WIDGET_ACCESS_FROM_EMAIL", env("WIDGET_ACCESS_FROM_EMAIL", "")]
      ,["SALES_ALERT_EMAILS", env("SALES_ALERT_EMAILS", "")]
    ].map(([name, value]) => ({ name, value })),
    secrets: [
      ["DATABASE_URL", secrets.databaseUrl],
      ["REDIS_URL", secrets.redisUrl],
      ["OPENROUTER_API_KEY", secrets.openrouterApiKey],
      ["THE_SPORTS_DB_API_KEY", secrets.sportsDbApiKey],
      ["THE_ODDS_API_KEY", secrets.oddsApiKey],
      ["SERPAPI_API_KEY", secrets.serpApiKey]
      ,["RESEND_API_KEY", secrets.resendApiKey]
      ,...(secrets.ga4ApiSecret ? [["GA4_API_SECRET", secrets.ga4ApiSecret]] : [])
      ,...(secrets.instagramAccessToken ? [["INSTAGRAM_ACCESS_TOKEN", secrets.instagramAccessToken]] : [])
    ].map(([name, valueFrom]) => ({ name, valueFrom })),
    logConfiguration: {
      logDriver: "awslogs",
      options: {
        "awslogs-group": logGroup,
        "awslogs-region": region,
        "awslogs-stream-prefix": "worker"
      }
    }
  }]
};

const taskDefinitionArn = register(definition);
if (env("RUN_MIGRATIONS", "1") === "1") runMigration(taskDefinitionArn);
if (env("DEPLOY_WORKER_SERVICE", "1") === "1") {
  upsertService(taskDefinitionArn);
} else {
  console.log("Standalone worker service deployment skipped; the worker is part of the edge task.");
}
console.log(`Worker task definition: ${taskDefinitionArn}`);
if (env("DEPLOY_WORKER_SERVICE", "1") === "1") {
  console.log(`Worker service: ${cluster}/${serviceName}`);
}

function runMigration(taskDefinitionArn) {
  const taskArn = aws([
    "ecs", "run-task",
    "--cluster", cluster,
    "--task-definition", taskDefinitionArn,
    "--launch-type", "FARGATE",
    "--network-configuration",
    `awsvpcConfiguration={subnets=[${subnets.join(",")}],securityGroups=[${securityGroup}],assignPublicIp=ENABLED}`,
    "--overrides", JSON.stringify({
      containerOverrides: [{ name: "worker", environment: [{ name: "SERVICE_ROLE", value: "migrate" }] }]
    }),
    "--query", "tasks[0].taskArn",
    "--output", "text"
  ]);
  aws(["ecs", "wait", "tasks-stopped", "--cluster", cluster, "--tasks", taskArn]);
  const exitCode = aws([
    "ecs", "describe-tasks", "--cluster", cluster, "--tasks", taskArn,
    "--query", "tasks[0].containers[0].exitCode", "--output", "text"
  ]);
  if (exitCode !== "0") throw new Error(`Migration task failed with exit code ${exitCode}.`);
}

function upsertService(taskDefinitionArn) {
  const status = aws([
    "ecs", "describe-services", "--cluster", cluster, "--services", serviceName,
    "--query", "services[0].status", "--output", "text"
  ]);
  if (status === "ACTIVE" || status === "DRAINING") {
    aws([
      "ecs", "update-service", "--cluster", cluster, "--service", serviceName,
      "--task-definition", taskDefinitionArn, "--desired-count", "1",
      "--force-new-deployment", "--output", "text"
    ]);
    return;
  }
  aws([
    "ecs", "create-service", "--cluster", cluster, "--service-name", serviceName,
    "--task-definition", taskDefinitionArn, "--desired-count", "1", "--launch-type", "FARGATE",
    "--network-configuration",
    `awsvpcConfiguration={subnets=[${subnets.join(",")}],securityGroups=[${securityGroup}],assignPublicIp=ENABLED}`,
    "--enable-execute-command", "--output", "text"
  ]);
}

function register(value) {
  const file = join(tmpdir(), `${family}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(value, null, 2));
  try {
    return aws([
      "ecs", "register-task-definition", "--cli-input-json", `file://${file}`,
      "--query", "taskDefinition.taskDefinitionArn", "--output", "text"
    ]);
  } finally {
    if (existsSync(file)) rmSync(file);
  }
}

function secretArn(name) {
  return aws(["secretsmanager", "describe-secret", "--secret-id", name, "--query", "ARN", "--output", "text"]);
}
function runtimeSecretReference(name) {
  try {
    return aws(["ssm", "get-parameter", "--name", `/${name}`, "--query", "Parameter.ARN", "--output", "text"]);
  } catch {
    return secretArn(name);
  }
}
function optionalRuntimeSecretReference(name) {
  try { return runtimeSecretReference(name); } catch { return null; }
}
function env(name, fallback) { return process.env[name] ?? fallback; }
function aws(args) {
  return execFileSync("aws", [
    "--region", region,
    "--cli-connect-timeout", "5",
    "--cli-read-timeout", "60",
    ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
