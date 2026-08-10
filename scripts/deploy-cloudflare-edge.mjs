#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const region = env("AWS_REGION", "eu-central-1");
const cluster = env("ECS_CLUSTER", "ai-sports-prediction");
const serviceName = env("ECS_EDGE_SERVICE", "ai-sports-prediction-edge");
const taskFamily = env("ECS_EDGE_TASK_FAMILY", "ai-sports-prediction-edge");
const desiredCount = env("ECS_DESIRED_COUNT", "1");
const logGroup = env("ECS_LOG_GROUP", "/ecs/ai-sports-prediction");
const appSecurityGroup = env("ECS_APP_SECURITY_GROUP", "sg-0ff92d788326fd9ac");
const subnetIds = env(
  "ECS_SUBNET_IDS",
  "subnet-0cc8d0aa15263d1ef,subnet-06ed8c8d5be7ac04c,subnet-0f5eb9f5765d627ee"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const assignPublicIp = env("ECS_ASSIGN_PUBLIC_IP", "ENABLED");
const accountId = env("AWS_ACCOUNT_ID", aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"]));
const imageUri = env(
  "ECR_IMAGE_URI",
  `${accountId}.dkr.ecr.${region}.amazonaws.com/ai-sports-prediction:latest`
);

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
  adminApiToken: runtimeSecretReference("ai-sports-prediction/admin-api-token"),
  adminAccessEmails: runtimeSecretReference("ai-sports-prediction/admin-access-emails"),
  adminSessionSecret: runtimeSecretReference("ai-sports-prediction/admin-session-secret"),
  adminTotpSecrets: runtimeSecretReference("ai-sports-prediction/admin-totp-secrets"),
  openrouterApiKey: runtimeSecretReference("ai-sports-prediction/openrouter-api-key"),
  resendApiKey: runtimeSecretReference("ai-sports-prediction/resend-api-key"),
  theOddsApiKey: runtimeSecretReference("ai-sports-prediction/the-odds-api-key"),
  theSportsDbApiKey: runtimeSecretReference("ai-sports-prediction/the-sports-db-api-key"),
  cloudflareTunnelToken: runtimeSecretReference("ai-sports-prediction/cloudflare-tunnel-token"),
  serpApiKey: runtimeSecretReference("ai-sports-prediction/serpapi-api-key"),
  ga4ApiSecret: optionalRuntimeSecretReference("ai-sports-prediction/ga4-api-secret"),
  widgetApiKeyEncryptionKey: optionalRuntimeSecretReference("ai-sports-prediction/widget-api-key-encryption-key"),
  widgetCustomerSessionSecret: optionalRuntimeSecretReference("ai-sports-prediction/widget-customer-session-secret"),
  tiktokAccessToken: optionalRuntimeSecretReference("ai-sports-prediction/tiktok-access-token")
};

const taskDefinition = {
  family: taskFamily,
  networkMode: "awsvpc",
  requiresCompatibilities: ["FARGATE"],
  cpu: env("ECS_EDGE_CPU", "1024"),
  memory: env("ECS_EDGE_MEMORY", "2048"),
  executionRoleArn,
  taskRoleArn,
  runtimePlatform: {
    operatingSystemFamily: "LINUX",
    cpuArchitecture: "ARM64"
  },
  containerDefinitions: [
    {
      name: "web",
      image: imageUri,
      essential: true,
      portMappings: [{ containerPort: 3000, protocol: "tcp" }],
      environment: [
        { name: "NODE_ENV", value: "production" },
        { name: "SERVICE_ROLE", value: "web" },
        { name: "PORT", value: "3000" },
        { name: "AI_SPORTS_API_URL", value: env("WEB_API_URL", "http://127.0.0.1:3001") },
        { name: "INTERNAL_API_URL", value: env("WEB_INTERNAL_API_URL", "http://127.0.0.1:3001") },
        { name: "SHOW_FULL_SITE", value: env("SHOW_FULL_SITE", "1") },
        { name: "NEXT_PUBLIC_SHOW_FULL_SITE", value: env("NEXT_PUBLIC_SHOW_FULL_SITE", "1") },
        { name: "NEXT_PUBLIC_SITE_URL", value: env("NEXT_PUBLIC_SITE_URL", "https://residualsports.com") },
        { name: "GA4_MEASUREMENT_ID", value: env("GA4_MEASUREMENT_ID", "G-KSGFX9TKD8") },
        { name: "ADMIN_SESSION_TTL_HOURS", value: env("ADMIN_SESSION_TTL_HOURS", "168") },
        { name: "OPENROUTER_MODEL_IDS", value: env("OPENROUTER_MODEL_IDS", "openai/gpt-oss-20b:free") },
        { name: "OPENROUTER_SITE_URL", value: env("OPENROUTER_SITE_URL", "https://residualsports.com") },
        { name: "OPENROUTER_SITE_NAME", value: env("OPENROUTER_SITE_NAME", "Residual Sports") },
        { name: "NEWSLETTER_FROM_EMAIL", value: env("NEWSLETTER_FROM_EMAIL", "Residual Sports <hello@residualsports.com>") },
        { name: "THE_ODDS_API_REGIONS", value: env("THE_ODDS_API_REGIONS", "eu,us") },
        { name: "ODDS_REFRESH_LOOKAHEAD_DAYS", value: env("ODDS_REFRESH_LOOKAHEAD_DAYS", "7") },
        { name: "THE_SPORTS_DB_CACHE_SECONDS", value: env("THE_SPORTS_DB_CACHE_SECONDS", "300") },
        { name: "THE_SPORTS_DB_LIVE_CACHE_SECONDS", value: env("THE_SPORTS_DB_LIVE_CACHE_SECONDS", "60") },
        { name: "DATABASE_SSL", value: env("DATABASE_SSL", "1") },
        { name: "DATABASE_SSL_REJECT_UNAUTHORIZED", value: env("DATABASE_SSL_REJECT_UNAUTHORIZED", "1") },
        {
          name: "DATABASE_SSL_CA_FILE",
          value: env("DATABASE_SSL_CA_FILE", "/etc/ssl/certs/aws-rds-global-bundle.pem")
        },
        { name: "WEB_API_CACHE_SECONDS", value: env("WEB_API_CACHE_SECONDS", "60") },
        { name: "WEB_API_ODDS_CACHE_SECONDS", value: env("WEB_API_ODDS_CACHE_SECONDS", "60") },
        { name: "OUTREACH_SEARCH_PROVIDER", value: env("OUTREACH_SEARCH_PROVIDER", "serpapi") }
        ,{ name: "PUBLIC_SITE_URL", value: env("PUBLIC_SITE_URL", "https://residualsports.com") }
        ,{ name: "WIDGET_CUSTOMER_SESSION_TTL_HOURS", value: env("WIDGET_CUSTOMER_SESSION_TTL_HOURS", "720") }
        ,{ name: "WIDGET_ACCESS_FROM_EMAIL", value: env("WIDGET_ACCESS_FROM_EMAIL", "") }
      ],
      secrets: [
        { name: "DATABASE_URL", valueFrom: secrets.databaseUrl },
        { name: "REDIS_URL", valueFrom: secrets.redisUrl },
        { name: "ADMIN_API_TOKEN", valueFrom: secrets.adminApiToken },
        { name: "ADMIN_ACCESS_EMAILS", valueFrom: secrets.adminAccessEmails },
        { name: "ADMIN_SESSION_SECRET", valueFrom: secrets.adminSessionSecret },
        { name: "ADMIN_TOTP_SECRETS", valueFrom: secrets.adminTotpSecrets },
        { name: "OPENROUTER_API_KEY", valueFrom: secrets.openrouterApiKey },
        { name: "RESEND_API_KEY", valueFrom: secrets.resendApiKey },
        { name: "THE_ODDS_API_KEY", valueFrom: secrets.theOddsApiKey },
        { name: "THE_SPORTS_DB_API_KEY", valueFrom: secrets.theSportsDbApiKey },
        { name: "SERPAPI_API_KEY", valueFrom: secrets.serpApiKey }
        ,...(secrets.ga4ApiSecret
          ? [{ name: "GA4_API_SECRET", valueFrom: secrets.ga4ApiSecret }]
          : [])
        ,...(secrets.widgetApiKeyEncryptionKey
          ? [{ name: "WIDGET_API_KEY_ENCRYPTION_KEY", valueFrom: secrets.widgetApiKeyEncryptionKey }]
          : [])
        ,...(secrets.widgetCustomerSessionSecret
          ? [{ name: "WIDGET_CUSTOMER_SESSION_SECRET", valueFrom: secrets.widgetCustomerSessionSecret }]
          : [])
      ],
      logConfiguration: awslogs("edge-web")
    },
    {
      name: "api",
      image: imageUri,
      essential: true,
      portMappings: [{ containerPort: 3001, protocol: "tcp" }],
      environment: [
        { name: "NODE_ENV", value: "production" },
        { name: "SERVICE_ROLE", value: "api" },
        { name: "API_HOST", value: "0.0.0.0" },
        { name: "API_PORT", value: "3001" },
        { name: "DATABASE_SSL", value: env("DATABASE_SSL", "1") },
        { name: "DATABASE_SSL_REJECT_UNAUTHORIZED", value: env("DATABASE_SSL_REJECT_UNAUTHORIZED", "1") },
        {
          name: "DATABASE_SSL_CA_FILE",
          value: env("DATABASE_SSL_CA_FILE", "/etc/ssl/certs/aws-rds-global-bundle.pem")
        },
        { name: "API_CORS_ORIGIN", value: env("API_CORS_ORIGIN", "https://residualsports.com") },
        { name: "API_CACHE_ENABLED", value: env("API_CACHE_ENABLED", "1") },
        { name: "API_CACHE_MATCHES_TTL_SECONDS", value: env("API_CACHE_MATCHES_TTL_SECONDS", "300") },
        { name: "API_CACHE_ODDS_TTL_SECONDS", value: env("API_CACHE_ODDS_TTL_SECONDS", "60") },
        { name: "API_CACHE_BENCHMARK_TTL_SECONDS", value: env("API_CACHE_BENCHMARK_TTL_SECONDS", "300") },
        { name: "API_CACHE_SPECIAL_TTL_SECONDS", value: env("API_CACHE_SPECIAL_TTL_SECONDS", "300") },
        { name: "API_CACHE_HEALTH_TTL_SECONDS", value: env("API_CACHE_HEALTH_TTL_SECONDS", "2") },
        { name: "OPENROUTER_MODEL_IDS", value: env("OPENROUTER_MODEL_IDS", "openai/gpt-oss-20b:free") },
        { name: "OPENROUTER_SITE_URL", value: env("OPENROUTER_SITE_URL", "https://residualsports.com") },
        { name: "OPENROUTER_SITE_NAME", value: env("OPENROUTER_SITE_NAME", "Residual Sports") }
      ],
      secrets: [
        { name: "DATABASE_URL", valueFrom: secrets.databaseUrl },
        { name: "REDIS_URL", valueFrom: secrets.redisUrl },
        { name: "ADMIN_API_TOKEN", valueFrom: secrets.adminApiToken },
        { name: "OPENROUTER_API_KEY", valueFrom: secrets.openrouterApiKey }
      ],
      logConfiguration: awslogs("edge-api")
    },
    {
      name: "worker",
      image: imageUri,
      essential: false,
      restartPolicy: {
        enabled: true,
        ignoredExitCodes: [],
        restartAttemptPeriod: 60
      },
      environment: [
        ["NODE_ENV", "production"],
        ["SERVICE_ROLE", "worker"],
        ["QUEUE_KEY_PREFIX", "{ai-sports-prediction}"],
        ["DATABASE_SSL", "1"],
        ["DATABASE_SSL_REJECT_UNAUTHORIZED", env("DATABASE_SSL_REJECT_UNAUTHORIZED", "1")],
        ["DATABASE_SSL_CA_FILE", "/etc/ssl/certs/aws-rds-global-bundle.pem"],
        ["OPENROUTER_MODEL_IDS", env("OPENROUTER_MODEL_IDS", "openai/gpt-oss-20b:free")],
        ["OPENROUTER_SITE_URL", env("OPENROUTER_SITE_URL", "https://residualsports.com")],
        ["OPENROUTER_SITE_NAME", env("OPENROUTER_SITE_NAME", "Residual Sports")],
        ["FIXTURE_SYNC_INTERVAL_MINUTES", env("FIXTURE_SYNC_INTERVAL_MINUTES", "15")],
        ["LIVE_SCORE_SYNC_INTERVAL_MINUTES", env("LIVE_SCORE_SYNC_INTERVAL_MINUTES", "2")],
        ["PREDICTION_AUTOMATION_INTERVAL_MINUTES", env("PREDICTION_AUTOMATION_INTERVAL_MINUTES", "60")],
        ["PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN", env("PREDICTION_AUTOMATION_MAX_FIXTURES_PER_RUN", "50")],
        ["ODDS_REFRESH_LOOKAHEAD_DAYS", env("ODDS_REFRESH_LOOKAHEAD_DAYS", "7")],
        ["ODDS_REFRESH_INTERVAL_MINUTES", env("ODDS_REFRESH_INTERVAL_MINUTES", "60")],
        ["ODDS_REFRESH_DAILY_INTERVAL_MINUTES", env("ODDS_REFRESH_DAILY_INTERVAL_MINUTES", "1440")],
        ["ODDS_REFRESH_PRE_MATCH_MINUTES", env("ODDS_REFRESH_PRE_MATCH_MINUTES", "60")],
        ["ODDS_REFRESH_MAX_MATCHES_PER_RUN", env("ODDS_REFRESH_MAX_MATCHES_PER_RUN", "250")],
        ["BACKUP_AUTOMATION_ENABLED", env("BACKUP_AUTOMATION_ENABLED", "1")],
        ["BACKUP_AUTOMATION_INTERVAL_HOURS", env("BACKUP_AUTOMATION_INTERVAL_HOURS", "12")],
        ["BACKUP_S3_BUCKET", env("BACKUP_S3_BUCKET", "ai-sports-prediction")],
        ["BACKUP_S3_REGION", region],
        ["BACKUP_S3_PREFIX", env("BACKUP_S3_PREFIX", "ai-sports-prediction/backups")],
        ["POSTGRES_BACKUP_DIR", "/tmp/postgres-backups"],
        ["OPS_ALERT_EMAILS", env("OPS_ALERT_EMAILS", "")],
        ["OPS_ALERT_FROM_EMAIL", env("OPS_ALERT_FROM_EMAIL", "Residual Sports <ops@residualsports.com>")],
        ["NEWSLETTER_FROM_EMAIL", env("NEWSLETTER_FROM_EMAIL", "Residual Sports <hello@residualsports.com>")],
        ["MARKETING_AUTOMATION_ENABLED", env("MARKETING_AUTOMATION_ENABLED", "0")],
        ["MARKETING_ANALYTICS_ENABLED", env("MARKETING_ANALYTICS_ENABLED", "1")],
        ["GA4_MEASUREMENT_ID", env("GA4_MEASUREMENT_ID", "G-KSGFX9TKD8")],
        ["REVENUE_AUTOMATION_ENABLED", env("REVENUE_AUTOMATION_ENABLED", "1")],
        ["REVENUE_AUTOMATION_INTERVAL_MINUTES", env("REVENUE_AUTOMATION_INTERVAL_MINUTES", "60")],
        ["PUBLIC_SITE_URL", env("PUBLIC_SITE_URL", "https://residualsports.com")],
        ["WIDGET_ACCESS_FROM_EMAIL", env("WIDGET_ACCESS_FROM_EMAIL", "")],
        ["SALES_ALERT_EMAILS", env("SALES_ALERT_EMAILS", "")]
      ].map(([name, value]) => ({ name, value })),
      secrets: [
        ["DATABASE_URL", secrets.databaseUrl],
        ["REDIS_URL", secrets.redisUrl],
        ["OPENROUTER_API_KEY", secrets.openrouterApiKey],
        ["THE_SPORTS_DB_API_KEY", secrets.theSportsDbApiKey],
        ["THE_ODDS_API_KEY", secrets.theOddsApiKey],
        ["SERPAPI_API_KEY", secrets.serpApiKey],
        ["RESEND_API_KEY", secrets.resendApiKey],
        ...(secrets.ga4ApiSecret ? [["GA4_API_SECRET", secrets.ga4ApiSecret]] : [])
      ].map(([name, valueFrom]) => ({ name, valueFrom })),
      logConfiguration: awslogs("edge-worker")
    },
    {
      name: "cloudflared",
      image: env("CLOUDFLARED_IMAGE", "cloudflare/cloudflared:latest"),
      essential: true,
      command: ["tunnel", "--no-autoupdate", "run"],
      environment: [{ name: "TUNNEL_TRANSPORT_PROTOCOL", value: env("TUNNEL_TRANSPORT_PROTOCOL", "http2") }],
      secrets: [{ name: "TUNNEL_TOKEN", valueFrom: secrets.cloudflareTunnelToken }],
      logConfiguration: awslogs("cloudflared")
    }
  ]
};

const taskDefinitionArn = registerTaskDefinition(taskDefinition);
upsertService(taskDefinitionArn);

console.log(`Cloudflare edge task definition: ${taskDefinitionArn}`);
console.log(`ECS service: ${cluster}/${serviceName}`);

function registerTaskDefinition(definition) {
  const file = join(tmpdir(), `${definition.family}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(definition, null, 2));

  try {
    return aws([
      "ecs",
      "register-task-definition",
      "--cli-input-json",
      `file://${file}`,
      "--query",
      "taskDefinition.taskDefinitionArn",
      "--output",
      "text"
    ]);
  } finally {
    if (existsSync(file)) {
      rmSync(file);
    }
  }
}

