#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function serviceConfiguration(environment = process.env) {
  return {
    region: environment.AWS_REGION ?? "eu-central-1",
    accountId: environment.AWS_ACCOUNT_ID ?? "186581960948",
    cluster: environment.ECS_CLUSTER ?? "ai-sports-prediction",
    edge: environment.ECS_EDGE_SERVICE ?? "ai-sports-prediction-edge",
    worker: environment.ECS_WORKER_SERVICE ?? "ai-sports-prediction-worker"
  };
}

export function awsCli(region) {
  return (args) => execFileSync("aws", [
    "--region", region, "--cli-connect-timeout", "5", "--cli-read-timeout", "60", ...args
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function assertAccount(aws, configuration) {
  const accountId = aws(["sts", "get-caller-identity", "--query", "Account", "--output", "text"]);
  if (accountId !== configuration.accountId) {
    throw new Error(`AWS credential account ${accountId} does not match AWS_ACCOUNT_ID=${configuration.accountId}; refusing service changes.`);
  }
}

function desiredCount(value, name) {
  if (!/^(0|[1-9]\d*)$/.test(String(value ?? "")) || !Number.isSafeInteger(Number(value))) {
    throw new Error(`${name} must be an explicit non-negative integer; refusing to guess a service's previous capacity.`);
  }
  return Number(value);
}

function taskDefinition(value, name, configuration) {
  if (typeof value !== "string" || !new RegExp(`^arn:aws:ecs:${configuration.region}:${configuration.accountId}:task-definition/[A-Za-z0-9_-]+:[1-9]\\d*$`).test(value)) {
    throw new Error(`${name} must be a task definition ARN in the configured AWS account and region.`);
  }
  return value;
}

export function previousServices(environment, configuration) {
  return ["edge", "worker"].map((key) => {
    const prefix = `PREVIOUS_${key.toUpperCase()}`;
    return {
      key, service: configuration[key],
      taskDefinition: taskDefinition(environment[`${prefix}_TASK_DEFINITION`]?.trim(), `${prefix}_TASK_DEFINITION`, configuration),
      desiredCount: desiredCount(environment[`${prefix}_DESIRED_COUNT`], `${prefix}_DESIRED_COUNT`)
    };
  });
}

export function currentServices(aws, configuration) {
  const result = JSON.parse(aws([
    "ecs", "describe-services", "--cluster", configuration.cluster,
    "--services", configuration.edge, configuration.worker,
    "--query", "{services:services[].{serviceName:serviceName,status:status,taskDefinition:taskDefinition,desiredCount:desiredCount},failures:failures}",
    "--output", "json"
  ]));
  if (result.failures?.length) throw new Error("Unable to describe both production services; refusing partial service state.");
  return ["edge", "worker"].map((key) => {
    const service = result.services?.find((entry) => entry.serviceName === configuration[key]);
    if (!service || service.status !== "ACTIVE") throw new Error(`Production service ${configuration[key]} is missing or not ACTIVE.`);
    return {
      key, service: service.serviceName,
      taskDefinition: taskDefinition(service.taskDefinition, `${key} taskDefinition`, configuration),
      desiredCount: desiredCount(service.desiredCount, `${key} desiredCount`)
    };
  });
}

export function rollbackServices({ aws, configuration, environment = process.env, log = console.log }) {
  // Validate the complete snapshot before issuing any service mutation.
  const previous = previousServices(environment, configuration);
  assertAccount(aws, configuration);
  const current = currentServices(aws, configuration);
  const changed = previous.filter((service) => {
    const existing = current.find((entry) => entry.key === service.key);
    return existing.taskDefinition !== service.taskDefinition || existing.desiredCount !== service.desiredCount;
  });
  if (!changed.length) {
    log("Production services are unchanged; no rollback or restart is necessary.");
    return [];
  }

  const restored = [];
  const errors = [];
  for (const service of changed) {
    try {
      // No forced deployment: restoring a task definition starts one as needed,
      // and a previously dormant service must never start pulling its old image.
      aws([
        "ecs", "update-service", "--cluster", configuration.cluster,
        "--service", service.service, "--task-definition", service.taskDefinition,
        "--desired-count", String(service.desiredCount), "--output", "json"
      ]);
      restored.push(service.service);
      log(`Restoring ${service.service} to ${service.taskDefinition} with desiredCount=${service.desiredCount}.`);
    } catch (error) {
      errors.push(new Error(`Could not restore ${service.service}: ${error.message}`, { cause: error }));
    }
  }
  // Still restore/wait for the other service if one update fails.
  if (restored.length) {
    try {
      aws(["ecs", "wait", "services-stable", "--cluster", configuration.cluster, "--services", ...restored]);
    } catch (error) {
      errors.push(new Error(`Restored services did not stabilize: ${error.message}`, { cause: error }));
    }
  }
  if (errors.length) throw new AggregateError(errors, errors.map((error) => error.message).join("\n"));
  log("Rollback completed; previous service versions and capacity were restored.");
  return restored;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const configuration = serviceConfiguration();
  rollbackServices({ aws: awsCli(configuration.region), configuration });
}
