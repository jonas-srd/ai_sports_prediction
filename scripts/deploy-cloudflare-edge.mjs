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
  databaseUrl: secretArn("ai-sports-prediction/database-url"),
  redisUrl: secretArn("ai-sports-prediction/redis-url"),
  adminApiToken: secretArn("ai-sports-prediction/admin-api-token"),
  cloudflareTunnelToken: secretArn("ai-sports-prediction/cloudflare-tunnel-token")
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
        { name: "SHOW_FULL_SITE", value: env("SHOW_FULL_SITE", "0") },
        { name: "NEXT_PUBLIC_SHOW_FULL_SITE", value: env("NEXT_PUBLIC_SHOW_FULL_SITE", "0") },
        { name: "WEB_API_CACHE_SECONDS", value: env("WEB_API_CACHE_SECONDS", "60") }
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
        { name: "API_CORS_ORIGIN", value: env("API_CORS_ORIGIN", "https://www.ai-sports-prediction.net") },
        { name: "API_CACHE_ENABLED", value: env("API_CACHE_ENABLED", "1") },
        { name: "API_CACHE_MATCHES_TTL_SECONDS", value: env("API_CACHE_MATCHES_TTL_SECONDS", "300") },
        { name: "API_CACHE_BENCHMARK_TTL_SECONDS", value: env("API_CACHE_BENCHMARK_TTL_SECONDS", "300") },
        { name: "API_CACHE_SPECIAL_TTL_SECONDS", value: env("API_CACHE_SPECIAL_TTL_SECONDS", "300") },
        { name: "API_CACHE_HEALTH_TTL_SECONDS", value: env("API_CACHE_HEALTH_TTL_SECONDS", "2") }
      ],
      secrets: [
        { name: "DATABASE_URL", valueFrom: secrets.databaseUrl },
        { name: "REDIS_URL", valueFrom: secrets.redisUrl },
        { name: "ADMIN_API_TOKEN", valueFrom: secrets.adminApiToken }
      ],
      logConfiguration: awslogs("edge-api")
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
  return execFileSync("aws", ["--region", region, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