function upsertService(taskDefinitionArn) {
  const status = describeServiceStatus();

  if (status === "ACTIVE" || status === "DRAINING") {
    aws([
      "ecs",
      "update-service",
      "--cluster",
      cluster,
      "--service",
      serviceName,
      "--task-definition",
      taskDefinitionArn,
      "--desired-count",
      desiredCount,
      "--force-new-deployment",
      "--output",
      "text"
    ]);
    return;
  }

  aws([
    "ecs",
    "create-service",
    "--cluster",
    cluster,
    "--service-name",
    serviceName,
    "--task-definition",
    taskDefinitionArn,
    "--desired-count",
    desiredCount,
    "--launch-type",
    "FARGATE",
    "--network-configuration",
    `awsvpcConfiguration={subnets=[${subnetIds.join(",")}],securityGroups=[${appSecurityGroup}],assignPublicIp=${assignPublicIp}}`,
    "--enable-execute-command",
    "--output",
    "text"
  ]);
}

function describeServiceStatus() {
  try {
    const status = aws([
      "ecs",
      "describe-services",
      "--cluster",
      cluster,
      "--services",
      serviceName,
      "--query",
      "services[0].status",
      "--output",
      "text"
    ]);
    return status === "None" ? null : status;
  } catch {
    return null;
  }
}

function secretArn(secretName) {
  return aws([
    "secretsmanager",
    "describe-secret",
    "--secret-id",
    secretName,
    "--query",
    "ARN",
    "--output",
    "text"
  ]);
}

function runtimeSecretReference(secretName) {
  try {
    return aws([
      "ssm",
      "get-parameter",
      "--name",
      `/${secretName}`,
      "--query",
      "Parameter.ARN",
      "--output",
      "text"
    ]);
  } catch {
    return secretArn(secretName);
  }
}

function optionalRuntimeSecretReference(secretName) {
  try {
    return runtimeSecretReference(secretName);
  } catch {
    return null;
  }
}

function awslogs(streamPrefix) {
  return {
    logDriver: "awslogs",
    options: {
      "awslogs-group": logGroup,
      "awslogs-region": region,
      "awslogs-stream-prefix": streamPrefix
    }
  };
}

function env(name, fallback) {
  return process.env[name] ?? fallback;
}

function aws(args) {
  return execFileSync("aws", ["--region", region, "--cli-connect-timeout", "5", "--cli-read-timeout", "30", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
