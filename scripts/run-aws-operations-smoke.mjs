#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const region = process.env.AWS_REGION ?? "eu-central-1";
const cluster = process.env.ECS_CLUSTER ?? "ai-sports-prediction";
const taskDefinition = process.env.ECS_WORKER_TASK_FAMILY ?? "ai-sports-prediction-worker";
const securityGroup = process.env.ECS_APP_SECURITY_GROUP ?? "sg-0ff92d788326fd9ac";
const subnets = (process.env.ECS_SUBNET_IDS ??
  "subnet-0cc8d0aa15263d1ef,subnet-06ed8c8d5be7ac04c,subnet-0f5eb9f5765d627ee")
  .split(",").map((value) => value.trim()).filter(Boolean);

const fixtureTask = runTask({
  command: [
    "node", "--import", "tsx", "-e",
    "const {createPostgresPool}=await import('@ai-sports-prediction/db'); const {syncUpcomingSportFixtures}=await import('./apps/worker/src/jobs/sync-upcoming-sport-fixtures.ts'); const db=createPostgresPool(); try{await syncUpcomingSportFixtures(db)} finally{await db.end()}"
  ]
});
waitForSuccess(fixtureTask, "Fixture synchronization");

const backupTask = runTask({
  environment: [{ name: "SERVICE_ROLE", value: "backup" }]
});
waitForSuccess(backupTask, "Backup and restore drill");

console.log(`Fixture smoke task: ${fixtureTask}`);
console.log(`Backup/restore smoke task: ${backupTask}`);

function runTask(containerOverride) {
  return aws([
    "ecs", "run-task",
    "--cluster", cluster,
    "--task-definition", taskDefinition,
    "--launch-type", "FARGATE",
    "--network-configuration",
    `awsvpcConfiguration={subnets=[${subnets.join(",")}],securityGroups=[${securityGroup}],assignPublicIp=ENABLED}`,
    "--overrides", JSON.stringify({ containerOverrides: [{ name: "worker", ...containerOverride }] }),
    "--query", "tasks[0].taskArn",
    "--output", "text"
  ]);
}

function waitForSuccess(taskArn, label) {
  aws(["ecs", "wait", "tasks-stopped", "--cluster", cluster, "--tasks", taskArn]);
  const result = JSON.parse(aws([
    "ecs", "describe-tasks",
    "--cluster", cluster,
    "--tasks", taskArn,
    "--query", "tasks[0].containers[0].{exitCode:exitCode,reason:reason}",
    "--output", "json"
  ]));
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${result.exitCode}: ${result.reason ?? "unknown"}`);
  }
}

function aws(args) {
  return execFileSync("aws", [
    "--region", region,
    "--cli-connect-timeout", "5",
    "--cli-read-timeout", "120",
    ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
