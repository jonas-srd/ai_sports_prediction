#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const region = process.env.AWS_REGION ?? "eu-central-1";
const cluster = process.env.ECS_CLUSTER ?? "ai-sports-prediction";
const edgeService = process.env.ECS_EDGE_SERVICE ?? "ai-sports-prediction-edge";
const workerService = process.env.ECS_WORKER_SERVICE ?? "ai-sports-prediction-worker";
const edgeTaskDefinition = process.env.PREVIOUS_EDGE_TASK_DEFINITION?.trim();
const workerTaskDefinition = process.env.PREVIOUS_WORKER_TASK_DEFINITION?.trim();

if (!edgeTaskDefinition || !workerTaskDefinition) {
  throw new Error("PREVIOUS_EDGE_TASK_DEFINITION and PREVIOUS_WORKER_TASK_DEFINITION are required for a rollback.");
}

rollback(workerService, workerTaskDefinition);
rollback(edgeService, edgeTaskDefinition);
console.log(`Rollback started for ${cluster}. Waiting for both services to stabilize.`);
aws(["ecs", "wait", "services-stable", "--cluster", cluster, "--services", workerService, edgeService]);
console.log("Rollback completed.");

function rollback(service, taskDefinition) {
  aws([
    "ecs", "update-service",
    "--cluster", cluster,
    "--service", service,
    "--task-definition", taskDefinition,
    "--force-new-deployment",
    "--output", "text"
  ]);
}

function aws(args) {
  return execFileSync("aws", ["--region", region, "--cli-connect-timeout", "5", "--cli-read-timeout", "60", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}
