#!/usr/bin/env node
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { assertAccount, awsCli, currentServices, serviceConfiguration } from "./rollback-aws-services.mjs";

export function captureServiceState({ aws, configuration }) {
  assertAccount(aws, configuration);
  const services = currentServices(aws, configuration);
  const edge = services.find((service) => service.key === "edge");
  let definition;
  try {
    definition = JSON.parse(aws([
      "ecs", "describe-task-definition", "--task-definition", edge.taskDefinition,
      "--query", "taskDefinition", "--output", "json"
    ]));
  } catch (error) {
    if (/AccessDenied|not authorized/i.test(String(error?.stderr ?? error?.message ?? ""))) {
      // Do not bypass the recovery guard or dump the full child-process error.
      // Reading the definition is essential to distinguish recovery from normal production.
      throw Object.assign(new Error(
        "Production preflight cannot inspect the active edge task because the deployment role lacks ecs:DescribeTaskDefinition. "
        + "Have an AWS administrator add the policy from infra/iam/github-actions-recovery-read-policy.json, then rerun preflight. "
        + "No image publication, migration, or service update has started. The recovery-profile guard remains enforced."
      ), { code: "PREFLIGHT_TASK_DEFINITION_READ_DENIED" });
    }
    throw error;
  }
  if (!Array.isArray(definition.containerDefinitions) || !definition.containerDefinitions.length) {
    throw new Error("Cannot inspect the current production task definition; refusing deployment.");
  }
  const recoveryMode = definition.containerDefinitions.some((container) =>
    container.environment?.some((variable) => variable.name === "RECOVERY_WORKER_APPROVED" && variable.value)
    || [...(container.command ?? []), ...(container.entryPoint ?? [])].some((argument) => argument.includes("recovery-worker.mjs"))
  );
  if (recoveryMode) {
    throw new Error("Production is running the isolated recovery profile. Normal deployment is blocked before migrations or service changes because it would restore disabled business handlers and secrets. Use an explicitly reviewed recovery-aware rollout.");
  }
  return services.map((service) => `${service.key}=${service.taskDefinition}\n${service.key}_desired_count=${service.desiredCount}\n`).join("");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.env.GITHUB_OUTPUT) throw new Error("GITHUB_OUTPUT is required to preserve the production service snapshot.");
  const configuration = serviceConfiguration();
  const output = captureServiceState({ aws: awsCli(configuration.region), configuration });
  appendFileSync(process.env.GITHUB_OUTPUT, output);
  console.log("Saved production task definitions and desired counts; deployment preflight passed.");
}
